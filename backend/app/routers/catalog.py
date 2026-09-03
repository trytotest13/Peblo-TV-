"""Catalog endpoints — publish, search, read, rollback."""
import json
import os
import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.auth.deps import require_admin
from app.config import get_settings
from app.db import get_db
from app.models.publish_run import PublishRun
from app.models.user import User
from app.schemas.catalog import PublishRunRead
from app.services.catalog import build_catalog
from app.services.storage import get_storage_instance

settings = get_settings()
router = APIRouter(prefix="/catalog", tags=["catalog"])


# ---------------------------------------------------------------------------
# Public endpoints (viewer reads the catalogue)
# ---------------------------------------------------------------------------

@router.get("")
async def get_catalog(
    db: AsyncSession = Depends(get_db),
):
    """
    Return the current published catalogue.

    The viewer UI reads ONLY this endpoint — never admin endpoints.
    """
    storage = get_storage_instance()
    key = settings.catalog_filename
    catalog_path = os.path.join(settings.local_storage_path, key)

    # Try to read the published file from storage
    if os.path.exists(catalog_path):
        with open(catalog_path, "r") as f:
            return json.load(f)

    # Fallback: build from DB on the fly (useful before first publish)
    doc = await build_catalog(db)
    return doc.model_dump(mode="json")


