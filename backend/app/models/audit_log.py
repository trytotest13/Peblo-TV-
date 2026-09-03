"""Audit log — tracks who changed what and when."""
import uuid
from datetime import datetime

from sqlalchemy import CHAR, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AuditLog(Base):
    """Immutable log of content changes.

    One row is written per create / update / delete of a show, season,
    or episode. The ``before`` and ``after`` columns hold a JSON snapshot
    of the resource before and after the change.
    """

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Who
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # What entity
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)  # show | season | episode
    entity_id: Mapped[str] = mapped_column(CHAR(36), nullable=False, index=True)

    # Action
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # created | updated | deleted

    # Snapshot
    before: Mapped[str | None] = mapped_column(Text, nullable=True)
    after: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
