"""Artwork model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

ARTWORK_TYPES = ("poster", "banner", "thumbnail")


class Artwork(Base):
    __tablename__ = "artwork"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Either show-level or episode-level artwork (one must be set)
    show_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shows.id", ondelete="CASCADE"), nullable=True
    )
    episode_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("episodes.id", ondelete="CASCADE"), nullable=True
    )

    artwork_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    # Pixel dimensions at upload time (for validation audit)
    width_px: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height_px: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    show: Mapped["Show | None"] = relationship("Show", back_populates="artwork")
    episode: Mapped["Episode | None"] = relationship("Episode", back_populates="artwork")


# Avoid circular imports at module load
from app.models.show import Show  # noqa: E402, F401
from app.models.episode import Episode  # noqa: E402, F401
