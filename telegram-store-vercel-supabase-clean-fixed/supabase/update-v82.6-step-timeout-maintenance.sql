-- Link Auto Order v82.6
-- Timeout per-step workflow. NULL = mengikuti default reseller_workflows.step_timeout_ms.
begin;

alter table if exists public.reseller_workflow_steps
  add column if not exists wait_timeout_ms integer null;

-- Rapikan nilai lama bila kolom pernah dibuat manual.
update public.reseller_workflow_steps
set wait_timeout_ms = null
where wait_timeout_ms is not null and wait_timeout_ms < 1500;

update public.reseller_workflow_steps
set wait_timeout_ms = 120000
where wait_timeout_ms is not null and wait_timeout_ms > 120000;

commit;
notify pgrst, 'reload schema';
