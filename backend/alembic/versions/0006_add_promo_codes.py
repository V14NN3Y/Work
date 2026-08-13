"""add promo codes table + orders discount columns

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    discount_type = postgresql.ENUM("percentage", "fixed", name="discount_type", create_type=False)
    discount_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "promo_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("discount_type", discount_type, nullable=False),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("min_order_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("max_discount_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("usage_limit", sa.Integer(), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.add_column(
        "orders",
        sa.Column(
            "promo_code_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("promo_codes.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("orders", sa.Column("promo_code", sa.String(50), nullable=True))
    op.add_column(
        "orders", sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0")
    )


def downgrade() -> None:
    op.drop_column("orders", "discount_amount")
    op.drop_column("orders", "promo_code")
    op.drop_column("orders", "promo_code_id")
    op.drop_table("promo_codes")
    postgresql.ENUM(name="discount_type").drop(op.get_bind(), checkfirst=True)
