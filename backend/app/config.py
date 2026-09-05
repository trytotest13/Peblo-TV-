"""Application configuration.

Loads from environment variables / .env file. Single source of truth for all
runtime knobs (DB URL, JWT secret, storage backend choice, etc.).
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# ---------------------------------------------------------------------------
# Dev-only defaults — safe-ish local values used when the env is missing.
# Production environments MUST set these explicitly; pydantic rejects the
# shipped defaults below via the `_DEVELOPMENT_DEFAULT_PREFIX` check in
# `get_settings` so a real prod deploy fails fast instead of booting with a
# known-weak secret.
# ---------------------------------------------------------------------------
_DEV_DEFAULTS = {
    "jwt_secret": "dev-secret-change-me",
    "bootstrap_admin_password": "admin123",
}
_DEV_DEFAULT_PREFIX = "dev-"  # any shipped value starts with this


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "Peblo TV Mini API"
    log_level: str = "INFO"

    # Database
    database_url: str = (
        "postgresql+asyncpg://peblo:peblo@db:5432/peblo_tv"
    )
    sync_database_url: str = (
        "postgresql+psycopg2://peblo:peblo@db:5432/peblo_tv"
    )

    # Auth — dev defaults in code, MUST be overridden in production
    jwt_secret: str = _DEV_DEFAULTS["jwt_secret"]
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # CORS — comma-separated list of allowed origins. No wildcards.
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Storage
    storage_backend: Literal["local", "r2"] = "local"
    local_storage_path: str = "./storage"
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_base_url: str = ""

    # Catalog
    catalog_filename: str = "catalog.json"

    # Bootstrap
    bootstrap_admin_email: str = "admin@peblo.local"
    bootstrap_admin_password: str = _DEV_DEFAULTS["bootstrap_admin_password"]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # Fail fast in production: reject the shipped dev defaults so an operator
    # who forgot to override them gets a clear error rather than a running
    # service that accepts tokens signed with a known-public secret.
    if settings.app_env == "production":
        if settings.jwt_secret.startswith(_DEV_DEFAULT_PREFIX):
            raise RuntimeError(
                "JWT_SECRET must be set to a strong, non-default value in production. "
                f"Got value starting with '{_DEV_DEFAULT_PREFIX}'. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        if settings.bootstrap_admin_password == _DEV_DEFAULTS["bootstrap_admin_password"]:
            raise RuntimeError(
                "BOOTSTRAP_ADMIN_PASSWORD must be changed from the default in production."
            )
    return settings
