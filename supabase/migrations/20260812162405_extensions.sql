-- pgcrypto: gen_random_uuid() for primary keys, gen_random_bytes()/digest() used by
-- create_order (order_ref generation) and track_order/submit_review (phone comparison).
create extension if not exists pgcrypto;
