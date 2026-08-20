from typing import List
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CRM Опора - Образовательный Центр"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Security
    JWT_SECRET: str = "opora_crm_super_secure_jwt_secret_key_2026_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/opora_crm"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/opora_crm"

    # Business Rules Defaults
    MAX_CHILDREN_PER_PARENT: int = 5
    MAX_SUBJECTS_PER_CHILD: int = 5
    LOW_BALANCE_THRESHOLD: int = 2
    DEFAULT_LESSON_DURATION_MINUTES: int = 60
    TIMEZONE: str = "Europe/Moscow"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
