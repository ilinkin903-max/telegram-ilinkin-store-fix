-- Link Auto Order v82.7 - Continuous Workflow Recorder
-- Menyimpan snapshot chat sebelum setiap aksi agar recorder dapat terus membandingkan
-- pesan baru, pesan yang diedit, dan pesan sementara yang kemudian hilang.

alter table if exists public.reseller_workflow_steps
  add column if not exists recorder_before_snapshots jsonb not null default '[]'::jsonb;

update public.reseller_workflow_steps
set recorder_before_snapshots = '[]'::jsonb
where recorder_before_snapshots is null;

-- Tidak menghapus/mengubah step, produk, order, saldo, maupun workflow yang sudah ada.
