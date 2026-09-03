"""Tests for the audit log (stretch goal)."""
import pytest
from uuid import UUID
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.audit_log import AuditLog
from app.models.user import User
from app.auth.security import create_access_token, hash_password


async def _make_admin(db_session) -> str:
    """Create an admin user and return their JWT."""
    admin = User(
        email="audit-admin@peblo.local",
        hashed_password=hash_password("testpass"),
        role="admin",
    )
    db_session.add(admin)
    await db_session.commit()
    return create_access_token(admin.email, "admin")


@pytest.mark.asyncio
async def test_create_show_writes_audit_log(db_session):
    """Creating a show should write one 'created' audit log entry."""
    from app.schemas.show import ShowCreate
    from uuid import uuid4

    token = await _make_admin(db_session)
    body = {
        "slug": "audit-test-show",
        "title": "Audit Test",
        "section": "series",
        "categories": ["adventure"],
        "status": "draft",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            "/shows",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
    assert r.status_code == 201
    show_id = r.json()["id"]

    from sqlalchemy import select
    # SQLite returns UUID as string, so cast to string for comparison
    stmt = select(AuditLog).where(AuditLog.entity_id == str(show_id))
    result = await db_session.execute(stmt)
    entries = result.scalars().all()
    assert len(entries) == 1
    assert entries[0].action == "created"
    assert entries[0].actor_email == "audit-admin@peblo.local"
    assert entries[0].entity_type == "show"


@pytest.mark.asyncio
async def test_update_show_writes_audit_with_before_after(db_session):
    """Updating should record the before/after snapshots."""
    from app.schemas.show import ShowCreate, ShowUpdate
    from sqlalchemy import select

    token = await _make_admin(db_session)
    body = {
        "slug": "audit-update-show",
        "title": "Original Title",
        "section": "series",
        "categories": [],
        "status": "draft",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/shows", headers={"Authorization": f"Bearer {token}"}, json=body)
    show_id = r.json()["id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.patch(
            f"/shows/{show_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Updated Title"},
        )
    assert r.status_code == 200

    stmt = select(AuditLog).where(AuditLog.entity_id == show_id)
    result = await db_session.execute(stmt)
    entries = result.scalars().all()
    assert len(entries) == 2, f"Expected 2 entries, got {len(entries)}: {[e.action for e in entries]}"
    actions = {e.action for e in entries}
    assert actions == {"created", "updated"}, f"Expected created+updated, got {actions}"
    update_entry = next(e for e in entries if e.action == "updated")
    assert "Original Title" in update_entry.before
    assert "Updated Title" in update_entry.after


@pytest.mark.asyncio
async def test_delete_show_writes_audit_log(db_session):
    """Deleting should write a 'deleted' entry with the before snapshot."""
    from sqlalchemy import select

    token = await _make_admin(db_session)
    body = {
        "slug": "audit-delete-show",
        "title": "To Be Deleted",
        "section": "series",
        "categories": [],
        "status": "draft",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/shows", headers={"Authorization": f"Bearer {token}"}, json=body)
    show_id = r.json()["id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.delete(
            f"/shows/{show_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 204

    stmt = select(AuditLog).where(
        (AuditLog.entity_id == show_id) & (AuditLog.action == "deleted")
    )
    result = await db_session.execute(stmt)
    entries = result.scalars().all()
    assert len(entries) == 1
    assert entries[0].before is not None
    assert "To Be Deleted" in entries[0].before


@pytest.mark.asyncio
async def test_audit_log_endpoint_returns_entries(db_session):
    """The /admin/audit-log endpoint should list entries."""
    from app.schemas.show import ShowCreate
    from sqlalchemy import select

    token = await _make_admin(db_session)
    body = {
        "slug": "audit-list-show",
        "title": "Listed",
        "section": "series",
        "categories": [],
        "status": "draft",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/shows", headers={"Authorization": f"Bearer {token}"}, json=body)
    assert r.status_code == 201

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get(
            "/admin/audit-log",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    entries = r.json()
    assert len(entries) >= 1
    assert entries[0]["action"] == "created"
    assert entries[0]["actor_email"] == "audit-admin@peblo.local"


@pytest.mark.asyncio
async def test_audit_log_filters_by_entity_type(db_session):
    """The endpoint should accept an entity_type filter."""
    from app.schemas.show import ShowCreate, ShowUpdate

    token = await _make_admin(db_session)
    body = {
        "slug": "audit-filter-show",
        "title": "Filtered",
        "section": "series",
        "categories": [],
        "status": "draft",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post("/shows", headers={"Authorization": f"Bearer {token}"}, json=body)
    show_id = r.json()["id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get(
            "/admin/audit-log?entity_type=show",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    entries = r.json()
    assert all(e["entity_type"] == "show" for e in entries)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get(
            "/admin/audit-log?entity_type=episode",
            headers={"Authorization": f"Bearer {token}"},
        )
    entries = r.json()
    assert all(e["entity_type"] == "episode" for e in entries)
