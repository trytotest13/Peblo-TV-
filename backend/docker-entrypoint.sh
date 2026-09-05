#!/bin/bash
set -e

cd /app

echo "[entrypoint] Applying database migrations..."
alembic upgrade head
echo "[entrypoint] Database migrations complete."

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

echo "[entrypoint] Publishing catalog JSON..."
python -c "
import asyncio
import json
import os
from app.db import AsyncSessionLocal
from app.services.catalog import build_catalog
from app.config import get_settings

async def main():
    async with AsyncSessionLocal() as db:
        settings = get_settings()
        cat = await build_catalog(db)
        live_path = os.path.join(settings.local_storage_path, settings.catalog_filename)
        os.makedirs(os.path.dirname(live_path) or '.', exist_ok=True)
        with open(live_path, 'w') as f:
            json.dump(cat.model_dump(mode='json'), f, indent=2)
        print(f'[entrypoint] Catalog published with {len(cat.shows)} shows.')

asyncio.run(main())
"

echo "[entrypoint] Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
