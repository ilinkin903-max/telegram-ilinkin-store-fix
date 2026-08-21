-- Link Auto Order v82.2 - Workflow anti-loop / anti-double-order guard
-- Additive migration. Tidak menghapus produk, workflow, order, stok, user, atau saldo.

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

create index if not exists reseller_workflow_run_steps_order_idx
  on public.reseller_workflow_run_steps (order_ref, step_order);
create index if not exists reseller_workflow_run_steps_status_idx
  on public.reseller_workflow_run_steps (status, updated_at desc);

alter table public.reseller_workflow_run_steps enable row level security;

notify pgrst, 'reload schema';
