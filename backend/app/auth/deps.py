"""FastAPI auth dependencies.

We use the `Annotated[X, Depends(...)]` pattern so ruff B008 (function-call-in-default)
stays happy and FastAPI still gets the dependency graph.
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_token
from app.db import get_db
from app.models.user import User

security = HTTPBearer()
DbSession = Annotated[AsyncSession, Depends(get_db)]
BearerCreds = Annotated[HTTPAuthorizationCredentials, Depends(security)]


async def get_current_user(
    credentials: BearerCreds,
    db: DbSession,
) -> User:
    """Return the current authenticated user, or raise 401."""
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str):
    """Dependency factory: require the user to have one of the given roles."""

    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {roles}",
            )
        return user

    return checker


# Convenience shortcuts
require_admin = require_role("admin")
require_editor = require_role("editor", "admin")
