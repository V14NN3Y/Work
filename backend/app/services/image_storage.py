import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image

from app.config import settings

MAX_DIMENSION = 1600
WEBP_QUALITY = 80
PRODUCTS_SUBDIR = "products"


def _products_dir() -> Path:
    directory = Path(settings.upload_dir) / PRODUCTS_SUBDIR
    directory.mkdir(parents=True, exist_ok=True)
    return directory


async def save_product_image(file: UploadFile) -> str:
    """Resize/convert an uploaded image to WebP and persist it to local disk.

    Returns the public URL path (served via the /uploads static mount).
    """
    image = Image.open(file.file)
    image = image.convert("RGB")
    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION))

    filename = f"{uuid.uuid4()}.webp"
    destination = _products_dir() / filename
    image.save(destination, format="WEBP", quality=WEBP_QUALITY)

    return f"/uploads/{PRODUCTS_SUBDIR}/{filename}"


def delete_product_image(image_url: str) -> None:
    filename = Path(image_url).name
    path = _products_dir() / filename
    path.unlink(missing_ok=True)
