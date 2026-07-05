-- Jalankan file ini di Supabase SQL Editor sebelum import data.
-- Database bot lama yang berbasis JSON dipindah ke tabel-tabel ini.

create extension if not exists pgcrypto;

create table if not exists public.bot_users (
  telegram_id bigint primary key,
  first_name text,
  username text,
  transaction_count integer not null default 0,
  spending integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  price integer not null default 0,
  description text not null default '',
  terms text not null default '',
  image_url text not null default '',
  category text not null default '',
  bulk_prices jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  stock jsonb not null default '[]'::jsonb,
  sold integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_code_idx on public.products (code);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  username text,
  product_name text not null,
  product_code text not null,
  quantity integer not null default 1,
  total_price integer not null default 0,
  order_ref text unique,
  created_at timestamptz not null default now()
);

create index if not exists transactions_telegram_id_idx on public.transactions (telegram_id);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);

create table if not exists public.pending_orders (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  product_code text not null,
  quantity integer not null default 1,
  voucher_code text not null default '',
  invoice_ref text unique,
  amount integer not null default 0,
  fee integer not null default 0,
  status text not null default 'draft',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pending_orders_status_idx on public.pending_orders (status);

create table if not exists public.vouchers (
  code text primary key,
  products jsonb not null default '[]'::jsonb,
  discount integer not null default 0,
  usage_limit integer not null default 0,
  used_by jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security sengaja tidak diaktifkan karena bot memakai SERVICE_ROLE_KEY di server Vercel.
-- Jangan pernah taruh SERVICE_ROLE_KEY di frontend / public JavaScript.

-- Update fitur owner tools lengkap.
alter table public.products add column if not exists image_url text not null default '';
alter table public.products add column if not exists category text not null default '';
alter table public.products add column if not exists bulk_prices jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.vouchers add column if not exists description text not null default '';
alter table public.vouchers add column if not exists active boolean not null default true;
alter table public.vouchers add column if not exists expires_at timestamptz;

create table if not exists public.shop_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  updated_at timestamptz not null default now()
);

-- Kolom tambahan varian produk dan harga grosir.
alter table public.pending_orders add column if not exists variant_key text not null default '';
alter table public.pending_orders add column if not exists variant_name text not null default '';
alter table public.pending_orders add column if not exists unit_price integer not null default 0;
alter table public.transactions add column if not exists variant_key text not null default '';
alter table public.transactions add column if not exists variant_name text not null default '';
alter table public.transactions add column if not exists unit_price integer not null default 0;
