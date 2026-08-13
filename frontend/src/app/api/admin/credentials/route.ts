import { NextResponse } from "next/server";
import { createClient as createBrowserStyleClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

interface CredentialsUpdatePayload {
  current_password: string;
  new_email?: string;
  new_password?: string;
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as CredentialsUpdatePayload;

  if (!payload.current_password) {
    return NextResponse.json({ detail: "Mot de passe actuel requis" }, { status: 400 });
  }
  if (!payload.new_email?.trim() && !payload.new_password) {
    return NextResponse.json({ detail: "Renseignez un nouvel email et/ou un nouveau mot de passe" }, { status: 400 });
  }

  // Who's asking — the middleware already guarantees this is an admin, but this Route Handler
  // re-derives identity independently rather than trusting a client-supplied id (defense in
  // depth for an endpoint that changes login credentials).
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ detail: "Authentification requise" }, { status: 401 });
  }

  // Re-verify the current password with a fresh anon-keyed client (mirrors the old backend's
  // "must re-submit current_password" check) — a stolen-but-still-valid session cookie alone
  // shouldn't be enough to take over the account.
  const verifyClient = createBrowserStyleClient(
    process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: payload.current_password,
  });
  if (verifyError) {
    return NextResponse.json({ detail: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  const admin = createAdminClient();
  const updates: { email?: string; password?: string } = {};
  if (payload.new_email?.trim()) updates.email = payload.new_email.trim();
  if (payload.new_password) updates.password = payload.new_password;

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, updates);
  if (updateError) {
    const isDuplicate = updateError.message.toLowerCase().includes("already");
    return NextResponse.json(
      { detail: isDuplicate ? "Cet email est déjà utilisé" : updateError.message },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  return NextResponse.json({ success: true });
}
