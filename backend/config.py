from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
from functools import lru_cache


class Settings(BaseSettings):

    # Anthropic
    ANTHROPIC_API_KEY: str

    # GitHub
    GITHUB_TOKEN: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # LLM Provider
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o"

    # Rate limits and concurrency
    GITHUB_API_REQUESTS_PER_HOUR: int = 5000
    MAX_CONCURRENT_RESUMES: int = 50
    PLAYWRIGHT_POOL_SIZE: int = 10
    MAX_CONCURRENT_URLS: int = 20

    # LLM rate limiting
    LLM_MAX_RETRIES: int = 4
    LLM_RETRY_BASE_DELAY: float = 2.0  # seconds, doubles each retry
    LLM_MAX_CONCURRENT: int = 3  # max parallel LLM calls to avoid TPM spikes

    # Timeouts (seconds)
    PHASE1_TIMEOUT_SECONDS: int = 10
    PHASE2_TIMEOUT_SECONDS: int = 120
    PLAYWRIGHT_PAGE_TIMEOUT: int = 15000  # milliseconds
    PLAYWRIGHT_NAVIGATION_TIMEOUT: int = 30000  # milliseconds
    GITHUB_REQUEST_TIMEOUT: int = 10
    CLAUDE_TIMEOUT: int = 60

    # File limits
    MAX_FILE_SIZE_MB: int = 10
    MAX_RESUMES_PER_JOB: int = 1000

    # Processing
    TOP_REPOS_TO_ANALYZE: int = 3
    MAX_COMMITS_TO_FETCH: int = 50
    MAX_FILES_TO_READ_PER_REPO: int = 5
    MAX_FILE_SIZE_TO_READ_BYTES: int = 50000  # 50KB per source file

    # Storage
    TEMP_DIR: str = "temp"

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        if v not in ("development", "production", "test"):
            raise ValueError("APP_ENV must be development, production, or test")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
