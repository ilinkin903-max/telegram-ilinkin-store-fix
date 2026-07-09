-- Jalankan file ini jika Total Transaksi sempat turun setelah Maintenance.
-- Script ini mengembalikan angka minimal Total Transaksi menjadi 196.
-- Setelah itu, order baru akan menambah counter ini otomatis.

create table if not exists public.shop_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  updated_at timestamptz not null default now()
);

with live as (
  select
    coalesce(count(*), 0)::numeric as orders_total,
    coalesce(sum(coalesce(total_price, 0)), 0)::numeric as revenue_total,
    coalesce(sum(coalesce(quantity, 0)), 0)::numeric as quantity_sold
  from public.transactions
), existing as (
  select value
  from public.shop_settings
  where key = 'historical_stats'
), merged as (
  select
    greatest(196, (select orders_total from live), coalesce(((select value from existing)->>'orders_total')::numeric, 0)) as orders_total,
    greatest((select revenue_total from live), coalesce(((select value from existing)->>'revenue_total')::numeric, 0)) as revenue_total,
    greatest((select quantity_sold from live), coalesce(((select value from existing)->>'quantity_sold')::numeric, 0)) as quantity_sold
)
insert into public.shop_settings (key, value, updated_at)
select
  'historical_stats',
  jsonb_build_object(
    'orders_total', orders_total,
    'revenue_total', revenue_total,
    'quantity_sold', quantity_sold,
    'updated_at', now()::text
  ),
  now()
from merged
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();
