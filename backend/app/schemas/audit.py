"""Audit log schema."""
from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: str
    actor_email: str
    entity_type: str
    entity_id: str
    action: str
    before: str | None
    after: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
