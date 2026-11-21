from datetime import date, timedelta
from io import BytesIO
from uuid import uuid4

import pytest
from docx import Document
from fastapi.testclient import TestClient

from backend.app import db
from backend.app.config import get_settings
from backend.app.main import app
from backend.app.planner import adapt_future_tasks, build_plan, new_workspace


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{tmp_path / "test.db"}')
    monkeypatch.setenv('LLM_PROVIDER', 'demo')
    get_settings.cache_clear()
    with TestClient(app) as client:
        yield client
    get_settings.cache_clear()


def profile(days=14, budget=30):
    value = new_workspace()['profile']
    value.update(name='Sam', company='Example Ltd', interview_date=(date.today() + timedelta(days=days)).isoformat(), minutes_per_day=budget)
    return value


@pytest.mark.parametrize('days,budget', [(0, 15), (1, 15), (3, 30), (14, 45), (180, 120)])
def test_scheduler_obeys_deadline_and_budget(days, budget):
    value = profile(days, budget)
    tasks = build_plan(value, new_workspace()['skills'])
    assert tasks
    for day in {t['date'] for t in tasks}:
        assert sum(t['minutes'] for t in tasks if t['date'] == day) <= budget
        assert date.today() <= date.fromisoformat(day) <= date.today() + timedelta(days=max(0, days - 1))
    assert len({t['id'] for t in tasks}) == len(tasks)


def test_replanning_keeps_completed_and_todays_tasks():
    data = new_workspace()
    task = next(t for t in data['tasks'] if t['date'] > date.today().isoformat())
    task['completed'] = True
    preserved = [t.copy() for t in data['tasks'] if t['date'] == date.today().isoformat() or t['completed']]
    data['skills'][0].update(score=90, samples=1)
    adapt_future_tasks(data)
    for old in preserved:
        assert old in data['tasks']
    for day in {t['date'] for t in data['tasks']}:
        assert sum(t['minutes'] for t in data['tasks'] if t['date'] == day) <= data['profile']['minutes_per_day']


def test_beginner_starts_without_stretch_questions():
    from backend.app.catalog import QUESTIONS
    data = new_workspace()
    today = [t for t in data['tasks'] if t['date'] == date.today().isoformat()]
    assert all(next(q for q in QUESTIONS if q['id'] == t['question_id'])['difficulty'] != 'Stretch' for t in today)


def test_onboarding_tasks_answer_and_followup_are_persistent(client):
    value = client.get('/api/workspace').json()
    assert not value['onboarded']
    saved = client.put('/api/profile', json=profile(3)).json()
    assert saved['onboarded']
    assert len({t['date'] for t in saved['tasks']}) == 3
    task = saved['tasks'][0]
    response = client.post('/api/answers', json={
        'question_id': task['question_id'], 'task_id': task['id'],
        'answer': 'I built a project with my team. I tested the queue because I wanted predictable ordering. I learned to check edge cases.',
        'duration_seconds': 90, 'assessment': True,
    })
    assert response.status_code == 200
    result = response.json()
    assert result['session']['feedback']['source'] == 'checklist'
    assert all(s['samples'] == 0 for s in result['workspace']['skills'])
    assert next(t for t in result['workspace']['tasks'] if t['id'] == task['id'])['completed']
    parent = result['session']
    followup = client.post('/api/answers', json={'question_id': task['question_id'], 'answer': 'I decided to test the arrival order first because correctness mattered.', 'parent_session_id': parent['id']}).json()
    assert followup['session']['question'] == parent['feedback']['follow_up']
    assert len(client.get('/api/workspace').json()['sessions']) == 2
    assert client.patch(f'/api/tasks/{task["id"]}', json={'completed': False}).status_code == 200


def test_validation_and_workspace_isolation(client):
    client.get('/api/workspace')
    assert client.put('/api/profile', json=profile(-1)).status_code == 422
    assert client.put('/api/profile', json=profile(181)).status_code == 422
    assert client.post('/api/answers', json={'question_id': 'tell-me', 'answer': 'tiny'}).status_code == 422
    assert client.post('/api/answers', json={'question_id': 'missing', 'answer': 'A long enough answer'}).status_code == 404
    assert client.post('/api/answers', json={'question_id': 'tell-me', 'answer': 'A long enough answer', 'parent_session_id': 'unknown'}).status_code == 404
    client.put('/api/profile', json=profile())
    with TestClient(app) as other:
        assert other.get('/api/workspace').json()['profile']['name'] == 'Alex'


