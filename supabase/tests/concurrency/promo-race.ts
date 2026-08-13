// Concurrency test for public.create_order()'s promo code locking (see the `FOR UPDATE` lock
// on promo_codes in supabase/migrations/20260812162413_functions_orders.sql). This is the one
// property pgTAP's single-connection tests (supabase/tests/database/00_create_order.sql)
// structurally cannot prove: that two REAL, simultaneous requests against a usage_limit=1
// promo code can never both succeed. A single green run is not proof for a race condition —
// this script repeats the race N times (default 50) against the local Supabase stack, each
// iteration with fresh fixtures, and reports a pass/fail summary.
//
// Usage:
//   cd supabase/tests/concurrency && npm install
//   npm run test:promo-race                  # 50 iterations against the local stack
//   ITERATIONS=200 npm run test:promo-race    # override the iteration count
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:promo-race

import { createClient } from "@supabase/supabase-js";

// Standard local Supabase CLI demo keys (printed by `supabase status`) — public by design for
// local dev, not a secret. Override via env vars to point this at a different environment.
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ITERATIONS = Number(process.env.ITERATIONS ?? 50);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface IterationResult {
  iteration: number;
  ok: boolean;
  detail: string;
}

async function runIteration(iteration: number): Promise<IterationResult> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const promoCode = `RACE${iteration}${suffix}`.toUpperCase().slice(0, 40);

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({ title: `Race Test Product ${iteration}`, price: 1000, stock_quantity: 10, is_active: true })
    .select()
    .single();
  if (productError || !product) return { iteration, ok: false, detail: `fixture setup failed: ${productError?.message}` };

  const { data: promo, error: promoError } = await admin
    .from("promo_codes")
    .insert({
      code: promoCode,
      discount_type: "fixed",
      discount_value: 100,
      usage_limit: 1,
      usage_count: 0,
      is_active: true,
    })
    .select()
    .single();
  if (promoError || !promo) return { iteration, ok: false, detail: `promo fixture setup failed: ${promoError?.message}` };

  // Two independent client instances (like two different customers' browsers), firing the
  // exact same order concurrently against the exact same promo code.
  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  const clientB = createClient(SUPABASE_URL, ANON_KEY);

  const placeOrder = (client: ReturnType<typeof createClient>) =>
    client.rpc("create_order", {
      p_customer_name: "Race Tester",
      p_phone_number: "+22990001122",
      p_address_text: "Cotonou",
      p_latitude: 6.4,
      p_longitude: 2.4,
      p_items: [{ product_id: product.id, quantity: 1 }],
      p_promo_code: promoCode,
    });

  const [resultA, resultB] = await Promise.all([placeOrder(clientA), placeOrder(clientB)]);
  const successes = [resultA, resultB].filter((r) => !r.error);
  const failures = [resultA, resultB].filter((r) => r.error);

  let ok = true;
  const problems: string[] = [];

  if (successes.length !== 1) {
    ok = false;
    problems.push(`expected exactly 1 success, got ${successes.length}`);
  }
  if (failures.length === 1 && !failures[0].error?.message.includes("limite d'utilisation")) {
    ok = false;
    problems.push(`the failing request had an unexpected error: ${failures[0].error?.message}`);
  }

  const { data: finalPromo } = await admin.from("promo_codes").select("usage_count").eq("id", promo.id).single();
  if (finalPromo?.usage_count !== 1) {
    ok = false;
    problems.push(`promo_codes.usage_count ended at ${finalPromo?.usage_count}, expected exactly 1`);
  }

  // Cleanup so a 50-iteration run doesn't pollute the local database. usage_count must be
  // reset before the delete — guard_promo_delete (see the triggers migration) blocks deleting
  // a promo code that has ever been used, by design.
  const orderIds = successes.map((r) => (r.data as { id: string } | null)?.id).filter((v): v is string => Boolean(v));
  if (orderIds.length > 0) {
    await admin.from("order_items").delete().in("order_id", orderIds);
    await admin.from("orders").delete().in("id", orderIds);
  }
  await admin.from("promo_codes").update({ usage_count: 0 }).eq("id", promo.id);
  await admin.from("promo_codes").delete().eq("id", promo.id);
  await admin.from("products").delete().eq("id", product.id);

  return { iteration, ok, detail: ok ? "ok" : problems.join("; ") };
}

async function main() {
  console.log(`Running ${ITERATIONS} iterations of the promo usage_limit race against ${SUPABASE_URL}...`);
  const results: IterationResult[] = [];
  for (let i = 1; i <= ITERATIONS; i++) {
    const result = await runIteration(i);
    results.push(result);
    process.stdout.write(result.ok ? "." : "X");
  }
  console.log("");

  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log(`PASS: all ${ITERATIONS} iterations enforced usage_limit=1 correctly.`);
    process.exit(0);
  }

  console.log(`FAIL: ${failed.length}/${ITERATIONS} iterations broke the usage_limit invariant:`);
  for (const f of failed) {
    console.log(`  iteration ${f.iteration}: ${f.detail}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("Unexpected error running the concurrency test:", err);
  process.exit(1);
});
