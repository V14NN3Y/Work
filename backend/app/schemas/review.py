import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.review import ReviewStatus


class ReviewCreate(BaseModel):
    product_id: uuid.UUID
    order_ref: str = Field(min_length=1, max_length=20)
    phone_number: str = Field(min_length=1, max_length=30)
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    customer_name: str
    rating: int
    comment: str | None
    status: ReviewStatus
    created_at: datetime


class ReviewListResponse(BaseModel):
    items: list[ReviewRead]
    total: int
    average_rating: float | None
    page: int
    page_size: int


class ReviewModerate(BaseModel):
    status: ReviewStatus


class ReviewAdminRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    order_id: uuid.UUID
    customer_name: str
    rating: int
    comment: str | None
    status: ReviewStatus
    created_at: datetime
    moderated_at: datetime | None


class ReviewAdminListResponse(BaseModel):
    items: list[ReviewAdminRead]
    total: int
    page: int
    page_size: int
