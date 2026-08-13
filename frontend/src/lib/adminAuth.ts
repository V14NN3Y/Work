const TOKEN_KEY = "ecommerce_admin_token";

// NOTE: JWT stored in localStorage (not an httpOnly cookie) — pragmatic choice for a
// single-admin MVP. Trade-off: vulnerable to token theft via XSS. If this becomes a real
// concern, move to a cookie set by a Next.js Route Handler acting as a BFF.
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isUnauthorized(err: unknown): boolean {
  return typeof err === "object" && err !== null && "status" in err && (err as { status: unknown }).status === 401;
}
