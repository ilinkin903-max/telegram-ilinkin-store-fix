-- Link Auto Order v82.8
-- Dukungan beberapa klik tombol berurutan pada SATU pesan Telegram supplier.
-- Aman untuk data lama: hanya menambah kolom metadata workflow step.

alter table if exists public.reseller_workflow_steps
  add column if not exists source_message_snapshot jsonb not null default '{}'::jsonb;

alter table if exists public.reseller_workflow_steps
  add column if not exists response_mode text not null default 'wait';

update public.reseller_workflow_steps
set response_mode = 'wait'
where response_mode is null or response_mode not in ('wait', 'same_message');

update public.reseller_workflow_steps
set source_message_snapshot = '{}'::jsonb
where source_message_snapshot is null;
