#!/bin/bash
set -e

cd /app

echo "[entrypoint] Creating database tables (idempotent)..."
python -c "
import asyncio
from app.db import async_engine, Base
import app.models.show
import app.models.season
import app.models.episode
import app.models.artwork
import app.models.publish_run
import app.models.user

async def main():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await async_engine.dispose()
    print('[entrypoint] Tables ready.')

asyncio.run(main())
"

echo "[entrypoint] Seeding database if empty..."
python -c "
import asyncio
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models.show import Show

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Show).limit(1))
        if result.scalar_one_or_none() is None:
            print('[entrypoint] No shows found. Running seed...')
            import seed
            await seed.seed()
        else:
            print('[entrypoint] Shows already exist. Skipping seed.')

asyncio.run(main())
"

echo "[entrypoint] Seeding artwork if missing..."
python -c "
import asyncio
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app.models.artwork import Artwork

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Artwork).limit(1))
        if result.scalar_one_or_none() is None:
            print('[entrypoint] No artwork found. Running seed_artwork...')
            import seed_artwork
            await seed_artwork.main()
        else:
            print('[entrypoint] Artwork already exists. Skipping.')

asyncio.run(main())
"

echo "[entrypoint] Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
