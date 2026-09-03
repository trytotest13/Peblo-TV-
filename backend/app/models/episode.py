"""Episode model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

ALLOWED_LANGUAGES = ("en", "hi")


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    season_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)

    # Core metadata
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    synopsis: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    # Numbering
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Technical
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(
        String(5), nullable=False, index=True
    )

    # Grouping key — episodes sharing a content_group are language variants
    content_group: Mapped[str] = mapped_column(String(150), nullable=False, index=True)

    # Publication state
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )  # draft | published

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "content_group", "language", name="uq_episode_content_group_language"
        ),
    )

    # Relationships
    season: Mapped["Season"] = relationship("Season", back_populates="episodes")
    artwork: Mapped[list["Artwork"]] = relationship(
        "Artwork", back_populates="episode", cascade="all, delete-orphan"
    )


# Avoid circular imports at module load
from app.models.artwork import Artwork  # noqa: E402, F401
from app.models.season import Season  # noqa: E402, F401
