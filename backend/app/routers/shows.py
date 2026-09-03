"""Show CRUD endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user, require_editor
from app.db import get_db
from app.models.show import Show
from app.models.user import User
from app.schemas.show import ShowCreate, ShowRead, ShowUpdate, ShowWithArtworkRead

router = APIRouter(prefix="/shows", tags=["shows"])


@router.get("", response_model=list[ShowRead])
async def list_shows(
    section: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all shows with optional filtering."""
    stmt = select(Show).offset(skip).limit(limit)
    if section:
        stmt = stmt.where(Show.section == section)
    if status_filter:
        stmt = stmt.where(Show.status == status_filter)
    if search:
        stmt = stmt.where(Show.title.ilike(f"%{search}%"))
    result = await db.execute(stmt.order_by(Show.title))
    return [ShowRead.model_validate(s) for s in result.scalars().all()]


@router.get("/{show_id}", response_model=ShowWithArtworkRead)
async def get_show(
    show_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Show)
        .where(Show.id == show_id)
        .options(selectinload(Show.artwork), selectinload(Show.seasons))
    )
    result = await db.execute(stmt)
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return ShowWithArtworkRead.model_validate(show)


@router.post("", response_model=ShowRead, status_code=status.HTTP_201_CREATED)
async def create_show(
    body: ShowCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    existing = await db.execute(select(Show).where(Show.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Show with slug '{body.slug}' already exists")

    show = Show(**body.model_dump())
    db.add(show)
    await db.commit()
    await db.refresh(show)
    return ShowRead.model_validate(show)


@router.patch("/{show_id}", response_model=ShowRead)
async def update_show(
    show_id: str,
    body: ShowUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    result = await db.execute(select(Show).where(Show.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(show, key, value)
    await db.commit()
    await db.refresh(show)
    return ShowRead.model_validate(show)


@router.delete("/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    result = await db.execute(select(Show).where(Show.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    await db.delete(show)
    await db.commit()
