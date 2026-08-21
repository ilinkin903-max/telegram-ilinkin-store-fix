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