@router.get("/search")
async def search_catalog(
    q: str | None = None,
    section: str | None = None,
    category: str | None = None,
    language: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Search the catalogue by title/synopsis/category; all filters compose.
    """
    catalog = await build_catalog(db)
    results = catalog.shows

    if q:
        q_lower = q.lower()
        results = [
            s for s in results
            if q_lower in s.title.lower()
            or (s.synopsis and q_lower in s.synopsis.lower())
            or any(q_lower in c.lower() for c in s.categories)
            or any(
                q_lower in ep.title.lower()
                for season in s.seasons
                for ep in season.episodes
            )
        ]

    if section:
        results = [s for s in results if s.section == section]

    if category:
        results = [s for s in results if category in s.categories]

    if language:
        results = [
            s for s in results
            if any(
                language in {lv.language for ep in season.episodes for lv in ep.languages}
                for season in s.seasons
            )
        ]

    return {"results": results, "total": len(results)}


# ---------------------------------------------------------------------------
# Admin: publish
# ---------------------------------------------------------------------------

@router.post("/publish", response_model=PublishRunRead)
async def publish_catalog(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Build the catalogue JSON and write it to storage atomically.

    Strategy:
    1. Build the new catalogue entirely in memory.
    2. Write it to a temporary file (catalog.json.tmp).
    3. Atomically rename it over the live file.
    4. Record the PublishRun.

    If the process dies mid-write the reader still sees the old file — never
    a half-written catalogue.
    """
    run = PublishRun(initiated_by=user.email, outcome="failed")
    db.add(run)
    await db.flush()  # get the run ID

    try:
        catalog = await build_catalog(db)
        catalog_dict = catalog.model_dump(mode="json")
        catalog_json = json.dumps(catalog_dict, indent=2)

        storage = get_storage_instance()
        live_key = settings.catalog_filename
        tmp_key = f"{live_key}.tmp"
        versioned_key = f"{live_key}.v{run.id}.json"

        # Write to temp location first
        live_path = os.path.join(settings.local_storage_path, live_key)
        tmp_path = os.path.join(settings.local_storage_path, tmp_key)
        versioned_path = os.path.join(settings.local_storage_path, versioned_key)
        os.makedirs(os.path.dirname(live_path), exist_ok=True)

        with open(tmp_path, "w") as f:
            f.write(catalog_json)

        # Atomic rename to live
        os.replace(tmp_path, live_path)

        # Save a versioned copy for rollback
        with open(versioned_path, "w") as f:
            f.write(catalog_json)

        # Update run
        run.outcome = "success"
        run.shows_published = len(catalog.shows)
        run.episodes_published = sum(
            len(s.seasons) > 0 and sum(len(se.episodes) for se in s.seasons)
            for s in catalog.shows
        )
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(run)
        return PublishRunRead.model_validate(run)

    except Exception as exc:
        run.outcome = "failed"
        run.error_message = str(exc)
        run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(run)
        raise HTTPException(
            status_code=500,
            detail=f"Publish failed: {exc}",
        )


@router.get("/publish-runs", response_model=list[PublishRunRead])
async def list_publish_runs(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Return publish run history."""
    result = await db.execute(
        select(PublishRun)
        .order_by(PublishRun.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return [PublishRunRead.model_validate(r) for r in result.scalars().all()]


@router.post("/rollback/{run_id}", response_model=PublishRunRead)
async def rollback_to_publish(
    run_id: UUID = Path(..., description="ID of a successful publish run to roll back to"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Roll back the live catalogue to a previous successful publish.

    The versioned catalogue from the target run is copied over the live file
    atomically (write-temp + os.replace). A new PublishRun row is recorded
    with outcome='rolled_back' so the history shows what happened.
    """
    target = await db.get(PublishRun, run_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Publish run {run_id} not found")
    if target.outcome != "success":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot roll back to a {target.outcome} run. Only successful runs are kept.",
        )

    # Record a new run for this rollback
    rollback_run = PublishRun(initiated_by=user.email, outcome="rolled_back")
    db.add(rollback_run)
    await db.flush()

    live_key = settings.catalog_filename
    live_path = os.path.join(settings.local_storage_path, live_key)
    versioned_path = os.path.join(
        settings.local_storage_path, f"{live_key}.v{run_id}.json"
    )
    tmp_path = os.path.join(settings.local_storage_path, f"{live_key}.tmp")

    if not os.path.exists(versioned_path):
        rollback_run.outcome = "failed"
        rollback_run.error_message = (
            f"Versioned file for run {run_id} not found on disk. "
            "Publishes before versioning was added cannot be rolled back."
        )
        rollback_run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(
            status_code=410,
            detail=rollback_run.error_message,
        )

    try:
        shutil.copy(versioned_path, tmp_path)
        os.replace(tmp_path, live_path)
        rollback_run.shows_published = target.shows_published
        rollback_run.episodes_published = target.episodes_published
        rollback_run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(rollback_run)
        return PublishRunRead.model_validate(rollback_run)
    except Exception as exc:
        rollback_run.outcome = "failed"
        rollback_run.error_message = str(exc)
        rollback_run.finished_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Rollback failed: {exc}")


@router.get("/diff/{run_id}")
async def diff_publish(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Return a diff between the current live catalogue and a previous publish.

    Shows show slugs that were added, removed, or had their episode count change.
    """
    target = await db.get(PublishRun, run_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Publish run {run_id} not found")
    if target.outcome != "success":
        raise HTTPException(
            status_code=400,
            detail=f"Run {run_id} was {target.outcome}; no diff available.",
        )

    live_key = settings.catalog_filename
    live_path = os.path.join(settings.local_storage_path, live_key)
    versioned_path = os.path.join(
        settings.local_storage_path, f"{live_key}.v{run_id}.json"
    )

    if not os.path.exists(live_path):
        raise HTTPException(status_code=404, detail="No live catalogue file found.")
    if not os.path.exists(versioned_path):
        raise HTTPException(
            status_code=404,
            detail=f"Versioned file for run {run_id} not found on disk.",
        )

    with open(live_path) as f:
        live = json.load(f)
    with open(versioned_path) as f:
        old = json.load(f)

    return _compute_diff(old, live)


def _compute_diff(old: dict, new: dict) -> dict:
    """Compute a structural diff between two catalogues."""
    old_shows = {s["slug"]: s for s in old.get("shows", [])}
    new_shows = {s["slug"]: s for s in new.get("shows", [])}

    added = sorted(set(new_shows) - set(old_shows))
    removed = sorted(set(old_shows) - set(new_shows))

    common = set(old_shows) & set(new_shows)
    changed = []
    for slug in sorted(common):
        old_eps = sum(
            len(ep.get("languages", [])) if False else len(season.get("episodes", []))
            for season in old_shows[slug].get("seasons", [])
        )
        # Count unique episodes (post content_group collapse) — use total episodes
        old_total_eps = sum(
            len(season.get("episodes", []))
            for season in old_shows[slug].get("seasons", [])
        )
        new_total_eps = sum(
            len(season.get("episodes", []))
            for season in new_shows[slug].get("seasons", [])
        )
        old_status = old_shows[slug].get("section")
        new_status = new_shows[slug].get("section")
        if old_total_eps != new_total_eps or old_status != new_status:
            changed.append(
                {
                    "slug": slug,
                    "old_episodes": old_total_eps,
                    "new_episodes": new_total_eps,
                    "old_section": old_status,
                    "new_section": new_status,
                }
            )

    return {
        "added_shows": added,
        "removed_shows": removed,
        "changed_shows": changed,
        "old_shows_count": len(old_shows),
        "new_shows_count": len(new_shows),
    }
