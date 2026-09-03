"""Admin validation report."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_admin, get_current_user
from app.db import get_db
from app.models.user import User
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
