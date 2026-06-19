-- MGShop Casa - Schema SQL
-- Esegui questo script su Supabase > SQL Editor

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  category_id uuid references categories(id) on delete set null,
  cover_image text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Product images (galleria)
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

-- Banners (slider homepage)
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  link text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  status text not null default 'pending',
  total numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_price numeric(10,2) not null,
  quantity integer not null default 1,
  created_at timestamptz default now()
);

-- RLS: disabilita per uso con service_role key
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table banners enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Policy: lettura pubblica per prodotti, categorie, banners, immagini
create policy "Public read categories" on categories for select using (true);
create policy "Public read products" on products for select using (is_active = true);
create policy "Public read product_images" on product_images for select using (true);
create policy "Public read banners" on banners for select using (is_active = true);

-- Supabase Storage: crea bucket "images" pubblico dalla dashboard
-- Storage > New bucket > nome: images > Public: ON
