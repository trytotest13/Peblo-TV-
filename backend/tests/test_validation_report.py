"""Tests for the validation report builder.

The validation report is what an editor uses to figure out what to fix
before they can publish. It must surface every missing piece grouped
by show.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.services.validation_report import build_validation_report


@pytest.mark.asyncio
async def test_empty_db_reports_clean(db_session: AsyncSession):
    report = await build_validation_report(db_session)
    assert report.can_publish is True
    assert report.issues == []


@pytest.mark.asyncio
async def test_published_episode_without_duration_flagged(db_session: AsyncSession):
    show = Show(slug="a", title="A", section="series", categories=[], status="published")
    db_session.add(show)
    await db_session.flush()
    s = Season(show_id=show.id, season_number=1, title="S1")
    db_session.add(s)
    await db_session.flush()
    ep = Episode(
        season_id=s.id, slug="e1", title="E1", episode_number=1,
        language="en", content_group="g1", duration_seconds=None, status="published",
    )
    db_session.add(ep)
    await db_session.commit()

    report = await build_validation_report(db_session)
    assert not report.can_publish
    kinds = {i.kind for i in report.issues}
    assert "missing_duration" in kinds


@pytest.mark.asyncio
async def test_draft_episode_with_missing_artwork_not_flagged(db_session: AsyncSession):
    """Only published episodes need artwork; drafts are not blocking."""
    from app.models.artwork import Artwork

    show = Show(slug="b", title="B", section="series", categories=[], status="published")
    db_session.add(show)
    await db_session.flush()
    # Add show-level artwork so the show doesn't trigger missing_artwork
    for art_type in ("poster", "banner", "thumbnail"):
        db_session.add(Artwork(
            show_id=show.id, episode_id=None, artwork_type=art_type,
            storage_key=f"x/{art_type}.jpg", width_px=600, height_px=900, file_size_kb=10,
        ))
    s = Season(show_id=show.id, season_number=1, title="S1")
    db_session.add(s)
    await db_session.flush()
    ep = Episode(
        season_id=s.id, slug="e1", title="E1", episode_number=1,
        language="en", content_group="g1", duration_seconds=300, status="draft",
    )
    db_session.add(ep)
    await db_session.commit()

    report = await build_validation_report(db_session)
    # Draft episode missing artwork shouldn't generate missing_artwork issues
    kinds = {i.kind for i in report.issues}
    assert "missing_artwork" not in kinds, f"Draft episode shouldn't need artwork, got: {report.issues}"


@pytest.mark.asyncio
async def test_published_show_missing_section_flagged(db_session: AsyncSession):
    # A published show with empty section should appear
    show = Show(slug="c", title="C", section="", categories=[], status="published")
    db_session.add(show)
    await db_session.commit()

    report = await build_validation_report(db_session)
    no_section = [i for i in report.issues if i.kind == "no_section"]
    assert len(no_section) == 1
    assert no_section[0].show_slug == "c"
