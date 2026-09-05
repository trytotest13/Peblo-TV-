"""Content concern and support feedback report router."""
import logging
import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/report", tags=["report"])


class ContentReportRequest(BaseModel):
    category: str = Field(..., max_length=50, description="Category of report (e.g. content_issue, bug, privacy)")
    target_id: str | None = Field(None, max_length=100, description="ID or slug of show/episode if applicable")
    reporter_email: EmailStr | None = Field(None, description="Optional contact email for follow-up")
    description: str = Field(..., min_length=5, max_length=2000, description="Detailed explanation")


class ContentReportResponse(BaseModel):
    status: str
    report_id: str
    message: str


@router.post("", response_model=ContentReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_content_report(payload: ContentReportRequest):
    """Submit a content concern or support report."""
    if not payload.description.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description cannot be empty or whitespace only.",
        )
    report_id = f"rpt-{uuid.uuid4().hex[:12]}"
    logger.info(
        "Content report received [id=%s, category=%s, target=%s]",
        report_id,
        payload.category,
        payload.target_id,
    )
    return ContentReportResponse(
        status="received",
        report_id=report_id,
        message="Thank you for submitting your feedback. Our safety team will review it.",
    )
