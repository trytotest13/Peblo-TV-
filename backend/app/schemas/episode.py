"""Episode schemas."""
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas import ALLOWED_LANGUAGES_TYPE


class EpisodeCreate(BaseModel):
    season_id: UUID
    title: str = Field(min_length=1, max_length=255)
    synopsis: str | None = None
    episode_number: int = Field(ge=1)
    duration_seconds: int | None = Field(ge=0, default=None)
    language: ALLOWED_LANGUAGES_TYPE
    content_group: str = Field(min_length=1, max_length=150)
    status: str = Field(default="draft", pattern="^(draft|published)$")


class EpisodeUpdate(BaseModel):
    title: str | None = Field(min_length=1, max_length=255, default=None)
    synopsis: str | None = None
    episode_number: int | None = Field(ge=1, default=None)
    duration_seconds: int | None = Field(ge=0, default=None)
    language: ALLOWED_LANGUAGES_TYPE | None = None
    status: str | None = Field(default=None, pattern="^(draft|published)$")


class EpisodeRead(BaseModel):
    id: UUID
    season_id: UUID
    slug: str
    title: str
    synopsis: str | None
    episode_number: int
    duration_seconds: int | None
    language: str
    content_group: str
    status: str

    model_config = {"from_attributes": True}


class EpisodeWithArtworkRead(EpisodeRead):
    artwork: list["ArtworkRead"] = []


from app.schemas.artwork import ArtworkRead

EpisodeWithArtworkRead.model_rebuild()
