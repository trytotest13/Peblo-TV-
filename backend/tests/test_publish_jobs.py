"""Tests for the publish queue / schedule / history router."""
import os
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.security import create_access_token, hash_password
from app.config import get_settings
from app.main import app
from app.models.artwork import ARTWORK_TYPES
from app.models.artwork import Artwork
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.models.user import User


async def _admin_token(db_session, email="publish-admin@peblo.local"):
    user = User(email=email, hashed_password=hash_password("testpass"), role="admin")
    db_session.add(user)
    await db_session.commit()
    return create_access_token(user.email, "admin")


async def _draft_show(db_session, slug="pub-queue-show", with_artwork=False):
    show = Show(
        slug=slug, title="Queue Show", section="series", categories=[], status="draft"
    )
    db_session.add(show)
    await db_session.flush()
    if with_artwork:
        for art_type in ARTWORK_TYPES:
            db_session.add(
                Artwork(show_id=show.id, artwork_type=art_type, storage_key=f"k/{art_type}.jpg")
            )
    await db_session.commit()
    return show


def _catalog_paths():
    settings = get_settings()
    live = os.path.join(settings.local_storage_path, settings.catalog_filename)
    return settings, live


def _cleanup_catalog():
    settings, live = _catalog_paths()
    for name in os.listdir(settings.local_storage_path):
        if name.startswith(settings.catalog_filename):
            os.remove(os.path.join(settings.local_storage_path, name))


@pytest.mark.asyncio
async def test_queue_seeds_draft_show_and_publish_succeeds(db_session):
    """A draft show appears in the queue; Publish now flips it live."""
    token = await _admin_token(db_session)
    show = await _draft_show(db_session, with_artwork=True)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/publish/jobs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    jobs = r.json()
    job = next(j for j in jobs if j["item_type"] == "show" and j["item_id"] == str(show.id))
    assert job["validation_status"] == "validated"
    assert job["issues"] == []

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            f"/publish/jobs/{job['id']}/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    assert r.json()["validation_status"] == "published"
    assert r.json()["result"] == "live"

    await db_session.refresh(show)
    assert show.status == "published"
    _cleanup_catalog()


@pytest.mark.asyncio
async def test_publish_blocked_when_validation_has_issues(db_session):
    """Missing artwork -> issues listed, publish returns 409, nothing flips."""
    token = await _admin_token(db_session)
    show = await _draft_show(db_session, slug="issue-show", with_artwork=False)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/publish/jobs", headers={"Authorization": f"Bearer {token}"})
    job = next(j for j in r.json() if j["item_id"] == str(show.id))
    assert job["validation_status"] == "issues"
    assert any("artwork" in m.lower() for m in job["issues"])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            f"/publish/jobs/{job['id']}/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 409

    await db_session.refresh(show)
    assert show.status == "draft"


@pytest.mark.asyncio
async def test_cancel_job(db_session):
    """Cancelling removes the job from the pending queue."""
    token = await _admin_token(db_session)
    await _draft_show(db_session, slug="cancel-show", with_artwork=True)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        jobs = (
            await ac.get("/publish/jobs", headers={"Authorization": f"Bearer {token}"})
        ).json()
        job = next(j for j in jobs if j["title"] == "Queue Show")
        r = await ac.post(
            f"/publish/jobs/{job['id']}/cancel",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    assert r.json()["validation_status"] == "cancelled"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        jobs = (
            await ac.get("/publish/jobs", headers={"Authorization": f"Bearer {token}"})
        ).json()
    # Cancelled show is re-seeded as a fresh pending job (still draft) —
    # but the cancelled row itself must be gone from pending
    assert all(j["id"] != job["id"] for j in jobs)


@pytest.mark.asyncio
async def test_past_due_schedule_publishes_on_read(db_session):
    """A past-due scheduled show publishes when the schedule is read."""
    token = await _admin_token(db_session)
    show = await _draft_show(db_session, slug="sched-show", with_artwork=True)

    past = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            "/publish/schedule",
            json={
                "title": "Queue Show",
                "item_type": "show",
                "item_id": str(show.id),
                "scheduled_for": past,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 201

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/publish/schedule", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    row = next(i for i in r.json() if i["title"] == "Queue Show")
    assert row["status"] == "published"

    await db_session.refresh(show)
    assert show.status == "published"
    _cleanup_catalog()


@pytest.mark.asyncio
async def test_history_contains_published_job(db_session):
    """History unions terminal jobs with catalogue runs, newest first."""
    token = await _admin_token(db_session)
    await _draft_show(db_session, slug="hist-show", with_artwork=True)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        jobs = (
            await ac.get("/publish/jobs", headers={"Authorization": f"Bearer {token}"})
        ).json()
        job = next(j for j in jobs if j["title"] == "Queue Show")
        await ac.post(
            f"/publish/jobs/{job['id']}/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
        r = await ac.get(
            "/publish/history?limit=20", headers={"Authorization": f"Bearer {token}"}
        )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    titles = [i["title"] for i in body["items"]]
    assert "Queue Show" in titles
    row = next(i for i in body["items"] if i["title"] == "Queue Show")
    assert row["result"] == "live"
    assert row["published_by"] == "auto"
    _cleanup_catalog()
