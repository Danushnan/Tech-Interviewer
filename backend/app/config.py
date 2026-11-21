from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'sqlite:///./prepwise.db'
    llm_provider: Literal['demo', 'openai', 'openrouter'] = 'demo'
    llm_api_key: str = ''
    llm_model: str = ''
    allowed_origins: str = 'http://127.0.0.1:5173,http://localhost:5173'
    whisper_model: str = 'base'
    enable_whisper: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
