-- Perbaikan prasyarat v65/v66
-- Jalankan HANYA pada project Supabase yang sama dengan SUPABASE_URL di Vercel.
-- File ini membuat tabel public.bot_users jika belum ada.
-- Setelah file ini berhasil, jalankan update-v65 lalu update-v66.

create extension if not exists pgcrypto;

create table if not exists public.bot_users (
  telegram_id bigint primary key,
  first_name text,
  username text,
  transaction_count integer not null default 0,
  spending bigint not null default 0,
  balance_main bigint not null default 0,
  balance_referral bigint not null default 0,
  referral_code text,
  referred_by bigint,
  referral_status text not null default 'none',
  referral_reward_amount bigint not null default 0,
  referral_rewarded_at timestamptz,
  first_purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pastikan kolom dasar tetap tersedia jika tabel pernah dibuat dengan struktur lama.
alter table public.bot_users add column if not exists first_name text;
alter table public.bot_users add column if not exists username text;
alter table public.bot_users add column if not exists transaction_count integer not null default 0;
alter table public.bot_users add column if not exists spending bigint not null default 0;
alter table public.bot_users add column if not exists balance_main bigint not null default 0;
alter table public.bot_users add column if not exists balance_referral bigint not null default 0;
alter table public.bot_users add column if not exists referral_code text;
alter table public.bot_users add column if not exists referred_by bigint;
alter table public.bot_users add column if not exists referral_status text not null default 'none';
alter table public.bot_users add column if not exists referral_reward_amount bigint not null default 0;
alter table public.bot_users add column if not exists referral_rewarded_at timestamptz;
alter table public.bot_users add column if not exists first_purchase_at timestamptz;
alter table public.bot_users add column if not exists created_at timestamptz not null default now();
alter table public.bot_users add column if not exists updated_at timestamptz not null default now();

-- Jika project lama memiliki tabel public.users, coba salin data user yang memiliki ID Telegram numerik.
-- Blok ini aman dilewati bila public.users tidak ada.
do $$
begin
  if to_regclass('public.users') is not null then
    execute $copy$
      insert into public.bot_users (
        telegram_id,
        first_name,
        username,
        transaction_count,
        spending,
        created_at,
        updated_at
      )
      select
        case
          when coalesce(j->>'telegram_id', j->>'id', '') ~ '^[0-9]+$'
            then coalesce(j->>'telegram_id', j->>'id')::bigint
          else null
        end as telegram_id,
        nullif(trim(coalesce(j->>'first_name', j->>'name', '')), '') as first_name,
        nullif(trim(coalesce(j->>'username', '')), '') as username,
        case
          when coalesce(j->>'transaction_count', j->>'transactions', '') ~ '^[0-9]+$'
            then coalesce(j->>'transaction_count', j->>'transactions')::integer
          else 0
        end as transaction_count,
        case
          when coalesce(j->>'spending', j->>'total_spending', '') ~ '^[0-9]+$'
            then coalesce(j->>'spending', j->>'total_spending')::bigint
          else 0
        end as spending,
        case
          when coalesce(j->>'created_at', '') <> ''
            then (j->>'created_at')::timestamptz
          else now()
        end as created_at,
        now() as updated_at
      from (
        select to_jsonb(u) as j
        from public.users u
      ) src
      where coalesce(j->>'telegram_id', j->>'id', '') ~ '^[0-9]+$'
      on conflict (telegram_id) do update set
        first_name = coalesce(excluded.first_name, public.bot_users.first_name),
        username = coalesce(excluded.username, public.bot_users.username),
        transaction_count = greatest(
          coalesce(public.bot_users.transaction_count, 0),
          coalesce(excluded.transaction_count, 0)
        ),
        spending = greatest(
          coalesce(public.bot_users.spending, 0),
          coalesce(excluded.spending, 0)
        ),
        updated_at = now()
    $copy$;
  end if;
end
$$;

-- Kode referral awal untuk user lama akan dilengkapi lagi oleh SQL v65.
update public.bot_users
set referral_code = upper(
  substr(
    encode(
      digest(telegram_id::text || ':' || gen_random_uuid()::text, 'sha256'),
      'hex'
    ),
    1,
    10
  )
)
where trim(coalesce(referral_code, '')) = '';

notify pgrst, 'reload schema';

select
  to_regclass('public.bot_users') as bot_users_table,
  count(*) as total_users
from public.bot_users;
