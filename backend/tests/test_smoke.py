"""Basic smoke tests for the API.

These run against an in-process FastAPI app with the async test client.
We use SQLite for speed — Postgres-specific features (UUID, ARRAY) are
mocked at the model layer.
"""
import os
import pytest
from httpx import AsyncClient, ASGITransport


# Force settings before importing app
os.environ.setdefault("APP_ENV", "test")

from app.main import app  # noqa: E402


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_requires_credentials():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/shows")
    assert r.status_code in (401, 403)  # unauthenticated
