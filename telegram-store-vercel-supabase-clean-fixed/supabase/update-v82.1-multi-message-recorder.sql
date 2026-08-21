-- Link Auto Order v82.1 - Multi-message Workflow Recorder
-- Additive migration. Aman dijalankan setelah v82.0. Tidak menghapus data.

alter table public.reseller_workflows
  add column if not exists recent_message_snapshots jsonb not null default '[]'::jsonb;

alter table public.reseller_workflow_steps
  add column if not exists response_snapshots jsonb not null default '[]'::jsonb;

alter table public.reseller_workflow_steps
  add column if not exists response_selection_index integer not null default 0;

alter table public.reseller_workflow_steps
  add column if not exists text_category text not null default 'other';

-- Backfill step lama agar tetap kompatibel.
update public.reseller_workflow_steps
set response_snapshots = jsonb_build_array(response_snapshot)
where (response_snapshots is null or response_snapshots = '[]'::jsonb)
  and response_snapshot is not null
  and response_snapshot <> '{}'::jsonb;

update public.reseller_workflow_steps
set text_category = case
  when action_type = 'text' and lower(trim(action_value)) = '{quantity}' then 'quantity'
  else 'other'
end
where coalesce(text_category, '') = '' or text_category = 'other';

notify pgrst, 'reload schema';
