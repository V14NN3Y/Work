import re
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.models.order import OrderStatus

PHONE_REGEX = re.compile(r"^\+?[0-9]{8,15}$")


class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=150)
    phone_number: str = Field(min_length=1, max_length=30)
    address_text: str = Field(min_length=1, max_length=255)
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
    items: list[OrderItemCreate] = Field(min_length=1)
    promo_code: str | None = Field(default=None, min_length=1, max_length=50)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        cleaned = re.sub(r"[\s-]", "", value)
        if not PHONE_REGEX.match(cleaned):
            raise ValueError("Numéro de téléphone invalide")
        return cleaned


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID | None
    quantity: int
    unit_price: Decimal


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_ref: str
    customer_name: str
    phone_number: str
    address_text: str
    latitude: Decimal
    longitude: Decimal
    total_amount: Decimal
    status: OrderStatus
    promo_code: str | None
    discount_amount: Decimal
    created_at: datetime
    items: list[OrderItemRead] = []

    @computed_field
    @property
    def maps_url(self) -> str:
        return f"https://maps.google.com/?q={self.latitude},{self.longitude}"

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        return self.total_amount + self.discount_amount


class OrderListResponse(BaseModel):
    items: list[OrderRead]
    total: int
    page: int
    page_size: int


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
