async def _create_product(client, admin_headers, **overrides):
    payload = {
        "title": "Produit Commande",
        "description": "Test",
        "price": "2500.00",
        "stock_quantity": 3,
        "image_url": "https://example.com/img.jpg",
    }
    payload.update(overrides)
    resp = await client.post("/api/admin/products", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


def _order_payload(product_id, quantity=1, **overrides):
    payload = {
        "customer_name": "Aïssatou Diop",
        "phone_number": "77 123 45 67",
        "address_text": "Derrière l'église, Dakar",
        "latitude": "14.6928",
        "longitude": "-17.4467",
        "items": [{"product_id": product_id, "quantity": quantity}],
    }
    payload.update(overrides)
    return payload


async def test_create_order_success_decrements_stock(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=5)

    resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=2))
    assert resp.status_code == 201
    body = resp.json()
    assert body["order_ref"].startswith("CMD")
    assert body["total_amount"] == "5000.00"
    assert body["maps_url"] == "https://maps.google.com/?q=14.69280000,-17.44670000"

    detail = await client.get(f"/api/products/{product['id']}")
    assert detail.json()["stock_quantity"] == 3


async def test_create_order_insufficient_stock_returns_409(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=1)
    resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=5))
    assert resp.status_code == 409


async def test_create_order_invalid_phone_returns_422(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=5)
    resp = await client.post("/api/orders", json=_order_payload(product["id"], phone_number="abc"))
    assert resp.status_code == 422


async def test_cancel_order_restores_stock(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=5)
    order_resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=2))
    order = order_resp.json()

    detail = await client.get(f"/api/products/{product['id']}")
    assert detail.json()["stock_quantity"] == 3

    status_resp = await client.patch(
        f"/api/admin/orders/{order['id']}/status", json={"status": "cancelled"}, headers=admin_headers
    )
    assert status_resp.status_code == 200

    detail = await client.get(f"/api/products/{product['id']}")
    assert detail.json()["stock_quantity"] == 5


async def test_filter_orders_by_status(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=5)
    await client.post("/api/orders", json=_order_payload(product["id"], quantity=1))

    resp = await client.get("/api/admin/orders?status=pending", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


async def test_track_order_success(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=5)
    order_resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=1))
    order = order_resp.json()

    resp = await client.get(f"/api/orders/track?ref={order['order_ref']}&phone=77 123 45 67")
    assert resp.status_code == 200
    assert resp.json()["id"] == order["id"]


async def test_track_order_wrong_phone_returns_404(client, admin_headers):
    product = await _create_product(client, admin_headers, stock_quantity=5)
    order_resp = await client.post("/api/orders", json=_order_payload(product["id"], quantity=1))
    order = order_resp.json()

    resp = await client.get(f"/api/orders/track?ref={order['order_ref']}&phone=00000000")
    assert resp.status_code == 404
    wrong_phone_detail = resp.json()["detail"]

    resp2 = await client.get("/api/orders/track?ref=CMD000000FFFFFF&phone=00000000")
    assert resp2.status_code == 404
    # Identical generic message whether the ref is unknown or the phone is wrong — anti-enumeration.
    assert resp2.json()["detail"] == wrong_phone_detail
