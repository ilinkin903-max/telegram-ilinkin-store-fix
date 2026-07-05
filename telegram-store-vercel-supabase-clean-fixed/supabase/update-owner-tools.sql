-- Jalankan file ini di Supabase SQL Editor untuk update project lama.
-- Aman dijalankan berkali-kali.

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
