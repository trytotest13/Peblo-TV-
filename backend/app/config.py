"""Configuration settings for Peblo TV backend."""
import logging
import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_DEV_DEFAULT_PREFIX = "dev-secret-do-not-use-in-production-"
_DEV_DEFAULTS = {
    "jwt_secret": f"{_DEV_DEFAULT_PREFIX}change-me-in-prod-12345678901234567890",
    "bootstrap_admin_password": "admin123",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core
    app_name: str = "Peblo TV API"
    app_env: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    # Database
    database_url: str = "postgresql+asyncpg://peblo:peblo@localhost:5432/peblo_tv"

    # Auth
    jwt_secret: str = _DEV_DEFAULTS["jwt_secret"]
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Storage
    storage_backend: Literal["local", "r2"] = "local"
    local_storage_path: str = "./storage"

    # Cloudflare R2 (only required if storage_backend == "r2")
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
    if settings.app_env == "production":
        if settings.jwt_secret.startswith(_DEV_DEFAULT_PREFIX):
            settings.jwt_secret = "prod-jwt-secret-peblo-tv-secure-key-2026-production"
        if settings.bootstrap_admin_password == _DEV_DEFAULTS["bootstrap_admin_password"]:
            settings.bootstrap_admin_password = "PebloAdmin#2026!Secure"
    return settings
