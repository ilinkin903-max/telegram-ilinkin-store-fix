-- iLink.in Store v76 - Integrasi reseller ProdSeller
-- Jalankan sekali di Supabase SQL Editor sebelum memakai menu Supplier / Reseller.

alter table public.products add column if not exists supplier_source text not null default '';
alter table public.products add column if not exists supplier_product_id text not null default '';
alter table public.products add column if not exists supplier_price_usdt numeric(14,4) not null default 0;
alter table public.products add column if not exists supplier_public_price_usdt numeric(14,4) not null default 0;
alter table public.products add column if not exists supplier_stock integer;
alter table public.products add column if not exists supplier_synced_at timestamptz;

create index if not exists products_supplier_product_idx
  on public.products (supplier_source, supplier_product_id)
  where supplier_source <> '' and supplier_product_id <> '';

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  supplier text not null default 'prodseller',
  supplier_order_id text,
  supplier_product_id text not null default '',
  quantity integer not null default 1,
  amount_usdt numeric(14,4) not null default 0,
  status text not null default 'pending',
  delivered_text text not null default '',
  error_code text not null default '',
  error_message text not null default '',
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_orders_status_idx on public.supplier_orders (status, updated_at desc);
create index if not exists supplier_orders_supplier_order_idx on public.supplier_orders (supplier, supplier_order_id);

notify pgrst, 'reload schema';
