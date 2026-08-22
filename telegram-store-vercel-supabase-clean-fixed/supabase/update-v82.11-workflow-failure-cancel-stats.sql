-- v82.11: exclude canceled transactions from live statistics.
-- Safe to run multiple times. Existing completed transactions remain included.
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
    where lower(coalesce(status, 'completed')) = 'completed'
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

revoke all on function public.stats_summary_v62() from public, anon, authenticated;
grant execute on function public.stats_summary_v62() to service_role;
