"""Production config guard — refuse to boot prod against a local database."""
import pytest

from app.config import get_settings


@pytest.fixture
def _fresh_settings(monkeypatch):
    get_settings.cache_clear()
    yield monkeypatch
    get_settings.cache_clear()


def _prod_env(monkeypatch, db_url):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", db_url)
    monkeypatch.setenv("JWT_SECRET", "x" * 64)
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "not-the-default-123")


def test_production_refuses_localhost_database(_fresh_settings):
    _prod_env(
        _fresh_settings,
        "postgresql+asyncpg://peblo:peblo@localhost:5432/peblo_tv",
    )
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_settings()


def test_production_accepts_remote_database(_fresh_settings):
    _prod_env(_fresh_settings, "postgres://peblo:pw@dpg-abc-a/peblo_tv")
    assert "localhost" not in get_settings().database_url
