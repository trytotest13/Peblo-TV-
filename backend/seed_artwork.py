"""
Artwork seeder: copies the example images from documaent/ to local storage
and creates matching Artwork rows for every show and every published episode.

This bypasses the strict /artwork/upload validation because the images are
shipped with the project and known to be valid. The seeder is idempotent —
re-running will not create duplicates.
"""
import asyncio
import shutil
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.models.artwork import Artwork
from app.models.episode import Episode
from app.models.show import Show

ROOT = Path(__file__).parent
DOCS = ROOT / "documaent"
if not DOCS.exists():
    DOCS = ROOT.parent / "documaent"

STORAGE = ROOT / "storage"
ARTWORK_DIR = STORAGE / "artwork"

# (filename in documaent, artwork_type, target_width, target_height)
ARTWORK_FILES = [
    ("poster_good.jpg",   "poster",    600, 900),
    ("banner_good.jpg",   "banner",   1280, 720),
    ("thumb_good.jpg",    "thumbnail", 640, 360),
]


def copy_to_storage(filename: str, artwork_type: str) -> str:
    """Copy an image into storage and return the storage key."""
    src = DOCS / filename
    if not src.exists():
        raise FileNotFoundError(f"Missing asset: {src}")

    ext = src.suffix
    key = f"artwork/{artwork_type}/{uuid.uuid4()}{ext}"
    dest = STORAGE / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    return key


async def seed_artwork_for(db: AsyncSession, show: Show | None = None, episode: Episode | None = None):
    """Create poster/banner/thumbnail artwork rows for a show or episode."""
    for filename, art_type, w, h in ARTWORK_FILES:
        # Skip if already exists
        stmt = select(Artwork).where(Artwork.artwork_type == art_type)
        stmt = stmt.where(
            Artwork.show_id == (show.id if show else None),
            Artwork.episode_id == (episode.id if episode else None),
        )
        existing = await db.execute(stmt)
        if existing.scalar_one_or_none():
            continue

        key = copy_to_storage(filename, art_type)
        file_size_kb = (STORAGE / key).stat().st_size // 1024
        db.add(
            Artwork(
                show_id=show.id if show else None,
                episode_id=episode.id if episode else None,
                artwork_type=art_type,
                storage_key=key,
                width_px=w,
                height_px=h,
                file_size_kb=file_size_kb,
            )
        )


async def seed_artwork_for_show(db: AsyncSession, show: Show):
    await seed_artwork_for(db, show=show)


async def seed_artwork_for_episode(db: AsyncSession, episode: Episode):
    await seed_artwork_for(db, episode=episode)


async def main():
    if not DOCS.exists():
        print(f"[seed_artwork] Fixtures directory {DOCS} not found. Skipping artwork seeding.")
        return

    async with AsyncSessionLocal() as db:
        shows = (await db.execute(select(Show))).scalars().all()
        episodes = (await db.execute(select(Episode))).scalars().all()

        print(f"Seeding artwork for {len(shows)} shows, {len(episodes)} episodes...")

        for show in shows:
            await seed_artwork_for_show(db, show)
            print(f"  ✓ {show.title}")

        for ep in episodes:
            await seed_artwork_for_episode(db, ep)

        await db.commit()
        print(f"\n✅ Artwork seeded: {len(shows) * 3} show images, {len(episodes) * 3} episode images.")


if __name__ == "__main__":
    asyncio.run(main())
