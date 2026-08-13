import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  CategoryListResponse,
  Order,
  OrderListResponse,
  Product,
  ProductImage,
  ProductListResponse,
  PromoCode,
  PromoCodeListResponse,
  Review,
  ReviewAdmin,
  ReviewAdminListResponse,
  ReviewListResponse,
} from "@/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// PostgREST maps a function/trigger's `raise sqlstate 'PTxyz'` to HTTP status xyz, with the
// custom message in the error body — this recovers that status from the client-side error
// object (`error.code` holds the raw SQLSTATE, e.g. "PT409") so ApiError.status keeps meaning
// the same thing it always did, and existing `err instanceof ApiError` handling in components
// doesn't need to change.
function toApiError(error: PostgrestError): ApiError {
  const match = /^PT(\d{3})$/.exec(error.code ?? "");
  return new ApiError(match ? parseInt(match[1], 10) : 400, error.message);
}

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw toApiError(error);
  return data as T;
}

const PAGE_SIZE = 20;
function rangeFor(page: number, pageSize = PAGE_SIZE): [number, number] {
  const from = Math.max(0, page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

// --- Row → API-shape mapping helpers ---
// The old FastAPI layer nested images/category/items into each response; Supabase's embedded
// resource syntax (`select("*, images:product_images(*)")`) gets us most of the way there, but
// a couple of computed fields (order.maps_url/subtotal, review.product_title) still need to be
// derived client-side rather than server-side (those lived in Pydantic computed_fields / a SQL
// join respectively).

interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  price: string;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  images: ProductImage[] | null;
  category: Category | null;
}

function toProduct(row: ProductRow): Product {
  return { ...row, images: row.images ?? [] };
}

interface OrderRow {
  id: string;
  order_ref: string;
  customer_name: string;
  phone_number: string;
  address_text: string;
  latitude: string;
  longitude: string;
  total_amount: string;
  status: Order["status"];
  promo_code: string | null;
  discount_amount: string;
  created_at: string;
  items?: Order["items"] | null;
}

function toOrder(row: OrderRow): Order {
  return {
    ...row,
    items: row.items ?? [],
    maps_url: `https://maps.google.com/?q=${row.latitude},${row.longitude}`,
    subtotal: (parseFloat(row.total_amount) + parseFloat(row.discount_amount)).toFixed(2),
  };
}

const PRODUCT_SELECT = "*, images:product_images(id, image_url, display_order), category:categories(*)";
const ORDER_SELECT = "*, items:order_items(*)";

// --- Public / storefront ---
// Every function below takes a SupabaseClient as its first argument rather than constructing
// one internally, so the SAME function works from Server Components (lib/supabase/server.ts's
// client) and Client Components (lib/supabase/client.ts's client) alike.

export async function getProducts(
  supabase: SupabaseClient,
  params?: { search?: string; page?: number; categoryId?: string }
): Promise<ProductListResponse> {
  const page = params?.page ?? 1;
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(...rangeFor(page));

  if (params?.search) query = query.ilike("title", `%${params.search}%`);
  if (params?.categoryId) query = query.eq("category_id", params.categoryId);

  const { data, error, count } = await query;
  if (error) throw toApiError(error);
  return { items: (data as ProductRow[]).map(toProduct), total: count ?? 0, page, page_size: PAGE_SIZE };
}

export async function getProduct(supabase: SupabaseClient, id: string): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .single();
  if (error) throw toApiError(error);
  return toProduct(data as ProductRow);
}

export async function getCategories(supabase: SupabaseClient): Promise<CategoryListResponse> {
  const items = await unwrap<Category[]>(supabase.from("categories").select("*").order("name"));
  return { items };
}

export interface CreateOrderPayload {
  customer_name: string;
  phone_number: string;
  address_text: string;
  latitude: number;
  longitude: number;
  items: { product_id: string; quantity: number }[];
  promo_code?: string;
}

export async function createOrder(supabase: SupabaseClient, payload: CreateOrderPayload): Promise<Order> {
  const row = await unwrap<OrderRow>(
    supabase.rpc("create_order", {
      p_customer_name: payload.customer_name,
      p_phone_number: payload.phone_number,
      p_address_text: payload.address_text,
      p_latitude: payload.latitude,
      p_longitude: payload.longitude,
      p_items: payload.items,
      p_promo_code: payload.promo_code ?? null,
    })
  );
  return toOrder(row);
}

