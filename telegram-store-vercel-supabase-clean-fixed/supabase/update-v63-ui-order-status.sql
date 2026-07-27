-- v63: status administratif transaksi untuk dashboard reseller.
-- Jalankan setelah update v62. Aman dijalankan berulang kali.

alter table public.transactions
  add column if not exists status text not null default 'completed';

alter table public.transactions
  add column if not exists canceled_at timestamptz;

alter table public.transactions
  add column if not exists status_updated_at timestamptz not null default now();

update public.transactions
set status = 'completed'
where status is null or btrim(status) = '';

alter table public.transactions
  drop constraint if exists transactions_status_check;

alter table public.transactions
  add constraint transactions_status_check
  check (status in ('completed', 'canceled'));

create index if not exists transactions_status_created_at_idx
  on public.transactions (status, created_at desc);
