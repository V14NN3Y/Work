async def _create_product(client, admin_headers, **overrides):
    payload = {
        "title": "Produit Avis",
        "description": "Test",
        "price": "1500.00",
        "stock_quantity": 5,
        "image_url": "https://example.com/img.jpg",
    }
    payload.update(overrides)
    resp = await client.post("/api/admin/products", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


async def _create_order(client, product_id, quantity=1):
    payload = {
        "customer_name": "Fatou Bello",
        "phone_number": "77 123 45 67",
        "address_text": "Rue 12, Cotonou",
        "latitude": "6.3703",
        "longitude": "2.3912",
        "items": [{"product_id": product_id, "quantity": quantity}],
    }
    resp = await client.post("/api/orders", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _complete_order(client, admin_headers, order_id):
    resp = await client.patch(
        f"/api/admin/orders/{order_id}/status", json={"status": "completed"}, headers=admin_headers
    )
    assert resp.status_code == 200


async def test_create_review_requires_completed_order(client, admin_headers):
    product = await _create_product(client, admin_headers)
    order = await _create_order(client, product["id"])

    resp = await client.post(
        "/api/reviews",
        json={
            "product_id": product["id"],
            "order_ref": order["order_ref"],
            "phone_number": "77 123 45 67",
            "rating": 5,
            "comment": "Très bon produit",
        },
    )
    assert resp.status_code == 400


async def test_create_review_success_then_pending_and_hidden(client, admin_headers):
    product = await _create_product(client, admin_headers)
    order = await _create_order(client, product["id"])
    await _complete_order(client, admin_headers, order["id"])

    resp = await client.post(
        "/api/reviews",
        json={
            "product_id": product["id"],
            "order_ref": order["order_ref"],
            "phone_number": "77 123 45 67",
            "rating": 4,
            "comment": "Bien",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["customer_name"] == "Fatou Bello"

    public = await client.get(f"/api/products/{product['id']}/reviews")
    assert public.status_code == 200
    assert public.json()["total"] == 0
    assert public.json()["average_rating"] is None


async def test_create_review_wrong_phone_returns_404(client, admin_headers):
    product = await _create_product(client, admin_headers)
    order = await _create_order(client, product["id"])
    await _complete_order(client, admin_headers, order["id"])

    resp = await client.post(
        "/api/reviews",
        json={
            "product_id": product["id"],
            "order_ref": order["order_ref"],
            "phone_number": "00000000",
            "rating": 3,
        },
    )
    assert resp.status_code == 404


async def test_create_duplicate_review_returns_409(client, admin_headers):
    product = await _create_product(client, admin_headers)
    order = await _create_order(client, product["id"])
    await _complete_order(client, admin_headers, order["id"])

    payload = {
        "product_id": product["id"],
        "order_ref": order["order_ref"],
        "phone_number": "77 123 45 67",
        "rating": 5,
    }
    first = await client.post("/api/reviews", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/reviews", json=payload)
    assert second.status_code == 409


async def test_moderation_flow_makes_review_public(client, admin_headers):
    product = await _create_product(client, admin_headers)
    order = await _create_order(client, product["id"])
    await _complete_order(client, admin_headers, order["id"])

    created = await client.post(
        "/api/reviews",
        json={
            "product_id": product["id"],
            "order_ref": order["order_ref"],
            "phone_number": "77 123 45 67",
            "rating": 5,
            "comment": "Excellent",
        },
    )
    review_id = created.json()["id"]

    pending_list = await client.get("/api/admin/reviews?status=pending", headers=admin_headers)
    assert pending_list.status_code == 200
    assert any(r["id"] == review_id for r in pending_list.json()["items"])

    moderate = await client.patch(
        f"/api/admin/reviews/{review_id}/moderate", json={"status": "approved"}, headers=admin_headers
    )
    assert moderate.status_code == 200
    assert moderate.json()["status"] == "approved"

    public = await client.get(f"/api/products/{product['id']}/reviews")
    assert public.status_code == 200
    body = public.json()
    assert body["total"] == 1
    assert body["average_rating"] == 5.0
    assert body["items"][0]["comment"] == "Excellent"


async def test_admin_delete_review(client, admin_headers):
    product = await _create_product(client, admin_headers)
    order = await _create_order(client, product["id"])
    await _complete_order(client, admin_headers, order["id"])

    created = await client.post(
        "/api/reviews",
        json={
            "product_id": product["id"],
            "order_ref": order["order_ref"],
            "phone_number": "77 123 45 67",
            "rating": 1,
        },
    )
    review_id = created.json()["id"]

    resp = await client.delete(f"/api/admin/reviews/{review_id}", headers=admin_headers)
    assert resp.status_code == 204

    listing = await client.get("/api/admin/reviews", headers=admin_headers)
    assert not any(r["id"] == review_id for r in listing.json()["items"])
