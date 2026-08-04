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
