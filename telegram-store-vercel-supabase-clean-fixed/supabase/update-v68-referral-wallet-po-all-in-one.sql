-- iLink.in Store v68 - migration gabungan referral/wallet/PO
-- Gunakan file ini bila update v65/v66 sebelumnya gagal karena public.bot_users belum ada.
-- Prasyarat: schema dasar dan update v62/v63/v64 sudah terpasang.
-- Aman ditujukan untuk upgrade; tetap lakukan backup database sebelum migrasi produksi.

-- ============================================================
-- PERBAIKAN BOT USERS
-- ============================================================
-- Perbaikan prasyarat v65/v66
-- Jalankan HANYA pada project Supabase yang sama dengan SUPABASE_URL di Vercel.
-- File ini membuat tabel public.bot_users jika belum ada.
-- Setelah file ini berhasil, jalankan update-v65 lalu update-v66.

create extension if not exists pgcrypto;

create table if not exists public.bot_users (
  telegram_id bigint primary key,
  first_name text,
  username text,
  transaction_count integer not null default 0,
  spending bigint not null default 0,
  balance_main bigint not null default 0,
  balance_referral bigint not null default 0,
  referral_code text,
  referred_by bigint,
  referral_status text not null default 'none',
  referral_reward_amount bigint not null default 0,
  referral_rewarded_at timestamptz,
  first_purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pastikan kolom dasar tetap tersedia jika tabel pernah dibuat dengan struktur lama.
alter table public.bot_users add column if not exists first_name text;
alter table public.bot_users add column if not exists username text;
alter table public.bot_users add column if not exists transaction_count integer not null default 0;
alter table public.bot_users add column if not exists spending bigint not null default 0;
alter table public.bot_users add column if not exists balance_main bigint not null default 0;
alter table public.bot_users add column if not exists balance_referral bigint not null default 0;
alter table public.bot_users add column if not exists referral_code text;
alter table public.bot_users add column if not exists referred_by bigint;
alter table public.bot_users add column if not exists referral_status text not null default 'none';
alter table public.bot_users add column if not exists referral_reward_amount bigint not null default 0;
alter table public.bot_users add column if not exists referral_rewarded_at timestamptz;
alter table public.bot_users add column if not exists first_purchase_at timestamptz;
alter table public.bot_users add column if not exists created_at timestamptz not null default now();
alter table public.bot_users add column if not exists updated_at timestamptz not null default now();

-- Jika project lama memiliki tabel public.users, coba salin data user yang memiliki ID Telegram numerik.
-- Blok ini aman dilewati bila public.users tidak ada.
do $$
begin
  if to_regclass('public.users') is not null then
    execute $copy$
      insert into public.bot_users (
        telegram_id,
        first_name,
        username,
        transaction_count,
        spending,
        created_at,
        updated_at
      )
      select
        case
          when coalesce(j->>'telegram_id', j->>'id', '') ~ '^[0-9]+$'
            then coalesce(j->>'telegram_id', j->>'id')::bigint
          else null
        end as telegram_id,
        nullif(trim(coalesce(j->>'first_name', j->>'name', '')), '') as first_name,
        nullif(trim(coalesce(j->>'username', '')), '') as username,
        case
          when coalesce(j->>'transaction_count', j->>'transactions', '') ~ '^[0-9]+$'
            then coalesce(j->>'transaction_count', j->>'transactions')::integer
          else 0
        end as transaction_count,
        case
          when coalesce(j->>'spending', j->>'total_spending', '') ~ '^[0-9]+$'
            then coalesce(j->>'spending', j->>'total_spending')::bigint
          else 0
        end as spending,
        case
          when coalesce(j->>'created_at', '') <> ''
            then (j->>'created_at')::timestamptz
          else now()
        end as created_at,
        now() as updated_at
      from (
        select to_jsonb(u) as j
        from public.users u
      ) src
      where coalesce(j->>'telegram_id', j->>'id', '') ~ '^[0-9]+$'
      on conflict (telegram_id) do update set
        first_name = coalesce(excluded.first_name, public.bot_users.first_name),
        username = coalesce(excluded.username, public.bot_users.username),
        transaction_count = greatest(
          coalesce(public.bot_users.transaction_count, 0),
          coalesce(excluded.transaction_count, 0)
        ),
        spending = greatest(
          coalesce(public.bot_users.spending, 0),
          coalesce(excluded.spending, 0)
        ),
        updated_at = now()
    $copy$;
  end if;
end
$$;

-- Kode referral awal untuk user lama akan dilengkapi lagi oleh SQL v65.
update public.bot_users
set referral_code = upper(
  substr(
    encode(
      digest(telegram_id::text || ':' || gen_random_uuid()::text, 'sha256'),
      'hex'
    ),
    1,
    10
  )
)
where trim(coalesce(referral_code, '')) = '';

notify pgrst, 'reload schema';

select
  to_regclass('public.bot_users') as bot_users_table,
  count(*) as total_users
from public.bot_users;

-- ============================================================
-- V65 REFERRAL WALLET TOPUP
-- ============================================================
-- v65: referral, saldo pengguna, top up QRIS, dan pembayaran produk dengan saldo.
-- Jalankan SETELAH update v62, v63, dan v64.
-- Aman dijalankan berulang kali.

create extension if not exists pgcrypto;

alter table public.bot_users add column if not exists balance_main bigint not null default 0;
alter table public.bot_users add column if not exists balance_referral bigint not null default 0;
alter table public.bot_users add column if not exists referral_code text;
alter table public.bot_users add column if not exists referred_by bigint;
alter table public.bot_users add column if not exists referral_status text not null default 'none';
alter table public.bot_users add column if not exists referral_reward_amount bigint not null default 0;
alter table public.bot_users add column if not exists referral_rewarded_at timestamptz;
alter table public.bot_users add column if not exists first_purchase_at timestamptz;

alter table public.bot_users drop constraint if exists bot_users_balance_main_nonnegative;
alter table public.bot_users add constraint bot_users_balance_main_nonnegative check (balance_main >= 0);
alter table public.bot_users drop constraint if exists bot_users_balance_referral_nonnegative;
alter table public.bot_users add constraint bot_users_balance_referral_nonnegative check (balance_referral >= 0);

update public.bot_users
set referral_code = upper(substr(encode(digest(telegram_id::text || ':' || gen_random_uuid()::text, 'sha256'), 'hex'), 1, 10))
where trim(coalesce(referral_code, '')) = '';

create unique index if not exists bot_users_referral_code_unique_idx
  on public.bot_users (upper(referral_code));
create index if not exists bot_users_referred_by_idx on public.bot_users (referred_by);

alter table public.bot_users drop constraint if exists bot_users_referral_status_check;
alter table public.bot_users add constraint bot_users_referral_status_check
  check (referral_status in ('none', 'pending', 'rewarded', 'ineligible'));

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_key text not null unique,
  telegram_id bigint not null,
  wallet_type text not null,
  direction text not null,
  amount bigint not null check (amount > 0),
  balance_after bigint not null default 0,
  reason text not null default '',
  reference text not null default '',
  actor_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (telegram_id, created_at desc);
alter table public.wallet_ledger enable row level security;
alter table public.wallet_ledger drop constraint if exists wallet_ledger_wallet_type_check;
alter table public.wallet_ledger add constraint wallet_ledger_wallet_type_check
  check (wallet_type in ('main', 'referral'));
alter table public.wallet_ledger drop constraint if exists wallet_ledger_direction_check;
alter table public.wallet_ledger add constraint wallet_ledger_direction_check
  check (direction in ('credit', 'debit'));

create table if not exists public.pending_topups (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  topup_ref text not null unique,
  amount bigint not null default 0,
  fee bigint not null default 0,
  total_amount bigint not null default 0,
  payment_provider text not null default '',
  provider_transaction_id text,
  provider_checkout_url text not null default '',
  qr_payload text not null default '',
  status text not null default 'waiting_amount',
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pending_topups_provider_transaction_unique_idx
  on public.pending_topups (provider_transaction_id)
  where provider_transaction_id is not null and trim(provider_transaction_id) <> '';
create index if not exists pending_topups_user_status_idx
  on public.pending_topups (telegram_id, status, created_at desc);
create index if not exists pending_topups_status_idx
  on public.pending_topups (status, created_at);
alter table public.pending_topups enable row level security;
alter table public.pending_topups drop constraint if exists pending_topups_status_check;
alter table public.pending_topups add constraint pending_topups_status_check
  check (status in ('waiting_amount', 'awaiting_payment', 'completed', 'canceled', 'expired', 'failed'));

alter table public.pending_orders add column if not exists payment_method text not null default 'gateway';
alter table public.transactions add column if not exists payment_method text not null default 'gateway';
alter table public.transactions add column if not exists wallet_main_used bigint not null default 0;
alter table public.transactions add column if not exists wallet_referral_used bigint not null default 0;

insert into public.shop_settings(key, value, updated_at) values
  ('referral_enabled', 'true'::jsonb, now()),
  ('referral_reward_amount', '500'::jsonb, now()),
  ('referral_reward_mode', '"signup"'::jsonb, now()),
  ('topup_enabled', 'true'::jsonb, now()),
  ('wallet_payment_enabled', 'true'::jsonb, now()),
  ('topup_min_amount', '10000'::jsonb, now()),
  ('topup_max_amount', '1000000'::jsonb, now())
on conflict (key) do nothing;

create or replace function public.register_bot_user_v65(
  p_user jsonb,
  p_referral_code text default '',
  p_referral_enabled boolean default true,
  p_reward_amount integer default 0,
  p_reward_mode text default 'signup'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint := coalesce(nullif(p_user->>'telegram_id', '')::bigint, nullif(p_user->>'id', '')::bigint, 0);
  v_first_name text := nullif(trim(coalesce(p_user->>'first_name', '')), '');
  v_username text := nullif(trim(coalesce(p_user->>'username', '')), '');
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_mode text := lower(trim(coalesce(p_reward_mode, 'signup')));
  v_amount bigint := greatest(0, coalesce(p_reward_amount, 0));
  v_existing public.bot_users%rowtype;
  v_referrer public.bot_users%rowtype;
  v_user public.bot_users%rowtype;
  v_generated text;
  v_status text := 'none';
  v_reward jsonb := null;
  v_try integer := 0;
begin
  if v_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if v_mode not in ('signup', 'first_purchase') then v_mode := 'signup'; end if;

  select * into v_existing from public.bot_users where telegram_id = v_id for update;
  if found then
    update public.bot_users set
      first_name = coalesce(v_first_name, first_name),
      username = coalesce(v_username, username),
      updated_at = now()
    where telegram_id = v_id
    returning * into v_user;
    return jsonb_build_object('created', false, 'user', to_jsonb(v_user), 'referral_reward', null);
  end if;

  loop
    v_try := v_try + 1;
    v_generated := upper(substr(encode(digest(v_id::text || ':' || gen_random_uuid()::text, 'sha256'), 'hex'), 1, 10));
    exit when not exists (select 1 from public.bot_users where upper(referral_code) = v_generated);
    if v_try > 10 then raise exception 'REFERRAL_CODE_GENERATION_FAILED'; end if;
  end loop;

  if p_referral_enabled and v_code <> '' then
    select * into v_referrer
      from public.bot_users
     where upper(referral_code) = v_code
     limit 1
     for update;
    if found and v_referrer.telegram_id <> v_id and v_amount > 0 then
      v_status := case when v_mode = 'signup' then 'rewarded' else 'pending' end;
    else
      v_status := 'ineligible';
    end if;
  end if;

  insert into public.bot_users(
    telegram_id, first_name, username, referral_code, referred_by,
    referral_status, referral_reward_amount, referral_rewarded_at,
    transaction_count, spending, balance_main, balance_referral,
    created_at, updated_at
  ) values (
    v_id, v_first_name, v_username, v_generated,
    case when v_status in ('pending', 'rewarded') then v_referrer.telegram_id else null end,
    v_status,
    case when v_status in ('pending', 'rewarded') then v_amount else 0 end,
    case when v_status = 'rewarded' then now() else null end,
    0, 0, 0, 0, now(), now()
  ) returning * into v_user;

  if v_status = 'rewarded' and v_amount > 0 then
    update public.bot_users
       set balance_referral = balance_referral + v_amount,
           updated_at = now()
     where telegram_id = v_referrer.telegram_id
     returning * into v_referrer;

    insert into public.wallet_ledger(
      entry_key, telegram_id, wallet_type, direction, amount,
      balance_after, reason, reference, created_at
    ) values (
      'referral:signup:' || v_id::text,
      v_referrer.telegram_id,
      'referral', 'credit', v_amount,
      v_referrer.balance_referral,
      'Bonus referral pengguna baru',
      v_id::text,
      now()
    ) on conflict (entry_key) do nothing;

    v_reward := jsonb_build_object(
      'telegram_id', v_referrer.telegram_id,
      'amount', v_amount,
      'invitee_id', v_id,
      'mode', 'signup'
    );
  end if;

  return jsonb_build_object('created', true, 'user', to_jsonb(v_user), 'referral_reward', v_reward);
end;
$$;

create or replace function public.set_user_balances_v65(
  p_telegram_id bigint,
  p_balance_main bigint,
  p_balance_referral bigint,
  p_reason text default 'Penyesuaian saldo oleh owner',
  p_reference text default '',
  p_actor_id bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.bot_users%rowtype;
  v_new_main bigint := greatest(0, coalesce(p_balance_main, 0));
  v_new_ref bigint := greatest(0, coalesce(p_balance_referral, 0));
  v_diff_main bigint;
  v_diff_ref bigint;
  v_ref text := trim(coalesce(p_reference, ''));
begin
  if p_telegram_id is null or p_telegram_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if v_ref = '' then v_ref := gen_random_uuid()::text; end if;

  select * into v_user from public.bot_users where telegram_id = p_telegram_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  v_diff_main := v_new_main - coalesce(v_user.balance_main, 0);
  v_diff_ref := v_new_ref - coalesce(v_user.balance_referral, 0);

  update public.bot_users
     set balance_main = v_new_main,
         balance_referral = v_new_ref,
         updated_at = now()
   where telegram_id = p_telegram_id
   returning * into v_user;

  if v_diff_main <> 0 then
    insert into public.wallet_ledger(
      entry_key, telegram_id, wallet_type, direction, amount,
      balance_after, reason, reference, actor_id, created_at
    ) values (
      'admin:' || v_ref || ':main', p_telegram_id, 'main',
      case when v_diff_main > 0 then 'credit' else 'debit' end,
      abs(v_diff_main), v_new_main, trim(coalesce(p_reason, 'Penyesuaian saldo oleh owner')),
      v_ref, p_actor_id, now()
    ) on conflict (entry_key) do nothing;
  end if;

  if v_diff_ref <> 0 then
    insert into public.wallet_ledger(
      entry_key, telegram_id, wallet_type, direction, amount,
      balance_after, reason, reference, actor_id, created_at
    ) values (
      'admin:' || v_ref || ':referral', p_telegram_id, 'referral',
      case when v_diff_ref > 0 then 'credit' else 'debit' end,
      abs(v_diff_ref), v_new_ref, trim(coalesce(p_reason, 'Penyesuaian saldo oleh owner')),
      v_ref, p_actor_id, now()
    ) on conflict (entry_key) do nothing;
  end if;

  return to_jsonb(v_user);
end;
$$;

create or replace function public.complete_topup_v65(
  p_topup_ref text,
  p_provider_transaction_id text,
  p_paid_total bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text := trim(coalesce(p_topup_ref, ''));
  v_topup public.pending_topups%rowtype;
  v_user public.bot_users%rowtype;
begin
  if v_ref = '' then raise exception 'TOPUP_REF_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('topup:' || v_ref, 0));

  select * into v_topup from public.pending_topups where topup_ref = v_ref for update;
  if not found then raise exception 'TOPUP_NOT_FOUND'; end if;

  if v_topup.status = 'completed' then
    select * into v_user from public.bot_users where telegram_id = v_topup.telegram_id;
    return jsonb_build_object('already_completed', true, 'topup', to_jsonb(v_topup), 'user', to_jsonb(v_user));
  end if;
  if v_topup.status <> 'awaiting_payment' then raise exception 'TOPUP_NOT_AWAITING_PAYMENT'; end if;
  if coalesce(p_paid_total, 0) <> coalesce(v_topup.total_amount, 0) then raise exception 'TOPUP_AMOUNT_MISMATCH'; end if;

  select * into v_user from public.bot_users where telegram_id = v_topup.telegram_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  update public.bot_users
     set balance_main = balance_main + v_topup.amount,
         updated_at = now()
   where telegram_id = v_topup.telegram_id
   returning * into v_user;

  insert into public.wallet_ledger(
    entry_key, telegram_id, wallet_type, direction, amount,
    balance_after, reason, reference, created_at
  ) values (
    'topup:' || v_ref,
    v_topup.telegram_id, 'main', 'credit', v_topup.amount,
    v_user.balance_main, 'Top up QRIS berhasil', v_ref, now()
  ) on conflict (entry_key) do nothing;

  update public.pending_topups
     set status = 'completed',
         provider_transaction_id = coalesce(nullif(trim(coalesce(p_provider_transaction_id, '')), ''), provider_transaction_id),
         completed_at = now(),
         updated_at = now()
   where id = v_topup.id
   returning * into v_topup;

  return jsonb_build_object('already_completed', false, 'topup', to_jsonb(v_topup), 'user', to_jsonb(v_user));
end;
$$;

create or replace function public.reward_referral_after_transaction_v65()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitee public.bot_users%rowtype;
  v_referrer public.bot_users%rowtype;
  v_amount bigint;
begin
  if lower(coalesce(new.status, 'completed')) <> 'completed' then return new; end if;
  select * into v_invitee from public.bot_users where telegram_id = new.telegram_id for update;
  if not found then return new; end if;

  if v_invitee.first_purchase_at is null then
    update public.bot_users set first_purchase_at = new.created_at, updated_at = now()
     where telegram_id = new.telegram_id;
  end if;

  if v_invitee.referral_status <> 'pending' or v_invitee.referred_by is null then return new; end if;
  v_amount := greatest(0, coalesce(v_invitee.referral_reward_amount, 0));
  if v_amount <= 0 then
    update public.bot_users set referral_status = 'ineligible', updated_at = now()
     where telegram_id = new.telegram_id;
    return new;
  end if;

  select * into v_referrer from public.bot_users where telegram_id = v_invitee.referred_by for update;
  if not found then
    update public.bot_users set referral_status = 'ineligible', updated_at = now()
     where telegram_id = new.telegram_id;
    return new;
  end if;

  update public.bot_users
     set balance_referral = balance_referral + v_amount,
         updated_at = now()
   where telegram_id = v_referrer.telegram_id
   returning * into v_referrer;

  insert into public.wallet_ledger(
    entry_key, telegram_id, wallet_type, direction, amount,
    balance_after, reason, reference, created_at
  ) values (
    'referral:first_purchase:' || new.telegram_id::text,
    v_referrer.telegram_id, 'referral', 'credit', v_amount,
    v_referrer.balance_referral, 'Bonus referral setelah pembelian pertama',
    new.telegram_id::text, now()
  ) on conflict (entry_key) do nothing;

  update public.bot_users
     set referral_status = 'rewarded',
         referral_rewarded_at = now(),
         updated_at = now()
   where telegram_id = new.telegram_id;

  return new;
end;
$$;

drop trigger if exists transactions_referral_reward_v65 on public.transactions;
create trigger transactions_referral_reward_v65
after insert on public.transactions
for each row execute function public.reward_referral_after_transaction_v65();

create or replace function public.fulfill_wallet_order_v65(
  p_order jsonb,
  p_product_code text,
  p_total_price integer,
  p_buyer jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice text := trim(coalesce(p_order->>'invoice_ref', ''));
  v_product_code text := trim(coalesce(p_product_code, p_order->>'product_code', ''));
  v_variant_key text := trim(coalesce(p_order->>'variant_key', ''));
  v_variant_name text := trim(coalesce(p_order->>'variant_name', ''));
  v_quantity integer := greatest(1, coalesce(nullif(p_order->>'quantity', '')::integer, 1));
  v_telegram_id bigint := coalesce(nullif(p_order->>'telegram_id', '')::bigint, 0);
  v_unit_price integer := greatest(0, coalesce(nullif(p_order->>'unit_price', '')::integer, 0));
  v_cost_unit integer := greatest(0, coalesce(nullif(p_order->>'cost_unit', '')::integer, 0));
  v_cost_total integer := greatest(0, coalesce(nullif(p_order->>'cost_total', '')::integer, 0));
  v_cost_source text := trim(coalesce(p_order->>'cost_source', 'unset'));
  v_voucher_code text := trim(coalesce(p_order->>'voucher_code', ''));
  v_now timestamptz := now();
  v_product public.products%rowtype;
  v_user public.bot_users%rowtype;
  v_transaction public.transactions%rowtype;
  v_variant jsonb;
  v_variant_idx integer;
  v_stock jsonb := '[]'::jsonb;
  v_taken jsonb := '[]'::jsonb;
  v_rest jsonb := '[]'::jsonb;
  v_variants jsonb;
  v_profit integer;
  v_inserted_id uuid;
  v_delivered_text text := '';
  v_main_used bigint := 0;
  v_ref_used bigint := 0;
  v_remaining bigint;
begin
  if v_invoice = '' then raise exception 'INVOICE_REQUIRED'; end if;
  if v_product_code = '' then raise exception 'PRODUCT_CODE_REQUIRED'; end if;
  if v_telegram_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if p_total_price is null or p_total_price < 0 then raise exception 'TOTAL_PRICE_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended('invoice:' || v_invoice, 0));

  select * into v_transaction from public.transactions where order_ref = v_invoice limit 1;
  if found then
    return jsonb_build_object(
      'already_completed', true,
      'delivered', coalesce(v_transaction.delivered_items, '[]'::jsonb),
      'transaction', to_jsonb(v_transaction)
    );
  end if;

  select * into v_user from public.bot_users where telegram_id = v_telegram_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if coalesce(v_user.balance_main, 0) + coalesce(v_user.balance_referral, 0) < p_total_price then
    raise exception 'INSUFFICIENT_WALLET_BALANCE';
  end if;

  select * into v_product
    from public.products
   where upper(code) = upper(v_product_code)
   limit 1
   for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  if v_cost_total = 0 and v_cost_unit > 0 then v_cost_total := v_cost_unit * v_quantity; end if;
  if v_cost_source = '' then v_cost_source := case when v_cost_total > 0 then 'snapshot' else 'unset' end; end if;
  v_profit := case when v_cost_source = 'unset' then 0 else p_total_price - v_cost_total end;

  insert into public.transactions (
    telegram_id, username, product_name, product_code,
    variant_key, variant_name, unit_price, quantity, total_price,
    payment_fee, cost_unit, cost_total, cost_source, cost_updated_at,
    profit_amount, payment_method, wallet_main_used, wallet_referral_used,
    order_ref, delivered_items, delivered_text, created_at
  ) values (
    v_telegram_id,
    nullif(trim(coalesce(p_buyer->>'username', '')), ''),
    v_product.name, v_product.code, v_variant_key, v_variant_name,
    v_unit_price, v_quantity, p_total_price,
    0, v_cost_unit, v_cost_total, v_cost_source,
    case when v_cost_source = 'unset' then null else v_now end,
    v_profit, 'wallet', 0, 0,
    v_invoice, '[]'::jsonb, '', v_now
  ) on conflict (order_ref) do nothing returning id into v_inserted_id;

  if v_inserted_id is null then
    select * into v_transaction from public.transactions where order_ref = v_invoice limit 1;
    return jsonb_build_object(
      'already_completed', true,
      'delivered', coalesce(v_transaction.delivered_items, '[]'::jsonb),
      'transaction', to_jsonb(v_transaction)
    );
  end if;

  if v_variant_key <> '' then
    select (ord - 1)::integer, elem into v_variant_idx, v_variant
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) with ordinality as t(elem, ord)
     where upper(regexp_replace(
       coalesce(elem->>'sku', elem->>'kode', elem->>'key', elem->>'name', elem->>'nama', 'VAR' || ord::text),
       '\s+', '-', 'g'
     )) = upper(v_variant_key)
     limit 1;
    if v_variant_idx is null then raise exception 'VARIANT_NOT_FOUND'; end if;
    v_stock := coalesce(v_variant->'stock', v_variant->'stok', v_variant->'data', '[]'::jsonb);
  else
    v_stock := coalesce(v_product.stock, '[]'::jsonb);
  end if;

  if jsonb_typeof(v_stock) <> 'array' then raise exception 'STOCK_FORMAT_INVALID'; end if;
  if jsonb_array_length(v_stock) < v_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;

  select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb) into v_taken
    from jsonb_array_elements(v_stock) with ordinality as t(elem, ord) where ord <= v_quantity;
  select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb) into v_rest
    from jsonb_array_elements(v_stock) with ordinality as t(elem, ord) where ord > v_quantity;

  if v_variant_key <> '' then
    v_variants := coalesce(v_product.variants, '[]'::jsonb);
    v_variants := jsonb_set(v_variants, array[v_variant_idx::text, 'stock'], v_rest, true);
    v_variants := jsonb_set(
      v_variants, array[v_variant_idx::text, 'sold'],
      to_jsonb(greatest(0, coalesce(nullif(v_variant->>'sold', '')::integer, 0)) + v_quantity), true
    );
    update public.products set variants = v_variants, sold = coalesce(sold, 0) + v_quantity, updated_at = v_now
     where id = v_product.id;
  else
    update public.products set stock = v_rest, sold = coalesce(sold, 0) + v_quantity, updated_at = v_now
     where id = v_product.id;
  end if;

  v_main_used := least(coalesce(v_user.balance_main, 0), p_total_price);
  v_remaining := p_total_price - v_main_used;
  v_ref_used := greatest(0, v_remaining);

  update public.bot_users
     set balance_main = balance_main - v_main_used,
         balance_referral = balance_referral - v_ref_used,
         first_name = coalesce(nullif(trim(coalesce(p_buyer->>'first_name', '')), ''), first_name),
         username = coalesce(nullif(trim(coalesce(p_buyer->>'username', '')), ''), username),
         transaction_count = transaction_count + 1,
         spending = spending + p_total_price,
         updated_at = v_now
   where telegram_id = v_telegram_id
   returning * into v_user;

  if v_main_used > 0 then
    insert into public.wallet_ledger(entry_key, telegram_id, wallet_type, direction, amount, balance_after, reason, reference, created_at)
    values ('order:' || v_invoice || ':main', v_telegram_id, 'main', 'debit', v_main_used,
      v_user.balance_main, 'Pembayaran produk dengan saldo utama', v_invoice, v_now)
    on conflict (entry_key) do nothing;
  end if;
  if v_ref_used > 0 then
    insert into public.wallet_ledger(entry_key, telegram_id, wallet_type, direction, amount, balance_after, reason, reference, created_at)
    values ('order:' || v_invoice || ':referral', v_telegram_id, 'referral', 'debit', v_ref_used,
      v_user.balance_referral, 'Pembayaran produk dengan saldo referral', v_invoice, v_now)
    on conflict (entry_key) do nothing;
  end if;

  select coalesce(string_agg(value, E'\n' order by ord), '') into v_delivered_text
    from jsonb_array_elements_text(v_taken) with ordinality as t(value, ord);

  update public.transactions
     set delivered_items = v_taken,
         delivered_text = v_delivered_text,
         wallet_main_used = v_main_used,
         wallet_referral_used = v_ref_used
   where id = v_inserted_id
   returning * into v_transaction;

  if v_voucher_code <> '' then
    if upper(v_voucher_code) like 'AUTO_PROMO:%' then
      update public.auto_promos set used_count = coalesce(used_count, 0) + 1, updated_at = v_now
       where upper(code) = upper(substring(v_voucher_code from 12));
    else
      update public.vouchers
         set used_by = case
           when coalesce(used_by, '[]'::jsonb) @> jsonb_build_array(v_telegram_id)
             then coalesce(used_by, '[]'::jsonb)
           else coalesce(used_by, '[]'::jsonb) || jsonb_build_array(v_telegram_id)
         end,
         updated_at = v_now
       where upper(code) = upper(v_voucher_code);
    end if;
  end if;

  insert into public.shop_settings(key, value, updated_at)
  values (
    'historical_stats',
    jsonb_build_object(
      'orders_total', 1, 'revenue_total', p_total_price,
      'quantity_sold', v_quantity, 'cost_total', v_cost_total,
      'profit_total', v_profit, 'updated_at', v_now
    ), v_now
  ) on conflict (key) do update set
    value = jsonb_build_object(
      'orders_total', coalesce((public.shop_settings.value->>'orders_total')::numeric, 0) + 1,
      'revenue_total', coalesce((public.shop_settings.value->>'revenue_total')::numeric, 0) + p_total_price,
      'quantity_sold', coalesce((public.shop_settings.value->>'quantity_sold')::numeric, 0) + v_quantity,
      'cost_total', coalesce((public.shop_settings.value->>'cost_total')::numeric, 0) + v_cost_total,
      'profit_total', coalesce((public.shop_settings.value->>'profit_total')::numeric, 0) + v_profit,
      'updated_at', v_now
    ), updated_at = v_now;

  return jsonb_build_object(
    'already_completed', false,
    'delivered', v_taken,
    'transaction', to_jsonb(v_transaction),
    'wallet', jsonb_build_object(
      'main_used', v_main_used,
      'referral_used', v_ref_used,
      'balance_main', v_user.balance_main,
      'balance_referral', v_user.balance_referral
    )
  );
end;
$$;

revoke all on function public.register_bot_user_v65(jsonb, text, boolean, integer, text) from public, anon, authenticated;
revoke all on function public.set_user_balances_v65(bigint, bigint, bigint, text, text, bigint) from public, anon, authenticated;
revoke all on function public.complete_topup_v65(text, text, bigint) from public, anon, authenticated;
revoke all on function public.fulfill_wallet_order_v65(jsonb, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.register_bot_user_v65(jsonb, text, boolean, integer, text) to service_role;
grant execute on function public.set_user_balances_v65(bigint, bigint, bigint, text, text, bigint) to service_role;
grant execute on function public.complete_topup_v65(text, text, bigint) to service_role;
grant execute on function public.fulfill_wallet_order_v65(jsonb, text, integer, jsonb) to service_role;

-- ============================================================
-- V66 REFERRAL NOTIFICATION FIX
-- ============================================================
-- v66: memperbaiki referral untuk user yang sudah pernah terdaftar tetapi belum memiliki referrer,
-- serta menambahkan fungsi registrasi referral yang lebih aman dan idempoten.
-- Jalankan setelah update-v65-referral-wallet-topup.sql.

create or replace function public.register_bot_user_v66(
  p_user jsonb,
  p_referral_code text default '',
  p_referral_enabled boolean default true,
  p_reward_amount integer default 0,
  p_reward_mode text default 'signup'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint := coalesce(nullif(p_user->>'telegram_id', '')::bigint, nullif(p_user->>'id', '')::bigint, 0);
  v_first_name text := nullif(trim(coalesce(p_user->>'first_name', '')), '');
  v_username text := nullif(trim(coalesce(p_user->>'username', '')), '');
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_mode text := lower(trim(coalesce(p_reward_mode, 'signup')));
  v_amount bigint := greatest(0, coalesce(p_reward_amount, 0));
  v_referrer public.bot_users%rowtype;
  v_user public.bot_users%rowtype;
  v_generated text;
  v_reward jsonb := null;
  v_try integer := 0;
  v_created boolean := false;
  v_ledger_id uuid;
begin
  if v_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if v_mode not in ('signup', 'first_purchase') then v_mode := 'signup'; end if;

  -- Menjamin dua update /start untuk user yang sama tidak diproses bersamaan.
  perform pg_advisory_xact_lock(hashtextextended('bot_user:' || v_id::text, 0));

  select * into v_user from public.bot_users where telegram_id = v_id for update;

  if found then
    update public.bot_users set
      first_name = coalesce(v_first_name, first_name),
      username = coalesce(v_username, username),
      updated_at = now()
    where telegram_id = v_id
    returning * into v_user;
  else
    loop
      v_try := v_try + 1;
      v_generated := upper(substr(encode(digest(v_id::text || ':' || gen_random_uuid()::text, 'sha256'), 'hex'), 1, 10));
      exit when not exists (select 1 from public.bot_users where upper(referral_code) = v_generated);
      if v_try > 10 then raise exception 'REFERRAL_CODE_GENERATION_FAILED'; end if;
    end loop;

    insert into public.bot_users(
      telegram_id, first_name, username, referral_code,
      referred_by, referral_status, referral_reward_amount,
      referral_rewarded_at, transaction_count, spending,
      balance_main, balance_referral, created_at, updated_at
    ) values (
      v_id, v_first_name, v_username, v_generated,
      null, 'none', 0, null, 0, 0, 0, 0, now(), now()
    ) returning * into v_user;
    v_created := true;
  end if;

  -- Tidak ada referral pada command /start biasa.
  if not p_referral_enabled then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'disabled', 'referral_reward', null);
  end if;
  if v_code = '' then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'no_code', 'referral_reward', null);
  end if;
  if v_amount <= 0 then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'zero_reward', 'referral_reward', null);
  end if;

  -- Referral yang sudah terhubung tidak boleh diganti atau dibayar dua kali.
  if v_user.referred_by is not null or v_user.referral_status in ('pending', 'rewarded') then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'already_referred', 'referral_reward', null);
  end if;

  -- User lama masih boleh memakai link referral selama belum pernah bertransaksi.
  -- Ini memperbaiki kasus user yang sudah tersimpan sebelum fitur v65 dipasang.
  if v_user.first_purchase_at is not null
     or coalesce(v_user.transaction_count, 0) > 0
     or coalesce(v_user.spending, 0) > 0
     or exists (select 1 from public.transactions where telegram_id = v_id limit 1) then
    update public.bot_users
       set referral_status = 'ineligible', updated_at = now()
     where telegram_id = v_id
     returning * into v_user;
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'already_purchased', 'referral_reward', null);
  end if;

  select * into v_referrer
    from public.bot_users
   where upper(referral_code) = v_code
   limit 1
   for update;

  if not found then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'invalid_code', 'referral_reward', null);
  end if;

  if v_referrer.telegram_id = v_id then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'self_referral', 'referral_reward', null);
  end if;

  if v_mode = 'first_purchase' then
    update public.bot_users
       set referred_by = v_referrer.telegram_id,
           referral_status = 'pending',
           referral_reward_amount = v_amount,
           referral_rewarded_at = null,
           updated_at = now()
     where telegram_id = v_id
     returning * into v_user;

    return jsonb_build_object(
      'created', v_created,
      'user', to_jsonb(v_user),
      'referral_state', 'pending',
      'referral_reward', null
    );
  end if;

  -- Ledger menjadi gerbang idempotensi sebelum saldo ditambah.
  insert into public.wallet_ledger(
    entry_key, telegram_id, wallet_type, direction, amount,
    balance_after, reason, reference, created_at
  ) values (
    'referral:signup:' || v_id::text,
    v_referrer.telegram_id,
    'referral', 'credit', v_amount,
    0,
    'Bonus referral pengguna baru',
    v_id::text,
    now()
  ) on conflict (entry_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    select * into v_user from public.bot_users where telegram_id = v_id;
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'already_rewarded', 'referral_reward', null);
  end if;

  update public.bot_users
     set balance_referral = balance_referral + v_amount,
         updated_at = now()
   where telegram_id = v_referrer.telegram_id
   returning * into v_referrer;

  update public.wallet_ledger
     set balance_after = v_referrer.balance_referral
   where id = v_ledger_id;

  update public.bot_users
     set referred_by = v_referrer.telegram_id,
         referral_status = 'rewarded',
         referral_reward_amount = v_amount,
         referral_rewarded_at = now(),
         updated_at = now()
   where telegram_id = v_id
   returning * into v_user;

  v_reward := jsonb_build_object(
    'telegram_id', v_referrer.telegram_id,
    'referrer_name', v_referrer.first_name,
    'referrer_username', v_referrer.username,
    'amount', v_amount,
    'invitee_id', v_id,
    'invitee_name', v_user.first_name,
    'invitee_username', v_user.username,
    'mode', 'signup'
  );

  return jsonb_build_object(
    'created', v_created,
    'user', to_jsonb(v_user),
    'referral_state', 'rewarded',
    'referral_reward', v_reward
  );
