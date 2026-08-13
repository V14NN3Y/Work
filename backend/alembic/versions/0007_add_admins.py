"""add admins table, seeded from existing ADMIN_USERNAME/ADMIN_PASSWORD(_HASH) env vars

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-09

"""
from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # One-time transition: seed a row from the env-var-based credentials this app used before
    # this migration, so existing deployments keep logging in with the same username/password
    # without any manual step. Reuses the same "prefer ADMIN_PASSWORD_HASH, else hash
    # ADMIN_PASSWORD" logic that app/security.py used pre-migration.
    from app.config import settings

    if settings.admin_password_hash:
        password_hash = settings.admin_password_hash
    else:
        password_hash = bcrypt.hashpw(settings.admin_password.encode(), bcrypt.gensalt()).decode()

    op.execute(
        sa.text("INSERT INTO admins (username, password_hash) VALUES (:username, :password_hash)").bindparams(
            username=settings.admin_username, password_hash=password_hash
        )
    )


def downgrade() -> None:
    op.drop_table("admins")
