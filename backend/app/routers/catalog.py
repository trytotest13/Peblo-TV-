"""Catalog endpoints — publish, search, and read."""
import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.config import get_settings
from app.db import get_db
from app.models.publish_run import PublishRun
from app.models.user import User
from app.schemas.catalog import (
    PublishRunRead,
)
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

        # Write to temp location first
        live_path = os.path.join(settings.local_storage_path, live_key)
        tmp_path = os.path.join(settings.local_storage_path, tmp_key)
        os.makedirs(os.path.dirname(live_path), exist_ok=True)

        with open(tmp_path, "w") as f:
            f.write(catalog_json)

        # Atomic rename
        os.replace(tmp_path, live_path)

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