export async function trackOrder(supabase: SupabaseClient, ref: string, phone: string): Promise<Order> {
  const row = await unwrap<OrderRow>(supabase.rpc("track_order", { p_ref: ref, p_phone: phone }));
  return toOrder(row);
}

export async function getProductReviews(
  supabase: SupabaseClient,
  productId: string,
  page = 1
): Promise<ReviewListResponse> {
  const [{ data: items, error: itemsError, count }, { data: summary }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, product_id, customer_name, rating, comment, status, created_at", { count: "exact" })
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(...rangeFor(page)),
    supabase.from("product_review_summary").select("average_rating").eq("product_id", productId).maybeSingle(),
  ]);

  if (itemsError) throw toApiError(itemsError);
  return {
    items: (items as Review[]) ?? [],
    total: count ?? 0,
    average_rating: summary?.average_rating ?? null,
    page,
    page_size: PAGE_SIZE,
  };
}

export interface CreateReviewPayload {
  product_id: string;
  order_ref: string;
  phone_number: string;
  rating: number;
  comment?: string;
}

export function createReview(supabase: SupabaseClient, payload: CreateReviewPayload): Promise<Review> {
  return unwrap<Review>(
    supabase.rpc("submit_review", {
      p_product_id: payload.product_id,
      p_order_ref: payload.order_ref,
      p_phone: payload.phone_number,
      p_rating: payload.rating,
      p_comment: payload.comment ?? null,
    })
  );
}

export interface PromoValidateResult {
  valid: boolean;
  discount_amount: string | null;
  message: string | null;
}

export function validatePromoCode(
  supabase: SupabaseClient,
  code: string,
  subtotal: number
): Promise<PromoValidateResult> {
  return unwrap<PromoValidateResult>(
    supabase.rpc("validate_promo_code", { p_code: code, p_subtotal: subtotal.toFixed(2) })
  );
}

// --- Admin: products ---

export async function adminListProducts(
  supabase: SupabaseClient,
  params?: { includeInactive?: boolean; search?: string; page?: number; categoryId?: string }
): Promise<ProductListResponse> {
  const page = params?.page ?? 1;
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeFor(page));

  if (!params?.includeInactive) query = query.eq("is_active", true);
  if (params?.search) query = query.ilike("title", `%${params.search}%`);
  if (params?.categoryId) query = query.eq("category_id", params.categoryId);

  const { data, error, count } = await query;
  if (error) throw toApiError(error);
  return { items: (data as ProductRow[]).map(toProduct), total: count ?? 0, page, page_size: PAGE_SIZE };
}

export async function adminGetProduct(supabase: SupabaseClient, id: string): Promise<Product> {
  const row = await unwrap<ProductRow>(supabase.from("products").select(PRODUCT_SELECT).eq("id", id).single());
  return toProduct(row);
}

export async function adminCreateProduct(
  supabase: SupabaseClient,
  data: {
    title: string;
    description: string;
    price: string;
    stock_quantity: number;
    image_url: string;
    category_id?: string | null;
  }
): Promise<Product> {
  const row = await unwrap<ProductRow>(
    supabase.from("products").insert(data).select(PRODUCT_SELECT).single()
  );
  return toProduct(row);
}

export async function adminUpdateProduct(
  supabase: SupabaseClient,
  id: string,
  data: Record<string, unknown>
): Promise<Product> {
  const row = await unwrap<ProductRow>(
    supabase.from("products").update(data).eq("id", id).select(PRODUCT_SELECT).single()
  );
  return toProduct(row);
}

// Goes through a Route Handler (not a plain client-side delete) — Storage cleanup for the
// product's images needs the service_role key, and the guard_product_delete trigger's PT409
// needs to surface as a real HTTP 409 for ApiError to pick up correctly.
export async function adminDeleteProduct(id: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Une erreur est survenue");
  }
}

export async function adminUploadImages(productId: string, files: File[]): Promise<ProductImage[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Échec de l'upload");
  }
  return res.json();
}

export async function adminDeleteImage(productId: string, imageId: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Une erreur est survenue");
  }
}

// No Route Handler needed — RLS already allows admin UPDATE on product_images (no Storage
// involved), so this is a plain client-side write.
export async function adminReorderImages(
  supabase: SupabaseClient,
  _productId: string,
  items: { id: string; display_order: number }[]
): Promise<ProductImage[]> {
  await Promise.all(
    items.map(({ id, display_order }) =>
      unwrap(supabase.from("product_images").update({ display_order }).eq("id", id))
    )
  );
  return unwrap<ProductImage[]>(
    supabase
      .from("product_images")
      .select("id, image_url, display_order")
      .in(
        "id",
        items.map((i) => i.id)
      )
      .order("display_order")
  );
}

