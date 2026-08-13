import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components / Route Handlers / Server Actions client, cookie-based session (replaces
// the old localStorage JWT). SUPABASE_URL_INTERNAL is a local-Docker-only override so this
// (running inside the frontend container) can reach the Supabase CLI's stack — see
// docker-compose.yml. Production (Netlify) never sets it, so this always falls back to
// NEXT_PUBLIC_SUPABASE_URL there, same value the browser uses.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Must match the fixed name in lib/supabase/client.ts and middleware.ts — see the
      // comment there for why this can't be left to auto-derivation.
      cookieOptions: { name: "sb-auth-token" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only — safe to ignore
            // since the middleware below already refreshes the session on every request.
          }
        },
      },
    }
  );
}

// For public, unauthenticated Server Component reads (homepage, product pages, sitemap —
// anything covered by a `public`/anon RLS policy). Calling next/headers' cookies() — which
// createClient() above does — unconditionally opts a route into fully dynamic rendering,
// which would silently drop the ISR caching (`revalidate`) these pages rely on for speed.
// This client never touches cookies, so it doesn't have that side effect.
export function createStaticClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
