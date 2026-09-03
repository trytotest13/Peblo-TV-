"""Tests for versioned catalogue + rollback + diff (stretch goals)."""
import os

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app
from app.models.episode import Episode
from app.models.publish_run import PublishRun
from app.models.season import Season
from app.models.show import Show


async def _publish_once(db_session):
    """Helper: do one publish via the endpoint with an admin token."""
    from app.auth.security import create_access_token

    admin = Show(
        slug="rollback-test",
        title="Rollback Test",
        section="series",
        categories=[],
        status="published",
    )
    db_session.add(admin)
    await db_session.flush()

    s1 = Season(show_id=admin.id, season_number=1, title="S1")
    db_session.add(s1)
    await db_session.flush()

    ep = Episode(
        season_id=s1.id,
        slug="rb-s01e01",
        title="Episode 1",
        episode_number=1,
        language="en",
        content_group="rb-s01e01",
        duration_seconds=300,
        status="published",
    )
    db_session.add(ep)
    await db_session.commit()

    # Create admin user
    from app.auth.security import hash_password
    from app.models.user import User

    admin_user = User(
        email="rollback-admin@peblo.local",
        hashed_password=hash_password("testpass"),
        role="admin",
    )
    db_session.add(admin_user)
    await db_session.commit()

    token = create_access_token(admin_user.email, "admin")
    return token, admin.id, ep.id


@pytest.mark.asyncio
async def test_publish_saves_versioned_file(db_session):
    """A successful publish should write a versioned copy alongside the live file."""
    token, _show_id, _ep_id = await _publish_once(db_session)
    settings = get_settings()
    live_path = os.path.join(settings.local_storage_path, settings.catalog_filename)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            "/catalog/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    run_id = r.json()["id"]

    versioned_path = os.path.join(
        settings.local_storage_path, f"{settings.catalog_filename}.v{run_id}.json"
    )
    assert os.path.exists(versioned_path), "Versioned file should exist after publish"
    assert os.path.exists(live_path), "Live file should exist after publish"

    # Clean up
    for path in [live_path, versioned_path]:
        if os.path.exists(path):
            os.remove(path)


@pytest.mark.asyncio
async def test_rollback_replaces_live_with_versioned(db_session):
    """Rolling back should copy the versioned file back to live atomically."""
    token, _show_id, _ep_id = await _publish_once(db_session)
    settings = get_settings()
    live_path = os.path.join(settings.local_storage_path, settings.catalog_filename)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Publish
        r = await ac.post(
            "/catalog/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    run_id = r.json()["id"]
    versioned_path = os.path.join(
        settings.local_storage_path, f"{settings.catalog_filename}.v{run_id}.json"
    )

    # Manually modify the versioned file to be different from live
    with open(versioned_path) as f:
        versioned_content = f.read()
    with open(versioned_path, "w") as f:
        f.write(versioned_content.replace("Rollback Test", "Rolled Back Title"))

    # Rollback
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            f"/catalog/rollback/{run_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    assert r.json()["outcome"] == "rolled_back"

    # Live file should now have the rolled-back content
    with open(live_path) as f:
        live_content = f.read()
    assert "Rolled Back Title" in live_content
    assert "Rollback Test" not in live_content

    # Clean up
    for path in [live_path, versioned_path]:
        if os.path.exists(path):
            os.remove(path)


@pytest.mark.asyncio
async def test_rollback_nonexistent_run_returns_404(db_session):
    """Rolling back to a non-existent run should 404."""
    token, _, _ = await _publish_once(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            "/catalog/rollback/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_rollback_failed_run_returns_400(db_session):
    """Rolling back to a failed (but real) run should 400."""
    from app.auth.security import create_access_token, hash_password
    from app.models.user import User

    # Create a real failed run
    failed_run = PublishRun(initiated_by="test", outcome="failed", error_message="oops")
    db_session.add(failed_run)
    admin = User(
        email="test-admin@peblo.local",
        hashed_password=hash_password("testpass"),
        role="admin",
    )
    db_session.add(admin)
    await db_session.commit()

    token = create_access_token(admin.email, "admin")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            f"/catalog/rollback/{failed_run.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_diff_shows_added_and_removed_shows(db_session):
    """The diff endpoint should correctly identify added shows between publishes."""
    token, _show_id, _ep_id = await _publish_once(db_session)
    settings = get_settings()
    live_path = os.path.join(settings.local_storage_path, settings.catalog_filename)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            "/catalog/publish",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    run_id = r.json()["id"]
    versioned_path = os.path.join(
        settings.local_storage_path, f"{settings.catalog_filename}.v{run_id}.json"
    )

    # Add a new show to the DB
    new_show = Show(
        slug="diff-show",
        title="Diff Show",
        section="series",
        categories=[],
        status="published",
    )
    db_session.add(new_show)
    await db_session.flush()
    s1 = Season(show_id=new_show.id, season_number=1, title="S1")
    db_session.add(s1)
    await db_session.flush()
    ep = Episode(
        season_id=s1.id,
        slug="diff-s01e01",
        title="E1",
        episode_number=1,
        language="en",
        content_group="diff-s01e01",
        duration_seconds=300,
        status="published",
    )
    db_session.add(ep)
    await db_session.commit()

    # Publish again (live is now different from versioned)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.post(
            "/catalog/publish",
            headers={"Authorization": f"Bearer {token}"},
        )

    # Now diff against the versioned file (run_id)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get(
            f"/catalog/diff/{run_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    data = r.json()
    assert "diff-show" in data["added_shows"], "New show should be 'added' in diff"
    assert data["new_shows_count"] == 2
    assert data["old_shows_count"] == 1

    # Clean up
    for path in [live_path, versioned_path]:
        if os.path.exists(path):
            os.remove(path)
