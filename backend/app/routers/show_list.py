"""Authenticated My List endpoints."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select

from app.auth.deps import CurrentUser, DbSession
from app.models.show import Show
from app.models.show_list import ShowListItem

router = APIRouter(prefix="/my-list", tags=["my-list"])


@router.get("")
async def list_saved_shows(user: CurrentUser, db: DbSession) -> dict[str, list[str]]:
    result = await db.execute(
        select(Show.slug)
        .join(ShowListItem, ShowListItem.show_id == Show.id)
        .where(ShowListItem.user_id == user.id, Show.status == "published")
        .order_by(ShowListItem.created_at.desc())
    )
    return {"slugs": list(result.scalars().all())}


@router.post("/{show_slug}", status_code=status.HTTP_201_CREATED)
async def add_to_list(show_slug: str, user: CurrentUser, db: DbSession) -> dict[str, bool]:
    show = await db.scalar(select(Show).where(Show.slug == show_slug, Show.status == "published"))
    if show is None:
        raise HTTPException(status_code=404, detail="Published show not found")

    existing = await db.scalar(
        select(ShowListItem).where(ShowListItem.user_id == user.id, ShowListItem.show_id == show.id)
    )
    if existing is None:
        db.add(ShowListItem(user_id=user.id, show_id=show.id))
        await db.commit()
    return {"saved": True}


@router.delete("/{show_slug}")
async def remove_from_list(show_slug: str, user: CurrentUser, db: DbSession) -> dict[str, bool]:
    show = await db.scalar(select(Show).where(Show.slug == show_slug))
    if show is None:
        raise HTTPException(status_code=404, detail="Show not found")
    await db.execute(
        delete(ShowListItem).where(ShowListItem.user_id == user.id, ShowListItem.show_id == show.id)
    )
    await db.commit()
    return {"saved": False}
