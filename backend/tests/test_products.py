async def _create_product(client, admin_headers, **overrides):
    payload = {
        "title": "Produit Test",
        "description": "Description test",
        "price": "1000.00",
        "stock_quantity": 5,
        "image_url": "https://example.com/img.jpg",
    }
    payload.update(overrides)
    resp = await client.post("/api/admin/products", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


async def test_public_list_only_shows_active(client, admin_headers):
    active = await _create_product(client, admin_headers, title="Actif")
    inactive = await _create_product(client, admin_headers, title="Inactif")

    resp = await client.patch(
        f"/api/admin/products/{inactive['id']}", json={"is_active": False}, headers=admin_headers
    )
    assert resp.status_code == 200

    resp = await client.get("/api/products")
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()["items"]]
    assert active["id"] in ids
    assert inactive["id"] not in ids


async def test_admin_list_includes_inactive(client, admin_headers):
    inactive = await _create_product(client, admin_headers, title="Inactif2")
    await client.patch(f"/api/admin/products/{inactive['id']}", json={"is_active": False}, headers=admin_headers)

    resp = await client.get("/api/admin/products?include_inactive=true", headers=admin_headers)
    ids = [p["id"] for p in resp.json()["items"]]
    assert inactive["id"] in ids


async def test_get_product_detail_404_for_missing(client):
    resp = await client.get("/api/products/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_delete_product_never_ordered_succeeds(client, admin_headers):
    product = await _create_product(client, admin_headers, title="Jamais commandé")
    resp = await client.delete(f"/api/admin/products/{product['id']}", headers=admin_headers)
    assert resp.status_code == 204


async def test_delete_product_already_ordered_is_blocked(client, admin_headers):
    product = await _create_product(client, admin_headers, title="Commandé", stock_quantity=10)

    order_resp = await client.post(
        "/api/orders",
        json={
            "customer_name": "Client Test",
            "phone_number": "+221771234567",
            "address_text": "Dakar, Sénégal",
            "latitude": "14.6928",
            "longitude": "-17.4467",
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    )
    assert order_resp.status_code == 201

    resp = await client.delete(f"/api/admin/products/{product['id']}", headers=admin_headers)
    assert resp.status_code == 409
