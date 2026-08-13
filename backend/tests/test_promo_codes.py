import asyncio
import uuid
from decimal import Decimal

from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.deps import get_db
from app.main import app
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.promo_code import DiscountType, PromoCode

from tests.conftest import test_engine


async def _create_product(client, admin_headers, **overrides):
    payload = {
        "title": "Produit Promo",
        "description": "Test",
        "price": "2000.00",
        "stock_quantity": 10,
        "image_url": "https://example.com/img.jpg",
    }
    payload.update(overrides)
    resp = await client.post("/api/admin/products", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


async def _create_promo(client, admin_headers, **overrides):
    payload = {"code": "PROMO10", "discount_type": "percentage", "discount_value": "10.00"}
    payload.update(overrides)
    resp = await client.post("/api/admin/promo-codes", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


def _order_payload(product_id, quantity=1, **overrides):
    payload = {
        "customer_name": "Aïssatou Diop",
        "phone_number": "77 123 45 67",
        "address_text": "Derrière l'église, Cotonou",
        "latitude": "6.3703",
        "longitude": "2.3912",
        "items": [{"product_id": product_id, "quantity": quantity}],
    }
    payload.update(overrides)
    return payload


async def test_validate_promo_code_success(client, admin_headers):
    await _create_promo(client, admin_headers, code="VALID10")
    resp = await client.post("/api/promo-codes/validate", json={"code": "valid10", "subtotal": "1000.00"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["valid"] is True
    assert body["discount_amount"] == "100.00"


async def test_validate_unknown_promo_code_returns_valid_false(client):
    resp = await client.post("/api/promo-codes/validate", json={"code": "DOESNOTEXIST", "subtotal": "1000.00"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is False


async def test_create_duplicate_promo_code_returns_409(client, admin_headers):
    await _create_promo(client, admin_headers, code="DUPE1")
    resp = await client.post(
        "/api/admin/promo-codes",
        json={"code": "DUPE1", "discount_type": "fixed", "discount_value": "500.00"},
        headers=admin_headers,
    )
    assert resp.status_code == 409


async def test_create_order_with_percentage_promo_applies_discount(client, admin_headers):
    product = await _create_product(client, admin_headers, price="2000.00")
    await _create_promo(client, admin_headers, code="PCT10", discount_type="percentage", discount_value="10.00")

    resp = await client.post(
        "/api/orders", json=_order_payload(product["id"], quantity=2, promo_code="pct10")
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["subtotal"] == "4000.00"
    assert body["discount_amount"] == "400.00"
    assert body["total_amount"] == "3600.00"
    assert body["promo_code"] == "PCT10"


async def test_create_order_with_fixed_promo_capped_at_subtotal(client, admin_headers):
    product = await _create_product(client, admin_headers, price="1000.00")
    await _create_promo(client, admin_headers, code="BIGFIXED", discount_type="fixed", discount_value="5000.00")

    resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=1, promo_code="BIGFIXED"))
    assert resp.status_code == 201
    body = resp.json()
    assert body["discount_amount"] == "1000.00"
    assert body["total_amount"] == "0.00"


async def test_create_order_promo_below_min_order_amount_returns_400(client, admin_headers):
    product = await _create_product(client, admin_headers, price="500.00")
    await _create_promo(
        client, admin_headers, code="MIN10K", discount_type="fixed", discount_value="100.00", min_order_amount="10000.00"
    )

    resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=1, promo_code="MIN10K"))
    assert resp.status_code == 400


async def test_create_order_with_inactive_promo_returns_400(client, admin_headers):
    product = await _create_product(client, admin_headers)
    await _create_promo(client, admin_headers, code="INACTIVE1", is_active=False)

    resp = await client.post("/api/orders", json=_order_payload(product["id"], promo_code="INACTIVE1"))
    assert resp.status_code == 400


async def test_create_order_unknown_promo_returns_404(client, admin_headers):
    product = await _create_product(client, admin_headers)
    resp = await client.post("/api/orders", json=_order_payload(product["id"], promo_code="NOPE"))
    assert resp.status_code == 404


async def test_promo_usage_limit_enforced_sequentially(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=10)
    await _create_promo(client, admin_headers, code="ONCE", discount_type="fixed", discount_value="100.00", usage_limit=1)

    first = await client.post("/api/orders", json=_order_payload(product["id"], promo_code="ONCE"))
    assert first.status_code == 201

    second = await client.post("/api/orders", json=_order_payload(product["id"], promo_code="ONCE"))
    assert second.status_code == 400


async def test_delete_promo_code_blocked_after_use(client, admin_headers):
    product = await _create_product(client, admin_headers)
    promo = await _create_promo(client, admin_headers, code="USED1")
    order_resp = await client.post("/api/orders", json=_order_payload(product["id"], promo_code="USED1"))
    assert order_resp.status_code == 201

    resp = await client.delete(f"/api/admin/promo-codes/{promo['id']}", headers=admin_headers)
    assert resp.status_code == 409


async def test_promo_code_concurrent_orders_usage_limit_race_safe():
    """Two simultaneous customers race for a promo code capped at usage_limit=1 —
    exactly one order must succeed. Uses two independent DB connections/transactions
    (not the shared per-test session) so the `with_for_update()` row lock in
    create_order is actually exercised under real contention."""
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    code = f"RACE{uuid.uuid4().hex[:8].upper()}"
    async with session_factory() as setup_session:
        product = Product(title="Produit Course", price=Decimal("1000.00"), stock_quantity=10)
        promo = PromoCode(code=code, discount_type=DiscountType.fixed, discount_value=Decimal("100.00"), usage_limit=1)
        setup_session.add_all([product, promo])
        await setup_session.commit()
        product_id = product.id
        promo_id = promo.id

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client_a, AsyncClient(
            transport=transport, base_url="http://test"
        ) as client_b:
            payload = {
                "customer_name": "Client A",
                "phone_number": "77000001",
                "address_text": "Cotonou",
                "latitude": "6.37",
                "longitude": "2.39",
                "items": [{"product_id": str(product_id), "quantity": 1}],
                "promo_code": code,
            }
            payload_b = {**payload, "customer_name": "Client B", "phone_number": "77000002"}

            results = await asyncio.gather(
                client_a.post("/api/orders", json=payload),
                client_b.post("/api/orders", json=payload_b),
            )
    finally:
        app.dependency_overrides.pop(get_db, None)
        async with session_factory() as cleanup_session:
            await cleanup_session.execute(delete(OrderItem).where(OrderItem.product_id == product_id))
            await cleanup_session.execute(delete(Order).where(Order.promo_code_id == promo_id))
            await cleanup_session.execute(delete(Product).where(Product.id == product_id))
            await cleanup_session.execute(delete(PromoCode).where(PromoCode.id == promo_id))
            await cleanup_session.commit()

    statuses = sorted(r.status_code for r in results)
    assert statuses == [201, 400]
