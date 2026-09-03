"""Artwork schemas."""
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas import ARTWORK_TYPES


class ArtworkRead(BaseModel):
    id: UUID
    show_id: UUID | None
    episode_id: UUID | None
    artwork_type: str
    storage_key: str
    width_px: int | None
    height_px: int | None
    file_size_kb: int | None

    model_config = {"from_attributes": True}


class ArtworkUploadResponse(BaseModel):
    id: UUID
    artwork_type: str
    storage_key: str
    width_px: int
    height_px: int
    file_size_kb: int
    url: str


class ArtworkValidationError(BaseModel):
    artwork_type: str
    errors: list[str]
