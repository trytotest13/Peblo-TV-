"""Tests for the catalog builder — the trickiest business logic.

We seed a tiny in-memory database with one show, two seasons,
and two language variants of the same episode (sharing content_group).
The builder should collapse them into one catalogue entry.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.services.catalog import build_catalog


@pytest.mark.asyncio
async def test_content_group_collapses_into_one_entry(db_session: AsyncSession):
    """Two episodes sharing content_group but different languages → ONE entry with languages list."""
    show = Show(
        slug="test-show",
        title="Test Show",
        synopsis="For testing",
        section="featured",
        categories=["adventure"],
        status="published",
    )
    db_session.add(show)
    await db_session.flush()

    s1 = Season(show_id=show.id, season_number=1, title="S1")
    db_session.add(s1)
    await db_session.flush()

    # English variant
    en = Episode(
        season_id=s1.id,
        slug="test-s01e01-en",
        title="Episode 1",
        episode_number=1,
        duration_seconds=300,
        language="en",
        content_group="test-s01e01",
        status="published",
    )
    # Hindi variant of the SAME episode
    hi = Episode(
        season_id=s1.id,
        slug="test-s01e01-hi",
        title="Episode 1",
        episode_number=1,
        duration_seconds=300,
        language="hi",
        content_group="test-s01e01",
        status="published",
    )
    db_session.add_all([en, hi])
    await db_session.commit()

    catalog = await build_catalog(db_session)
    assert len(catalog.shows) == 1

    show_entry = catalog.shows[0]
    assert len(show_entry.seasons) == 1
    season_entry = show_entry.seasons[0]
    assert len(season_entry.episodes) == 1, "Two language variants should collapse into ONE entry"

    ep = season_entry.episodes[0]
    assert len(ep.languages) == 2
    langs = {l.language for l in ep.languages}
    assert langs == {"en", "hi"}


@pytest.mark.asyncio
async def test_season_zero_excluded(db_session: AsyncSession):
    """Season 0 is for trailers — must NOT appear in normal catalogue."""
    show = Show(
        slug="trailer-show", title="Trailer Show", section="series",
        categories=[], status="published",
    )
    db_session.add(show)
    await db_session.flush()

    s0 = Season(show_id=show.id, season_number=0, title="Trailers")
    s1 = Season(show_id=show.id, season_number=1, title="Season 1")
    db_session.add_all([s0, s1])
    await db_session.flush()

    trailer = Episode(
        season_id=s0.id, slug="t1-en", title="Trailer",
        episode_number=1, language="en", content_group="t1",
        duration_seconds=30, status="published",
    )
    real_ep = Episode(
        season_id=s1.id, slug="e1-en", title="Episode 1",
        episode_number=1, language="en", content_group="e1",
        duration_seconds=300, status="published",
    )
    db_session.add_all([trailer, real_ep])
    await db_session.commit()

    catalog = await build_catalog(db_session)
    show_entry = catalog.shows[0]
    season_numbers = [s.season_number for s in show_entry.seasons]
    assert 0 not in season_numbers, "Season 0 (trailers) should be excluded"
    assert 1 in season_numbers


@pytest.mark.asyncio
async def test_unpublished_shows_excluded(db_session: AsyncSession):
    show_p = Show(slug="p", title="Pub", section="series", categories=[], status="published")
    show_d = Show(slug="d", title="Draft", section="series", categories=[], status="draft")
    db_session.add_all([show_p, show_d])
    await db_session.commit()

    catalog = await build_catalog(db_session)
    slugs = {s.slug for s in catalog.shows}
    assert "p" in slugs
    assert "d" not in slugs, "Draft shows should not appear in the published catalogue"


@pytest.mark.asyncio
async def test_unpublished_episodes_excluded(db_session: AsyncSession):
    show = Show(slug="x", title="X", section="series", categories=[], status="published")
    db_session.add(show)
    await db_session.flush()
    s = Season(show_id=show.id, season_number=1, title="S1")
    db_session.add(s)
    await db_session.flush()
    pub = Episode(season_id=s.id, slug="e1", title="E1", episode_number=1,
                  language="en", content_group="g1", duration_seconds=100, status="published")
    draft = Episode(season_id=s.id, slug="e2", title="E2", episode_number=2,
                    language="en", content_group="g2", duration_seconds=100, status="draft")
    db_session.add_all([pub, draft])
    await db_session.commit()

    catalog = await build_catalog(db_session)
    eps = catalog.shows[0].seasons[0].episodes
    titles = {e.title for e in eps}
    assert "E1" in titles
    assert "E2" not in titles


@pytest.mark.asyncio
async def test_seasons_sorted_deterministically(db_session: AsyncSession):
    """Seasons must appear in season_number order, not insertion order."""
    show = Show(slug="y", title="Y", section="series", categories=[], status="published")
    db_session.add(show)
    await db_session.flush()
    # Insert out of order
    for n in [3, 1, 2]:
        s = Season(show_id=show.id, season_number=n, title=f"S{n}")
        db_session.add(s)
        await db_session.flush()
        ep = Episode(season_id=s.id, slug=f"e{n}", title=f"E{n}", episode_number=1,
                     language="en", content_group=f"g{n}", duration_seconds=100, status="published")
        db_session.add(ep)
    await db_session.commit()

    catalog = await build_catalog(db_session)
    seasons = catalog.shows[0].seasons
    assert [s.season_number for s in seasons] == [1, 2, 3]
