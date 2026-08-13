-- Product images bucket. Public read (product photos are meant to be publicly visible);
-- writes go exclusively through the service_role-keyed Next.js Route Handler (see
-- frontend/src/app/api/admin/products/[id]/images/route.ts), which needs the resize-to-WebP
-- step (sharp) anyway — so no anon/authenticated INSERT/UPDATE/DELETE policy is needed here,
-- mirroring the product_images table's own RLS design in the rls migration.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product images bucket"
  on storage.objects for select
  using (bucket_id = 'product-images');