end;
$$;

revoke all on function public.register_bot_user_v66(jsonb, text, boolean, integer, text) from public, anon, authenticated;
grant execute on function public.register_bot_user_v66(jsonb, text, boolean, integer, text) to service_role;

-- ============================================================
-- V68 MARKETPLACE PO
-- ============================================================
-- v68: Marketplace polish + sistem Pre-Order (PO) manual fulfillment.
-- Jalankan setelah v62, v63, v64, v65, dan v66.

create extension if not exists pgcrypto;

alter table public.products
  add column if not exists delivery_mode text not null default 'auto';

update public.products
set delivery_mode = 'auto'
where delivery_mode is null or lower(delivery_mode) not in ('auto','po');

alter table public.products drop constraint if exists products_delivery_mode_check;
alter table public.products add constraint products_delivery_mode_check
  check (delivery_mode in ('auto','po'));

alter table public.transactions add column if not exists delivery_mode text not null default 'auto';
alter table public.transactions add column if not exists delivery_status text not null default 'delivered';
alter table public.transactions add column if not exists delivered_at timestamptz;
alter table public.transactions add column if not exists delivered_by bigint;

update public.transactions
set delivery_mode = coalesce(nullif(delivery_mode,''),'auto'),
    delivery_status = coalesce(nullif(delivery_status,''),'delivered'),
    delivered_at = coalesce(delivered_at, created_at)