// --- Admin: categories ---

export const adminListCategories = getCategories;

export function adminCreateCategory(supabase: SupabaseClient, name: string): Promise<Category> {
  return unwrap<Category>(supabase.from("categories").insert({ name }).select().single());
}

export function adminUpdateCategory(supabase: SupabaseClient, id: string, name: string): Promise<Category> {
  return unwrap<Category>(supabase.from("categories").update({ name }).eq("id", id).select().single());
}

export async function adminDeleteCategory(supabase: SupabaseClient, id: string): Promise<void> {
  await unwrap(supabase.from("categories").delete().eq("id", id));
}

// --- Admin: orders ---

export async function adminListOrders(
  supabase: SupabaseClient,
  params?: { status?: string; page?: number }
): Promise<OrderListResponse> {
  const page = params?.page ?? 1;
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeFor(page));

  if (params?.status) query = query.eq("status", params.status);

  const { data, error, count } = await query;
  if (error) throw toApiError(error);
  return { items: (data as OrderRow[]).map(toOrder), total: count ?? 0, page, page_size: PAGE_SIZE };
}

export async function adminUpdateOrderStatus(supabase: SupabaseClient, id: string, status: string): Promise<Order> {
  // The restock-on-cancel trigger (app_private.restock_on_cancel) fires as part of this same
  // UPDATE statement — no separate client-side call needed to trigger it.
  const row = await unwrap<OrderRow>(
    supabase.from("orders").update({ status }).eq("id", id).select(ORDER_SELECT).single()
  );
  return toOrder(row);
}

// --- Admin: reviews ---

interface ReviewAdminRow {
  id: string;
  product_id: string;
  order_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: ReviewAdmin["status"];
  created_at: string;
  moderated_at: string | null;
  product: { title: string } | null;
}

function toReviewAdmin(row: ReviewAdminRow): ReviewAdmin {
  const { product, ...rest } = row;
  return { ...rest, product_title: product?.title ?? "" };
}

const REVIEW_ADMIN_SELECT = "*, product:products(title)";

export async function adminListReviews(
  supabase: SupabaseClient,
  params?: { status?: string; page?: number }
): Promise<ReviewAdminListResponse> {
  const page = params?.page ?? 1;
  let query = supabase
    .from("reviews")
    .select(REVIEW_ADMIN_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeFor(page));

  if (params?.status) query = query.eq("status", params.status);

  const { data, error, count } = await query;
  if (error) throw toApiError(error);
  return { items: (data as ReviewAdminRow[]).map(toReviewAdmin), total: count ?? 0, page, page_size: PAGE_SIZE };
}

export async function adminModerateReview(supabase: SupabaseClient, id: string, status: string): Promise<ReviewAdmin> {
  const row = await unwrap<ReviewAdminRow>(
    supabase
      .from("reviews")
      .update({ status, moderated_at: new Date().toISOString() })
      .eq("id", id)
      .select(REVIEW_ADMIN_SELECT)
      .single()
  );
  return toReviewAdmin(row);
}

export async function adminDeleteReview(supabase: SupabaseClient, id: string): Promise<void> {
  await unwrap(supabase.from("reviews").delete().eq("id", id));
}

// --- Admin: promo codes ---

export interface PromoCodePayload {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount?: string | null;
  max_discount_amount?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  is_active?: boolean;
}

export async function adminListPromoCodes(supabase: SupabaseClient): Promise<PromoCodeListResponse> {
  const items = await unwrap<PromoCode[]>(
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false })
  );
  return { items };
}

export function adminCreatePromoCode(supabase: SupabaseClient, data: PromoCodePayload): Promise<PromoCode> {
  return unwrap<PromoCode>(supabase.from("promo_codes").insert(data).select().single());
}

export function adminUpdatePromoCode(
  supabase: SupabaseClient,
  id: string,
  data: Partial<PromoCodePayload>
): Promise<PromoCode> {
  return unwrap<PromoCode>(supabase.from("promo_codes").update(data).eq("id", id).select().single());
}

export async function adminDeletePromoCode(supabase: SupabaseClient, id: string): Promise<void> {
  await unwrap(supabase.from("promo_codes").delete().eq("id", id));
}
