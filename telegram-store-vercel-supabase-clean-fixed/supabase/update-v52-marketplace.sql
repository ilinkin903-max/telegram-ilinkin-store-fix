-- Jalankan satu kali di Supabase SQL Editor setelah update ke v52.
-- Aman dijalankan ulang karena menggunakan IF NOT EXISTS.

alter table public.products
  add column if not exists display_scope text not null default 'both';

update public.products
set display_scope = 'both'
where display_scope is null or display_scope not in ('both', 'marketplace');

alter table public.pending_orders
  add column if not exists qr_payload text not null default '';
