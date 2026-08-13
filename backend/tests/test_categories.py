async def _create_category(client, admin_headers, name="Électronique"):
    resp = await client.post("/api/admin/categories", json={"name": name}, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


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


async def test_create_and_list_category(client, admin_headers):
    await _create_category(client, admin_headers, name="Maison")
    resp = await client.get("/api/categories")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()["items"]]
    assert "Maison" in names


async def test_create_duplicate_category_returns_409(client, admin_headers):
    await _create_category(client, admin_headers, name="Sport")
    resp = await client.post("/api/admin/categories", json={"name": "Sport"}, headers=admin_headers)
    assert resp.status_code == 409


async def test_update_category(client, admin_headers):
    category = await _create_category(client, admin_headers, name="Ancien nom")
    resp = await client.patch(
        f"/api/admin/categories/{category['id']}", json={"name": "Nouveau nom"}, headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Nouveau nom"


async def test_delete_category_sets_products_category_to_null(client, admin_headers):
    category = await _create_category(client, admin_headers, name="Jardin")
    product = await _create_product(client, admin_headers, category_id=category["id"])
    assert product["category"]["id"] == category["id"]

    resp = await client.delete(f"/api/admin/categories/{category['id']}", headers=admin_headers)
    assert resp.status_code == 204

    detail = await client.get(f"/api/products/{product['id']}")
    assert detail.status_code == 200
    assert detail.json()["category"] is None


async def test_filter_products_by_category(client, admin_headers):
    category_a = await _create_category(client, admin_headers, name="Catégorie A")
    category_b = await _create_category(client, admin_headers, name="Catégorie B")
    await _create_product(client, admin_headers, title="Produit A", category_id=category_a["id"])
    await _create_product(client, admin_headers, title="Produit B", category_id=category_b["id"])

    resp = await client.get(f"/api/products?category_id={category_a['id']}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Produit A"
