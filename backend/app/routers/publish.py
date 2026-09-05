"""Publish queue, schedule, and history endpoints.

The queue is backed by ``publish_jobs`` rows, but validation is always
computed live from the validation report — the row only tracks the request
lifecycle (validated -> publishing -> published, plus issues/cancelled).

For catalogue-type jobs (and after every show/episode publish) the existing
catalogue push in ``app.routers.catalog`` runs, so the viewer sees the
change without engineering help. Execution is inline — no worker queue;
at this scale a request-scoped publish is the simplest thing that works.
"""
import time
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.auth.deps import DbSession, require_editor
from app.models.episode import Episode
from app.models.publish_job import PublishJob, PublishSchedule
from app.models.publish_run import PublishRun
from app.models.season import Season
from app.models.show import Show
from app.models.user import User
from app.schemas.publish import (
    HistoryItem,
    HistoryPage,
    PublishJobCreate,
    PublishJobRead,
    PublishScheduleCreate,
    PublishScheduleRead,
    PublishScheduleUpdate,
)
from app.services.audit import log_change
from app.services.validation_report import build_validation_report

router = APIRouter(prefix="/publish", tags=["publish"])

PENDING = ("validated", "issues", "publishing")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _job_issues(db: DbSession, job: PublishJob) -> list[str]:
    """Live validation messages for a job, from the validation report."""
    report = await build_validation_report(db)
    if job.item_type == "catalogue":
        return [i.message for i in report.issues]
    if job.item_id is None:
        return []
    if job.item_type == "show":
        show = await db.get(Show, job.item_id)
        if not show:
            return ["Show no longer exists."]
        return [i.message for i in report.issues if i.show_slug == show.slug]
    if job.item_type == "episode":
        ep = await db.get(Episode, job.item_id)
        if not ep:
            return ["Episode no longer exists."]
        return [i.message for i in report.issues if i.episode_slug == ep.slug]
    return []


def _to_read(job: PublishJob, issues: list[str]) -> PublishJobRead:
    data = PublishJobRead.model_validate(job)
    data.issues = issues
    # Pending rows always show live validation; terminal rows keep history
    if job.validation_status in ("validated", "issues"):
        data.validation_status = "issues" if issues else "validated"
    return data


async def _seed_queue(db: DbSession) -> None:
    """One pending job per draft show/episode, plus a catalogue job.

    Idempotent — never duplicates an already-pending job. This is what makes
    the queue useful without anyone filing requests by hand: draft content
    is, by definition, waiting to publish.
    """
    existing = (
        (
            await db.execute(
                select(PublishJob).where(PublishJob.validation_status.in_(PENDING))
            )
        )
        .scalars()
        .all()
    )
    pending_keys = {(j.item_type, str(j.item_id) if j.item_id else None) for j in existing}

    shows = (await db.execute(select(Show).where(Show.status == "draft"))).scalars().all()
    for show in shows:
        if ("show", str(show.id)) not in pending_keys:
            db.add(
                PublishJob(
                    title=show.title,
                    item_type="show",
                    item_id=show.id,
                    requested_by="auto",
                )
            )

    episodes = (
        await db.execute(select(Episode).where(Episode.status == "draft"))
    ).scalars().all()
    for ep in episodes:
        if ("episode", str(ep.id)) not in pending_keys:
            db.add(
                PublishJob(
                    title=ep.title,
                    item_type="episode",
                    item_id=ep.id,
                    requested_by="auto",
                )
            )

    if ("catalogue", None) not in pending_keys and (shows or episodes):
        db.add(
            PublishJob(
                title="Full catalogue",
                item_type="catalogue",
                item_id=None,
                requested_by="auto",
            )
        )
    await db.flush()


async def _run_publish(
    db: DbSession, user: User, *, item_type: str, item_id: UUID | None
) -> tuple[int, str | None]:
    """Flip show/episode to published, then push the catalogue. Inline.

    Returns (duration_ms, error_detail). Catalogue push reuses the existing
    endpoint function so file-writing stays in one place.
    """
    from app.routers.catalog import publish_catalog as _push_catalog

    started = time.perf_counter()
    try:
        if item_type == "show" and item_id is not None:
            show = await db.get(Show, item_id)
            if not show:
                return 0, "Show no longer exists."
            before = {"status": show.status}
            show.status = "published"
            await db.flush()
            await log_change(
                db, user.email, "show", str(show.id), "updated",
                before=before, after={"status": "published"},
            )
        elif item_type == "episode" and item_id is not None:
            ep = await db.get(Episode, item_id)
            if not ep:
                return 0, "Episode no longer exists."
            before = {"status": ep.status}
            ep.status = "published"
            await db.flush()
            await log_change(
                db, user.email, "episode", str(ep.id), "updated",
                before=before, after={"status": "published"},
            )
        await _push_catalog(db, user)
        return int((time.perf_counter() - started) * 1000), None
    except HTTPException as exc:
        return int((time.perf_counter() - started) * 1000), str(exc.detail)
    except Exception as exc:  # noqa: BLE001 — surfaced as job failure, not a 500
        return int((time.perf_counter() - started) * 1000), str(exc)


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


