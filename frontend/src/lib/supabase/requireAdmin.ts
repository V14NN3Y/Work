import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route Handlers that touch admin-only resources re-check is_admin themselves rather than
// trusting middleware alone — defense in depth, since middleware only covers page navigations
// matched by its `matcher`, not every possible way this Route Handler could be invoked.
export async function requireAdmin(): Promise<{ error: NextResponse | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ detail: "Authentification requise" }, { status: 401 }) };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: NextResponse.json({ detail: "Accès refusé" }, { status: 403 }) };
  }

  return { error: null };
}
