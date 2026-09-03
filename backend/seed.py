"""
Seed script: loads the `seed_shows.json` and `reference.json` fixtures and
populates the database. Idempotent — running it twice will not duplicate data.

Usage: python seed.py
"""
import asyncio
import json
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models.episode import Episode
from app.models.season import Season
from app.models.show import Show

ROOT = Path(__file__).parent
# In Docker, /app/documaent is mounted from host's ./documaent
# In local dev, look one level up from backend/
SEED_FILE = ROOT / "documaent" / "seed_shows.json"
if not SEED_FILE.exists():
    SEED_FILE = ROOT.parent / "documaent" / "seed_shows.json"

REFERENCE_FILE = ROOT / "documaent" / "reference.json"
if not REFERENCE_FILE.exists():
    REFERENCE_FILE = ROOT.parent / "documaent" / "reference.json"


def build_slug(show_title: str, season: int, episode_num: int, language: str) -> str:
    base = show_title.lower().replace("'", "").replace(" ", "-")
    return f"{base}-s{season:02d}e{episode_num:02d}-{language}"


async def seed():
    with open(SEED_FILE) as f:
        seed_data = json.load(f)

    with open(REFERENCE_FILE) as f:
        ref = json.load(f)

    sections = set(ref["sections"])

    async with AsyncSessionLocal() as db:
        # Group rows by show_slug
        by_show: dict[str, list[dict]] = {}
        for row in seed_data:
            by_show.setdefault(row["slug"], []).append(row)

        for show_slug, rows in by_show.items():
            existing = await db.execute(
                select(Show).where(Show.slug == show_slug)
            )
            show = existing.scalar_one_or_none()

            if show is None:
                first = rows[0]
                if first.get("section") not in sections:
                    print(f"Skipping {show_slug}: invalid section '{first.get('section')}'")
                    continue
                show = Show(
                    slug=show_slug,
                    title=first["show_title"],
                    synopsis=first.get("synopsis"),
                    section=first["section"],
                    categories=first.get("categories", []),
                    status=first.get("status", "draft"),
                )
                db.add(show)
                await db.flush()
                print(f"Created show: {show.title}")

            # Group by season_number
            by_season: dict[int, list[dict]] = {}
            for row in rows:
                by_season.setdefault(row["season_number"], []).append(row)

            for season_num, season_rows in by_season.items():
                existing_season = await db.execute(
                    select(Season).where(
                        Season.show_id == show.id,
                        Season.season_number == season_num,
                    )
                )
                season = existing_season.scalar_one_or_none()
                if season is None:
                    season = Season(
                        show_id=show.id,
                        season_number=season_num,
                        title=f"Season {season_num}" if season_num > 0 else "Trailers",
                    )
                    db.add(season)
                    await db.flush()

                for row in season_rows:
                    content_group = row["content_group"]
                    language = row["language"]
                    # Idempotency: skip if (content_group, language) exists
                    existing_ep = await db.execute(
                        select(Episode).where(
                            Episode.content_group == content_group,
                            Episode.language == language,
                        )
                    )
                    if existing_ep.scalar_one_or_none():
                        continue

                    slug = build_slug(
                        row["show_title"],
                        season_num,
                        row["episode_number"],
                        language,
                    )
                    ep = Episode(
                        season_id=season.id,
                        slug=slug,
                        title=row["episode_title"],
                        synopsis=row.get("synopsis"),
                        episode_number=row["episode_number"],
                        duration_seconds=row.get("duration_seconds"),
                        language=language,
                        content_group=content_group,
                        status=row.get("status", "draft"),
                    )
                    db.add(ep)
                    print(f"  - {slug}")

        await db.commit()
        print("\n✅ Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
