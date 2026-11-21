from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Profile(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(min_length=2, max_length=120)
    company: str = Field(default='', max_length=120)
    interview_date: date
    experience: str = Field(default='Student / recent graduate', max_length=100)
    confidence: int = Field(default=3, ge=1, le=5)
    minutes_per_day: int = Field(default=30, ge=15, le=120)
    focus: list[str] = Field(default_factory=lambda: ['Communication', 'Problem solving'], max_length=5)
    cv: str = Field(default='', max_length=16000)
    job_description: str = Field(default='', max_length=16000)
    consent_ai: bool = False

    @field_validator('interview_date')
    @classmethod
    def date_in_range(cls, value):
        days = (value - date.today()).days
        if days < 0 or days > 180:
            raise ValueError('Choose an interview date between today and 180 days from today.')
        return value

    @field_validator('focus')
    @classmethod
    def valid_focus(cls, values):
        allowed = {'Communication', 'Problem solving', 'Behavioural', 'Data structures', 'Algorithms'}
        if not values or any(v not in allowed for v in values):
            raise ValueError('Select at least one supported skill.')
        return list(dict.fromkeys(values))


class AnswerRequest(BaseModel):
    question_id: str
    answer: str = Field(min_length=10, max_length=12000)
    duration_seconds: int = Field(default=0, ge=0, le=7200)
    task_id: str | None = None
    assessment: bool = False
    parent_session_id: str | None = None


class TaskUpdate(BaseModel):
    completed: bool


class SkillReview(BaseModel):
    skill: str
    level: Literal['Getting started', 'Building confidence', 'Feeling confident']


class Feedback(BaseModel):
    summary: str = Field(min_length=10, max_length=600)
    strengths: list[str] = Field(min_length=1, max_length=3)
    improvements: list[str] = Field(min_length=1, max_length=3)
    follow_up: str = Field(min_length=5, max_length=500)
    evidence: str = Field(default='', max_length=1000)
    rubric: dict[str, int]
    source: str = 'ai'

    @field_validator('rubric')
    @classmethod
    def rubric_in_range(cls, value):
        if set(value) != {'Structure', 'Specificity', 'Reflection'} or any(type(v) is not int or v < 1 or v > 5 for v in value.values()):
            raise ValueError('Rubric requires Structure, Specificity and Reflection scores of 1–5.')
        return value


class GeneratedQuestion(BaseModel):
    title: str = Field(min_length=10, max_length=300)
    description: str = Field(min_length=10, max_length=400)
    hint: str = Field(min_length=10, max_length=400)
    skill: Literal['Communication', 'Problem solving', 'Behavioural', 'Data structures', 'Algorithms']
    category: Literal['Behavioural', 'Technical', 'CV & projects']
    difficulty: Literal['Starter', 'Intermediate', 'Stretch']
    minutes: int = Field(ge=3, le=15)
