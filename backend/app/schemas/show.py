"""Show schemas."""
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas import ALLOWED_CATEGORIES_TYPE, ALLOWED_SECTIONS_TYPE


class ShowCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    synopsis: str | None = None
    section: ALLOWED_SECTIONS_TYPE
    categories: list[ALLOWED_CATEGORIES_TYPE] = Field(default_factory=list)
    status: str = Field(default="draft", pattern="^(draft|published)$")


class ShowUpdate(BaseModel):
    title: str | None = Field(min_length=1, max_length=255, default=None)
    synopsis: str | None = None
    section: ALLOWED_SECTIONS_TYPE | None = None
    categories: list[ALLOWED_CATEGORIES_TYPE] | None = None
    status: str | None = Field(default=None, pattern="^(draft|published)$")


class ShowRead(BaseModel):
    id: UUID
    slug: str
    title: str
    synopsis: str | None
    section: str
    categories: list[str]
    status: str

    model_config = {"from_attributes": True}


class ShowWithSeasonsRead(ShowRead):
    seasons: list["SeasonWithEpisodesRead"] = []


class ShowWithArtworkRead(ShowRead):
    artwork: list["ArtworkRead"] = []
    seasons: list["SeasonWithEpisodesRead"] = []


from app.schemas.artwork import ArtworkRead  # noqa: E402
from app.schemas.season import SeasonWithEpisodesRead  # noqa: E402

ShowWithSeasonsRead.model_rebuild()
ShowWithArtworkRead.model_rebuild()
