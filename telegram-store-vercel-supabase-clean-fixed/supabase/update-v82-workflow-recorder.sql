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
  previous_link_snapshot jsonb not null default '{}'::jsonb,
  created_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reseller_workflows add column if not exists previous_link_snapshot jsonb not null default '{}'::jsonb;
alter table public.reseller_workflows alter column step_timeout_ms set default 7000;

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
  capture_result boolean not null default false,
  created_at timestamptz not null default now(),
  unique(workflow_id, step_order)
);

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

-- Service-role based backend owns these tables. Keep RLS enabled without public policies.
alter table public.reseller_workflows enable row level security;
alter table public.reseller_workflow_steps enable row level security;
alter table public.reseller_workflow_runs enable row level security;

-- v82 setting defaults (stored as JSONB strings, matching existing shop_settings usage).
insert into public.shop_settings(key, value)
values
  ('workflow_reseller_enabled', to_jsonb('true'::text)),
  ('workflow_step_timeout_ms', to_jsonb('7000'::text))
on conflict (key) do nothing;

notify pgrst, 'reload schema';
