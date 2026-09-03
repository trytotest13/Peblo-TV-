"""Tests for the strict artwork validation rules.

These are the most error-prone rules — the API rejects uploads that
don't match the spec from reference.json. We test each of the three
artwork types with valid, oversized, and wrong-aspect files.
"""
import io
import struct

import pytest
from PIL import Image

from app.services.validation import validate_artwork, ARTWORK_SPECS


def make_jpeg(width: int, height: int, size_kb: int | None = None) -> bytes:
    """Generate a JPEG with the given dimensions. Optionally pad to size."""
    img = Image.new("RGB", (width, height), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    data = buf.getvalue()

    # Pad to target size (just to test the size limit, padding with zeros
    # is fine — the validator only checks the byte count).
    if size_kb is not None and len(data) < size_kb * 1024:
        data = data + b"\0" * (size_kb * 1024 - len(data))
    return data


def test_poster_valid_600x900():
    result = validate_artwork("poster", make_jpeg(600, 900))
    assert result.valid, f"Expected valid, got errors: {result.errors}"
    assert result.width_px == 600
    assert result.height_px == 900


def test_poster_rejects_wrong_aspect():
    result = validate_artwork("poster", make_jpeg(900, 600))  # 3:2 instead of 2:3
    assert not result.valid
    assert any("ratio" in e for e in result.errors)


def test_banner_valid_1280x720():
    result = validate_artwork("banner", make_jpeg(1280, 720))
    assert result.valid


def test_banner_rejects_wrong_aspect():
    result = validate_artwork("banner", make_jpeg(1920, 800))
    assert not result.valid
    assert any("ratio" in e for e in result.errors)


def test_thumbnail_valid_640x360():
    result = validate_artwork("thumbnail", make_jpeg(640, 360))
    assert result.valid


def test_thumbnail_rejects_oversize():
    """A 1MB image should be rejected even if dimensions are correct."""
    result = validate_artwork("thumbnail", make_jpeg(640, 360, size_kb=300))
    assert not result.valid
    assert any("KB" in e or "compress" in e for e in result.errors)


def test_rejects_unknown_artwork_type():
    result = validate_artwork("hero", b"anything")
    assert not result.valid
    assert any("Unknown artwork type" in e for e in result.errors)


def test_rejects_corrupt_image():
    result = validate_artwork("poster", b"not an image at all")
    assert not result.valid
    assert any("Could not read" in e or "valid JPEG" in e for e in result.errors)


def test_error_messages_are_human_readable():
    """The challenge says: 'reject with errors a non-technical editor can act on'."""
    result = validate_artwork("poster", make_jpeg(1920, 1080))
    assert not result.valid
    # Should mention px, ratio, and required dimensions
    joined = " ".join(result.errors).lower()
    assert "1920" in joined
    assert "2:3" in joined or "600" in joined


def test_aspect_tolerance_5_percent():
    """A 590x900 image (slightly off 2:3) should still pass — we allow 5% tolerance."""
    result = validate_artwork("poster", make_jpeg(590, 900))
    # 590/900 = 0.655..., 2/3 = 0.667, diff ~1.6% — should pass
    assert result.valid, f"Should tolerate slight ratio mismatch: {result.errors}"
