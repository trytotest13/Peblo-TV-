"""Episode CRUD endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_editor
from app.db import get_db
from app.models.episode import Episode
from app.models.season import Season
from app.models.user import User
from app.schemas.episode import EpisodeCreate, EpisodeRead, EpisodeUpdate

router = APIRouter(prefix="/episodes", tags=["episodes"])


@router.get("", response_model=list[EpisodeRead])
async def list_episodes(
    season_id: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    language: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
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
    result = await db.execute(stmt.order_by(Episode.season_id, Episode.episode_number))
    return [EpisodeRead.model_validate(e) for e in result.scalars().all()]


@router.get("/{episode_id}", response_model=EpisodeRead)
async def get_episode(
    episode_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return EpisodeRead.model_validate(episode)


@router.post("", response_model=EpisodeRead, status_code=status.HTTP_201_CREATED)
async def create_episode(
    body: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    # Verify season exists
    season_result = await db.execute(select(Season).where(Season.id == body.season_id))
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
    await db.commit()
    await db.refresh(episode)
    return EpisodeRead.model_validate(episode)


@router.patch("/{episode_id}", response_model=EpisodeRead)
async def update_episode(
    episode_id: str,
    body: EpisodeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(episode, key, value)
    await db.commit()
    await db.refresh(episode)
    return EpisodeRead.model_validate(episode)


@router.delete("/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_episode(
    episode_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    await db.delete(episode)
    await db.commit()
