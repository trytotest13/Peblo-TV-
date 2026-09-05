"""Tests for the content concern report endpoint."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_submit_report_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/report",
            json={
                "category": "content_issue",
                "target_id": "episode-123",
                "reporter_email": "parent@example.com",
                "description": "The audio playback stops unexpectedly at 2:00 mark.",
            },
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "received"
    assert data["report_id"].startswith("rpt-")


@pytest.mark.asyncio
async def test_submit_report_validation_error():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/report",
            json={
                "category": "bug",
                "description": "   ",
            },
        )
    assert resp.status_code == 422
