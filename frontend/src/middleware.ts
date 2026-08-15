import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_HOST = "adminboard.oralyah.com";
const PROD_HOSTS = ["oralyah.com", "www.oralyah.com"];

// Real server-side auth check, shared by both places that need it below (adminboard.oralyah.com
// pages, and the /admin/* fallback for hosts that don't get the clean-URL treatment). Builds the
// Supabase client against `request`'s cookies and returns a response with any refreshed auth
// cookies applied — `buildResponse` decides what kind of response that ends up being (`next` vs
// `rewrite`), since that differs between the two call sites.
async function withAdminAuth(
  request: NextRequest,
  loginUrl: URL,
  buildResponse: () => NextResponse
): Promise<NextResponse> {
  let response = buildResponse();

  const supabase = createServerClient(
    process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Must match the fixed name in lib/supabase/client.ts and lib/supabase/server.ts — see
      // the comment in client.ts for why this can't be left to auto-derivation.
      cookieOptions: { name: "sb-auth-token" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = buildResponse();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() (not getSession()) actually revalidates the token against Supabase Auth and
  // transparently refreshes it if expired — the refreshed cookies ride along via setAll above.
  // This is also what makes the check a real server-side one, not just "cookie present".
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // is_admin() is SECURITY DEFINER, so it can read admin_users despite that table having no RLS
  // policies for anon/authenticated at all — the RPC is the only way this check can work.
  const isAdmin = user ? (await supabase.rpc("is_admin")).data === true : false;

  if (!isAdmin) {
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// The admin pages still live at app/admin/* in the codebase (moving them was judged too risky
// for a cosmetic win) — this rewrites clean adminboard.oralyah.com URLs to their real /admin/*
// counterpart server-side, invisibly to the browser (NextResponse.rewrite never changes the
// address bar), so the client-side router — and every internal link — genuinely believes it's
// at "/login", "/orders", etc.
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;

  if (hostname === ADMIN_HOST) {
    const internalPath = pathname.startsWith("/admin") ? pathname : pathname === "/" ? "/admin" : `/admin${pathname}`;
    const rewriteUrl = new URL(internalPath + search, request.url);

    if (internalPath === "/admin/login") {
      return NextResponse.rewrite(rewriteUrl);
    }

    return withAdminAuth(request, new URL("/login", request.url), () => NextResponse.rewrite(rewriteUrl));
  }

  // Legacy /admin/* links on the real production domain now live on adminboard.oralyah.com —
  // redirect rather than silently 404ing on old bookmarks/links.
  if (PROD_HOSTS.includes(hostname) && pathname.startsWith("/admin")) {
    const clean = pathname.replace(/^\/admin/, "") || "/";
    return NextResponse.redirect(`https://${ADMIN_HOST}${clean}${search}`);
  }

  // Shop pages, on any host: no admin logic involved, skip Supabase entirely rather than
  // paying for an auth check on every public storefront request.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Fallback: localhost (dev) or a Netlify preview deploy hitting /admin/* directly. Preserves
  // the pre-adminboard behavior unchanged rather than bouncing a local/preview session to
  // production, which would be surprising mid-development.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }
  return withAdminAuth(request, new URL("/admin/login", request.url), () => NextResponse.next({ request }));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|robots\\.txt|sitemap\\.xml|api/).*)",
  ],
};
