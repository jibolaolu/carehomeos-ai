from pathlib import Path
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
ENV_EXAMPLE_FILE = Path(__file__).resolve().parents[2] / ".env.example"


class Settings(BaseSettings):
    app_name: str = "CareHomeOS API"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_v1_prefix: str = "/api/v1"
    public_api_base_url: str = "http://localhost:8000"
    public_dashboard_url: str = "http://localhost:3000"
    allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:3005"])
    enable_docs: bool = True
    database_url: str = "postgresql+asyncpg://carehomeos:carehomeos@localhost:5432/carehomeos"
    redis_url: str = "redis://localhost:6379/0"
    default_nation: str = "england"
    enable_ai_features: bool = False
    aws_region: str = "eu-west-2"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_clinical: str = "clinical-documents"
    s3_bucket_audio: str = "audio-temp"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"
    anthropic_deep_model: str = "claude-opus-4-5"
    openai_model: str = "gpt-4o"
    openai_fast_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-1.5-flash"
    deepl_api_key: str = ""
    auth0_domain: str = ""
    auth0_audience: str = ""
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    stripe_secret_key: str = ""
    sendgrid_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=(ENV_FILE, ENV_EXAMPLE_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