where delivery_mode is null
   or delivery_status is null
   or (delivery_mode = 'auto' and delivery_status = 'delivered' and delivered_at is null);

alter table public.transactions drop constraint if exists transactions_delivery_mode_check;
alter table public.transactions add constraint transactions_delivery_mode_check
  check (delivery_mode in ('auto','po'));
alter table public.transactions drop constraint if exists transactions_delivery_status_check;
alter table public.transactions add constraint transactions_delivery_status_check
  check (delivery_status in ('waiting_delivery','delivered','canceled'));

create table if not exists public.po_orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  telegram_id bigint not null,
  username text,
  product_code text not null,
  product_name text not null,
  variant_key text not null default '',
  variant_name text not null default '',
  quantity integer not null default 1,
  total_price integer not null default 0,
  payment_method text not null default 'gateway',
  status text not null default 'waiting_delivery',
  delivery_text text not null default '',
  paid_at timestamptz not null default now(),
  delivered_at timestamptz,
  delivered_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint po_orders_status_check check (status in ('waiting_delivery','delivered','canceled'))
);

create index if not exists po_orders_status_created_idx on public.po_orders(status, created_at desc);
create index if not exists po_orders_telegram_idx on public.po_orders(telegram_id, created_at desc);

create or replace function public.fulfill_po_order_v68(
  p_order jsonb,
  p_product_code text,
  p_total_price integer,
  p_buyer jsonb default '{}'::jsonb,
  p_use_wallet boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice text := trim(coalesce(p_order->>'invoice_ref', ''));
  v_product_code text := trim(coalesce(p_product_code, p_order->>'product_code', ''));
  v_variant_key text := trim(coalesce(p_order->>'variant_key', ''));
  v_variant_name text := trim(coalesce(p_order->>'variant_name', ''));
  v_quantity integer := greatest(1, coalesce(nullif(p_order->>'quantity', '')::integer, 1));
  v_telegram_id bigint := coalesce(nullif(p_order->>'telegram_id', '')::bigint, 0);
  v_unit_price integer := greatest(0, coalesce(nullif(p_order->>'unit_price', '')::integer, 0));
  v_payment_fee integer := greatest(0, coalesce(nullif(p_order->>'fee', '')::integer, 0));
  v_cost_unit integer := greatest(0, coalesce(nullif(p_order->>'cost_unit', '')::integer, 0));
  v_cost_total integer := greatest(0, coalesce(nullif(p_order->>'cost_total', '')::integer, 0));
  v_cost_source text := trim(coalesce(p_order->>'cost_source', 'unset'));
  v_voucher_code text := trim(coalesce(p_order->>'voucher_code', ''));
  v_payment_method text := case when p_use_wallet then 'wallet' else trim(coalesce(p_order->>'payment_method','gateway')) end;
  v_now timestamptz := now();
  v_product public.products%rowtype;
  v_user public.bot_users%rowtype;
  v_transaction public.transactions%rowtype;
  v_po public.po_orders%rowtype;
  v_variant jsonb;
  v_variant_idx integer;
  v_variants jsonb;
  v_profit integer;
  v_inserted_id uuid;
  v_main_used bigint := 0;
  v_ref_used bigint := 0;
  v_remaining bigint := 0;
begin
  if v_invoice = '' then raise exception 'INVOICE_REQUIRED'; end if;
  if v_product_code = '' then raise exception 'PRODUCT_CODE_REQUIRED'; end if;
  if v_telegram_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if p_total_price is null or p_total_price < 0 then raise exception 'TOTAL_PRICE_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended('invoice:' || v_invoice, 0));

  select * into v_transaction from public.transactions where order_ref = v_invoice limit 1;
  if found then
    select * into v_po from public.po_orders where order_ref = v_invoice limit 1;
    return jsonb_build_object(
      'already_completed', true,
      'po_waiting', coalesce(v_transaction.delivery_status,'') = 'waiting_delivery',
      'delivered', coalesce(v_transaction.delivered_items, '[]'::jsonb),
      'transaction', to_jsonb(v_transaction),
      'po_order', case when v_po.id is null then null else to_jsonb(v_po) end
    );
  end if;

  select * into v_product
    from public.products
   where upper(code) = upper(v_product_code)
   limit 1
   for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if lower(coalesce(v_product.delivery_mode,'auto')) <> 'po' then raise exception 'PRODUCT_NOT_PO'; end if;

  if v_variant_key <> '' then
    select (ord - 1)::integer, elem into v_variant_idx, v_variant
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) with ordinality as t(elem, ord)
     where upper(regexp_replace(
       coalesce(elem->>'sku', elem->>'kode', elem->>'key', elem->>'name', elem->>'nama', 'VAR' || ord::text),
       '\s+', '-', 'g'
     )) = upper(v_variant_key)
     limit 1;
    if v_variant_idx is null then raise exception 'VARIANT_NOT_FOUND'; end if;
    if coalesce((v_variant->>'active')::boolean, true) = false then raise exception 'VARIANT_INACTIVE'; end if;
  end if;

  if p_use_wallet then
    select * into v_user from public.bot_users where telegram_id = v_telegram_id for update;
    if not found then raise exception 'USER_NOT_FOUND'; end if;
    if coalesce(v_user.balance_main,0) + coalesce(v_user.balance_referral,0) < p_total_price then
      raise exception 'INSUFFICIENT_WALLET_BALANCE';
    end if;
  end if;

  if v_cost_total = 0 and v_cost_unit > 0 then v_cost_total := v_cost_unit * v_quantity; end if;
  if v_cost_source = '' then v_cost_source := case when v_cost_total > 0 then 'snapshot' else 'unset' end; end if;
  v_profit := case when v_cost_source = 'unset' then 0 else p_total_price - v_payment_fee - v_cost_total end;

  insert into public.transactions (
    telegram_id, username, product_name, product_code,
    variant_key, variant_name, unit_price, quantity, total_price,
    payment_fee, cost_unit, cost_total, cost_source, cost_updated_at,
    profit_amount, payment_method, wallet_main_used, wallet_referral_used,
    order_ref, delivered_items, delivered_text,
    delivery_mode, delivery_status, created_at
  ) values (
    v_telegram_id,
    nullif(trim(coalesce(p_buyer->>'username','')), ''),
    v_product.name, v_product.code,
    v_variant_key, v_variant_name, v_unit_price, v_quantity, p_total_price,
    v_payment_fee, v_cost_unit, v_cost_total, v_cost_source,
    case when v_cost_source = 'unset' then null else v_now end,
    v_profit, v_payment_method, 0, 0,
    v_invoice, '[]'::jsonb, '', 'po', 'waiting_delivery', v_now
  ) on conflict (order_ref) do nothing returning id into v_inserted_id;

  if v_inserted_id is null then
    select * into v_transaction from public.transactions where order_ref = v_invoice limit 1;
    select * into v_po from public.po_orders where order_ref = v_invoice limit 1;
    return jsonb_build_object('already_completed', true, 'po_waiting', true, 'delivered', coalesce(v_transaction.delivered_items,'[]'::jsonb), 'transaction', to_jsonb(v_transaction), 'po_order', to_jsonb(v_po));
  end if;

  if v_variant_key <> '' then
    v_variants := coalesce(v_product.variants, '[]'::jsonb);
    v_variants := jsonb_set(
      v_variants,
      array[v_variant_idx::text, 'sold'],
      to_jsonb(greatest(0, coalesce(nullif(v_variant->>'sold','')::integer, 0)) + v_quantity),
      true
    );
    update public.products
       set variants = v_variants,
           sold = coalesce(sold,0) + v_quantity,
           updated_at = v_now
     where id = v_product.id;
  else
    update public.products
       set sold = coalesce(sold,0) + v_quantity,
           updated_at = v_now
     where id = v_product.id;
  end if;

  if p_use_wallet then
    v_main_used := least(coalesce(v_user.balance_main,0), p_total_price);
    v_remaining := p_total_price - v_main_used;
    v_ref_used := greatest(0, v_remaining);

    update public.bot_users
       set balance_main = balance_main - v_main_used,
           balance_referral = balance_referral - v_ref_used,
           first_name = coalesce(nullif(trim(coalesce(p_buyer->>'first_name','')), ''), first_name),
           username = coalesce(nullif(trim(coalesce(p_buyer->>'username','')), ''), username),
           transaction_count = coalesce(transaction_count,0) + 1,
           spending = coalesce(spending,0) + p_total_price,
           updated_at = v_now
     where telegram_id = v_telegram_id
     returning * into v_user;

    if v_main_used > 0 then
      insert into public.wallet_ledger(entry_key, telegram_id, wallet_type, direction, amount, balance_after, reason, reference, created_at)
      values ('order:' || v_invoice || ':main', v_telegram_id, 'main', 'debit', v_main_used, v_user.balance_main, 'Pembayaran PO dengan saldo utama', v_invoice, v_now)
      on conflict (entry_key) do nothing;
    end if;
    if v_ref_used > 0 then
      insert into public.wallet_ledger(entry_key, telegram_id, wallet_type, direction, amount, balance_after, reason, reference, created_at)
      values ('order:' || v_invoice || ':referral', v_telegram_id, 'referral', 'debit', v_ref_used, v_user.balance_referral, 'Pembayaran PO dengan saldo referral', v_invoice, v_now)
      on conflict (entry_key) do nothing;
    end if;

    update public.transactions
       set wallet_main_used = v_main_used,
           wallet_referral_used = v_ref_used
     where id = v_inserted_id
     returning * into v_transaction;
  else
    insert into public.bot_users(telegram_id, first_name, username, transaction_count, spending, created_at, updated_at)
    values (
      v_telegram_id,
      nullif(trim(coalesce(p_buyer->>'first_name','')), ''),
      nullif(trim(coalesce(p_buyer->>'username','')), ''),
      1, p_total_price, v_now, v_now
    ) on conflict (telegram_id) do update set
      first_name = coalesce(excluded.first_name, public.bot_users.first_name),
      username = coalesce(excluded.username, public.bot_users.username),
      transaction_count = coalesce(public.bot_users.transaction_count,0) + 1,
      spending = coalesce(public.bot_users.spending,0) + p_total_price,
      updated_at = v_now;

    select * into v_transaction from public.transactions where id = v_inserted_id;
  end if;

  if v_voucher_code <> '' then
    if upper(v_voucher_code) like 'AUTO_PROMO:%' then
      update public.auto_promos set used_count = coalesce(used_count,0) + 1, updated_at = v_now
       where upper(code) = upper(substring(v_voucher_code from 12));
    else
      update public.vouchers
         set used_by = case
           when coalesce(used_by,'[]'::jsonb) @> jsonb_build_array(v_telegram_id) then coalesce(used_by,'[]'::jsonb)
           else coalesce(used_by,'[]'::jsonb) || jsonb_build_array(v_telegram_id)
         end,
         updated_at = v_now
       where upper(code) = upper(v_voucher_code);
    end if;
  end if;

  insert into public.po_orders(
    order_ref, telegram_id, username, product_code, product_name,
    variant_key, variant_name, quantity, total_price, payment_method,
    status, paid_at, created_at, updated_at
  ) values (
    v_invoice, v_telegram_id,
    nullif(trim(coalesce(p_buyer->>'username','')), ''),
    v_product.code, v_product.name,
    v_variant_key, v_variant_name, v_quantity, p_total_price, v_payment_method,
    'waiting_delivery', v_now, v_now, v_now
  ) on conflict (order_ref) do update set updated_at = excluded.updated_at
  returning * into v_po;

  insert into public.shop_settings(key, value, updated_at)
  values (
    'historical_stats',
    jsonb_build_object('orders_total',1,'revenue_total',p_total_price,'quantity_sold',v_quantity,'cost_total',v_cost_total,'profit_total',v_profit,'updated_at',v_now),
    v_now
  ) on conflict (key) do update set
    value = jsonb_build_object(
      'orders_total', coalesce((public.shop_settings.value->>'orders_total')::numeric,0) + 1,
      'revenue_total', coalesce((public.shop_settings.value->>'revenue_total')::numeric,0) + p_total_price,
      'quantity_sold', coalesce((public.shop_settings.value->>'quantity_sold')::numeric,0) + v_quantity,
      'cost_total', coalesce((public.shop_settings.value->>'cost_total')::numeric,0) + v_cost_total,
      'profit_total', coalesce((public.shop_settings.value->>'profit_total')::numeric,0) + v_profit,
      'updated_at', v_now
    ), updated_at = v_now;

  return jsonb_build_object(
    'already_completed', false,
    'po_waiting', true,
    'delivered', '[]'::jsonb,
    'transaction', to_jsonb(v_transaction),
    'po_order', to_jsonb(v_po),
    'wallet', case when p_use_wallet then jsonb_build_object(
      'main_used',v_main_used,
      'referral_used',v_ref_used,
      'balance_main',v_user.balance_main,
      'balance_referral',v_user.balance_referral
    ) else null end
  );
