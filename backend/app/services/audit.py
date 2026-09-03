"""Audit log helper — write a single row per content change."""
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_change(
    db: AsyncSession,
    actor_email: str,
    entity_type: str,
    entity_id: str,
    action: str,
    before: Any = None,
    after: Any = None,
) -> None:
    """Write one audit log row. Snapshots are JSON-serialized."""
    entry = AuditLog(
        actor_email=actor_email,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        before=json.dumps(before, default=str) if before is not None else None,
        after=json.dumps(after, default=str) if after is not None else None,
    )
    db.add(entry)