def test_file_extraction_and_review_without_upload_storage(client):
    text = 'Project: Interview practice\nSkills: Python, React, SQL'
    extracted = client.post('/api/documents/extract', files={'file': ('cv.txt', text.encode(), 'text/plain')})
    assert extracted.status_code == 200
    assert extracted.json()['text'] == text
    doc = Document()
    doc.add_paragraph('My graduate project')
    buffer = BytesIO()
    doc.save(buffer)
    assert 'My graduate project' in client.post('/api/documents/extract', files={'file': ('cv.docx', buffer.getvalue())}).json()['text']
    assert client.post('/api/documents/extract', files={'file': ('cv.exe', b'bad')}).status_code == 415
    assert client.post('/api/documents/extract', files={'file': ('cv.pdf', b'not a PDF')}).status_code == 422
    assert client.post('/api/documents/extract', files={'file': ('cv.txt', b' ')}).status_code == 422
    assert client.post('/api/documents/extract', files={'file': ('cv.txt', b'x' * (5 * 1024 * 1024 + 1))}).status_code == 413
    assert client.get('/api/workspace').json()['profile']['cv'] == ''


def test_review_saved_questions_and_delete_data(client):
    value = client.post('/api/saved/queue').json()
    assert value['saved_questions'] == ['queue']
    assert client.post('/api/saved/queue').json()['saved_questions'] == []
    assert client.post('/api/saved/unknown').status_code == 404
    updated = client.post('/api/skills/review', json={'skill': 'Algorithms', 'level': 'Getting started'}).json()
    assert 'Algorithms' in updated['profile']['focus']
    assert next(s for s in updated['skills'] if s['name'] == 'Algorithms')['review'] == 'Getting started'
    assert not client.delete('/api/workspace').json()['onboarded']
    assert client.get('/api/workspace').json()['saved_questions'] == []


def test_provider_errors_do_not_invent_feedback(client, monkeypatch):
    monkeypatch.setenv('LLM_PROVIDER', 'openrouter')
    monkeypatch.setenv('LLM_API_KEY', '')
    get_settings.cache_clear()
    value = profile()
    value['consent_ai'] = True
    client.put('/api/profile', json=value)
    response = client.post('/api/answers', json={'question_id': 'tell-me', 'answer': 'This answer should remain available for another try.'})
    assert response.status_code == 503
    assert client.get('/api/workspace').json()['sessions'] == []


def test_ai_observations_adapt_plan_and_custom_questions_work(client, monkeypatch):
    from backend.app.models import Feedback
    async def feedback(*args):
        return Feedback(summary='Your answer explains a decision with a concrete outcome.', strengths=['A clear decision.'], improvements=['Give an edge case.'], follow_up='What edge case would change your approach?', evidence='I built a project', rubric={'Structure': 4, 'Specificity': 4, 'Reflection': 3})
    async def generate(*args):
        return {'title': 'How did you choose the data structure in your graduate project?', 'description': 'Explain a real trade-off from your project.', 'hint': 'Compare your choice with one alternative.', 'skill': 'Data structures', 'category': 'CV & projects', 'difficulty': 'Starter', 'minutes': 5, 'guide': 'Explain your reasoning.'}
    monkeypatch.setattr('backend.app.main.evaluate', feedback)
    monkeypatch.setattr('backend.app.main.generate_question', generate)
    old = client.get('/api/workspace').json()
    today_tasks = [t for t in old['tasks'] if t['date'] == date.today().isoformat()]
    result = client.post('/api/answers', json={'question_id': 'tell-me', 'answer': 'I built a project and learned from testing it.'}).json()
    skill = next(s for s in result['workspace']['skills'] if s['name'] == 'Communication')
    assert skill['samples'] == 1 and skill['score'] > 0
    assert all(t in result['workspace']['tasks'] for t in today_tasks)
    custom = client.post('/api/questions/generate').json()
    assert custom['question'] in custom['workspace']['custom_questions']
    custom_id = custom['question']['id']
    assert client.post('/api/saved/' + custom_id).status_code == 200
    assert client.post('/api/answers', json={'question_id': custom_id, 'answer': 'I built a project and selected a queue for ordering.'}).status_code == 200


def test_tailored_questions_need_ai_configuration(client):
    assert client.post('/api/questions/generate').status_code == 503


def test_mysql_repository_when_configured(monkeypatch):
    import os
    url = os.getenv('TEST_MYSQL_URL')
    if not url:
        pytest.skip('Set TEST_MYSQL_URL to run the MySQL integration check.')
    monkeypatch.setenv('DATABASE_URL', url)
    get_settings.cache_clear()
    db.initialise()
    key = str(uuid4())
    db.create_workspace(key, new_workspace())
    db.mutate_workspace(key, lambda data: data.update(onboarded=True))
    assert db.read_workspace(key)['onboarded'] is True
    with db.connection() as (conn, _):
        conn.cursor().execute('DELETE FROM workspaces WHERE id = %s', (key,))
    get_settings.cache_clear()
