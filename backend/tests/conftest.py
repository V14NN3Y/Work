import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import Base
from app.deps import get_db
from app.main import app
from app.models.admin import Admin
from app.security import create_access_token, hash_password

# NullPool: each connection is opened and discarded per checkout, tied to whichever
# event loop is current at the time. Avoids asyncpg connections created in one
# pytest-asyncio test's event loop being reused (and breaking) in another test's loop.
test_engine = create_async_engine(settings.database_url, poolclass=NullPool)


@pytest_asyncio.fixture(autouse=True)
async def _create_schema():
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def db_session():
    async with test_engine.connect() as connection:
        await connection.begin()
        session = AsyncSession(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
        yield session
        await session.close()
        await connection.rollback()


# Login now looks up an Admin row in the database rather than comparing against env-var
# settings directly. This test suite runs against the same database as the dev app (not an
# isolated test DB), so the 0007 migration's seed row may already exist for real (committed,
# outside any test transaction) — only insert if it's missing, so tests work whether that
# migration has run here or not. Either way, this row (existing or freshly added) lives in
# db_session's per-test transaction scope for any in-test mutation, rolled back afterwards.
@pytest_asyncio.fixture(autouse=True)
async def _seed_admin(db_session):
    existing = (
        await db_session.execute(select(Admin).where(Admin.username == settings.admin_username))
    ).scalar_one_or_none()
    if existing is None:
        db_session.add(Admin(username=settings.admin_username, password_hash=hash_password(settings.admin_password)))
        await db_session.commit()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers():
    token = create_access_token(subject="admin")
    return {"Authorization": f"Bearer {token}"}
