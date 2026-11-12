"""Upload validators for listing photos (rules §4)."""

from django.core.exceptions import ValidationError

MAX_IMAGE_BYTES = 1024 * 1024  # about 1 MB
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_image_size(image):
    if image.size > MAX_IMAGE_BYTES:
        raise ValidationError("Each photo must be 1 MB or smaller. Compress it and try again.")


def validate_image_format(image):
    """Check the actual image header, not just the file extension."""
    from PIL import Image, UnidentifiedImageError

    try:
        with Image.open(image) as opened:
            opened.verify()
            image_format = opened.format
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValidationError("This file is not a readable image.")

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Only JPG, PNG and WebP photos are allowed.")

    image.seek(0)
