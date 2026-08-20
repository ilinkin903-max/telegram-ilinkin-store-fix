-- iLink.in Store v82 - Telegram Supplier on-demand di Vercel + Supabase
-- Jalankan SETELAH update-v81-telegram-userbot-suppliers.sql.

alter table public.telegram_supplier_connectors
  add column if not exists interaction_lock_token text not null default '',
  add column if not exists interaction_lock_until timestamptz,
  add column if not exists last_interaction_at timestamptz;

alter table public.telegram_supplier_products
  add column if not exists stock_flow jsonb not null default '[]'::jsonb,
  add column if not exists stock_regex text not null default '',
  add column if not exists stock_text text not null default '',
  add column if not exists stock_checked_at timestamptz,
  add column if not exists stock_cache_seconds integer not null default 60;

alter table public.supplier_orders
  add column if not exists balance_deducted boolean not null default false,
  add column if not exists balance_deducted_amount numeric(18,4) not null default 0;

create or replace function public.try_lock_telegram_supplier_connector(
  p_connector_id uuid,
  p_lock_token text,
  p_ttl_seconds integer default 75
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
  v_ttl integer := greatest(15, least(coalesce(p_ttl_seconds,75), 300));
begin
  if coalesce(nullif(trim(p_lock_token),''),'') = '' then return false; end if;

  update public.telegram_supplier_connectors c
     set interaction_lock_token = p_lock_token,
         interaction_lock_until = now() + make_interval(secs => v_ttl),
         last_interaction_at = now(),
         updated_at = now()
   where c.id = p_connector_id
     and c.enabled = true
     and (
       c.interaction_lock_until is null
       or c.interaction_lock_until <= now()
       or c.interaction_lock_token = p_lock_token
     )
     and not exists (
       select 1
         from public.supplier_orders so
        where so.supplier = 'telegram_userbot'
          and so.supplier_connector_id = c.id
          and so.status = 'processing'
          and so.locked_at is not null
          and so.locked_at > now() - interval '3 minutes'
     )
  returning true into v_claimed;

  return coalesce(v_claimed,false);
end;
$$;

revoke all on function public.try_lock_telegram_supplier_connector(uuid,text,integer) from public;
grant execute on function public.try_lock_telegram_supplier_connector(uuid,text,integer) to service_role;

create or replace function public.unlock_telegram_supplier_connector(
  p_connector_id uuid,
  p_lock_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlocked boolean := false;
begin
  update public.telegram_supplier_connectors
     set interaction_lock_token = '',
         interaction_lock_until = null,
         updated_at = now()
   where id = p_connector_id
     and interaction_lock_token = coalesce(p_lock_token,'')
  returning true into v_unlocked;
  return coalesce(v_unlocked,false);
end;
$$;

revoke all on function public.unlock_telegram_supplier_connector(uuid,text) from public;
grant execute on function public.unlock_telegram_supplier_connector(uuid,text) to service_role;

create or replace function public.claim_telegram_supplier_order_by_ref(
  p_order_ref text,
  p_worker_id text,
  p_lock_token text,
  p_ttl_seconds integer default 120
)
returns setof public.supplier_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.supplier_orders;
  v_ttl integer := greatest(30, least(coalesce(p_ttl_seconds,120), 300));
begin
  -- Pulihkan processing serverless yang stale.
  update public.supplier_orders
     set status = 'retry', worker_id = '', locked_at = null,
         next_attempt_at = now(),
         error_code = case when error_code = '' then 'VERCEL_STALE' else error_code end,
         error_message = case when error_message = '' then 'Vercel invocation lock expired; ready for retry.' else error_message end,
         updated_at = now()
   where supplier = 'telegram_userbot'
     and status = 'processing'
     and locked_at is not null
     and locked_at < now() - interval '3 minutes';

  select so.* into v_order
    from public.supplier_orders so
    join public.telegram_supplier_connectors c on c.id = so.supplier_connector_id
   where so.order_ref = p_order_ref
     and so.supplier = 'telegram_userbot'
     and so.status in ('queued','retry','error','delivery_pending')
     and c.enabled = true
     and (
       c.interaction_lock_until is null
       or c.interaction_lock_until <= now()
       or c.interaction_lock_token = p_lock_token
     )
     and not exists (
       select 1 from public.supplier_orders active
        where active.supplier = 'telegram_userbot'
          and active.supplier_connector_id = so.supplier_connector_id
          and active.status = 'processing'
          and active.id <> so.id
          and active.locked_at > now() - interval '3 minutes'
     )
   for update of c, so skip locked
   limit 1;

  if not found then return; end if;

  update public.telegram_supplier_connectors
     set interaction_lock_token = p_lock_token,
         interaction_lock_until = now() + make_interval(secs => v_ttl),
         last_interaction_at = now(),
         status = 'online',
         last_error = '',
         updated_at = now()
   where id = v_order.supplier_connector_id;

  update public.supplier_orders
     set status = case when coalesce(delivered_text,'') <> '' then 'delivery_pending' else 'processing' end,
         worker_id = coalesce(p_worker_id,'vercel-ondemand'),
         locked_at = now(),
         attempt_count = coalesce(attempt_count,0) + 1,
         updated_at = now()
   where id = v_order.id
   returning * into v_order;

  return next v_order;
end;
$$;

revoke all on function public.claim_telegram_supplier_order_by_ref(text,text,text,integer) from public;
grant execute on function public.claim_telegram_supplier_order_by_ref(text,text,text,integer) to service_role;

create or replace function public.deduct_telegram_supplier_balance_once(
  p_order_ref text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.supplier_orders;
  v_balance numeric;
  v_amount numeric := greatest(coalesce(p_amount,0),0);
begin
  select * into v_order
    from public.supplier_orders
   where order_ref = p_order_ref
     and supplier = 'telegram_userbot'
   for update;

  if not found then return null; end if;

  if v_order.balance_deducted then
    select balance into v_balance from public.telegram_supplier_connectors where id = v_order.supplier_connector_id;
    return jsonb_build_object('deducted',false,'already_deducted',true,'amount',v_order.balance_deducted_amount,'balance',v_balance);
  end if;

  update public.telegram_supplier_connectors
     set balance = case when balance is null then null else greatest(balance - v_amount, 0) end,
         updated_at = now()
   where id = v_order.supplier_connector_id
  returning balance into v_balance;

  update public.supplier_orders
     set balance_deducted = true,
         balance_deducted_amount = v_amount,
         updated_at = now()
   where id = v_order.id;

  return jsonb_build_object('deducted',true,'already_deducted',false,'amount',v_amount,'balance',v_balance);
end;
$$;

revoke all on function public.deduct_telegram_supplier_balance_once(text,numeric) from public;
grant execute on function public.deduct_telegram_supplier_balance_once(text,numeric) to service_role;

notify pgrst, 'reload schema';
