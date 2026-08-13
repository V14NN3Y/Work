from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import (
    admin_categories,
    admin_orders,
    admin_products,
    admin_promo_codes,
    admin_reviews,
    auth,
    categories,
    orders,
    products,
    promo_codes,
    reviews,
)

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="E-commerce Autonome API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(products.router)
app.include_router(categories.router)
app.include_router(orders.router)
app.include_router(reviews.router)
app.include_router(promo_codes.router)
app.include_router(auth.router)
app.include_router(admin_products.router)
app.include_router(admin_categories.router)
app.include_router(admin_orders.router)
app.include_router(admin_reviews.router)
app.include_router(admin_promo_codes.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
