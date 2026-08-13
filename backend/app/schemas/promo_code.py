import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.promo_code import DiscountType


class PromoCodeBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    discount_type: DiscountType
    discount_value: Decimal = Field(gt=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_discount_amount: Decimal | None = Field(default=None, ge=0)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    is_active: bool = True


class PromoCodeCreate(PromoCodeBase):
    pass


class PromoCodeUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    discount_type: DiscountType | None = None
    discount_value: Decimal | None = Field(default=None, gt=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_discount_amount: Decimal | None = Field(default=None, ge=0)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class PromoCodeRead(PromoCodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    usage_count: int
    created_at: datetime


class PromoCodeListResponse(BaseModel):
    items: list[PromoCodeRead]


class PromoValidateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    subtotal: Decimal = Field(gt=0)


class PromoValidateResponse(BaseModel):
    valid: bool
    discount_amount: Decimal | None = None
    message: str | None = None