end;
$$;

create or replace function public.fulfill_po_paid_order_v68(
  p_order jsonb,
  p_product_code text,
  p_total_price integer,
  p_buyer jsonb default '{}'::jsonb
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.fulfill_po_order_v68(p_order, p_product_code, p_total_price, p_buyer, false);
$$;

create or replace function public.fulfill_po_wallet_order_v68(
  p_order jsonb,
  p_product_code text,
  p_total_price integer,
  p_buyer jsonb default '{}'::jsonb
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.fulfill_po_order_v68(p_order, p_product_code, p_total_price, p_buyer, true);
$$;

create or replace function public.mark_po_delivered_v68(
  p_order_ref text,
  p_delivery_text text,
  p_actor_id bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text := trim(coalesce(p_order_ref,''));
  v_text text := trim(coalesce(p_delivery_text,''));
  v_po public.po_orders%rowtype;
  v_transaction public.transactions%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_now timestamptz := now();
begin
  if v_ref = '' then raise exception 'ORDER_REF_REQUIRED'; end if;
  if v_text = '' then raise exception 'DELIVERY_TEXT_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('po-delivery:' || v_ref,0));
  select * into v_po from public.po_orders where order_ref = v_ref for update;
  if not found then raise exception 'PO_NOT_FOUND'; end if;
  if v_po.status = 'delivered' then
    select * into v_transaction from public.transactions where order_ref = v_ref limit 1;
    return jsonb_build_object('already_delivered',true,'po_order',to_jsonb(v_po),'transaction',to_jsonb(v_transaction));
  end if;
  if v_po.status <> 'waiting_delivery' then raise exception 'PO_NOT_WAITING_DELIVERY'; end if;

  select coalesce(jsonb_agg(line order by ord),'[]'::jsonb) into v_items
  from (
    select trim(value) as line, ord
    from regexp_split_to_table(v_text, E'\\r?\\n') with ordinality as t(value,ord)
    where trim(value) <> ''
  ) s;

  update public.po_orders
     set status = 'delivered', delivery_text = v_text,
         delivered_at = v_now, delivered_by = p_actor_id, updated_at = v_now
   where id = v_po.id
   returning * into v_po;

  update public.transactions
     set delivery_status = 'delivered', delivered_text = v_text,
         delivered_items = v_items, delivered_at = v_now, delivered_by = p_actor_id
   where order_ref = v_ref
   returning * into v_transaction;

  return jsonb_build_object('already_delivered',false,'po_order',to_jsonb(v_po),'transaction',to_jsonb(v_transaction));
end;
$$;

revoke all on function public.fulfill_po_order_v68(jsonb,text,integer,jsonb,boolean) from public, anon, authenticated;
revoke all on function public.fulfill_po_paid_order_v68(jsonb,text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.fulfill_po_wallet_order_v68(jsonb,text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.mark_po_delivered_v68(text,text,bigint) from public, anon, authenticated;
grant execute on function public.fulfill_po_order_v68(jsonb,text,integer,jsonb,boolean) to service_role;
grant execute on function public.fulfill_po_paid_order_v68(jsonb,text,integer,jsonb) to service_role;
grant execute on function public.fulfill_po_wallet_order_v68(jsonb,text,integer,jsonb) to service_role;
grant execute on function public.mark_po_delivered_v68(text,text,bigint) to service_role;

notify pgrst, 'reload schema';

