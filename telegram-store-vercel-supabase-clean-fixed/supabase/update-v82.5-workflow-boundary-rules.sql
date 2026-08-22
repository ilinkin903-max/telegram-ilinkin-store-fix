-- Link Auto Order v82.5
-- Membersihkan nilai contoh lama. Runtime v82.5 hanya memakai teks sebelum/sesudah.
begin;

update public.reseller_workflow_steps
set stock_sample_text = ''
where coalesce(stock_sample_text, '') <> '';

update public.reseller_workflow_steps
set result_sample_text = ''
where coalesce(result_sample_text, '') <> '';

commit;
