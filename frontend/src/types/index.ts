export interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface CategoryListResponse {
  items: Category[];
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: string;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  images: ProductImage[];
  category: Category | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export type OrderStatus = "pending" | "delivering" | "completed" | "cancelled";

export interface OrderItem {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: string;
}

export interface Order {
  id: string;
  order_ref: string;
  customer_name: string;
  phone_number: string;
  address_text: string;
  latitude: string;
  longitude: string;
  total_amount: string;
  status: OrderStatus;
  promo_code: string | null;
  discount_amount: string;
  created_at: string;
  items: OrderItem[];
  maps_url: string;
  subtotal: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
}

export interface CartItem {
  productId: string;
  title: string;
  price: string;
  imageUrl: string | null;
  stockQuantity: number;
  quantity: number;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  created_at: string;
}

export interface ReviewListResponse {
  items: Review[];
  total: number;
  average_rating: number | null;
  page: number;
  page_size: number;
}

export interface ReviewAdmin {
  id: string;
  product_id: string;
  product_title: string;
  order_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  created_at: string;
  moderated_at: string | null;
}

export interface ReviewAdminListResponse {
  items: ReviewAdmin[];
  total: number;
  page: number;
  page_size: number;
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: "bg-status-pending-bg text-status-pending",
  approved: "bg-status-completed-bg text-status-completed",
  rejected: "bg-status-cancelled-bg text-status-cancelled",
};

export type DiscountType = "percentage" | "fixed";

export interface PromoCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order_amount: string | null;
  max_discount_amount: string | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export interface PromoCodeListResponse {
  items: PromoCode[];
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  delivering: "En cours de livraison",
  completed: "Complétée",
  cancelled: "Annulée",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-status-pending-bg text-status-pending",
  delivering: "bg-status-delivering-bg text-status-delivering",
  completed: "bg-status-completed-bg text-status-completed",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};
