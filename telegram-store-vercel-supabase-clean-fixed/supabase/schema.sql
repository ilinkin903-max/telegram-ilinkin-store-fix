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
