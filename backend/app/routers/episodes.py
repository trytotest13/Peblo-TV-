"""Episode CRUD endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select

from app.auth.deps import CurrentUser, DbSession, require_editor
from app.models.episode import Episode
from app.models.season import Season
from app.schemas.episode import EpisodeCreate, EpisodeRead, EpisodeUpdate
from app.services.audit import log_change

router = APIRouter(prefix="/episodes", tags=["episodes"])


@router.get("", response_model=list[EpisodeRead])
async def list_episodes(
    db: DbSession,
    _user: CurrentUser,
    season_id: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    language: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    """List episodes with optional filtering."""
    stmt = select(Episode).offset(skip).limit(limit)
    if season_id:
        stmt = stmt.where(Episode.season_id == season_id)
    if status_filter:
        stmt = stmt.where(Episode.status == status_filter)
    if language:
        stmt = stmt.where(Episode.language == language)
    if search:
        stmt = stmt.where(Episode.title.ilike(f"%{search}%"))
    result = await db.execute(
        stmt.order_by(Episode.season_id, Episode.episode_number)
    )
    return [EpisodeRead.model_validate(e) for e in result.scalars().all()]


@router.get("/{episode_id}", response_model=EpisodeRead)
async def get_episode(
    episode_id: UUID,
    db: DbSession,
    _user: CurrentUser,
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return EpisodeRead.model_validate(episode)


@router.post("", response_model=EpisodeRead, status_code=status.HTTP_201_CREATED)
async def create_episode(
    body: EpisodeCreate,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    # Verify season exists
    season_result = await db.execute(
        select(Season).where(Season.id == body.season_id)
    )
    if not season_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Season not found")

    # Unique constraint: (content_group, language)
    existing = await db.execute(
        select(Episode).where(
            and_(
                Episode.content_group == body.content_group,
                Episode.language == body.language,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=(
                f"Episode with content_group='{body.content_group}' and "
                f"language='{body.language}' already exists"
            ),
        )

    episode = Episode(**body.model_dump())
    db.add(episode)
    await db.flush()
    await log_change(
        db,
        user.email,
        "episode",
        str(episode.id),
        "created",
        after=EpisodeRead.model_validate(episode).model_dump(),
    )
    await db.commit()
    await db.refresh(episode)
    return EpisodeRead.model_validate(episode)


@router.patch("/{episode_id}", response_model=EpisodeRead)
async def update_episode(
    episode_id: UUID,
    body: EpisodeUpdate,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    before = EpisodeRead.model_validate(episode).model_dump()
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(episode, key, value)
    await db.flush()
    await log_change(
        db,
        user.email,
        "episode",
        str(episode.id),
        "updated",
        before=before,
        after=EpisodeRead.model_validate(episode).model_dump(),
    )
    await db.commit()
    await db.refresh(episode)
    return EpisodeRead.model_validate(episode)


@router.delete("/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_episode(
    episode_id: UUID,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    before = EpisodeRead.model_validate(episode).model_dump()
    await log_change(
        db, user.email, "episode", str(episode.id), "deleted", before=before
    )
    await db.delete(episode)
    await db.commit()
