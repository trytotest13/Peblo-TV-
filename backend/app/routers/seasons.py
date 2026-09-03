"""Season CRUD endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_editor
from app.db import get_db
from app.models.season import Season
from app.models.show import Show
from app.models.user import User
from app.schemas.season import SeasonCreate, SeasonRead
from app.services.audit import log_change

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("/{season_id}", response_model=SeasonRead)
async def get_season(
    season_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Season).where(Season.id == season_id))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return SeasonRead.model_validate(season)


@router.post("", response_model=SeasonRead, status_code=status.HTTP_201_CREATED)
async def create_season(
    body: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    # Verify show exists
    show_result = await db.execute(select(Show).where(Show.id == body.show_id))
    if not show_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Show not found")

    season = Season(**body.model_dump())
    db.add(season)
    await db.flush()
    await log_change(db, user.email, "season", str(season.id), "created", after=SeasonRead.model_validate(season).model_dump())
    await db.commit()
    await db.refresh(season)
    return SeasonRead.model_validate(season)


@router.patch("/{season_id}", response_model=SeasonRead)
async def update_season(
    season_id: UUID,
    body: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    result = await db.execute(select(Season).where(Season.id == season_id))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    before = SeasonRead.model_validate(season).model_dump()
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(season, key, value)
    await db.flush()
    await log_change(db, user.email, "season", str(season.id), "updated", before=before, after=SeasonRead.model_validate(season).model_dump())
    await db.commit()
    await db.refresh(season)
    return SeasonRead.model_validate(season)


@router.delete("/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_season(
    season_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    result = await db.execute(select(Season).where(Season.id == season_id))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    before = SeasonRead.model_validate(season).model_dump()
    await log_change(db, user.email, "season", str(season.id), "deleted", before=before)
    await db.delete(season)
    await db.commit()
