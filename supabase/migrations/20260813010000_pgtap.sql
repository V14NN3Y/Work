-- pgTAP: testing framework for the RPC/trigger/RLS test suite under supabase/tests/database/.
-- Installed in `extensions` (not `public`), so — like pgcrypto/uuid-ossp — it's never exposed
-- via PostgREST (see supabase/config.toml `[api] schemas`). Harmless to have in production;
-- only ever invoked by `supabase test db`, never by application code.
create extension if not exists pgtap with schema extensions;
