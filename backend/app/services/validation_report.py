"""Validation report builder.

Surfaces everything currently blocking publish, grouped by show so an editor
can fix it without asking an engineer.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.schemas import ARTWORK_TYPES
from app.schemas.catalog import ValidationIssue, ValidationReport


async def build_validation_report(db: AsyncSession) -> ValidationReport:
    issues: list[ValidationIssue] = []

    # All shows (regardless of status) — we want to find issues even on drafts
    show_stmt = (
        select(Show)
        .options(
            selectinload(Show.artwork),
            selectinload(Show.seasons).selectinload(Season.episodes).selectinload(Episode.artwork),
        )
    )
    result = await db.execute(show_stmt)
    shows = result.scalars().all()

    total_episodes = 0
    for show in shows:
        # 1. Published show must have a section
        if show.status == "published" and not show.section:
            issues.append(
                ValidationIssue(
                    show_slug=show.slug,
                    kind="no_section",
                    message=f"Show '{show.title}' is published but has no section.",
                )
            )

        # 2. Show-level artwork (banner for hero)
        for art_type in ARTWORK_TYPES:
            if not any(a.artwork_type == art_type for a in show.artwork):
                issues.append(
                    ValidationIssue(
                        show_slug=show.slug,
                        kind="missing_artwork",
                        message=f"Show '{show.title}' is missing {art_type} artwork.",
                    )
                )

        for season in show.seasons:
            for ep in season.episodes:
                total_episodes += 1

                # 3. Episode can't be published without duration
                if ep.status == "published" and (ep.duration_seconds is None or ep.duration_seconds <= 0):
                    issues.append(
                        ValidationIssue(
                            show_slug=show.slug,
                            season_number=season.season_number,
                            episode_slug=ep.slug,
                            kind="missing_duration",
                            message=(
                                f"Episode '{ep.title}' (S{season.season_number}E{ep.episode_number}) "
                                "is published but has no duration."
                            ),
                        )
                    )

                # 4. Episode can't be published without artwork (poster, banner, thumbnail)
                for art_type in ARTWORK_TYPES:
                    if ep.status == "published" and not any(
                        a.artwork_type == art_type for a in ep.artwork
                    ):
                        issues.append(
                            ValidationIssue(
                                show_slug=show.slug,
                                season_number=season.season_number,
                                episode_slug=ep.slug,
                                kind="missing_artwork",
                                message=(
                                    f"Episode '{ep.title}' (S{season.season_number}E{ep.episode_number}) "
                                    f"is missing {art_type} artwork."
                                ),
                            )
                        )

    return ValidationReport(
        total_shows=len(shows),
        total_episodes=total_episodes,
        issues=issues,
        can_publish=len(issues) == 0,
    )
