"""Catalog builder.

This module is responsible for turning the relational state of the database
into the flat published catalogue JSON. Two important rules:

  1. Only shows with status='published' AND only episodes with
     status='published' appear in the output.
  2. Episodes sharing a `content_group` are collapsed into a single
     catalogue entry whose `languages` list enumerates the available
     language variants.
"""
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.artwork import Artwork
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show
from app.schemas.catalog import (
    CatalogDocument,
    EpisodeCatalogEntry,
    LanguageVariant,
    SeasonCatalogEntry,
    ShowCatalogEntry,
)
from app.services.storage import get_storage_instance


async def build_catalog(db: AsyncSession) -> CatalogDocument:
    """Read the published subset of the database and return a CatalogDocument."""
    storage = get_storage_instance()

    # Pull all published shows with their seasons/episodes/artwork.
    stmt = (
        select(Show)
        .where(Show.status == "published")
        .options(
            selectinload(Show.artwork),
            selectinload(Show.seasons).selectinload(Season.episodes).selectinload(Episode.artwork),
        )
        .order_by(Show.title)
    )
    result = await db.execute(stmt)
    shows = result.scalars().all()

    catalog_shows: list[ShowCatalogEntry] = []

    for show in shows:
        # Skip shows missing a section (shouldn't be published, but be safe)
        if not show.section:
            continue

        # Build a map from artwork_type -> url
        show_artwork = _artwork_url_map(show.artwork, storage)

        seasons_out: list[SeasonCatalogEntry] = []
        for season in sorted(show.seasons, key=lambda s: s.season_number):
            published_eps = [e for e in season.episodes if e.status == "published"]

            # Skip Season 0 (trailers) — viewer handles trailers separately
            if season.season_number == 0:
                continue

            # Group episodes by content_group
            grouped: dict[str, list[Episode]] = defaultdict(list)
            for ep in published_eps:
                grouped[ep.content_group].append(ep)

            episode_entries: list[EpisodeCatalogEntry] = []
            for group_id, variants in grouped.items():
                # Use the first variant as the canonical entry
                canonical = variants[0]
                languages = [
                    LanguageVariant(
                        language=v.language,
                        episode_slug=v.slug,
                        duration_seconds=v.duration_seconds,
                    )
                    for v in variants
                ]
                # Episode-level artwork: prefer the first variant's artwork
                ep_artwork = _artwork_url_map(canonical.artwork, storage)

                episode_entries.append(
                    EpisodeCatalogEntry(
                        slug=canonical.slug,
                        title=canonical.title,
                        synopsis=canonical.synopsis,
                        episode_number=canonical.episode_number,
                        season_number=season.season_number,
                        languages=languages,
                        poster_url=ep_artwork.get("poster"),
                        banner_url=ep_artwork.get("banner"),
                        thumbnail_url=ep_artwork.get("thumbnail"),
                    )
                )

            # Sort by episode_number deterministically
            episode_entries.sort(key=lambda e: e.episode_number)

            seasons_out.append(
                SeasonCatalogEntry(
                    season_number=season.season_number,
                    title=season.title,
                    episodes=episode_entries,
                )
            )

        # Deterministic ordering: seasons by season_number
        seasons_out.sort(key=lambda s: s.season_number)

        catalog_shows.append(
            ShowCatalogEntry(
                slug=show.slug,
                title=show.title,
                synopsis=show.synopsis,
                section=show.section,
                categories=show.categories or [],
                seasons=seasons_out,
                poster_url=show_artwork.get("poster"),
                banner_url=show_artwork.get("banner"),
                thumbnail_url=show_artwork.get("thumbnail"),
            )
        )

    return CatalogDocument(
        generated_at=datetime.now(timezone.utc),
        shows=catalog_shows,
    )


def _artwork_url_map(artworks: list[Artwork], storage) -> dict[str, str]:
    """Map artwork_type -> url for a list of Artwork rows."""
    out: dict[str, str] = {}
    for art in artworks:
        if art.artwork_type not in out:
            out[art.artwork_type] = storage.url(art.storage_key)
    return out
