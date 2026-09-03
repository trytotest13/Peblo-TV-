"""Shared enums and constants used across schemas."""
from typing import Literal

# Re-export raw tuples for any code that uses them as plain data
from app.models.show import ALLOWED_CATEGORIES, ALLOWED_SECTIONS
from app.models.episode import ALLOWED_LANGUAGES
from app.models.artwork import ARTWORK_TYPES

# Literal types for Pydantic annotations
ALLOWED_SECTIONS_TYPE = Literal["featured", "series", "minisodes", "songs"]
ALLOWED_CATEGORIES_TYPE = Literal[
    "adventure", "folk", "friendship", "india", "language", "learning",
    "maths", "music", "nature", "reading", "science", "singalong",
    "stories", "travel", "values",
]
ALLOWED_LANGUAGES_TYPE = Literal["en", "hi"]
ARTWORK_TYPES_TYPE = Literal["poster", "banner", "thumbnail"]

__all__ = [
    "ALLOWED_SECTIONS",
    "ALLOWED_CATEGORIES",
    "ALLOWED_LANGUAGES",
    "ARTWORK_TYPES",
    "ALLOWED_SECTIONS_TYPE",
    "ALLOWED_CATEGORIES_TYPE",
    "ALLOWED_LANGUAGES_TYPE",
    "ARTWORK_TYPES_TYPE",
]
