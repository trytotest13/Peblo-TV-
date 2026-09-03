"""Application configuration.

Loads from environment variables / .env file. Single source of truth for all
runtime knobs (DB URL, JWT secret, storage backend choice, etc.).
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # Auth
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

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
    bootstrap_admin_password: str = "admin123"


@lru_cache
def get_settings() -> Settings:
    return Settings()
