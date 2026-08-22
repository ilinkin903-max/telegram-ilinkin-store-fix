-- Link Auto Order v82.4.0
-- Partial result extraction + recorded live supplier stock.
-- Additive migration: does not delete products, workflows, orders, balances, or stock.

begin;

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

-- Only one recorded stock-reading step per workflow.
create unique index if not exists reseller_workflow_steps_one_stock_capture_idx
  on public.reseller_workflow_steps(workflow_id)
  where capture_stock = true;

commit;

notify pgrst, 'reload schema';
