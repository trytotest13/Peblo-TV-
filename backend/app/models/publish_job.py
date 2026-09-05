"""Publish queue + schedule models.

PublishJob: one row per pending publish request (show, episode, or a full
catalogue push). Validation is computed live from the validation report —
the row only tracks the request lifecycle.

PublishSchedule: a publish job pinned to a future date/time. Past-due rows
are executed by a lightweight sweep whenever the schedule is read.
"""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PublishJob(Base):
    __tablename__ = "publish_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # show | episode | catalogue
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # FK-less on purpose: catalogue jobs have no item; keeps migration trivial
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    requested_by: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # validated | issues | publishing | published | cancelled | failed
    validation_status: Mapped[str] = mapped_column(String(20), nullable=False, default="validated")

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # live | partial | failed
    result: Mapped[str | None] = mapped_column(String(20), nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)


class PublishSchedule(Base):
    __tablename__ = "publish_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    item_type: Mapped[str] = mapped_column(String(20), nullable=False)
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone_note: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    # scheduled | published | cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
