// One-time bootstrap: creates the first admin account. Replaces the old Alembic migration
// 0007, which seeded a DB row directly — Supabase Auth owns credentials now, and creating an
// Auth user can only be done through its admin API (service_role key), not plain SQL.
//
// Usage:
//   SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   ADMIN_EMAIL=admin@oralyah.com \
//   ADMIN_PASSWORD=... \
//   node scripts/seed-admin.mjs
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

for (const [name, value] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD })) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create admin auth user:", error.message);
  process.exit(1);
}

const { error: allowlistError } = await supabase
  .from("admin_users")
  .insert({ id: data.user.id, display_name: "Admin" });

if (allowlistError) {
  console.error("Auth user created but failed to add to admin_users:", allowlistError.message);
  console.error(`You can insert it manually: insert into admin_users (id) values ('${data.user.id}');`);
  process.exit(1);
}

console.log(`Admin account created: ${ADMIN_EMAIL} (id: ${data.user.id})`);
