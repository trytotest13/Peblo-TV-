"""Tests for auth + role-based access control."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.auth.security import hash_password, create_access_token


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint_open(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_shows_endpoint_requires_auth(client):
    r = await client.get("/shows")
    # FastAPI HTTPBearer returns 403 when no Authorization header is present
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_publish_requires_admin(client, db_session):
    """Editor role should NOT be able to publish — only admin."""
    from app.models.user import User
    from app.auth.security import hash_password

    # Create an editor user in the test DB
    editor = User(
        email="editor@peblo.local",
        hashed_password=hash_password("anything"),
        role="editor",
    )
    db_session.add(editor)
    await db_session.commit()

    token = create_access_token(editor.email, "editor")
    r = await client.post(
        "/catalog/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    # Editor should be forbidden from publishing
    assert r.status_code == 403, f"Editor should be 403, got {r.status_code}: {r.text}"


def test_jwt_round_trip():
    """Sanity: tokens we issue can be decoded back."""
    from app.auth.security import decode_token
    token = create_access_token("a@b.com", "admin")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "a@b.com"
    assert payload["role"] == "admin"


def test_invalid_token_rejected():
    from app.auth.security import decode_token
    assert decode_token("not-a-real-token") is None
    assert decode_token("") is None
