"""Tests for the search endpoint.

Verifies that q matches show title, episode title, and category,
and that filters compose correctly.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show


async def _seed_test_data(db_session):
    """Create one published show with one season and two episodes."""
    show = Show(
        slug="searchable-show",
        title="Searchable Adventures",
        synopsis="For testing search",
        section="series",
        categories=["adventure", "india"],
        status="published",
    )
    db_session.add(show)
    await db_session.flush()

    s1 = Season(show_id=show.id, season_number=1, title="Season 1")
    db_session.add(s1)
    await db_session.flush()

    ep1 = Episode(
        season_id=s1.id,
        slug="searchable-s01e01",
        title="The Flying Kite Adventure",
        episode_number=1,
        duration_seconds=300,
        language="en",
        content_group="searchable-s01e01",
        status="published",
    )
    ep2 = Episode(
        season_id=s1.id,
        slug="searchable-s01e02",
        title="Mountain Climbing",
        episode_number=2,
        duration_seconds=300,
        language="en",
        content_group="searchable-s01e02",
        status="published",
    )
    db_session.add_all([ep1, ep2])
    await db_session.commit()


@pytest.mark.asyncio
async def test_search_matches_show_title(db_session):
    await _seed_test_data(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=Searchable")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    slugs = {s["slug"] for s in data["results"]}
    assert "searchable-show" in slugs


@pytest.mark.asyncio
async def test_search_matches_episode_title(db_session):
    """q must match episode titles (Part A item 6)."""
    await _seed_test_data(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=Kite")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    slugs = {s["slug"] for s in data["results"]}
    assert "searchable-show" in slugs


@pytest.mark.asyncio
async def test_search_matches_category(db_session):
    await _seed_test_data(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=adventure")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_search_composes_with_section_filter(db_session):
    """Section filter should narrow results."""
    await _seed_test_data(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=Searchable&section=series")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1

    # Wrong section should return zero
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=Searchable&section=minisodes")
    data = r.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_search_composes_with_language_filter(db_session):
    """Language filter should narrow to shows with episodes in that language."""
    await _seed_test_data(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=Kite&language=en")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1

    # No Hindi episodes
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/catalog/search?q=Kite&language=hi")
    data = r.json()
    assert data["total"] == 0
