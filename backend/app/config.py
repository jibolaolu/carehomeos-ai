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
    public_api_prefix: str = "/api/v1/public"
    public_api_base_url: str = "http://localhost:8000"
    public_dashboard_url: str = "http://localhost:3000"
    allowed_origins: list[str] = Field(default_factory=lambda: [
        "http://localhost:3000",
        "http://localhost:3005",
        "http://localhost:19015",
        "http://localhost:19016",
    ])
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

    # Public API settings
    public_api_rate_limit: int = 1000  # requests per hour
    webhook_max_retries: int = 5
    webhook_retry_delay_seconds: int = 60

    # Pharmacy integration settings
    titan_api_url: str = ""
    titan_api_key: str = ""
    rxweb_api_url: str = ""
    rxweb_api_key: str = ""

    # NHS integration settings
    gp_connect_enabled: bool = False
    gp_connect_endpoint: str = ""
    gp_connect_client_id: str = ""
    gp_connect_client_secret: str = ""
    spine_endpoint: str = ""
    pds_enabled: bool = False

    # Compliance settings
    iso27001_certified: bool = False
    cyber_essentials_certified: bool = False
    dspt_compliant: bool = False
    dcb0129_compliant: bool = False

    # Billing / Pricing settings
    free_tier_max_residents: int = 5
    free_tier_max_care_notes_per_day: int = 20
    trial_days: int = 90
    group_discount_rate: float = 0.20
    ri_discount_rate: float = 0.50
    ri_discount_months: int = 6

    model_config = SettingsConfigDict(
        env_file=(ENV_FILE, ENV_EXAMPLE_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
