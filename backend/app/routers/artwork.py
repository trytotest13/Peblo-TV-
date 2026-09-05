"""Artwork upload endpoint with validation."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select

from app.auth.deps import DbSession, require_editor
from app.models.artwork import Artwork
from app.models.episode import Episode
from app.models.show import Show
from app.schemas.artwork import ArtworkUploadResponse, ArtworkValidationError
from app.services.storage import get_storage_instance
from app.services.validation import ARTWORK_SPECS, validate_artwork

router = APIRouter(prefix="/artwork", tags=["artwork"])


@router.post(
    "/upload",
    response_model=ArtworkUploadResponse,
    responses={400: {"model": ArtworkValidationError}},
)
async def upload_artwork(
    file: UploadFile,
    artwork_type: str,
    db: DbSession,
    user: Annotated[object, Depends(require_editor)],
    show_id: str | None = None,
    episode_id: str | None = None,
):
    """
    Upload artwork for a show or episode.

    Three sizes are validated strictly:
    - poster   → 2:3   (~600×900 px), max 200 KB
    - banner   → 16:9  (~1280×720 px), max 200 KB
    - thumbnail → 16:9 (~640×360 px), max 200 KB

    Errors are returned in a form a non-technical editor can act on.
    """
    if artwork_type not in ARTWORK_SPECS:
        raise HTTPException(
            status_code=400,
            detail={
                "artwork_type": artwork_type,
                "errors": [
                    f"Unknown artwork type '{artwork_type}'. "
                    f"Valid types: {list(ARTWORK_SPECS.keys())}"
                ],
            },
        )

    if (show_id is None) == (episode_id is None):
        raise HTTPException(
            status_code=400,
            detail={
                "artwork_type": artwork_type,
                "errors": [
                    "Provide exactly one of show_id or episode_id."
                ],
            },
        )

    # Validate the entity exists
    if show_id:
        result = await db.execute(select(Show).where(Show.id == show_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Show not found")
    else:
        result = await db.execute(select(Episode).where(Episode.id == episode_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Episode not found")

    # Read file bytes
    file_bytes = await file.read()

    # Validate
    validation = validate_artwork(artwork_type, file_bytes)
    if not validation.valid:
        raise HTTPException(
            status_code=400,
            detail={
                "artwork_type": artwork_type,
                "errors": validation.errors,
            },
        )

    # Save to storage
    storage = get_storage_instance()
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    key = f"artwork/{artwork_type}/{uuid.uuid4()}.{ext}"
    url = await storage.save(key, file_bytes)

    # Delete existing artwork of the same type for this entity
    existing_stmt = select(Artwork).where(
        Artwork.show_id == show_id,
        Artwork.episode_id == episode_id,
        Artwork.artwork_type == artwork_type,
    )
    existing_result = await db.execute(existing_stmt)
    for old in existing_result.scalars().all():
        await storage.delete(old.storage_key)
        await db.delete(old)

    # Create record
    artwork = Artwork(
        show_id=show_id,
        episode_id=episode_id,
        artwork_type=artwork_type,
        storage_key=key,
        width_px=validation.width_px,
        height_px=validation.height_px,
        file_size_kb=validation.file_size_kb,
    )
    db.add(artwork)
    await db.commit()
    await db.refresh(artwork)

    return ArtworkUploadResponse(
        id=artwork.id,
        artwork_type=artwork_type,
        storage_key=key,
        width_px=validation.width_px,
        height_px=validation.height_px,
        file_size_kb=validation.file_size_kb,
        url=url,
    )
