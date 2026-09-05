-- Link Auto Order v84.8.2
-- Counter order kanonik, statistik real-time, dan sinkronisasi status transaksi.
-- Aman dijalankan berulang kali. Tidak menghapus produk, stok, user, saldo, atau transaksi.

begin;

create table if not exists public.store_metrics_v84_8_2 (
  metric_key text primary key,
  orders_total bigint not null default 0,
  revenue_total numeric(24,2) not null default 0,
  quantity_sold bigint not null default 0,
  cost_total numeric(24,2) not null default 0,
  profit_total numeric(24,2) not null default 0,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint store_metrics_v84_8_2_key_check check (metric_key = 'all_time')
);

alter table public.store_metrics_v84_8_2 enable row level security;
revoke all on table public.store_metrics_v84_8_2 from public, anon, authenticated;

-- Ledger ini tetap disimpan saat detail transaksi dihapus. Dengan demikian,
-- restore/import order yang sama tidak menaikkan total untuk kedua kalinya.
create table if not exists public.store_order_metric_ledger_v84_8_2 (
  metric_order_key text primary key,
  transaction_id uuid,
  order_ref text not null default '',
  is_completed boolean not null default false,
  revenue numeric(24,2) not null default 0,
  quantity bigint not null default 0,
  cost numeric(24,2) not null default 0,
  profit numeric(24,2) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists store_order_metric_ledger_v84_8_2_transaction_idx
  on public.store_order_metric_ledger_v84_8_2 (transaction_id);

alter table public.store_order_metric_ledger_v84_8_2 enable row level security;
revoke all on table public.store_order_metric_ledger_v84_8_2 from public, anon, authenticated;

create or replace function public.sync_store_metrics_v84_8_2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_key text;
  v_old_key text;
  v_previous public.store_order_metric_ledger_v84_8_2%rowtype;
  v_previous_found boolean := false;
  v_previous_completed boolean := false;
  v_previous_revenue numeric := 0;
  v_previous_quantity bigint := 0;
  v_previous_cost numeric := 0;
  v_previous_profit numeric := 0;
  v_new_completed boolean := false;
  v_orders_delta bigint := 0;
  v_revenue_delta numeric := 0;
  v_quantity_delta bigint := 0;
  v_cost_delta numeric := 0;
  v_profit_delta numeric := 0;
begin
  -- Satu lock global mencegah rekonsiliasi backup menimpa transaksi yang masuk
  -- pada saat bersamaan. Update counter sendiri tetap atomik di satu baris.
  perform pg_advisory_xact_lock(hashtextextended('store_metrics_v84_8_2', 0));

  -- Detail transaksi boleh dibersihkan oleh maintenance, tetapi total historis
  -- harus tetap. DELETE hanya menaikkan revision agar daftar order di dashboard
  -- segera dimuat ulang; ledger/tombstone sengaja dipertahankan.
  if tg_op = 'DELETE' then
    insert into public.store_metrics_v84_8_2 as metrics (
      metric_key, orders_total, revenue_total, quantity_sold,
      cost_total, profit_total, revision, updated_at
    ) values ('all_time', 0, 0, 0, 0, 0, 1, now())
    on conflict (metric_key) do update set
      revision = metrics.revision + 1,
      updated_at = now();
    return old;
  end if;

  v_new_key := case
    when trim(coalesce(new.order_ref, '')) <> '' then 'order:' || trim(new.order_ref)
    else 'id:' || new.id::text
  end;
  v_old_key := v_new_key;
  if tg_op = 'UPDATE' then
    v_old_key := case
      when trim(coalesce(old.order_ref, '')) <> '' then 'order:' || trim(old.order_ref)
      else 'id:' || old.id::text
    end;
  end if;
  v_new_completed := lower(coalesce(new.status, 'completed')) = 'completed';

  -- Bila key/order_ref berubah, nolkan kontribusi key lama tetapi simpan tombstone
  -- agar restore dengan invoice lama tidak dihitung dua kali.
  if tg_op = 'UPDATE' and v_old_key <> v_new_key then
    select * into v_previous
      from public.store_order_metric_ledger_v84_8_2
     where metric_order_key = v_old_key
     for update;
    v_previous_found := found;
    if v_previous_found then
      v_previous_completed := coalesce(v_previous.is_completed, false);
      v_previous_revenue := coalesce(v_previous.revenue, 0);
      v_previous_quantity := coalesce(v_previous.quantity, 0);
      v_previous_cost := coalesce(v_previous.cost, 0);
      v_previous_profit := coalesce(v_previous.profit, 0);
    else
      v_previous_completed := lower(coalesce(old.status, 'completed')) = 'completed';
      v_previous_revenue := coalesce(old.total_price, 0);
      v_previous_quantity := coalesce(old.quantity, 0);
      v_previous_cost := coalesce(old.cost_total, 0);
      v_previous_profit := coalesce(old.profit_amount, 0);
    end if;

    if v_previous_completed then
      v_orders_delta := v_orders_delta - 1;
      v_revenue_delta := v_revenue_delta - v_previous_revenue;
      v_quantity_delta := v_quantity_delta - v_previous_quantity;
      v_cost_delta := v_cost_delta - v_previous_cost;
      v_profit_delta := v_profit_delta - v_previous_profit;
    end if;

    insert into public.store_order_metric_ledger_v84_8_2 as old_ledger (
      metric_order_key, transaction_id, order_ref, is_completed,
      revenue, quantity, cost, profit, updated_at
    ) values (
      v_old_key, old.id, trim(coalesce(old.order_ref, '')), false,
      0, 0, 0, 0, now()
    )
    on conflict (metric_order_key) do update set
      transaction_id = excluded.transaction_id,
      order_ref = excluded.order_ref,
      is_completed = false,
      revenue = 0,
      quantity = 0,
      cost = 0,
      profit = 0,
      updated_at = now();

    -- Key baru mungkin sudah pernah tercatat (misalnya hasil restore). Kurangi
    -- nilai tersimpan itu sebelum menggantinya dengan snapshot NEW.
    select * into v_previous
      from public.store_order_metric_ledger_v84_8_2
     where metric_order_key = v_new_key
     for update;
    v_previous_found := found;
    if v_previous_found and coalesce(v_previous.is_completed, false) then
      v_orders_delta := v_orders_delta - 1;
      v_revenue_delta := v_revenue_delta - coalesce(v_previous.revenue, 0);
      v_quantity_delta := v_quantity_delta - coalesce(v_previous.quantity, 0);
      v_cost_delta := v_cost_delta - coalesce(v_previous.cost, 0);
      v_profit_delta := v_profit_delta - coalesce(v_previous.profit, 0);
    end if;
  else
    select * into v_previous
      from public.store_order_metric_ledger_v84_8_2
     where metric_order_key = v_new_key
     for update;
    v_previous_found := found;

    if v_previous_found then
      v_previous_completed := coalesce(v_previous.is_completed, false);
      v_previous_revenue := coalesce(v_previous.revenue, 0);
      v_previous_quantity := coalesce(v_previous.quantity, 0);
      v_previous_cost := coalesce(v_previous.cost, 0);
      v_previous_profit := coalesce(v_previous.profit, 0);
    elsif tg_op = 'UPDATE' then
      -- Fallback aman bila ledger belum ter-seed tetapi transaksi sudah ada.
      v_previous_completed := lower(coalesce(old.status, 'completed')) = 'completed';
      v_previous_revenue := coalesce(old.total_price, 0);
      v_previous_quantity := coalesce(old.quantity, 0);
      v_previous_cost := coalesce(old.cost_total, 0);
      v_previous_profit := coalesce(old.profit_amount, 0);
    end if;

    if v_previous_completed then
      v_orders_delta := v_orders_delta - 1;
      v_revenue_delta := v_revenue_delta - v_previous_revenue;
      v_quantity_delta := v_quantity_delta - v_previous_quantity;
      v_cost_delta := v_cost_delta - v_previous_cost;
      v_profit_delta := v_profit_delta - v_previous_profit;
    end if;
  end if;

  if v_new_completed then
    v_orders_delta := v_orders_delta + 1;
    v_revenue_delta := v_revenue_delta + coalesce(new.total_price, 0);
    v_quantity_delta := v_quantity_delta + coalesce(new.quantity, 0);
    v_cost_delta := v_cost_delta + coalesce(new.cost_total, 0);
    v_profit_delta := v_profit_delta + coalesce(new.profit_amount, 0);
  end if;

  insert into public.store_order_metric_ledger_v84_8_2 as ledger (
    metric_order_key, transaction_id, order_ref, is_completed,
    revenue, quantity, cost, profit, updated_at
  ) values (
    v_new_key, new.id, trim(coalesce(new.order_ref, '')), v_new_completed,
    case when v_new_completed then coalesce(new.total_price, 0) else 0 end,
    case when v_new_completed then coalesce(new.quantity, 0) else 0 end,
    case when v_new_completed then coalesce(new.cost_total, 0) else 0 end,
    case when v_new_completed then coalesce(new.profit_amount, 0) else 0 end,
    now()
  )
  on conflict (metric_order_key) do update set
    transaction_id = excluded.transaction_id,
    order_ref = excluded.order_ref,
    is_completed = excluded.is_completed,
    revenue = excluded.revenue,
    quantity = excluded.quantity,
    cost = excluded.cost,
    profit = excluded.profit,
    updated_at = now();

  -- Revision selalu naik pada setiap INSERT/UPDATE transaksi. Selain menjaga
  -- counter, revision menjadi sinyal lintas-instance bahwa daftar order berubah.
  insert into public.store_metrics_v84_8_2 as metrics (
    metric_key, orders_total, revenue_total, quantity_sold,
    cost_total, profit_total, revision, updated_at
  ) values (
    'all_time', v_orders_delta, v_revenue_delta, v_quantity_delta,
    v_cost_delta, v_profit_delta, 1, now()
  )
  on conflict (metric_key) do update set
    orders_total = greatest(0::bigint, metrics.orders_total + excluded.orders_total),
    revenue_total = greatest(0::numeric, metrics.revenue_total + excluded.revenue_total),
    quantity_sold = greatest(0::bigint, metrics.quantity_sold + excluded.quantity_sold),
    cost_total = greatest(0::numeric, metrics.cost_total + excluded.cost_total),
    profit_total = metrics.profit_total + excluded.profit_total,
    revision = metrics.revision + 1,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_store_metrics_v84_8_2() from public, anon, authenticated;

drop trigger if exists transactions_store_metrics_v84_8_2 on public.transactions;
create trigger transactions_store_metrics_v84_8_2
  after insert or update or delete
  on public.transactions
  for each row execute function public.sync_store_metrics_v84_8_2();

-- Catat semua transaksi yang masih tersimpan tanpa mengubah counter global.
insert into public.store_order_metric_ledger_v84_8_2 as ledger (
  metric_order_key, transaction_id, order_ref, is_completed,
  revenue, quantity, cost, profit, updated_at
)
select
  case when trim(coalesce(t.order_ref, '')) <> ''
    then 'order:' || trim(t.order_ref) else 'id:' || t.id::text end,
  t.id,
  trim(coalesce(t.order_ref, '')),
  t.status = 'completed',
  case when t.status = 'completed' then coalesce(t.total_price, 0) else 0 end,
  case when t.status = 'completed' then coalesce(t.quantity, 0) else 0 end,
  case when t.status = 'completed' then coalesce(t.cost_total, 0) else 0 end,
  case when t.status = 'completed' then coalesce(t.profit_amount, 0) else 0 end,
  now()
from public.transactions t
on conflict (metric_order_key) do update set
  transaction_id = excluded.transaction_id,
  order_ref = excluded.order_ref,
  is_completed = excluded.is_completed,
  revenue = excluded.revenue,
  quantity = excluded.quantity,
  cost = excluded.cost,
  profit = excluded.profit,
  updated_at = now();

-- Seed awal: ambil nilai terluas antara transaksi completed yang masih tersimpan
-- dan historical_stats, sehingga maintenance transaksi lama tidak mereset total.
with live as (
  select
    count(*)::bigint as orders_total,
    coalesce(sum(total_price), 0)::numeric as revenue_total,
    coalesce(sum(quantity), 0)::bigint as quantity_sold,
    coalesce(sum(cost_total), 0)::numeric as cost_total,
    coalesce(sum(profit_amount), 0)::numeric as profit_total
  from public.transactions
  where status = 'completed'
), historical as (
  select
    coalesce(max(case
      when trim(coalesce(value->>'orders_total', '')) ~ '^[0-9]+([.][0-9]+)?$'
        then floor((value->>'orders_total')::numeric)::bigint else 0 end), 0)::bigint as orders_total,
    coalesce(max(case
      when trim(coalesce(value->>'revenue_total', '')) ~ '^-?[0-9]+([.][0-9]+)?$'
        then (value->>'revenue_total')::numeric else 0 end), 0)::numeric as revenue_total,
    coalesce(max(case
      when trim(coalesce(value->>'quantity_sold', '')) ~ '^[0-9]+([.][0-9]+)?$'
        then floor((value->>'quantity_sold')::numeric)::bigint else 0 end), 0)::bigint as quantity_sold,
    coalesce(max(case
      when trim(coalesce(value->>'cost_total', '')) ~ '^-?[0-9]+([.][0-9]+)?$'
        then (value->>'cost_total')::numeric else 0 end), 0)::numeric as cost_total,
    coalesce(max(case
      when trim(coalesce(value->>'profit_total', '')) ~ '^-?[0-9]+([.][0-9]+)?$'
        then (value->>'profit_total')::numeric else 0 end), 0)::numeric as profit_total
  from public.shop_settings
  where key = 'historical_stats'
), seed as (
  select
    greatest(live.orders_total, historical.orders_total)::bigint as orders_total,
    greatest(live.revenue_total, historical.revenue_total)::numeric as revenue_total,
    greatest(live.quantity_sold, historical.quantity_sold)::bigint as quantity_sold,
    case
      when historical.orders_total > live.orders_total
        or historical.revenue_total > live.revenue_total
        or historical.quantity_sold > live.quantity_sold
      then greatest(0::numeric, historical.cost_total)
      else greatest(0::numeric, live.cost_total)
    end as cost_total,
    case
      when historical.orders_total > live.orders_total
        or historical.revenue_total > live.revenue_total
        or historical.quantity_sold > live.quantity_sold
      then historical.profit_total
      else live.profit_total
    end as profit_total
  from live cross join historical
)
insert into public.store_metrics_v84_8_2 as metrics (
  metric_key, orders_total, revenue_total, quantity_sold,
  cost_total, profit_total, revision, updated_at
)
select
  'all_time', orders_total, revenue_total, quantity_sold,
  cost_total, profit_total, 1, now()
from seed
on conflict (metric_key) do update set
  orders_total = greatest(metrics.orders_total, excluded.orders_total),
  revenue_total = greatest(metrics.revenue_total, excluded.revenue_total),
  quantity_sold = greatest(metrics.quantity_sold, excluded.quantity_sold),
  cost_total = case
    when excluded.orders_total > metrics.orders_total
      or excluded.revenue_total > metrics.revenue_total
      or excluded.quantity_sold > metrics.quantity_sold
    then excluded.cost_total else metrics.cost_total end,
  profit_total = case
    when excluded.orders_total > metrics.orders_total
      or excluded.revenue_total > metrics.revenue_total
      or excluded.quantity_sold > metrics.quantity_sold
    then excluded.profit_total else metrics.profit_total end,
  revision = metrics.revision + 1,
  updated_at = now();

-- Rekonsiliasi dipakai setelah restore/import backup. Nilai sebelum import,
-- historical_stats, dan transaksi yang masih tersimpan dibandingkan sebagai satu
-- snapshot utuh. Ini mencegah order lama dihitung dua kali tanpa menurunkan data
-- baru yang sudah masuk sebelum restore.
create or replace function public.reconcile_store_metrics_v84_8_2(
  p_orders_floor bigint default 0,
  p_revenue_floor numeric default 0,
  p_quantity_floor bigint default 0,
  p_cost_floor numeric default 0,
  p_profit_floor numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('store_metrics_v84_8_2', 0));

  -- Pastikan setiap transaksi yang sedang tersimpan memiliki snapshot ledger.
  -- Tombstone untuk transaksi yang sudah dihapus tidak dihapus.
  insert into public.store_order_metric_ledger_v84_8_2 as ledger (
    metric_order_key, transaction_id, order_ref, is_completed,
    revenue, quantity, cost, profit, updated_at
  )
  select
    case when trim(coalesce(t.order_ref, '')) <> ''
      then 'order:' || trim(t.order_ref) else 'id:' || t.id::text end,
    t.id,
    trim(coalesce(t.order_ref, '')),
    t.status = 'completed',
    case when t.status = 'completed' then coalesce(t.total_price, 0) else 0 end,
    case when t.status = 'completed' then coalesce(t.quantity, 0) else 0 end,
    case when t.status = 'completed' then coalesce(t.cost_total, 0) else 0 end,
    case when t.status = 'completed' then coalesce(t.profit_amount, 0) else 0 end,
    now()
  from public.transactions t
  on conflict (metric_order_key) do update set
    transaction_id = excluded.transaction_id,
    order_ref = excluded.order_ref,
    is_completed = excluded.is_completed,
    revenue = excluded.revenue,
    quantity = excluded.quantity,
    cost = excluded.cost,
    profit = excluded.profit,
    updated_at = now();

  with live as (
    select
      count(*)::bigint as orders_total,
      coalesce(sum(total_price), 0)::numeric as revenue_total,
      coalesce(sum(quantity), 0)::bigint as quantity_sold,
      coalesce(sum(cost_total), 0)::numeric as cost_total,
      coalesce(sum(profit_amount), 0)::numeric as profit_total
    from public.transactions
    where status = 'completed'
  ), historical as (
    select
      coalesce(max(case
        when trim(coalesce(value->>'orders_total', '')) ~ '^[0-9]+([.][0-9]+)?$'
          then floor((value->>'orders_total')::numeric)::bigint else 0 end), 0)::bigint as orders_total,
      coalesce(max(case
        when trim(coalesce(value->>'revenue_total', '')) ~ '^-?[0-9]+([.][0-9]+)?$'
          then (value->>'revenue_total')::numeric else 0 end), 0)::numeric as revenue_total,
      coalesce(max(case
        when trim(coalesce(value->>'quantity_sold', '')) ~ '^[0-9]+([.][0-9]+)?$'
          then floor((value->>'quantity_sold')::numeric)::bigint else 0 end), 0)::bigint as quantity_sold,
      coalesce(max(case
        when trim(coalesce(value->>'cost_total', '')) ~ '^-?[0-9]+([.][0-9]+)?$'
          then (value->>'cost_total')::numeric else 0 end), 0)::numeric as cost_total,
      coalesce(max(case
        when trim(coalesce(value->>'profit_total', '')) ~ '^-?[0-9]+([.][0-9]+)?$'
          then (value->>'profit_total')::numeric else 0 end), 0)::numeric as profit_total
    from public.shop_settings
    where key = 'historical_stats'
  ), candidates as (
    select
      3 as source_priority,
      greatest(0::bigint, coalesce(p_orders_floor, 0)) as orders_total,
      greatest(0::numeric, coalesce(p_revenue_floor, 0)) as revenue_total,
      greatest(0::bigint, coalesce(p_quantity_floor, 0)) as quantity_sold,
      greatest(0::numeric, coalesce(p_cost_floor, 0)) as cost_total,
      coalesce(p_profit_floor, 0)::numeric as profit_total
    union all
    select 2, orders_total, revenue_total, quantity_sold,
           greatest(0::numeric, cost_total), profit_total
      from historical
    union all
    select 1, orders_total, revenue_total, quantity_sold,
           greatest(0::numeric, cost_total), profit_total
      from live
  ), winner as (
    select *
      from candidates
     order by orders_total desc, revenue_total desc, quantity_sold desc, source_priority desc
     limit 1
  )
  insert into public.store_metrics_v84_8_2 as metrics (
    metric_key, orders_total, revenue_total, quantity_sold,
    cost_total, profit_total, revision, updated_at
  )
  select
    'all_time', orders_total, revenue_total, quantity_sold,
    cost_total, profit_total, 1, now()
  from winner
  on conflict (metric_key) do update set
    orders_total = excluded.orders_total,
    revenue_total = excluded.revenue_total,
    quantity_sold = excluded.quantity_sold,
    cost_total = excluded.cost_total,
    profit_total = excluded.profit_total,
    revision = metrics.revision + 1,
    updated_at = now()
  returning jsonb_build_object(
    'orders_total', orders_total,
    'revenue_total', revenue_total,
    'quantity_sold', quantity_sold,
    'cost_total', cost_total,
    'profit_total', profit_total,
    'revision', revision,
    'updated_at', updated_at
  ) into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.reconcile_store_metrics_v84_8_2(bigint, numeric, bigint, numeric, numeric) from public, anon, authenticated;
grant execute on function public.reconcile_store_metrics_v84_8_2(bigint, numeric, bigint, numeric, numeric) to service_role;

-- Fulfillment lama sudah menaikkan counter user saat INSERT. Trigger ini hanya
-- menangani perubahan status/nominal setelah transaksi tercatat, agar batal/
-- pulihkan transaksi tidak membuat statistik per-user menyimpang.
create or replace function public.sync_bot_user_transaction_metrics_v84_8_2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_completed boolean := lower(coalesce(old.status, 'completed')) = 'completed';
  v_new_completed boolean := lower(coalesce(new.status, 'completed')) = 'completed';
  v_count_delta integer := 0;
  v_spending_delta bigint := 0;
begin
  if old.telegram_id = new.telegram_id then
    v_count_delta := (case when v_new_completed then 1 else 0 end)
                     - (case when v_old_completed then 1 else 0 end);
    v_spending_delta := (case when v_new_completed then coalesce(new.total_price, 0) else 0 end)
                        - (case when v_old_completed then coalesce(old.total_price, 0) else 0 end);
    if v_count_delta <> 0 or v_spending_delta <> 0 then
      update public.bot_users
         set transaction_count = greatest(0, coalesce(transaction_count, 0) + v_count_delta),
             spending = greatest(0::bigint, coalesce(spending, 0)::bigint + v_spending_delta)::integer,
             updated_at = now()
       where telegram_id = new.telegram_id;
    end if;
  else
    if v_old_completed then
      update public.bot_users
         set transaction_count = greatest(0, coalesce(transaction_count, 0) - 1),
             spending = greatest(0::bigint, coalesce(spending, 0)::bigint - coalesce(old.total_price, 0)::bigint)::integer,
             updated_at = now()
       where telegram_id = old.telegram_id;
    end if;
    if v_new_completed then
      update public.bot_users
         set transaction_count = coalesce(transaction_count, 0) + 1,
             spending = (coalesce(spending, 0)::bigint + coalesce(new.total_price, 0)::bigint)::integer,
             updated_at = now()
       where telegram_id = new.telegram_id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_bot_user_transaction_metrics_v84_8_2() from public, anon, authenticated;

drop trigger if exists transactions_bot_user_metrics_v84_8_2 on public.transactions;
create trigger transactions_bot_user_metrics_v84_8_2
  after update of status, total_price, telegram_id
  on public.transactions
  for each row execute function public.sync_bot_user_transaction_metrics_v84_8_2();

-- Perbarui juga RPC lama sebagai fallback selama PostgREST memuat schema cache baru.
-- Hanya transaksi completed yang boleh masuk statistik.
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
    where status = 'completed'
  ), clock as (
    select (now() at time zone 'Asia/Jakarta')::date as today
  )
  select jsonb_build_object(
    'orders_total', coalesce((select count(*) from base), 0),
    'live_orders_total', coalesce((select count(*) from base), 0),
    'orders_today', coalesce((select count(*) from base, clock where base.local_date = clock.today), 0),
    'orders_month', coalesce((select count(*) from base, clock where date_trunc('month', base.local_date) = date_trunc('month', clock.today)), 0),
    'revenue_total', coalesce((select sum(total_price) from base), 0),
    'quantity_sold', coalesce((select sum(quantity) from base), 0),
    'cost_total', coalesce((select sum(cost_total) from base), 0),
    'profit_total', coalesce((select sum(profit_amount) from base), 0),
    'revenue_today', coalesce((select sum(total_price) from base, clock where base.local_date = clock.today), 0),
    'profit_today', coalesce((select sum(profit_amount) from base, clock where base.local_date = clock.today), 0),
    'revenue_month', coalesce((select sum(total_price) from base, clock where date_trunc('month', base.local_date) = date_trunc('month', clock.today)), 0),
    'profit_month', coalesce((select sum(profit_amount) from base, clock where date_trunc('month', base.local_date) = date_trunc('month', clock.today)), 0),
    'counter_version', 'v62-fallback-completed-only',
    'updated_at', now()
  );
