"""Seed the database with demo products (FCFA), including locally-generated
placeholder images (no external network dependency). Run with:
    python -m scripts.seed
"""
import asyncio
from pathlib import Path

from PIL import Image, ImageDraw

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.product import Product
from app.models.product_image import ProductImage

DEMO_PRODUCTS = [
    {
        "title": "Casque Bluetooth Sans Fil",
        "description": "Casque audio sans fil avec réduction de bruit active, autonomie 20h.",
        "price": 25000,
        "stock_quantity": 15,
        "color": (69, 90, 100),
    },
    {
        "title": "Montre Connectée Sport",
        "description": "Suivi d'activité, notifications, étanche, autonomie 7 jours.",
        "price": 35000,
        "stock_quantity": 8,
        "color": (38, 70, 83),
    },
    {
        "title": "Sac à Dos Urbain 25L",
        "description": "Compartiment laptop 15 pouces, résistant à l'eau, plusieurs poches.",
        "price": 18000,
        "stock_quantity": 20,
        "color": (42, 72, 105),
    },
    {
        "title": "Enceinte Portable Bluetooth",
        "description": "Son puissant 360°, étanche IPX7, autonomie 12h.",
        "price": 15000,
        "stock_quantity": 12,
        "color": (224, 138, 44),
    },
    {
        "title": "Chargeur Solaire Portable",
        "description": "Batterie externe 20000mAh avec panneau solaire intégré.",
        "price": 12000,
        "stock_quantity": 0,
        "color": (87, 117, 90),
    },
    {
        "title": "Lunettes de Soleil Polarisées",
        "description": "Protection UV400, monture légère incassable.",
        "price": 8000,
        "stock_quantity": 30,
        "color": (100, 65, 90),
    },
]


def generate_placeholder_image(title: str, color: tuple[int, int, int]) -> str:
    directory = Path(settings.upload_dir) / "products"
    directory.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGB", (800, 800), color=color)
    draw = ImageDraw.Draw(image)
    draw.text((40, 40), title, fill=(255, 255, 255))

    filename = f"seed-{abs(hash(title))}.webp"
    image.save(directory / filename, format="WEBP", quality=80)
    return f"/uploads/products/{filename}"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        for data in DEMO_PRODUCTS:
            image_url = generate_placeholder_image(data["title"], data["color"])
            product = Product(
                title=data["title"],
                description=data["description"],
                price=data["price"],
                stock_quantity=data["stock_quantity"],
                image_url=image_url,
            )
            product.images.append(ProductImage(image_url=image_url, display_order=0))
            db.add(product)
        await db.commit()
    print(f"Seeded {len(DEMO_PRODUCTS)} products.")


if __name__ == "__main__":
    asyncio.run(seed())
