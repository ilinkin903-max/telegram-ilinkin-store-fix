-- iLink.in Store v81 - Multi Supplier Telegram Userbot
-- Jalankan sekali di Supabase SQL Editor sebelum memakai supplier Telegram Userbot.

create table if not exists public.telegram_supplier_connectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  bot_username text not null,
  enabled boolean not null default false,
  worker_profile text not null default 'default',
  currency text not null default 'IDR',
  balance numeric(18,4),
  balance_text text not null default '',
  balance_checked_at timestamptz,
  status text not null default 'offline',
  last_error text not null default '',
  flow_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_supplier_connectors_enabled_idx
  on public.telegram_supplier_connectors (enabled, worker_profile, updated_at desc);

create table if not exists public.telegram_supplier_products (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.telegram_supplier_connectors(id) on delete cascade,
  external_code text not null default '',
  name text not null,
  cost_amount numeric(18,4) not null default 0,
  currency text not null default 'IDR',
  stock integer,
  stock_mode text not null default 'balance',
  active boolean not null default true,
  order_flow jsonb not null default '[]'::jsonb,
  delivery_regex text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_supplier_products_connector_idx
  on public.telegram_supplier_products (connector_id, active, updated_at desc);

alter table public.supplier_orders add column if not exists supplier_connector_id uuid;
alter table public.supplier_orders add column if not exists supplier_product_ref uuid;
alter table public.supplier_orders add column if not exists worker_id text not null default '';
alter table public.supplier_orders add column if not exists worker_profile text not null default 'default';
alter table public.supplier_orders add column if not exists locked_at timestamptz;
alter table public.supplier_orders add column if not exists attempt_count integer not null default 0;
alter table public.supplier_orders add column if not exists next_attempt_at timestamptz;
alter table public.supplier_orders add column if not exists flow_snapshot jsonb not null default '{}'::jsonb;
alter table public.supplier_orders add column if not exists worker_state jsonb not null default '{}'::jsonb;
alter table public.supplier_orders add column if not exists amount_currency text not null default '';
alter table public.supplier_orders add column if not exists completed_at timestamptz;

create index if not exists supplier_orders_userbot_queue_idx
  on public.supplier_orders (supplier, status, next_attempt_at, created_at)
  where supplier = 'telegram_userbot';

create index if not exists supplier_orders_userbot_connector_idx
  on public.supplier_orders (supplier_connector_id, status, locked_at)
  where supplier = 'telegram_userbot';

create or replace function public.claim_telegram_supplier_order(
  p_worker_id text,
  p_worker_profile text default 'default'
)
returns setof public.supplier_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.supplier_orders;
begin
  -- Recover stale processing jobs. The same connector remains serialized.
  update public.supplier_orders
     set status = 'retry',
         worker_id = '',
         locked_at = null,
         next_attempt_at = now(),
         error_code = case when error_code = '' then 'WORKER_STALE' else error_code end,
         error_message = case when error_message = '' then 'Worker lock expired; queued for retry.' else error_message end,
         updated_at = now()
   where supplier = 'telegram_userbot'
     and status = 'processing'
     and locked_at is not null
     and locked_at < now() - interval '15 minutes';

  select so.* into v_order
    from public.supplier_orders so
    join public.telegram_supplier_connectors c on c.id = so.supplier_connector_id
   where so.supplier = 'telegram_userbot'
     and so.status in ('queued','retry')
     and c.enabled = true
     and c.worker_profile = coalesce(nullif(p_worker_profile,''), 'default')
     and not (c.status = 'syncing' and c.updated_at > now() - interval '2 minutes')
     and (so.next_attempt_at is null or so.next_attempt_at <= now())
     and not exists (
       select 1
         from public.supplier_orders active
        where active.supplier = 'telegram_userbot'
          and active.supplier_connector_id = so.supplier_connector_id
          and active.status = 'processing'
          and active.id <> so.id
          and active.locked_at > now() - interval '15 minutes'
     )
   order by so.created_at asc
   for update of c, so skip locked
   limit 1;

  if not found then
    return;
  end if;

  update public.supplier_orders
     set status = 'processing',
         worker_id = coalesce(p_worker_id,''),
         worker_profile = coalesce(nullif(p_worker_profile,''), 'default'),
         locked_at = now(),
         attempt_count = coalesce(attempt_count,0) + 1,
         updated_at = now()
   where id = v_order.id
   returning * into v_order;

  return next v_order;
end;
$$;

revoke all on function public.claim_telegram_supplier_order(text,text) from public;
grant execute on function public.claim_telegram_supplier_order(text,text) to service_role;


create or replace function public.try_begin_telegram_supplier_balance_sync(
  p_connector_id uuid,
  p_worker_profile text default 'default'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
begin
  update public.telegram_supplier_connectors c
     set status = 'syncing',
         last_error = '',
         updated_at = now()
   where c.id = p_connector_id
     and c.enabled = true
     and c.worker_profile = coalesce(nullif(p_worker_profile,''), 'default')
     and not (c.status = 'syncing' and c.updated_at > now() - interval '2 minutes')
     and not exists (
       select 1
         from public.supplier_orders active
        where active.supplier = 'telegram_userbot'
          and active.supplier_connector_id = c.id
          and active.status = 'processing'
          and active.locked_at > now() - interval '15 minutes'
     )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.try_begin_telegram_supplier_balance_sync(uuid,text) from public;
grant execute on function public.try_begin_telegram_supplier_balance_sync(uuid,text) to service_role;

notify pgrst, 'reload schema';
