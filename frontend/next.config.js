// Supabase Storage public URLs are already absolute — a single remotePattern derived from
// NEXT_PUBLIC_SUPABASE_URL at build time covers both local dev (http://127.0.0.1:54321) and
// production (https://<project>.supabase.co) without hand-editing this file. Replaces the old
// dual localhost/backend patterns the FastAPI-hosted /uploads/** images needed.
function supabaseStoragePattern() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];
  const url = new URL(supabaseUrl);
  return [
    {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || "",
      pathname: "/storage/v1/object/public/**",
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [...supabaseStoragePattern()],
    // Next's server-side Image Optimization endpoint runs inside this container and fetches
    // the image URL itself — that only works when the same URL is reachable from both the
    // browser and the server. In production (Netlify + a real Supabase project) that's always
    // true (one public https URL). Locally, SUPABASE_URL_INTERNAL exists specifically because
    // the browser-facing URL (127.0.0.1:54321, host-mapped) and the container's own view of
    // the world are different networks — the optimizer can't reach 127.0.0.1:54321 from inside
    // the container. Disabling optimization only in that specific case (detected by
    // SUPABASE_URL_INTERNAL being set) avoids a dead-end fetch without giving up real
    // optimization in production, where the problem doesn't exist.
    unoptimized: Boolean(process.env.SUPABASE_URL_INTERNAL),
  },
  // Standalone output: bundles only the files needed to run (server.js + minimal node_modules)
  // instead of requiring the full node_modules tree in the production image. Tied to the old
  // Docker-based deployment (Dockerfile.prod) — revisit once the Netlify deployment (phase 8)
  // replaces it, since Netlify's own build pipeline doesn't need this.
  output: "standalone",
};

module.exports = nextConfig;
