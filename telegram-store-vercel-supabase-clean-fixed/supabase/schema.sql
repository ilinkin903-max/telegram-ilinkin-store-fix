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
  cost_price integer not null default 0,
  description text not null default '',
  terms text not null default '',
  image_url text not null default '',
  category text not null default '',
  bulk_prices jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  active boolean not null default true,
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
  payment_fee integer not null default 0,
  cost_unit integer not null default 0,
  cost_total integer not null default 0,
  cost_source text not null default 'unset',
  cost_updated_at timestamptz,
  profit_amount integer not null default 0,
  status text not null default 'completed',
  canceled_at timestamptz,
  status_updated_at timestamptz not null default now(),
  order_ref text unique,
  created_at timestamptz not null default now()
);

create index if not exists transactions_telegram_id_idx on public.transactions (telegram_id);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists transactions_status_created_at_idx on public.transactions (status, created_at desc);

alter table public.transactions
  drop constraint if exists transactions_status_check;

alter table public.transactions
  add constraint transactions_status_check
  check (status in ('completed', 'canceled'));

create table if not exists public.pending_orders (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  product_code text not null,
  quantity integer not null default 1,
  voucher_code text not null default '',
  invoice_ref text unique,
  amount integer not null default 0,
  fee integer not null default 0,
  cost_unit integer not null default 0,
  cost_total integer not null default 0,
  cost_source text not null default 'unset',
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
  discount_type text not null default 'amount',
  discount_value integer not null default 0,
  min_qty integer not null default 1,
  min_spend integer not null default 0,
  usage_limit integer not null default 0,
  used_by jsonb not null default '[]'::jsonb,
  start_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security sengaja tidak diaktifkan karena bot memakai SERVICE_ROLE_KEY di server Vercel.
-- Jangan pernah taruh SERVICE_ROLE_KEY di frontend / public JavaScript.

-- Update fitur owner tools lengkap.
alter table public.products add column if not exists cost_price integer not null default 0;
alter table public.transactions add column if not exists payment_fee integer not null default 0;
alter table public.transactions add column if not exists cost_unit integer not null default 0;
alter table public.transactions add column if not exists cost_total integer not null default 0;
alter table public.transactions add column if not exists cost_source text not null default 'unset';
alter table public.transactions add column if not exists cost_updated_at timestamptz;
alter table public.transactions add column if not exists profit_amount integer not null default 0;
alter table public.transactions add column if not exists status text not null default 'completed';
alter table public.transactions add column if not exists canceled_at timestamptz;
alter table public.transactions add column if not exists status_updated_at timestamptz not null default now();
alter table public.pending_orders add column if not exists cost_unit integer not null default 0;
alter table public.pending_orders add column if not exists cost_total integer not null default 0;
alter table public.pending_orders add column if not exists cost_source text not null default 'unset';
alter table public.products add column if not exists image_url text not null default '';
alter table public.products add column if not exists category text not null default '';
alter table public.products add column if not exists bulk_prices jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.vouchers add column if not exists description text not null default '';
alter table public.vouchers add column if not exists active boolean not null default true;
alter table public.vouchers add column if not exists expires_at timestamptz;
alter table public.vouchers add column if not exists discount_type text not null default 'amount';
alter table public.vouchers add column if not exists discount_value integer not null default 0;
alter table public.vouchers add column if not exists min_qty integer not null default 1;
alter table public.vouchers add column if not exists min_spend integer not null default 0;
alter table public.vouchers add column if not exists start_at timestamptz;
update public.vouchers set discount_value = discount where coalesce(discount_value, 0) = 0 and coalesce(discount, 0) > 0;


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

alter table public.transactions add column if not exists delivered_items jsonb not null default '[]'::jsonb;
alter table public.transactions add column if not exists delivered_text text not null default '';


-- Broadcast polling analytics/admin results.
create table if not exists public.broadcast_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  is_anonymous boolean not null default true,
  poll_type text not null default 'regular',
  allows_multiple_answers boolean not null default false,
  status text not null default 'draft',
  created_by bigint,
  source_chat_id bigint,
  source_message_id integer,
  source_poll_id text,
  broadcast_mode text not null default 'sendpoll',
  total_sent integer not null default 0,
  total_failed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broadcast_poll_messages (
  id bigserial primary key,
  broadcast_id uuid not null references public.broadcast_polls(id) on delete cascade,
  poll_id text not null unique,
  telegram_id bigint not null,
  message_id integer,
  options_state jsonb not null default '[]'::jsonb,
  total_voter_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broadcast_poll_answers (
  id bigserial primary key,
  broadcast_id uuid not null references public.broadcast_polls(id) on delete cascade,
  poll_id text not null,
  telegram_id bigint not null,
  username text,
  first_name text,
  option_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (broadcast_id, telegram_id)
);

create index if not exists broadcast_poll_messages_broadcast_idx on public.broadcast_poll_messages (broadcast_id);
create index if not exists broadcast_poll_answers_broadcast_idx on public.broadcast_poll_answers (broadcast_id);

-- Source polling asli untuk mode global/forward.
alter table public.broadcast_polls add column if not exists source_chat_id bigint;
alter table public.broadcast_polls add column if not exists source_message_id integer;
alter table public.broadcast_polls add column if not exists source_poll_id text;
alter table public.broadcast_polls add column if not exists broadcast_mode text not null default 'sendpoll';

create index if not exists broadcast_poll_answers_poll_idx on public.broadcast_poll_answers (poll_id);

-- Auto Backup, Import Log, dan Promo Otomatis.
create table if not exists public.backup_logs (
  id bigserial primary key,
  type text not null default 'manual',
  status text not null default 'success',
  filename text not null default '',
  size_bytes integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.auto_promos (
  code text primary key,
  name text not null,
  description text not null default '',
  products jsonb not null default '[]'::jsonb,
  discount_type text not null default 'amount',
  discount_value integer not null default 0,
  min_qty integer not null default 1,
  min_spend integer not null default 0,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auto_promos_active_idx on public.auto_promos (active);
create index if not exists backup_logs_created_idx on public.backup_logs (created_at desc);

-- v52: visibilitas produk per kanal dan penyimpanan payload QRIS untuk unduhan Mini App.
alter table public.products add column if not exists display_scope text not null default 'both';
alter table public.pending_orders add column if not exists qr_payload text not null default '';


-- v55: provider pembayaran AutoGoPay/Pakasir dan referensi transaksi gateway.
alter table public.pending_orders add column if not exists payment_provider text not null default 'pakasir';
alter table public.pending_orders add column if not exists provider_transaction_id text not null default '';
alter table public.pending_orders add column if not exists provider_checkout_url text not null default '';
create unique index if not exists pending_orders_provider_transaction_idx
  on public.pending_orders (provider_transaction_id)
  where provider_transaction_id <> '';

-- ============================================================
-- v62 bundled migration for fresh installations
-- ============================================================
-- v62: keamanan, stok atomik, statistik akurat, dan lock terpisah.
-- WAJIB dijalankan di Supabase SQL Editor sebelum deploy v62.
-- Aman dijalankan berulang kali.

create table if not exists public.job_locks (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists job_locks_expires_idx on public.job_locks (expires_at);

-- Nilai kosong tidak mewakili invoice dan boleh muncul pada banyak transaksi lama.
update public.transactions
set order_ref = null
where trim(coalesce(order_ref, '')) = '';

create unique index if not exists transactions_order_ref_unique_idx
  on public.transactions (order_ref);

create or replace function public.claim_job_lock_v62(
  p_key text,
  p_ttl_seconds integer default 3600,
  p_meta jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := left(trim(coalesce(p_key, '')), 220);
  v_now timestamptz := now();
  v_inserted text;
begin
  if v_key = '' then return true; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_key, 0));

  delete from public.job_locks
   where key = v_key
     and coalesce(expires_at, updated_at + make_interval(secs => greatest(1, coalesce(p_ttl_seconds, 3600)))) <= v_now;

  insert into public.job_locks(key, value, expires_at, updated_at)
  values (
    v_key,
    jsonb_build_object(
      'status', 'processing',
      'claimed_at', v_now,
      'expires_at', v_now + make_interval(secs => greatest(1, coalesce(p_ttl_seconds, 3600)))
    ) || coalesce(p_meta, '{}'::jsonb),
    v_now + make_interval(secs => greatest(1, coalesce(p_ttl_seconds, 3600))),
    v_now
  )
  on conflict (key) do nothing
  returning key into v_inserted;

  return v_inserted is not null;
end;
$$;

create or replace function public.stats_summary_v62()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      coalesce(total_price, 0)::bigint as total_price,
      coalesce(quantity, 0)::bigint as quantity,
      coalesce(cost_total, 0)::bigint as cost_total,
      coalesce(profit_amount, 0)::bigint as profit_amount,
      (created_at at time zone 'Asia/Jakarta')::date as local_date
    from public.transactions
  ), today as (
    select (now() at time zone 'Asia/Jakarta')::date as d
  )
  select jsonb_build_object(
    'orders_total', coalesce((select count(*) from base), 0),
    'revenue_total', coalesce((select sum(total_price) from base), 0),
    'quantity_sold', coalesce((select sum(quantity) from base), 0),
    'cost_total', coalesce((select sum(cost_total) from base), 0),
    'profit_total', coalesce((select sum(profit_amount) from base), 0),
    'revenue_today', coalesce((select sum(total_price) from base, today where base.local_date = today.d), 0),
    'profit_today', coalesce((select sum(profit_amount) from base, today where base.local_date = today.d), 0),
    'revenue_month', coalesce((select sum(total_price) from base, today where date_trunc('month', base.local_date) = date_trunc('month', today.d)), 0),
    'profit_month', coalesce((select sum(profit_amount) from base, today where date_trunc('month', base.local_date) = date_trunc('month', today.d)), 0)
  );
$$;

create or replace function public.fulfill_paid_order_v62(
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
  v_payment_fee integer := greatest(0, coalesce(nullif(p_order->>'fee', '')::integer, 0));
  v_cost_unit integer := greatest(0, coalesce(nullif(p_order->>'cost_unit', '')::integer, 0));
  v_cost_total integer := greatest(0, coalesce(nullif(p_order->>'cost_total', '')::integer, 0));
  v_cost_source text := trim(coalesce(p_order->>'cost_source', 'unset'));
  v_voucher_code text := trim(coalesce(p_order->>'voucher_code', ''));
  v_now timestamptz := now();
  v_product public.products%rowtype;
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
begin
  if v_invoice = '' then raise exception 'INVOICE_REQUIRED'; end if;
  if v_product_code = '' then raise exception 'PRODUCT_CODE_REQUIRED'; end if;
  if v_telegram_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if p_total_price is null or p_total_price < 0 then raise exception 'TOTAL_PRICE_INVALID'; end if;

  -- Satu invoice hanya boleh diproses oleh satu transaksi database pada satu waktu.
  perform pg_advisory_xact_lock(hashtextextended('invoice:' || v_invoice, 0));

  select * into v_transaction
    from public.transactions
   where order_ref = v_invoice
   limit 1;
  if found then
    return jsonb_build_object(
      'already_completed', true,
      'delivered', coalesce(v_transaction.delivered_items, '[]'::jsonb),
      'transaction', to_jsonb(v_transaction)
    );
  end if;

  -- Lock baris produk membuat dua invoice berbeda untuk produk yang sama mengantre.
  select * into v_product
    from public.products
   where upper(code) = upper(v_product_code)
   limit 1
   for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;

  if v_cost_total = 0 and v_cost_unit > 0 then
    v_cost_total := v_cost_unit * v_quantity;
  end if;
  if v_cost_source = '' then
    v_cost_source := case when v_cost_total > 0 then 'snapshot' else 'unset' end;
  end if;
  v_profit := case
    when v_cost_source = 'unset' then 0
    else p_total_price - v_payment_fee - v_cost_total
  end;

  -- Klaim invoice dengan unique order_ref sebelum mengubah stok. Jika proses lain sudah
  -- lebih dulu memasukkan invoice, fungsi berhenti tanpa mengurangi stok.
  insert into public.transactions (
    telegram_id, username, product_name, product_code,
    variant_key, variant_name, unit_price, quantity, total_price,
    payment_fee, cost_unit, cost_total, cost_source, cost_updated_at,
    profit_amount, order_ref, delivered_items, delivered_text, created_at
  ) values (
    v_telegram_id,
    nullif(trim(coalesce(p_buyer->>'username', '')), ''),
    v_product.name,
    v_product.code,
    v_variant_key,
    v_variant_name,
    v_unit_price,
    v_quantity,
    p_total_price,
    v_payment_fee,
    v_cost_unit,
    v_cost_total,
    v_cost_source,
    case when v_cost_source = 'unset' then null else v_now end,
    v_profit,
    v_invoice,
    '[]'::jsonb,
    '',
    v_now
  )
  on conflict (order_ref) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    select * into v_transaction from public.transactions where order_ref = v_invoice limit 1;
    return jsonb_build_object(
      'already_completed', true,
      'delivered', coalesce(v_transaction.delivered_items, '[]'::jsonb),
      'transaction', to_jsonb(v_transaction)
    );
  end if;

  if v_variant_key <> '' then
    select (ord - 1)::integer, elem
      into v_variant_idx, v_variant
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

  select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    into v_taken
    from jsonb_array_elements(v_stock) with ordinality as t(elem, ord)
   where ord <= v_quantity;

  select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    into v_rest
    from jsonb_array_elements(v_stock) with ordinality as t(elem, ord)
   where ord > v_quantity;

  if v_variant_key <> '' then
    v_variants := coalesce(v_product.variants, '[]'::jsonb);
    v_variants := jsonb_set(v_variants, array[v_variant_idx::text, 'stock'], v_rest, true);
    v_variants := jsonb_set(
      v_variants,
      array[v_variant_idx::text, 'sold'],
      to_jsonb(greatest(0, coalesce(nullif(v_variant->>'sold', '')::integer, 0)) + v_quantity),
      true
    );
    update public.products
       set variants = v_variants,
           sold = coalesce(sold, 0) + v_quantity,
           updated_at = v_now
     where id = v_product.id;
  else
    update public.products
       set stock = v_rest,
           sold = coalesce(sold, 0) + v_quantity,
           updated_at = v_now
     where id = v_product.id;
  end if;

  select coalesce(string_agg(value, E'\n' order by ord), '')
    into v_delivered_text
    from jsonb_array_elements_text(v_taken) with ordinality as t(value, ord);

  update public.transactions
     set delivered_items = v_taken,
         delivered_text = v_delivered_text
   where id = v_inserted_id
   returning * into v_transaction;

  insert into public.bot_users (
    telegram_id, first_name, username, transaction_count, spending, created_at, updated_at
  ) values (
    v_telegram_id,
    nullif(trim(coalesce(p_buyer->>'first_name', '')), ''),
    nullif(trim(coalesce(p_buyer->>'username', '')), ''),
    1,
    p_total_price,
    v_now,
    v_now
  )
  on conflict (telegram_id) do update set
    first_name = coalesce(excluded.first_name, public.bot_users.first_name),
    username = coalesce(excluded.username, public.bot_users.username),
    transaction_count = coalesce(public.bot_users.transaction_count, 0) + 1,
    spending = coalesce(public.bot_users.spending, 0) + p_total_price,
    updated_at = v_now;

  if v_voucher_code <> '' then
    if upper(v_voucher_code) like 'AUTO_PROMO:%' then
      update public.auto_promos
         set used_count = coalesce(used_count, 0) + 1,
             updated_at = v_now
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

  -- Counter historis transaksi dipertahankan walau owner membersihkan tabel lama.
  insert into public.shop_settings(key, value, updated_at)
  values (
    'historical_stats',
    jsonb_build_object(
      'orders_total', 1,
      'revenue_total', p_total_price,
      'quantity_sold', v_quantity,
      'cost_total', v_cost_total,
      'profit_total', v_profit,
      'updated_at', v_now
    ),
    v_now
  )
  on conflict (key) do update set
    value = jsonb_build_object(
      'orders_total', coalesce((public.shop_settings.value->>'orders_total')::numeric, 0) + 1,
      'revenue_total', coalesce((public.shop_settings.value->>'revenue_total')::numeric, 0) + p_total_price,
      'quantity_sold', coalesce((public.shop_settings.value->>'quantity_sold')::numeric, 0) + v_quantity,
      'cost_total', coalesce((public.shop_settings.value->>'cost_total')::numeric, 0) + v_cost_total,
      'profit_total', coalesce((public.shop_settings.value->>'profit_total')::numeric, 0) + v_profit,
      'updated_at', v_now
    ),
    updated_at = v_now;

  return jsonb_build_object(
    'already_completed', false,
    'delivered', v_taken,
    'transaction', to_jsonb(v_transaction)
  );
end;
$$;

revoke all on function public.claim_job_lock_v62(text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.stats_summary_v62() from public, anon, authenticated;
revoke all on function public.fulfill_paid_order_v62(jsonb, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.claim_job_lock_v62(text, integer, jsonb) to service_role;
grant execute on function public.stats_summary_v62() to service_role;
grant execute on function public.fulfill_paid_order_v62(jsonb, text, integer, jsonb) to service_role;

-- Bersihkan lock lama yang sebelumnya tercampur di shop_settings.
delete from public.shop_settings
where key like 'payment_process:%'
   or key like 'payment_watch:%'
   or key like 'broadcast_job:%'
   or key like 'checkout_rate:%';

-- v65 bundled migration: referral, wallet, top up, dan pembayaran saldo.
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
alter table public.pending_orders add column if not exists delivery_mode text not null default 'auto';
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


-- v66 bundled migration: referral untuk user lama yang belum pernah memakai referral.
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



-- BEGIN bundled v69-po-variant-voucher-ui
-- v69 — PRE-ORDER per varian + checkout voucher preview/UI
-- Jalankan setelah update-v68-marketplace-po.sql.
-- Tidak mengubah stok. Field delivery_mode per varian disimpan di JSON products.variants.
-- delivery_mode pada pending_orders menjadi snapshot mode pengiriman saat checkout.

-- Tambahkan snapshot mode pengiriman tanpa langsung memaksa invoice lama menjadi AUTO.
-- Invoice pending lama dibackfill dari varian/produk terlebih dahulu agar PO yang sudah dibayar
-- tidak salah diproses sebagai AUTO setelah migrasi.
alter table public.pending_orders add column if not exists delivery_mode text;

update public.pending_orders o
   set delivery_mode = case
     when nullif(trim(coalesce(o.variant_key, '')), '') is not null then
       coalesce(
         (
           select lower(nullif(trim(coalesce(v.elem->>'delivery_mode','')), ''))
             from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) with ordinality as v(elem, ord)
            where upper(regexp_replace(
              coalesce(v.elem->>'sku', v.elem->>'kode', v.elem->>'key', v.elem->>'name', v.elem->>'nama', 'VAR' || v.ord::text),
              '\s+', '-', 'g'
            )) = upper(o.variant_key)
            limit 1
         ),
         lower(nullif(trim(coalesce(p.delivery_mode, '')), '')),
         'auto'
       )
     else coalesce(lower(nullif(trim(coalesce(p.delivery_mode, '')), '')), 'auto')
   end
  from public.products p
 where upper(p.code) = upper(o.product_code)
   and (o.delivery_mode is null or lower(o.delivery_mode) not in ('auto','po'));

update public.pending_orders
   set delivery_mode = 'auto'
 where delivery_mode is null or lower(delivery_mode) not in ('auto','po');

update public.pending_orders set delivery_mode = lower(delivery_mode);
alter table public.pending_orders alter column delivery_mode set default 'auto';
alter table public.pending_orders alter column delivery_mode set not null;
alter table public.pending_orders drop constraint if exists pending_orders_delivery_mode_check;
alter table public.pending_orders add constraint pending_orders_delivery_mode_check check (delivery_mode in ('auto','po'));

-- Simpan SnK saat checkout PO agar pesan pengiriman tetap memakai ketentuan yang berlaku saat dibeli.
alter table public.po_orders add column if not exists terms_snapshot text not null default '';

create or replace function public.fulfill_po_order_v69(
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
  v_delivery_mode text := lower(trim(coalesce(p_order->>'delivery_mode','')));
  v_terms_snapshot text := '';
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

  if v_variant_key <> '' then
    select (ord - 1)::integer, elem into v_variant_idx, v_variant
      from jsonb_array_elements(coalesce(v_product.variants, '[]'::jsonb)) with ordinality as t(elem, ord)
     where upper(regexp_replace(
       coalesce(elem->>'sku', elem->>'kode', elem->>'key', elem->>'name', elem->>'nama', 'VAR' || ord::text),
       '\s+', '-', 'g'
     )) = upper(v_variant_key)
     limit 1;
    if v_variant_idx is null then raise exception 'VARIANT_NOT_FOUND'; end if;
    if lower(coalesce(nullif(v_variant->>'active',''),'true')) in ('false','0','off') then raise exception 'VARIANT_INACTIVE'; end if;
    if v_delivery_mode not in ('auto','po') then
      v_delivery_mode := lower(coalesce(nullif(trim(coalesce(v_variant->>'delivery_mode','')), ''), v_product.delivery_mode, 'auto'));
    end if;
  else
    if v_delivery_mode not in ('auto','po') then
      v_delivery_mode := lower(coalesce(v_product.delivery_mode, 'auto'));
    end if;
  end if;

  if v_delivery_mode <> 'po' then raise exception 'SELECTION_NOT_PO'; end if;

  v_terms_snapshot := coalesce(
    nullif(trim(coalesce(v_variant->>'snk','')), ''),
    nullif(trim(coalesce(v_variant->>'terms','')), ''),
    nullif(trim(coalesce(v_product.terms,'')), ''),
    '-'
  );

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
    terms_snapshot, status, paid_at, created_at, updated_at
  ) values (
    v_invoice, v_telegram_id,
    nullif(trim(coalesce(p_buyer->>'username','')), ''),
    v_product.code, v_product.name,
    v_variant_key, v_variant_name, v_quantity, p_total_price, v_payment_method,
    v_terms_snapshot, 'waiting_delivery', v_now, v_now, v_now
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

create or replace function public.fulfill_po_paid_order_v69(
  p_order jsonb,
  p_product_code text,
  p_total_price integer,
  p_buyer jsonb default '{}'::jsonb
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.fulfill_po_order_v69(p_order, p_product_code, p_total_price, p_buyer, false);
$$;

create or replace function public.fulfill_po_wallet_order_v69(
  p_order jsonb,
  p_product_code text,
  p_total_price integer,
  p_buyer jsonb default '{}'::jsonb
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.fulfill_po_order_v69(p_order, p_product_code, p_total_price, p_buyer, true);
$$;


revoke all on function public.fulfill_po_order_v69(jsonb,text,integer,jsonb,boolean) from public, anon, authenticated;
revoke all on function public.fulfill_po_paid_order_v69(jsonb,text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.fulfill_po_wallet_order_v69(jsonb,text,integer,jsonb) from public, anon, authenticated;

grant execute on function public.fulfill_po_order_v69(jsonb,text,integer,jsonb,boolean) to service_role;
grant execute on function public.fulfill_po_paid_order_v69(jsonb,text,integer,jsonb) to service_role;
grant execute on function public.fulfill_po_wallet_order_v69(jsonb,text,integer,jsonb) to service_role;

notify pgrst, 'reload schema';

select
  to_regprocedure('public.fulfill_po_paid_order_v69(jsonb,text,integer,jsonb)') as po_qris_v69,
  to_regprocedure('public.fulfill_po_wallet_order_v69(jsonb,text,integer,jsonb)') as po_wallet_v69;

-- END bundled v69-po-variant-voucher-ui

-- v76: integrasi reseller ProdSeller
alter table public.products add column if not exists supplier_source text not null default '';
alter table public.products add column if not exists supplier_product_id text not null default '';
alter table public.products add column if not exists supplier_price_usdt numeric(14,4) not null default 0;
alter table public.products add column if not exists supplier_public_price_usdt numeric(14,4) not null default 0;
alter table public.products add column if not exists supplier_stock integer;
alter table public.products add column if not exists supplier_synced_at timestamptz;
create index if not exists products_supplier_product_idx on public.products (supplier_source, supplier_product_id) where supplier_source <> '' and supplier_product_id <> '';

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  supplier text not null default 'prodseller',
  supplier_order_id text,
  supplier_product_id text not null default '',
  quantity integer not null default 1,
  amount_usdt numeric(14,4) not null default 0,
  status text not null default 'pending',
  delivered_text text not null default '',
  error_code text not null default '',
  error_message text not null default '',
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supplier_orders_status_idx on public.supplier_orders (status, updated_at desc);
create index if not exists supplier_orders_supplier_order_idx on public.supplier_orders (supplier, supplier_order_id);

-- ==========================================================
-- v82.0 - Telegram supplier workflow recorder
-- ==========================================================
-- Link Auto Order v82.0 - Telegram Supplier Workflow Recorder
-- Additive migration. Does not remove existing products/orders/supplier data.

create extension if not exists pgcrypto;

create table if not exists public.reseller_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  product_code text not null default '',
  variant_key text not null default '',
  target_username text not null default '',
  active boolean not null default false,
  sample_quantity integer not null default 1,
  step_timeout_ms integer not null default 7000,
  last_message_id bigint,
  last_message_snapshot jsonb not null default '{}'::jsonb,
  recent_message_snapshots jsonb not null default '[]'::jsonb,
  previous_link_snapshot jsonb not null default '{}'::jsonb,
  created_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reseller_workflows add column if not exists previous_link_snapshot jsonb not null default '{}'::jsonb;
alter table public.reseller_workflows add column if not exists recent_message_snapshots jsonb not null default '[]'::jsonb;

create index if not exists reseller_workflows_product_idx
  on public.reseller_workflows (product_code, variant_key, active, updated_at desc);
create index if not exists reseller_workflows_target_idx
  on public.reseller_workflows (target_username, active, updated_at desc);

create table if not exists public.reseller_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.reseller_workflows(id) on delete cascade,
  step_order integer not null,
  action_type text not null check (action_type in ('text','button')),
  action_value text not null default '',
  preview_value text not null default '',
  response_snapshot jsonb not null default '{}'::jsonb,
  response_snapshots jsonb not null default '[]'::jsonb,
  response_selection_index integer not null default 0,
  text_category text not null default 'other',
  capture_result boolean not null default false,
  wait_timeout_ms integer null,
  created_at timestamptz not null default now(),
  unique(workflow_id, step_order)
);

alter table public.reseller_workflow_steps add column if not exists response_snapshots jsonb not null default '[]'::jsonb;
alter table public.reseller_workflow_steps add column if not exists response_selection_index integer not null default 0;
alter table public.reseller_workflow_steps add column if not exists text_category text not null default 'other';
alter table public.reseller_workflow_steps add column if not exists wait_timeout_ms integer null;

create index if not exists reseller_workflow_steps_workflow_idx
  on public.reseller_workflow_steps (workflow_id, step_order);

create table if not exists public.reseller_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  workflow_id uuid not null references public.reseller_workflows(id) on delete restrict,
  telegram_id bigint,
  product_code text not null default '',
  variant_key text not null default '',
  quantity integer not null default 1,
  status text not null default 'queued',
  current_step integer not null default 0,
  result_text text not null default '',
  last_message_id bigint,
  last_message_snapshot jsonb not null default '{}'::jsonb,
  error_code text not null default '',
  error_message text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reseller_workflow_runs_status_idx
  on public.reseller_workflow_runs (status, updated_at desc);
create index if not exists reseller_workflow_runs_workflow_idx
  on public.reseller_workflow_runs (workflow_id, updated_at desc);

-- v82.2 - persistent per-step execution journal. A step can only be sent once per invoice.
create table if not exists public.reseller_workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null references public.reseller_workflow_runs(order_ref) on delete cascade,
  workflow_id uuid not null references public.reseller_workflows(id) on delete restrict,
  step_order integer not null,
  step_id uuid references public.reseller_workflow_steps(id) on delete set null,
  action_type text not null default '',
  action_value text not null default '',
  status text not null default 'sending' check (status in ('sending','completed')),
  response_message_id bigint,
  response_snapshot jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_ref, step_order)
);
create index if not exists reseller_workflow_run_steps_order_idx on public.reseller_workflow_run_steps (order_ref, step_order);
create index if not exists reseller_workflow_run_steps_status_idx on public.reseller_workflow_run_steps (status, updated_at desc);

-- Service-role based backend owns these tables. Keep RLS enabled without public policies.
alter table public.reseller_workflows enable row level security;
alter table public.reseller_workflow_steps enable row level security;
alter table public.reseller_workflow_runs enable row level security;
alter table public.reseller_workflow_run_steps enable row level security;

-- v82 setting defaults (stored as JSONB strings, matching existing shop_settings usage).
insert into public.shop_settings(key, value)
values
  ('workflow_reseller_enabled', to_jsonb('true'::text)),
  ('workflow_step_timeout_ms', to_jsonb('7000'::text))
on conflict (key) do nothing;

notify pgrst, 'reload schema';


-- v82.1 - multi-message recorder + text category
alter table public.reseller_workflows add column if not exists recent_message_snapshots jsonb not null default '[]'::jsonb;
alter table public.reseller_workflow_steps add column if not exists response_snapshots jsonb not null default '[]'::jsonb;
alter table public.reseller_workflow_steps add column if not exists response_selection_index integer not null default 0;
alter table public.reseller_workflow_steps add column if not exists text_category text not null default 'other';
notify pgrst, 'reload schema';


-- v82.2 schema cache reload
notify pgrst, 'reload schema';

-- ============================================================
-- v82.3 - Workflow editor + manual Supplier / Reseller balance
-- ============================================================
-- Link Auto Order v82.3 - Workflow editor/copy + manual Telegram supplier balance/stock
-- Additive migration. Tidak menghapus produk, workflow, transaksi, user, saldo wallet, atau stok lokal.

create extension if not exists pgcrypto;

create table if not exists public.reseller_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  target_username text not null default '',
  manual_balance_idr numeric(18,2) not null default 0,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reseller_suppliers_target_lower_uidx
  on public.reseller_suppliers (lower(target_username));
create index if not exists reseller_suppliers_updated_idx
  on public.reseller_suppliers (updated_at desc);

alter table public.reseller_suppliers enable row level security;

alter table public.reseller_workflows
  add column if not exists supplier_id uuid references public.reseller_suppliers(id) on delete set null;
alter table public.reseller_workflows
  add column if not exists unit_cost_idr numeric(18,2) not null default 0;
alter table public.reseller_workflows
  add column if not exists copied_from_workflow_id uuid references public.reseller_workflows(id) on delete set null;

create index if not exists reseller_workflows_supplier_idx
  on public.reseller_workflows (supplier_id, active, updated_at desc);

alter table public.reseller_workflow_runs
  add column if not exists supplier_id uuid references public.reseller_suppliers(id) on delete set null;
alter table public.reseller_workflow_runs
  add column if not exists supplier_unit_cost_idr numeric(18,2) not null default 0;
alter table public.reseller_workflow_runs
  add column if not exists supplier_cost_total_idr numeric(18,2) not null default 0;
alter table public.reseller_workflow_runs
  add column if not exists supplier_balance_debited_at timestamptz;

create table if not exists public.reseller_supplier_ledger (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.reseller_suppliers(id) on delete cascade,
  order_ref text not null default '',
  entry_type text not null default 'adjustment' check (entry_type in ('debit','credit','adjustment')),
  amount_idr numeric(18,2) not null default 0,
  balance_before numeric(18,2) not null default 0,
  balance_after numeric(18,2) not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists reseller_supplier_ledger_order_debit_uidx
  on public.reseller_supplier_ledger (supplier_id, order_ref)
  where entry_type = 'debit' and order_ref <> '';
create index if not exists reseller_supplier_ledger_supplier_idx
  on public.reseller_supplier_ledger (supplier_id, created_at desc);

alter table public.reseller_supplier_ledger enable row level security;

-- Backfill supplier records dari bot supplier workflow yang sudah ada.
do $$
declare
  rec record;
  seq integer := 0;
begin
  for rec in
    select distinct trim(target_username) as target_username
    from public.reseller_workflows
    where trim(coalesce(target_username, '')) <> ''
    order by trim(target_username)
  loop
    if not exists (
      select 1 from public.reseller_suppliers s
      where lower(trim(s.target_username)) = lower(rec.target_username)
    ) then
      seq := seq + 1;
      insert into public.reseller_suppliers(name, target_username, manual_balance_idr, active)
      values ('Supplier ' || seq, rec.target_username, 0, true);
    end if;
  end loop;
end $$;

update public.reseller_workflows w
set supplier_id = s.id,
    updated_at = now()
from public.reseller_suppliers s
where w.supplier_id is null
  and lower(trim(w.target_username)) = lower(trim(s.target_username));

-- Modal lama di produk/varian dipakai sebagai nilai awal workflow bila ada.
do $$
declare
  w record;
  p record;
  v jsonb;
  found_cost numeric;
begin
  for w in select * from public.reseller_workflows where coalesce(unit_cost_idr,0) <= 0 loop
    select * into p from public.products where upper(code) = upper(w.product_code) limit 1;
    found_cost := 0;
    if p.id is not null then
      if trim(coalesce(w.variant_key,'')) <> '' then
        select elem into v
        from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) elem
        where upper(coalesce(elem->>'sku', elem->>'kode', elem->>'key', '')) = upper(w.variant_key)
        limit 1;
        found_cost := coalesce(nullif(v->>'cost_price','')::numeric, 0);
      else
        found_cost := coalesce(p.cost_price, 0);
      end if;
    end if;
    if found_cost > 0 then
      update public.reseller_workflows set unit_cost_idr = found_cost, updated_at = now() where id = w.id;
    end if;
  end loop;
end $$;

create or replace function public.debit_reseller_supplier_balance_v823(
  p_supplier_id uuid,
  p_order_ref text,
  p_amount numeric,
  p_note text default ''
)
returns table (
  debited boolean,
  balance_before numeric,
  balance_after numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.reseller_suppliers%rowtype;
  existing public.reseller_supplier_ledger%rowtype;
  amount numeric := greatest(0, coalesce(p_amount,0));
begin
  if p_supplier_id is null then
    raise exception 'SUPPLIER_NOT_FOUND';
  end if;
  if trim(coalesce(p_order_ref,'')) = '' then
    raise exception 'ORDER_REF_REQUIRED';
  end if;

  select * into s from public.reseller_suppliers where id = p_supplier_id for update;
  if not found then raise exception 'SUPPLIER_NOT_FOUND'; end if;

  select * into existing
  from public.reseller_supplier_ledger
  where supplier_id = p_supplier_id and order_ref = p_order_ref and entry_type = 'debit'
  limit 1;
  if found then
    return query select false, existing.balance_before, existing.balance_after;
    return;
  end if;

  if amount <= 0 then
    return query select false, s.manual_balance_idr, s.manual_balance_idr;
    return;
  end if;

  if s.manual_balance_idr < amount then
    raise exception 'INSUFFICIENT_MANUAL_SUPPLIER_BALANCE';
  end if;

  update public.reseller_suppliers
  set manual_balance_idr = manual_balance_idr - amount,
      updated_at = now()
  where id = p_supplier_id
  returning * into s;

  insert into public.reseller_supplier_ledger(
    supplier_id, order_ref, entry_type, amount_idr,
    balance_before, balance_after, note
  ) values (
    p_supplier_id, p_order_ref, 'debit', -amount,
    s.manual_balance_idr + amount, s.manual_balance_idr, coalesce(p_note,'')
  );

  return query select true, s.manual_balance_idr + amount, s.manual_balance_idr;
end;
$$;

revoke all on function public.debit_reseller_supplier_balance_v823(uuid,text,numeric,text) from public;
grant execute on function public.debit_reseller_supplier_balance_v823(uuid,text,numeric,text) to service_role;

notify pgrst, 'reload schema';

-- ================================================================
-- v82.4.0: partial product extraction + recorded live supplier stock
-- ================================================================
alter table if exists public.reseller_workflows
  add column if not exists live_stock integer,
  add column if not exists live_stock_checked_at timestamptz,
  add column if not exists stock_refresh_error text not null default '';

alter table if exists public.reseller_workflow_steps
  add column if not exists result_extract_prefix text not null default '',
  add column if not exists result_extract_suffix text not null default '',
  add column if not exists result_sample_text text not null default '',
  add column if not exists capture_stock boolean not null default false,
  add column if not exists stock_extract_prefix text not null default '',
  add column if not exists stock_extract_suffix text not null default '',
  add column if not exists stock_sample_text text not null default '';

create unique index if not exists reseller_workflow_steps_one_stock_capture_idx
  on public.reseller_workflow_steps(workflow_id)
  where capture_stock = true;

notify pgrst, 'reload schema';
