"""Publish queue / schedule / history schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PublishJobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    item_type: str = Field(pattern="^(show|episode|catalogue)$")
    item_id: UUID | None = None


class PublishJobRead(BaseModel):
    id: UUID
    title: str
    item_type: str
    item_id: UUID | None
    requested_by: str
    requested_at: datetime
    validation_status: str
    published_at: datetime | None
    duration_ms: int | None
    result: str | None
    error_detail: str | None
    # Computed live from the validation report on read
    issues: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PublishScheduleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    item_type: str = Field(pattern="^(show|episode|catalogue)$")
    item_id: UUID | None = None
    scheduled_for: datetime
    timezone_note: str | None = Field(default=None, max_length=100)


class PublishScheduleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    scheduled_for: datetime | None = None
    timezone_note: str | None = Field(default=None, max_length=100)


class PublishScheduleRead(BaseModel):
    id: UUID
    title: str
    item_type: str
    item_id: UUID | None
    scheduled_for: datetime
    timezone_note: str | None
    created_by: str
    status: str
    last_error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class HistoryItem(BaseModel):
    title: str
    item_type: str
    published_at: datetime | None
    published_by: str
    duration_ms: int | None
    # live | partial | failed
    result: str
    error_detail: str | None = None


class HistoryPage(BaseModel):
    items: list[HistoryItem]
    total: int
    cursor: int
