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
