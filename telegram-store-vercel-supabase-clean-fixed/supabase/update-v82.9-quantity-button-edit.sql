-- Link Auto Order v82.9
-- Tombol jumlah dinamis + daftar tombol sumber tetap tersedia saat workflow disalin/edit.
-- Aman untuk data lama: hanya menambah metadata.

alter table if exists public.reseller_workflow_steps
  add column if not exists button_role text not null default 'static';

update public.reseller_workflow_steps
set button_role = 'static'
where button_role is null or button_role not in ('static', 'quantity');

-- Workflow lama tetap aman. Runtime v82.9 juga melakukan auto-detect pada menu tombol
-- angka 1..20, sehingga workflow lama tidak wajib direkam ulang.