$$;

revoke all on function public.stats_summary_v62() from public, anon, authenticated;
grant execute on function public.stats_summary_v62() to service_role;

-- RPC ringkas dan cepat: total semua waktu berasal dari satu baris counter;
-- statistik hari/bulan hanya memindai transaksi bulan berjalan dengan indeks status+tanggal.
create or replace function public.stats_summary_v84_8_2()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with clock as (
    select
      (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as day_start,
      (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as month_start
  ), metrics as (
    select
      coalesce(max(orders_total), 0)::bigint as orders_total,
      coalesce(max(revenue_total), 0)::numeric as revenue_total,
      coalesce(max(quantity_sold), 0)::bigint as quantity_sold,
      coalesce(max(cost_total), 0)::numeric as cost_total,
      coalesce(max(profit_total), 0)::numeric as profit_total,
      coalesce(max(revision), 0)::bigint as revision,
      coalesce(max(updated_at), now()) as updated_at
    from public.store_metrics_v84_8_2
    where metric_key = 'all_time'
  ), month_rows as (
    select
      coalesce(t.total_price, 0)::numeric as total_price,
      coalesce(t.quantity, 0)::bigint as quantity,
      coalesce(t.cost_total, 0)::numeric as cost_total,
      coalesce(t.profit_amount, 0)::numeric as profit_amount,
      t.created_at,
      clock.day_start
    from public.transactions t
    cross join clock
    where t.status = 'completed'
      and t.created_at >= clock.month_start
  ), period as (
    select
      count(*)::bigint as orders_month,
      count(*) filter (where created_at >= day_start)::bigint as orders_today,
      coalesce(sum(total_price), 0)::numeric as revenue_month,
      coalesce(sum(total_price) filter (where created_at >= day_start), 0)::numeric as revenue_today,
      coalesce(sum(profit_amount), 0)::numeric as profit_month,
      coalesce(sum(profit_amount) filter (where created_at >= day_start), 0)::numeric as profit_today
    from month_rows
  )
  select jsonb_build_object(
    'counter_version', 'v84.8.2',
    'orders_total', coalesce(metrics.orders_total, 0),
    'live_orders_total', coalesce(metrics.orders_total, 0),
    'orders_today', coalesce(period.orders_today, 0),
    'orders_month', coalesce(period.orders_month, 0),
    'revenue_total', coalesce(metrics.revenue_total, 0),
    'live_revenue_total', coalesce(metrics.revenue_total, 0),
    'quantity_sold', coalesce(metrics.quantity_sold, 0),
    'live_quantity_sold', coalesce(metrics.quantity_sold, 0),
    'cost_total', coalesce(metrics.cost_total, 0),
    'live_cost_total', coalesce(metrics.cost_total, 0),
    'profit_total', coalesce(metrics.profit_total, 0),
    'live_profit_total', coalesce(metrics.profit_total, 0),
    'revenue_today', coalesce(period.revenue_today, 0),
    'profit_today', coalesce(period.profit_today, 0),
    'revenue_month', coalesce(period.revenue_month, 0),
    'profit_month', coalesce(period.profit_month, 0),
    'revision', coalesce(metrics.revision, 0),
    'updated_at', coalesce(metrics.updated_at, now())
  )
  from metrics cross join period;
$$;

revoke all on function public.stats_summary_v84_8_2() from public, anon, authenticated;
grant execute on function public.stats_summary_v84_8_2() to service_role;

notify pgrst, 'reload schema';

commit;
