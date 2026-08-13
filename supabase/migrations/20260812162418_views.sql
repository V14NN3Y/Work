-- Replaces the AVG(rating) aggregate query in GET /api/products/{id}/reviews. Plain public-read
-- view (no RPC needed) — the underlying `reviews` table's RLS still applies to the base table,
-- but a view only exposing already-approved aggregates needs its own read policy since views
-- don't inherit RLS from underlying tables by default in the same row-filtering sense.
create view product_review_summary as
select
  product_id,
  count(*) as review_count,
  round(avg(rating)::numeric, 1) as average_rating
from reviews
where status = 'approved'
group by product_id;

grant select on product_review_summary to anon, authenticated;
