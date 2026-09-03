"""Pytest config — patches the app's engine with a fresh in-memory SQLite per test.

Strategy: We replace `app.db.async_engine` and `AsyncSessionLocal` with
per-test in-memory engines. Because the app imports `get_db` at request
time, this swap is enough to redirect all queries to the test DB.
"""
import asyncio
import os
import sys
from pathlib import Path

# Force test settings BEFORE any app imports
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SYNC_DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")

# Make backend/ importable
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.db import Base
import app.models.show  # noqa
import app.models.season  # noqa
import app.models.episode  # noqa
import app.models.artwork  # noqa
import app.models.publish_run  # noqa
import app.models.user  # noqa


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_engine():
    """Fresh in-memory engine per test, with all tables created."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Patch the app to use this engine
    import app.db as appdb
    from app.db import AsyncSessionLocal
    saved_engine = appdb.async_engine
    saved_session = appdb.AsyncSessionLocal
    appdb.async_engine = engine
    appdb.AsyncSessionLocal = async_sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )

    yield engine

    # Restore
    appdb.async_engine = saved_engine
    appdb.AsyncSessionLocal = saved_session
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Session for direct DB access in tests (build_catalog, etc)."""
    from app.db import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_engine):
    """HTTP client wired to the in-memory test app."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
