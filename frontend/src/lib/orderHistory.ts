const STORAGE_KEY = "ecommerce_my_orders_v1";

export interface RememberedOrder {
  ref: string;
  phone: string;
}

export function getRememberedOrders(): RememberedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Most-recently-used first; de-duped by ref so re-tracking an already-remembered order
// just refreshes its position instead of creating a duplicate entry.
export function rememberOrder(ref: string, phone: string): RememberedOrder[] {
  const next = [{ ref, phone }, ...getRememberedOrders().filter((o) => o.ref !== ref)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function forgetOrder(ref: string): RememberedOrder[] {
  const next = getRememberedOrders().filter((o) => o.ref !== ref);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
