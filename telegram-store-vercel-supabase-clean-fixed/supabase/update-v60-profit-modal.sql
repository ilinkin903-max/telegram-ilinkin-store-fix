-- v60: modal supplier dan profit per transaksi
-- Jalankan sekali di Supabase SQL Editor sebelum deploy v60.

alter table public.products add column if not exists cost_price integer not null default 0;

alter table public.pending_orders add column if not exists cost_unit integer not null default 0;
alter table public.pending_orders add column if not exists cost_total integer not null default 0;
alter table public.pending_orders add column if not exists cost_source text not null default 'unset';

alter table public.transactions add column if not exists payment_fee integer not null default 0;
alter table public.transactions add column if not exists cost_unit integer not null default 0;
alter table public.transactions add column if not exists cost_total integer not null default 0;
alter table public.transactions add column if not exists cost_source text not null default 'unset';
alter table public.transactions add column if not exists cost_updated_at timestamptz;
alter table public.transactions add column if not exists profit_amount integer not null default 0;

-- Transaksi yang sudah pernah memiliki modal ditandai sebagai data lama/snapshot.
update public.transactions
set cost_source = 'snapshot', cost_updated_at = coalesce(cost_updated_at, created_at)
where coalesce(cost_total, 0) > 0 and coalesce(cost_source, 'unset') = 'unset';

-- Profit hanya dihitung jika modal sudah diketahui. Fee unik pembayaran
-- dikeluarkan agar profit = omzet bersih - modal supplier.
update public.transactions
set profit_amount = coalesce(total_price,0) - coalesce(payment_fee,0) - coalesce(cost_total,0)
where coalesce(cost_source, 'unset') <> 'unset';

update public.transactions
set profit_amount = 0
where coalesce(cost_source, 'unset') = 'unset';

create index if not exists transactions_profit_created_at_idx
on public.transactions (created_at desc, profit_amount);
