"""Database engine, session factory, and Base class.

We expose both an async session (for the FastAPI request path) and a sync
session helper (used by the seeder and the publish job which needs to drive
multiple transactions deterministically).
"""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""


_settings = get_settings()
_async_url = _settings.async_database_url

# Supabase Supavisor runs in transaction mode and cannot hold prepared
# statements — disable asyncpg's statement cache, but only on pooler URLs.
_connect_args = (
    {"statement_cache_size": 0}
    if ":6543" in _async_url or "pooler" in _async_url
    else {}
)

async_engine = create_async_engine(
    _async_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields an async session and ensures cleanup."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
