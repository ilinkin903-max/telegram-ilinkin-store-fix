-- Migration SQL: Update fulfill_paid_order_v62 & fulfill_wallet_order_v65 untuk mendukung STOK BERSAMA (shared stock pool) per varian.
-- Jalankan file ini di Supabase SQL Editor jika pembayaran saldo / QRIS untuk varian stok bersama memerlukan update fungsi database.

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
    if lower(coalesce(v_variant->>'stock_mode','separate')) = 'shared' then
      v_stock := coalesce(v_product.stock, '[]'::jsonb);
    else
      v_stock := coalesce(v_variant->'stock', v_variant->'stok', v_variant->'data', '[]'::jsonb);
    end if;
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
    if lower(coalesce(v_variant->>'stock_mode','separate')) = 'shared' then
      v_variants := jsonb_set(
        v_variants,
        array[v_variant_idx::text, 'sold'],
        to_jsonb(greatest(0, coalesce(nullif(v_variant->>'sold', '')::integer, 0)) + v_quantity),
        true
      );
      update public.products
         set stock = v_rest,
             variants = v_variants,
             sold = coalesce(sold, 0) + v_quantity,
             updated_at = v_now
       where id = v_product.id;
    else
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
    end if;
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

  return jsonb_build_object(
    'already_completed', false,
    'delivered', v_taken,
    'transaction', to_jsonb(v_transaction)
  );
end;
$$;

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
    if lower(coalesce(v_variant->>'stock_mode','separate')) = 'shared' then
      v_stock := coalesce(v_product.stock, '[]'::jsonb);
    else
      v_stock := coalesce(v_variant->'stock', v_variant->'stok', v_variant->'data', '[]'::jsonb);
    end if;
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
    if lower(coalesce(v_variant->>'stock_mode','separate')) = 'shared' then
      v_variants := jsonb_set(
        v_variants, array[v_variant_idx::text, 'sold'],
        to_jsonb(greatest(0, coalesce(nullif(v_variant->>'sold', '')::integer, 0)) + v_quantity), true
      );
      update public.products set stock = v_rest, variants = v_variants, sold = coalesce(sold, 0) + v_quantity, updated_at = v_now
       where id = v_product.id;
    else
      v_variants := jsonb_set(v_variants, array[v_variant_idx::text, 'stock'], v_rest, true);
      v_variants := jsonb_set(
        v_variants, array[v_variant_idx::text, 'sold'],
        to_jsonb(greatest(0, coalesce(nullif(v_variant->>'sold', '')::integer, 0)) + v_quantity), true
      );
      update public.products set variants = v_variants, sold = coalesce(sold, 0) + v_quantity, updated_at = v_now
       where id = v_product.id;
    end if;
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

  return jsonb_build_object(
    'already_completed', false,
    'delivered', v_taken,
    'transaction', to_jsonb(v_transaction),
    'wallet', jsonb_build_object(
      'main_used', v_main_used,
      'referral_used', v_ref_used,
      'balance_main', v_user.balance_main,
      'balance_referral', v_user.balance_referral,
      'balance_total', coalesce(v_user.balance_main, 0) + coalesce(v_user.balance_referral, 0)
    )
  );
end;
$$;

grant execute on function public.fulfill_paid_order_v62(jsonb, text, integer, jsonb) to service_role;
grant execute on function public.fulfill_wallet_order_v65(jsonb, text, integer, jsonb) to service_role;

-- Perbaikan: Omset & Profit tidak lagi menghitung transaksi yang dibatalkan (canceled).
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
    where lower(coalesce(status, 'completed')) <> 'canceled'
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

grant execute on function public.stats_summary_v62() to service_role;

notify pgrst, 'reload schema';
