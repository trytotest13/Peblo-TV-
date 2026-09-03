"""Season schemas."""
from uuid import UUID

from pydantic import BaseModel, Field


class SeasonCreate(BaseModel):
    show_id: UUID
    season_number: int = Field(ge=0)
    title: str | None = None


class SeasonUpdate(BaseModel):
    season_number: int | None = Field(ge=0, default=None)
    title: str | None = None


class SeasonRead(BaseModel):
    id: UUID
    show_id: UUID
    season_number: int
    title: str | None

    model_config = {"from_attributes": True}


class SeasonWithEpisodesRead(SeasonRead):
    episodes: list["EpisodeRead"] = []


from app.schemas.episode import EpisodeRead

SeasonWithEpisodesRead.model_rebuild()
