import io
import re
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import uuid4
from zipfile import BadZipFile, ZipFile

import httpx
from docx import Document
from fastapi import Cookie, Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pypdf.errors import PyPdfError

from . import db
from .catalog import QUESTIONS
from .coach import evaluate, generate_question
from .config import get_settings
from .models import AnswerRequest, Profile, SkillReview, TaskUpdate
from .planner import adapt_future_tasks, build_plan, new_workspace


@asynccontextmanager
async def lifespan(app):
    db.initialise()
    yield


app = FastAPI(title='Prepwise API', version='0.1.0', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=get_settings().allowed_origins.split(','),
    allow_credentials=True, allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allow_headers=['Content-Type'],
)


def workspace(response: Response, prepwise_workspace: str | None = Cookie(default=None)):
    key = prepwise_workspace
    data = db.read_workspace(key) if key and re.fullmatch(r'[A-Za-z0-9_-]{40,64}', key) else None
    if data is None:
        key = secrets.token_urlsafe(32)
        data = new_workspace()
        db.create_workspace(key, data)
        response.set_cookie('prepwise_workspace', key, httponly=True, samesite='strict', max_age=60 * 60 * 24 * 30)
    return key, data


@app.get('/api/health')
def health():
    return {'status': 'ok', 'provider': get_settings().llm_provider}


@app.get('/api/workspace')
def get_workspace(context=Depends(workspace)):
    return {**context[1], 'questions': QUESTIONS, 'provider': get_settings().llm_provider}


@app.put('/api/profile')
def save_profile(profile: Profile, context=Depends(workspace)):
    def change(data):
        data['profile'] = profile.model_dump(mode='json')
        data['onboarded'] = True
        # A new deadline/availability creates a fresh plan, while keeping history.
        data['tasks'] = build_plan(data['profile'], data['skills'], custom_questions=data.get('custom_questions'))
    return db.mutate_workspace(context[0], change)


@app.patch('/api/tasks/{task_id}')
def update_task(task_id: str, update: TaskUpdate, context=Depends(workspace)):
    def change(data):
        task = next((t for t in data['tasks'] if t['id'] == task_id), None)
        if not task:
            raise HTTPException(404, 'Task not found.')
        task['completed'] = update.completed
    return db.mutate_workspace(context[0], change)


@app.post('/api/answers')
async def answer(request: AnswerRequest, context=Depends(workspace)):
    question = next((q for q in QUESTIONS + context[1].get('custom_questions', []) if q['id'] == request.question_id), None)
    if not question:
        raise HTTPException(404, 'Question not found.')
    if request.parent_session_id:
        parent = next((s for s in context[1]['sessions'] if s['id'] == request.parent_session_id and s['question_id'] == request.question_id), None)
        if not parent:
            raise HTTPException(404, 'Previous answer not found in this workspace.')
        question = {**question, 'title': parent['feedback']['follow_up'], 'previous_answer': parent['answer']}
    try:
        feedback = await evaluate(question, request.answer, context[1]['profile'])
    except (httpx.HTTPError, ValueError, KeyError, RuntimeError) as exc:
        # Never silently replace failed AI feedback with invented AI output.
        raise HTTPException(503, 'AI coaching is unavailable or returned invalid feedback. Your answer is still in the editor. Try again, or disable AI sharing to use the offline checklist.') from exc
    session = {
        'id': str(uuid4()), 'question_id': question['id'], 'question': question['title'],
        'skill': question['skill'], 'answer': request.answer,
        'duration_seconds': request.duration_seconds,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'feedback': feedback.model_dump(), 'assessment': request.assessment,
    }
    def change(data):
        data['sessions'].insert(0, session)
        # Offline word-pattern checks must not become skill estimates.
        if feedback.source == 'ai':
            skill = next(s for s in data['skills'] if s['name'] == question['skill'])
            score = round(sum(feedback.rubric.values()) / 15 * 100)
            skill['score'] = round((skill['score'] * skill['samples'] + score) / (skill['samples'] + 1))
            skill['samples'] += 1
            adapt_future_tasks(data)
        if request.task_id:
            task = next((t for t in data['tasks'] if t['id'] == request.task_id and t['question_id'] == question['id']), None)
            if task:
                task['completed'] = True
    data = db.mutate_workspace(context[0], change)
    return {'session': session, 'workspace': data}


@app.post('/api/saved/{question_id}')
def toggle_saved(question_id: str, context=Depends(workspace)):
    if not any(q['id'] == question_id for q in QUESTIONS + context[1].get('custom_questions', [])):
        raise HTTPException(404, 'Question not found.')
    def change(data):
        saved = data['saved_questions']
        saved.remove(question_id) if question_id in saved else saved.append(question_id)
    return db.mutate_workspace(context[0], change)


