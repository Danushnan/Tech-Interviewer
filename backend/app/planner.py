from datetime import date, timedelta
from uuid import uuid4

from .catalog import QUESTIONS, SKILLS


def build_plan(profile: dict, skills: list[dict], today: date | None = None, custom_questions: list[dict] | None = None) -> list[dict]:
    """Schedule within the deadline and daily budget. No LLM calendar arithmetic."""
    today = today or date.today()
    deadline = date.fromisoformat(profile['interview_date'])
    days = max(1, (deadline - today).days)
    focus = profile.get('focus', [])
    levels = {s['name']: s['score'] for s in skills}
    difficulty = {'Starter': 0, 'Intermediate': 1, 'Stretch': 2}
    ordered = sorted(QUESTIONS + (custom_questions or []), key=lambda q: (levels.get(q['skill'], 0) - (10 if q['skill'] in focus else 0), difficulty[q['difficulty']], q['id']))
    tasks = []
    for day in range(days):
        remaining = profile['minutes_per_day']
        available = [q for q in ordered if q['difficulty'] != 'Stretch' or profile.get('confidence', 3) >= 4 or day >= max(2, int(days * .7))]
        # Revisit weaknesses, interleave question types and leave room for review.
        for offset in range(min(3, len(ordered))):
            question = available[(day * 2 + offset) % len(available)]
            minutes = question['minutes'] + 3
            if minutes <= remaining:
                tasks.append({
                    'id': str(uuid4()), 'title': question['title'], 'question_id': question['id'],
                    'category': question['category'], 'skill': question['skill'], 'minutes': minutes,
                    'date': (today + timedelta(days=day)).isoformat(), 'completed': False,
                    'reason': f"Practise {question['skill'].lower()} with time to reflect on feedback.",
                })
                remaining -= minutes
    return tasks


def new_workspace() -> dict:
    today = date.today()
    profile = {
        'name': 'Alex', 'role': 'Graduate Software Engineer', 'company': 'Your next team',
        'interview_date': (today + timedelta(days=14)).isoformat(),
        'experience': 'Student / recent graduate', 'confidence': 3, 'minutes_per_day': 30,
        'focus': ['Communication', 'Problem solving'], 'cv': '', 'job_description': '', 'consent_ai': False,
    }
    skills = [{'name': name, 'score': 0, 'samples': 0, 'review': None} for name in SKILLS]
    return {
        'profile': profile, 'skills': skills, 'tasks': build_plan(profile, skills),
        'sessions': [], 'saved_questions': [], 'custom_questions': [], 'onboarded': False,
    }


def adapt_future_tasks(data: dict):
    """Keep today's and completed work; reschedule only untouched future days."""
    today = date.today().isoformat()
    preserved = [t for t in data['tasks'] if t['date'] <= today or t['completed']]
    preserved_days = {t['date'] for t in preserved}
    future = [t for t in build_plan(data['profile'], data['skills'], custom_questions=data.get('custom_questions')) if t['date'] > today and t['date'] not in preserved_days]
    data['tasks'] = preserved + future
