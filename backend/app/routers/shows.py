"""Show CRUD endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, func, or_, select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession, require_editor
from app.models.show import Show
from app.schemas.show import (
    ShowCreate,
    ShowListItemRead,
    ShowRead,
    ShowUpdate,
    ShowWithArtworkRead,
)
from app.services.audit import log_change

router = APIRouter(prefix="/shows", tags=["shows"])


def search_filter(keyword: str):
    """Match a keyword against title, slug or the serialized categories list."""
    return or_(
        Show.title.ilike(f"%{keyword}%"),
        Show.slug.ilike(f"%{keyword}%"),
        Show.categories.cast(String).ilike(f"%{keyword}%"),
    )


@router.get("", response_model=list[ShowRead])
async def list_shows(
    db: DbSession,
    _user: CurrentUser,
    section: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
):
    """List shows with optional filtering; includes artwork for table thumbnails."""
    stmt = select(Show).offset(skip).limit(limit)
    if section:
        stmt = stmt.where(Show.section == section)
    if status_filter:
        stmt = stmt.where(Show.status == status_filter)
    if search:
        keyword = f"%{search}%"
        # Search across title, slug and categories (match any)
        stmt = stmt.where(search_filter(keyword))
    result = await db.execute(stmt.options(selectinload(Show.artwork)).order_by(Show.title))
    return [ShowListItemRead.model_validate(s) for s in result.scalars().all()]


@router.get("/count")
async def count_shows(
    db: DbSession,
    _user: CurrentUser,
    section: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
):
    """Total number of shows matching the same filters — powers pagination footer."""
    stmt = select(func.count(Show.id))
    if section:
        stmt = stmt.where(Show.section == section)
    if status_filter:
        stmt = stmt.where(Show.status == status_filter)
    if search:
        keyword = f"%{search}%"
        stmt = stmt.where(search_filter(keyword))
    result = await db.execute(stmt)
    return {"count": result.scalar_one()}


@router.get("/{show_id}", response_model=ShowWithArtworkRead)
async def get_show(
    show_id: UUID,
    db: DbSession,
    _user: CurrentUser,
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
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    existing = await db.execute(select(Show).where(Show.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409, detail=f"Show with slug '{body.slug}' already exists"
        )

    show = Show(**body.model_dump())
    db.add(show)
    await db.flush()
    await log_change(
        db,
        user.email,
        "show",
        str(show.id),
        "created",
        after=ShowRead.model_validate(show).model_dump(),
    )
    await db.commit()
    await db.refresh(show)
    return ShowRead.model_validate(show)


@router.patch("/{show_id}", response_model=ShowRead)
async def update_show(
    show_id: UUID,
    body: ShowUpdate,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    result = await db.execute(select(Show).where(Show.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    before = ShowRead.model_validate(show).model_dump()
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(show, key, value)
    await db.flush()
    await log_change(
        db,
        user.email,
        "show",
        str(show.id),
        "updated",
        before=before,
        after=ShowRead.model_validate(show).model_dump(),
    )
    await db.commit()
    await db.refresh(show)
    return ShowRead.model_validate(show)


@router.delete("/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: UUID,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
):
    result = await db.execute(select(Show).where(Show.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    before = ShowRead.model_validate(show).model_dump()
    await log_change(db, user.email, "show", str(show.id), "deleted", before=before)
    await db.delete(show)
    await db.commit()
