"""Season model."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    show_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shows.id", ondelete="CASCADE"), nullable=False
    )
    season_number: Mapped[int] = mapped_column(Integer, nullable=False)
    # Title is optional; when absent the viewer uses "Season N"
    title: Mapped[str | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    show: Mapped["Show"] = relationship("Show", back_populates="seasons")
    episodes: Mapped[list["Episode"]] = relationship(
        "Episode", back_populates="season", cascade="all, delete-orphan",
        order_by="Episode.episode_number"
    )


# Avoid circular imports at module load
from app.models.show import Show  # noqa: E402, F401
from app.models.episode import Episode  # noqa: E402, F401
