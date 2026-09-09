-- v85.1.0 - Dukungan media produk gambar/video untuk Bot + Marketplace.
-- Jalankan sekali di Supabase SQL Editor setelah update v85.0.0.

alter table public.products
  add column if not exists media_type text not null default 'image';

update public.products
   set media_type = 'image'
 where media_type is null
    or lower(media_type) not in ('image', 'video');

alter table public.products drop constraint if exists products_media_type_check;
alter table public.products
  add constraint products_media_type_check
  check (lower(media_type) in ('image', 'video'));

notify pgrst, 'reload schema';
