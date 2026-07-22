-- v55: integrasi AutoGoPay.
-- Jalankan satu kali di Supabase SQL Editor sebelum deploy v55.

alter table public.pending_orders
  add column if not exists payment_provider text not null default 'pakasir';

alter table public.pending_orders
  add column if not exists provider_transaction_id text not null default '';

alter table public.pending_orders
  add column if not exists provider_checkout_url text not null default '';

create unique index if not exists pending_orders_provider_transaction_idx
  on public.pending_orders (provider_transaction_id)
  where provider_transaction_id <> '';

update public.pending_orders
set payment_provider = 'pakasir'
where payment_provider is null or payment_provider = '';