# ---------------------------------------------------------------------------
# Queue
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=list[PublishJobRead])
async def list_jobs(
    db: DbSession,
    _user: Annotated[object, Depends(require_editor)],
    status: str = Query(default="pending", pattern="^(pending|all)$"),
):
    """Pending publish queue (auto-seeded from draft content)."""
    await _seed_queue(db)
    await db.commit()
    stmt = select(PublishJob).order_by(PublishJob.requested_at)
    if status == "pending":
        stmt = stmt.where(PublishJob.validation_status.in_(PENDING))
    jobs = (await db.execute(stmt)).scalars().all()
    out = []
    for job in jobs:
        issues = await _job_issues(db, job) if job.validation_status in PENDING else []
        out.append(_to_read(job, issues))
    return out


@router.post("/jobs", response_model=PublishJobRead, status_code=201)
async def create_job(
    body: PublishJobCreate,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    """File a manual publish request."""
    job = PublishJob(
        title=body.title,
        item_type=body.item_type,
        item_id=body.item_id,
        requested_by=user.email,
    )
    db.add(job)
    await db.flush()
    issues = await _job_issues(db, job)
    await db.commit()
    await db.refresh(job)
    return _to_read(job, issues)


@router.post("/jobs/{job_id}/publish", response_model=PublishJobRead)
async def publish_job(
    job_id: UUID,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    """Validation gate, then publish. Issues -> 409, never a silent push."""
    job = await db.get(PublishJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")
    if job.validation_status not in PENDING:
        raise HTTPException(
            status_code=400, detail=f"Job is already {job.validation_status}."
        )
    issues = await _job_issues(db, job)
    if issues:
        job.validation_status = "issues"
        await db.commit()
        raise HTTPException(status_code=409, detail={"message": "Validation issues block publish.", "issues": issues})

    job.validation_status = "publishing"
    await db.flush()
    duration_ms, error = await _run_publish(
        db, user, item_type=job.item_type, item_id=job.item_id
    )
    job.duration_ms = duration_ms
    job.published_at = datetime.now(UTC)
    if error is None:
        job.validation_status = "published"
        job.result = "live"
    else:
        job.validation_status = "failed"
        job.result = "failed"
        job.error_detail = error
    await db.commit()
    await db.refresh(job)
    remaining = [] if error else await _job_issues(db, job)
    return _to_read(job, remaining)


@router.post("/jobs/{job_id}/cancel", response_model=PublishJobRead)
async def cancel_job(
    job_id: UUID,
    db: DbSession,
    _user: Annotated[object, Depends(require_editor)],
):
    """Cancel a pending job. Frontend confirms first — no undo."""
    job = await db.get(PublishJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")
    if job.validation_status not in PENDING:
        raise HTTPException(
            status_code=400, detail=f"Job is already {job.validation_status}."
        )
    job.validation_status = "cancelled"
    await db.commit()
    await db.refresh(job)
    return _to_read(job, [])


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

async def _sweep_due(db: DbSession, user: User) -> None:
    """Execute past-due scheduled items. Failures stay scheduled with a note."""
    rows = (
        await db.execute(
            select(PublishSchedule)
            .where(PublishSchedule.status == "scheduled")
            .order_by(PublishSchedule.scheduled_for)
        )
    ).scalars().all()
    now = datetime.now(UTC)
    for row in rows:
        if _as_utc(row.scheduled_for) > now:
            continue
        issues: list[str] = []
        if row.item_type != "catalogue":
            probe = PublishJob(title=row.title, item_type=row.item_type, item_id=row.item_id)
            issues = await _job_issues(db, probe)
        if issues:
            row.last_error = "; ".join(issues)
            continue
        _, error = await _run_publish(
            db, user, item_type=row.item_type, item_id=row.item_id
        )
        if error is None:
            row.status = "published"
            row.last_error = None
        else:
            row.last_error = error
    await db.flush()


@router.get("/schedule", response_model=list[PublishScheduleRead])
async def list_schedule(
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    """Scheduled publishes, oldest first. Past-due rows execute on read."""
    await _sweep_due(db, user)
    await db.commit()
    rows = (
        await db.execute(
            select(PublishSchedule).order_by(PublishSchedule.scheduled_for)
        )
    ).scalars().all()
    return [PublishScheduleRead.model_validate(r) for r in rows]


@router.post("/schedule", response_model=PublishScheduleRead, status_code=201)
async def create_schedule(
    body: PublishScheduleCreate,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    """Pin a publish to a future date/time."""
    if body.item_type != "catalogue" and body.item_id is not None:
        model = Show if body.item_type == "show" else Episode
        if not await db.get(model, body.item_id):
            raise HTTPException(status_code=404, detail=f"{body.item_type} not found")
    row = PublishSchedule(
        title=body.title,
        item_type=body.item_type,
        item_id=body.item_id,
        scheduled_for=body.scheduled_for,
        timezone_note=body.timezone_note,
        created_by=user.email,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return PublishScheduleRead.model_validate(row)


@router.patch("/schedule/{schedule_id}", response_model=PublishScheduleRead)
async def update_schedule(
    schedule_id: UUID,
    body: PublishScheduleUpdate,
    db: DbSession,
    _user: Annotated[object, Depends(require_editor)],
):
    """Edit / reschedule a still-scheduled item."""
    row = await db.get(PublishSchedule, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled item not found")
    if row.status != "scheduled":
        raise HTTPException(status_code=400, detail=f"Item is already {row.status}.")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await db.refresh(row)
    return PublishScheduleRead.model_validate(row)


@router.post("/schedule/{schedule_id}/cancel", response_model=PublishScheduleRead)
async def cancel_schedule(
    schedule_id: UUID,
    db: DbSession,
    _user: Annotated[object, Depends(require_editor)],
):
    """Cancel a scheduled publish."""
    row = await db.get(PublishSchedule, schedule_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scheduled item not found")
    if row.status != "scheduled":
        raise HTTPException(status_code=400, detail=f"Item is already {row.status}.")
    row.status = "cancelled"
    await db.commit()
    await db.refresh(row)
    return PublishScheduleRead.model_validate(row)


# ---------------------------------------------------------------------------
# History — terminal jobs + catalogue runs, newest first
# ---------------------------------------------------------------------------

@router.get("/history", response_model=HistoryPage)
async def publish_history(
    db: DbSession,
    _user: Annotated[object, Depends(require_editor)],
    cursor: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    type: str | None = Query(default=None, pattern="^(show|episode|catalogue)$"),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
):
    """Paginated history of everything that published (or failed trying)."""
    items: list[HistoryItem] = []

    runs = (
        await db.execute(select(PublishRun).order_by(PublishRun.started_at.desc()))
    ).scalars().all()
    for run in runs:
        at = run.finished_at or run.started_at
        duration = (
            int((run.finished_at - run.started_at).total_seconds() * 1000)
            if run.finished_at and run.started_at
            else None
        )
        items.append(
            HistoryItem(
                title="Full catalogue" if run.outcome != "rolled_back" else "Catalogue rollback",
                item_type="catalogue",
                published_at=at,
                published_by=run.initiated_by,
                duration_ms=duration,
                result="live" if run.outcome in ("success", "rolled_back") else "failed",
                error_detail=run.error_message,
            )
        )

    jobs = (
        await db.execute(
            select(PublishJob)
            .where(PublishJob.validation_status.in_(("published", "failed")))
            .order_by(PublishJob.published_at.desc())
        )
    ).scalars().all()
    for job in jobs:
        items.append(
            HistoryItem(
                title=job.title,
                item_type=job.item_type,
                published_at=job.published_at,
                published_by=job.requested_by,
                duration_ms=job.duration_ms,
                result=job.result or "failed",
                error_detail=job.error_detail,
            )
        )

    if type:
        items = [i for i in items if i.item_type == type]
    if from_date:
        items = [i for i in items if i.published_at and _as_utc(i.published_at) >= _as_utc(from_date)]
    if to_date:
        items = [i for i in items if i.published_at and _as_utc(i.published_at) <= _as_utc(to_date)]
    items.sort(key=lambda i: i.published_at or datetime.min.replace(tzinfo=UTC), reverse=True)
    return HistoryPage(items=items[cursor : cursor + limit], total=len(items), cursor=cursor)
