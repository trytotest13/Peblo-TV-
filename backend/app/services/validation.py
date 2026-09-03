"""Artwork validation against reference.json specs."""
import io
from dataclasses import dataclass

from PIL import Image

ARTWORK_SPECS = {
    "poster": {
        "aspect": (2, 3),
        "target_px": (600, 900),
        "max_kb": 200,
    },
    "banner": {
        "aspect": (16, 9),
        "target_px": (1280, 720),
        "max_kb": 200,
    },
    "thumbnail": {
        "aspect": (16, 9),
        "target_px": (640, 360),
        "max_kb": 200,
    },
}


@dataclass
class ArtworkValidationResult:
    valid: bool
    errors: list[str]
    width_px: int
    height_px: int
    file_size_kb: int


def validate_artwork(artwork_type: str, file_bytes: bytes) -> ArtworkValidationResult:
    """Validate an uploaded image against the spec for `artwork_type`.

    Errors are human-readable and actionable by a non-technical editor.
    """
    errors: list[str] = []
    specs = ARTWORK_SPECS.get(artwork_type)

    if specs is None:
        return ArtworkValidationResult(
            valid=False,
            errors=[f"Unknown artwork type '{artwork_type}'. Valid types: {list(ARTWORK_SPECS.keys())}"],
            width_px=0,
            height_px=0,
            file_size_kb=0,
        )

    file_size_kb = len(file_bytes) // 1024

    # File size check
    if file_size_kb > specs["max_kb"]:
        errors.append(
            f"File is {file_size_kb} KB — must be {specs['max_kb']} KB or smaller. "
            "Please compress the image before uploading."
        )

    # Image dimensions check
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size
    except Exception:
        errors.append("Could not read image dimensions. Please upload a valid JPEG or PNG file.")
        return ArtworkValidationResult(
            valid=False,
            errors=errors,
            width_px=0,
            height_px=0,
            file_size_kb=file_size_kb,
        )

    # Aspect ratio check (allow ±5% tolerance)
    expected_ratio = specs["aspect"][0] / specs["aspect"][1]
    actual_ratio = width / height
    ratio_tolerance = 0.05

    if abs(actual_ratio - expected_ratio) > ratio_tolerance:
        errors.append(
            f"Image is {width}×{height} (ratio {actual_ratio:.2f}). "
            f"Required ratio is {specs['aspect'][0]}:{specs['aspect'][1]} "
            f"(≈{expected_ratio:.2f}). Please resize or crop."
        )

    return ArtworkValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        width_px=width,
        height_px=height,
        file_size_kb=file_size_kb,
    )
