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
  },
};

module.exports = nextConfig;
