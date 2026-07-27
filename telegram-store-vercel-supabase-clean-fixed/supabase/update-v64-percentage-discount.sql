-- v64: normalisasi diskon persen untuk voucher dan promo otomatis.
-- Jalankan setelah update v62 dan v63. Aman dijalankan berulang kali.

begin;

alter table public.vouchers
  add column if not exists discount_type text not null default 'amount';

alter table public.vouchers
  add column if not exists discount_value integer not null default 0;

alter table public.vouchers
  add column if not exists discount integer not null default 0;

alter table public.auto_promos
  add column if not exists discount_type text not null default 'amount';

alter table public.auto_promos
  add column if not exists discount_value integer not null default 0;

-- Terima data lama yang pernah disimpan sebagai percentage, persen, atau simbol %.
update public.vouchers
set discount_type = case
  when lower(trim(coalesce(discount_type, ''))) in ('percent', 'percentage', 'persen', '%') then 'percent'
  else 'amount'
end;

update public.auto_promos
set discount_type = case
  when lower(trim(coalesce(discount_type, ''))) in ('percent', 'percentage', 'persen', '%') then 'percent'
  else 'amount'
end;

-- Voucher versi lama memakai kolom discount. Salin nilainya bila discount_value masih kosong.
update public.vouchers
set discount_value = greatest(
  0,
  case
    when coalesce(discount_value, 0) > 0 then discount_value
    else coalesce(discount, 0)
  end
);

-- Pertahankan kolom kompatibilitas agar backup/import versi lama tetap terbaca.
update public.vouchers
set discount = discount_value;

update public.auto_promos
set discount_value = greatest(0, coalesce(discount_value, 0));

-- Persentase tidak boleh melebihi 100%.
update public.vouchers
set discount_value = least(100, discount_value),
    discount = least(100, discount_value)
where discount_type = 'percent';

update public.auto_promos
set discount_value = least(100, discount_value)
where discount_type = 'percent';

-- Cegah nilai tidak valid pada penyimpanan berikutnya.
alter table public.vouchers drop constraint if exists vouchers_discount_type_v64_check;
alter table public.vouchers add constraint vouchers_discount_type_v64_check
  check (discount_type in ('amount', 'percent'));

alter table public.vouchers drop constraint if exists vouchers_discount_value_v64_check;
alter table public.vouchers add constraint vouchers_discount_value_v64_check
  check (discount_value >= 0 and (discount_type <> 'percent' or discount_value <= 100));

alter table public.auto_promos drop constraint if exists auto_promos_discount_type_v64_check;
alter table public.auto_promos add constraint auto_promos_discount_type_v64_check
  check (discount_type in ('amount', 'percent'));

alter table public.auto_promos drop constraint if exists auto_promos_discount_value_v64_check;
alter table public.auto_promos add constraint auto_promos_discount_value_v64_check
  check (discount_value >= 0 and (discount_type <> 'percent' or discount_value <= 100));

commit;
