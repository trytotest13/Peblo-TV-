"""FastAPI application entrypoint."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import AsyncSessionLocal, Base, async_engine
from app.models.user import User
from app.auth.security import hash_password
from app.routers import auth, shows, seasons, episodes, artwork, catalog, admin

# Import models so Base.metadata sees them when we run create_all
import app.models.show  # noqa: F401
import app.models.season  # noqa: F401
import app.models.episode  # noqa: F401
import app.models.artwork  # noqa: F401
import app.models.publish_run  # noqa: F401
import app.models.user  # noqa: F401

settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


async def bootstrap_admin():
    """Create the bootstrap admin user if no users exist."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none() is None:
            admin = User(
                email=settings.bootstrap_admin_email,
                hashed_password=hash_password(settings.bootstrap_admin_password),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            logger.info(f"Bootstrap admin created: {admin.email}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and bootstrap admin. Shutdown: dispose engine."""
    # Create all tables (in dev). In production, alembic migrations are used.
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await bootstrap_admin()
    yield
    await async_engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the CMS and viewer frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount /media for local storage
storage_path = Path(settings.local_storage_path)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(storage_path)), name="media")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": settings.app_name, "env": settings.app_env}


# Register routers
app.include_router(auth.router)
app.include_router(shows.router)
app.include_router(seasons.router)
app.include_router(episodes.router)
app.include_router(artwork.router)
app.include_router(catalog.router)
app.include_router(admin.router)
