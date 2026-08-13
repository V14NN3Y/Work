from app.config import settings


async def test_login_success(client):
    resp = await client.post(
        "/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body


async def test_login_invalid_credentials(client):
    resp = await client.post("/api/auth/login", json={"username": "wrong", "password": "wrong"})
    assert resp.status_code == 401


async def test_admin_route_requires_token(client):
    resp = await client.get("/api/admin/orders")
    assert resp.status_code == 401


async def test_admin_route_with_token(client, admin_headers):
    resp = await client.get("/api/admin/orders", headers=admin_headers)
    assert resp.status_code == 200


async def test_update_password_then_login_with_new_password(client, admin_headers):
    resp = await client.patch(
        "/api/auth/credentials",
        json={"current_password": settings.admin_password, "new_password": "a-new-strong-password"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()

    old_login = await client.post(
        "/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password}
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/auth/login", json={"username": settings.admin_username, "password": "a-new-strong-password"}
    )
    assert new_login.status_code == 200


async def test_update_username_then_login_with_new_username(client, admin_headers):
    resp = await client.patch(
        "/api/auth/credentials",
        json={"current_password": settings.admin_password, "new_username": "newadminname"},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    new_login = await client.post(
        "/api/auth/login", json={"username": "newadminname", "password": settings.admin_password}
    )
    assert new_login.status_code == 200


async def test_update_credentials_wrong_current_password_returns_401(client, admin_headers):
    resp = await client.patch(
        "/api/auth/credentials",
        json={"current_password": "totally-wrong", "new_password": "a-new-strong-password"},
        headers=admin_headers,
    )
    assert resp.status_code == 401

    # Original password must still work — the failed attempt shouldn't have changed anything.
    login = await client.post(
        "/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password}
    )
    assert login.status_code == 200


async def test_update_credentials_requires_auth(client):
    resp = await client.patch(
        "/api/auth/credentials", json={"current_password": "x", "new_password": "a-new-strong-password"}
    )
    assert resp.status_code == 401
