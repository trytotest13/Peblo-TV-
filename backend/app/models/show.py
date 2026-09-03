"""Show model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

ALLOWED_SECTIONS = ("featured", "series", "minisodes", "songs")
ALLOWED_CATEGORIES = (
    "adventure",
    "folk",
    "friendship",
    "india",
    "language",
    "learning",
    "maths",
    "music",
    "nature",
    "reading",
    "science",
    "singalong",
    "stories",
    "travel",
    "values",
)


class Show(Base):
    __tablename__ = "shows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    synopsis: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    section: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )
    categories: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )  # draft | published

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    seasons: Mapped[list["Season"]] = relationship(
        "Season", back_populates="show", cascade="all, delete-orphan"
    )
    artwork: Mapped[list["Artwork"]] = relationship(
        "Artwork", back_populates="show", cascade="all, delete-orphan"
    )


# Avoid circular imports at module load
from app.models.season import Season  # noqa: E402, F401
from app.models.artwork import Artwork  # noqa: E402, F401
