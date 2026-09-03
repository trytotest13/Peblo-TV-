"""Admin endpoints — validation report and audit log."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin
from app.db import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogRead
from app.schemas.catalog import ValidationReport
from app.services.validation_report import build_validation_report

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/validation-report", response_model=ValidationReport)
async def get_validation_report(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Return everything currently blocking publish, grouped by show.

    Editors can fix issues without asking an engineer.
    """
    return await build_validation_report(db)


@router.get("/audit-log", response_model=list[AuditLogRead])
async def get_audit_log(
    entity_type: str | None = Query(None, description="Filter by show/season/episode"),
    entity_id: str | None = Query(None, description="Filter by entity ID"),
    actor_email: str | None = Query(None, description="Filter by who made the change"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Return the audit log, newest first. Admin-only — this is who-changed-what history.
    """
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if actor_email:
        stmt = stmt.where(AuditLog.actor_email == actor_email)
    result = await db.execute(stmt)
    return [AuditLogRead.model_validate(r) for r in result.scalars().all()]
