"""Catalog schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Catalogue entry shapes
# ---------------------------------------------------------------------------


class LanguageVariant(BaseModel):
    language: str
    episode_slug: str
    duration_seconds: int | None = None


class EpisodeCatalogEntry(BaseModel):
    """One catalogue entry — may represent multiple language variants."""

    slug: str
    title: str
    synopsis: str | None = None
    episode_number: int
    season_number: int
    languages: list[LanguageVariant] = Field(default_factory=list)

    # Artwork
    poster_url: str | None = None
    banner_url: str | None = None
    thumbnail_url: str | None = None


class SeasonCatalogEntry(BaseModel):
    season_number: int
    title: str | None = None
    episodes: list[EpisodeCatalogEntry] = Field(default_factory=list)


class ShowCatalogEntry(BaseModel):
    """One published show in the catalogue."""

    slug: str
    title: str
    synopsis: str | None = None
    section: str
    categories: list[str] = Field(default_factory=list)
    seasons: list[SeasonCatalogEntry] = Field(default_factory=list)

    # Show-level artwork
    poster_url: str | None = None
    banner_url: str | None = None
    thumbnail_url: str | None = None


class CatalogDocument(BaseModel):
    """The full published catalogue JSON."""

    generated_at: datetime
    shows: list[ShowCatalogEntry] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Publish job
# ---------------------------------------------------------------------------


class PublishRunRead(BaseModel):
    id: UUID
    initiated_by: str
    shows_published: int
    episodes_published: int
    outcome: str
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Validation report
# ---------------------------------------------------------------------------


class ValidationIssue(BaseModel):
    show_slug: str
    season_number: int | None = None
    episode_slug: str | None = None
    kind: str  # "missing_artwork" | "missing_duration" | "unpublished" | "no_section"
    message: str


class ValidationReport(BaseModel):
    total_shows: int
    total_episodes: int
    issues: list[ValidationIssue] = Field(default_factory=list)
    can_publish: bool
