import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role bypasses RLS entirely — only ever import this from Route Handlers that need to
// write to admin-locked-down resources (image Storage uploads, Supabase Auth admin API for
// credential changes). Never import this file from a Client Component or anything that ships
// to the browser — SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix specifically so
// Next.js won't inline it into client bundles, but the import boundary still has to be
// respected by hand since the `server-only` package isn't installed here.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// `admin.storage.from(bucket).getPublicUrl(path)` just concatenates the client's own base URL
// with the path — it makes no network call. Since createAdminClient() intentionally prefers
// SUPABASE_URL_INTERNAL (the Docker-internal hostname, correct for the server-to-server
// upload/DB-write calls it's used for), calling getPublicUrl() on that same client bakes that
// internal, browser-unreachable hostname into the URL stored in the database — this is a real
// bug that was caught in testing (corrupted image_url values crashed next/image on every page
// that rendered them). Always build the public URL from NEXT_PUBLIC_SUPABASE_URL specifically,
// regardless of which client performed the write, since this URL is for the browser to consume.
export function publicStorageUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