@app.post('/api/skills/review')
def review_skill(review: SkillReview, context=Depends(workspace)):
    def change(data):
        skill = next((s for s in data['skills'] if s['name'] == review.skill), None)
        if not skill:
            raise HTTPException(404, 'Skill not found.')
        skill['review'] = review.level
        # Self-reported needs influence the next plan without rewriting evidence.
        if review.level == 'Getting started' and review.skill not in data['profile']['focus']:
            data['profile']['focus'].append(review.skill)
        elif review.level == 'Feeling confident' and review.skill in data['profile']['focus'] and len(data['profile']['focus']) > 1:
            data['profile']['focus'].remove(review.skill)
        adapt_future_tasks(data)
    return db.mutate_workspace(context[0], change)


@app.post('/api/questions/generate')
async def personalised_question(context=Depends(workspace)):
    if len(context[1].get('custom_questions', [])) >= 50:
        raise HTTPException(422, 'You have 50 tailored questions. Practise an existing one or reset the workspace.')
    try:
        question = {**await generate_question(context[1]['profile']), 'id': 'custom-' + str(uuid4())}
    except (httpx.HTTPError, ValueError, KeyError, RuntimeError) as exc:
        raise HTTPException(503, 'Tailored questions need a configured AI provider and your text-sharing permission. Check your profile and server settings, then try again.') from exc
    def change(data):
        data.setdefault('custom_questions', []).append(question)
        adapt_future_tasks(data)
    data = db.mutate_workspace(context[0], change)
    return {'question': question, 'workspace': data}


@app.post('/api/documents/extract')
async def extract_document(file: UploadFile = File(...), context=Depends(workspace)):
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, 'Please upload a file smaller than 5 MB.')
    extension = Path(file.filename or '').suffix.lower()
    try:
        if extension == '.pdf':
            reader = PdfReader(io.BytesIO(content))
            if len(reader.pages) > 20:
                raise HTTPException(422, 'Use a document of 20 pages or fewer.')
            text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        elif extension == '.docx':
            with ZipFile(io.BytesIO(content)) as archive:
                if sum(item.file_size for item in archive.infolist()) > 20 * 1024 * 1024:
                    raise HTTPException(413, 'This document expands beyond the supported size. Try exporting it as text.')
            document = Document(io.BytesIO(content))
            text = '\n'.join([p.text for p in document.paragraphs] + [c.text for t in document.tables for r in t.rows for c in r.cells])
        elif extension == '.txt':
            text = content.decode('utf-8-sig')
        else:
            raise HTTPException(415, 'Supported formats: PDF, DOCX and TXT.')
    except (ValueError, UnicodeError, BadZipFile, KeyError, OSError, PyPdfError) as exc:
        raise HTTPException(422, 'This file could not be read. Try exporting it as text.') from exc
    if not text.strip():
        raise HTTPException(422, 'No readable text found. Try a text-based PDF, DOCX or TXT file.')
    return {'text': text[:16000], 'truncated': len(text) > 16000, 'filename': file.filename}


@app.post('/api/transcribe')
def transcribe(file: UploadFile = File(...), context=Depends(workspace)):
    if not get_settings().enable_whisper:
        raise HTTPException(503, 'Local transcription is not enabled. You can type your answer instead.')
    content = file.file.read(15 * 1024 * 1024 + 1)
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(413, 'Keep recordings under 15 MB.')
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise HTTPException(503, 'Install faster-whisper on the server to enable local transcription.') from exc
    # Audio is processed locally, deleted immediately, and never sent to the LLM.
    suffix = '.webm' if 'webm' in (file.content_type or '') else '.wav'
    with NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
        temporary.write(content)
        path = Path(temporary.name)
    try:
        model = WhisperModel(get_settings().whisper_model, device='cpu', compute_type='int8')
        segments, info = model.transcribe(str(path), word_timestamps=True)
        segments = list(segments)
        text = ' '.join(s.text.strip() for s in segments)
        fillers = len(re.findall(r'\b(um|uh|erm)\b', text, re.I))
        return {'text': text, 'duration_seconds': round(info.duration), 'filler_count': fillers,
                'fillers_per_minute': round(fillers * 60 / max(info.duration, 1), 1),
                'pauses': [{'start': a.end, 'end': b.start} for a, b in zip(segments, segments[1:]) if b.start - a.end > 2],
                'note': 'Transcript estimates can miss speech and fillers. Review the text before submitting; pauses do not affect your score.'}
    finally:
        path.unlink(missing_ok=True)


@app.delete('/api/workspace')
def reset_workspace(context=Depends(workspace)):
    def change(data):
        data.clear()
        data.update(new_workspace())
    return db.mutate_workspace(context[0], change)
