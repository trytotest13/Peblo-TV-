"""PublishRun model — records every publish attempt."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PublishRun(Base):
    __tablename__ = "publish_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    initiated_by: Mapped[str] = mapped_column(String(255), nullable=False)

    # Counts
    shows_published: Mapped[int] = mapped_column(Integer, default=0)
    episodes_published: Mapped[int] = mapped_column(Integer, default=0)

    # Outcome
    outcome: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # success | failed | rolled_back
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
