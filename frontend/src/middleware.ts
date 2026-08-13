import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Real server-side auth check on every /admin/* request — replaces the old client-only
// useEffect guard in admin/layout.tsx, which only checked *token presence* in localStorage
// (not validity) and only ran after hydration, leaving a flash-of-protected-content window.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!isLoginPage) {
    // getUser() (not getSession()) actually revalidates the token against Supabase Auth and
    // transparently refreshes it if expired — the refreshed cookies ride along via setAll
    // above. This is also what makes the check a real server-side one, not just "cookie present".
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // is_admin() is SECURITY DEFINER, so it can read admin_users despite that table having no
    // RLS policies for anon/authenticated at all — the RPC is the only way this check can work.
    const isAdmin = user ? (await supabase.rpc("is_admin")).data === true : false;

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
