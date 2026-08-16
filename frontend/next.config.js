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

// Same derivation as supabaseStoragePattern() above — the CSP needs to allow the Supabase
// origin for API/RPC calls (connect-src) and Storage image loads (img-src) without hand-editing
// this file when the project URL changes (local dev vs production).
function supabaseOrigin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return supabaseUrl ? new URL(supabaseUrl).origin : "";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [...supabaseStoragePattern()],
  },
  poweredByHeader: false,
  async headers() {
    const supabase = supabaseOrigin();
    // 'unsafe-inline' on script-src is required by Next.js's own hydration bootstrap scripts
    // (App Router inlines RSC payloads via <script> tags — see the raw HTML in any page
    // response). Nonce-based strict CSP would remove this but needs per-request nonce plumbing
    // through the App Router, a larger change than this pass. img-src allows data: for the
    // small inline placeholders shadcn/ui components use, plus the Supabase Storage origin for
    // real product photos. connect-src is the Supabase origin only — every data call this app
    // makes (REST, RPC, Auth, Storage) goes there or to same-origin Route Handlers.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: ${supabase}`,
      `font-src 'self' data:`,
      `connect-src 'self' ${supabase}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation stays allowed for the site's own origin — GPS capture at checkout is a
          // required, not incidental, feature (see components/GeolocationButton.tsx).
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
