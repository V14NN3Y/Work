-- Core schema, ported 1:1 from the FastAPI/SQLAlchemy models (backend/app/models/*.py).

create type order_status as enum ('pending', 'delivering', 'completed', 'cancelled');
create type review_status as enum ('pending', 'approved', 'rejected');
create type discount_type as enum ('percentage', 'fixed');

create table categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  description text,
  price numeric(10, 2) not null,
  stock_quantity integer not null default 0,
  image_url varchar(500),
  is_active boolean not null default true,
  category_id uuid references categories (id) on delete set null,
  created_at timestamptz not null default now()
);
create index ix_products_category_id on products (category_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  image_url varchar(500) not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index ix_product_images_product_id on product_images (product_id);

create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  discount_type discount_type not null,
  discount_value numeric(10, 2) not null,
  min_order_amount numeric(10, 2),
  max_discount_amount numeric(10, 2),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_ref varchar(20) not null unique,
  customer_name varchar(150) not null,
  phone_number varchar(30) not null,
  address_text varchar(255) not null,
  latitude numeric(10, 8) not null,
  longitude numeric(11, 8) not null,
  total_amount numeric(10, 2) not null,
  status order_status not null default 'pending',
  promo_code_id uuid references promo_codes (id) on delete set null,
  promo_code varchar(50),
  discount_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index ix_orders_status on orders (status);
create index ix_orders_created_at on orders (created_at);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id),
  quantity integer not null,
  unit_price numeric(10, 2) not null
);
create index ix_order_items_order_id on order_items (order_id);
create index ix_order_items_product_id on order_items (product_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  customer_name varchar(150) not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  status review_status not null default 'pending',
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  constraint uq_review_order_product unique (order_id, product_id)
);
create index ix_reviews_product_id on reviews (product_id);
create index ix_reviews_status on reviews (status);
