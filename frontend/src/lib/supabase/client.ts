"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // @supabase/ssr otherwise auto-derives the session cookie name from the Supabase URL's
    // hostname — which differs here between this browser client (NEXT_PUBLIC_SUPABASE_URL,
    // host-mapped 127.0.0.1) and the server/middleware clients (SUPABASE_URL_INTERNAL, the
    // Docker-internal Kong hostname, for local dev only). A fixed name keeps every context
    // agreeing on the same cookie regardless of which URL derived the client.
    { cookieOptions: { name: "sb-auth-token" } }
  );
}
