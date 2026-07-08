-- Jalankan file ini di Supabase SQL Editor untuk update project lama.
-- Aman dijalankan berkali-kali.

alter table public.products add column if not exists image_url text not null default '';
alter table public.products add column if not exists category text not null default '';
alter table public.products add column if not exists bulk_prices jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists active boolean not null default true;
alter table public.vouchers add column if not exists description text not null default '';
alter table public.vouchers add column if not exists active boolean not null default true;
alter table public.vouchers add column if not exists expires_at timestamptz;
alter table public.vouchers add column if not exists discount_type text not null default 'amount';
alter table public.vouchers add column if not exists discount_value integer not null default 0;
alter table public.vouchers add column if not exists min_qty integer not null default 1;
alter table public.vouchers add column if not exists min_spend integer not null default 0;
alter table public.vouchers add column if not exists start_at timestamptz;
update public.vouchers set discount_value = discount where coalesce(discount_value, 0) = 0 and coalesce(discount, 0) > 0;


create table if not exists public.shop_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  updated_at timestamptz not null default now()
);

-- Update varian produk dan harga grosir untuk bot Telegram.
alter table public.pending_orders add column if not exists variant_key text not null default '';
alter table public.pending_orders add column if not exists variant_name text not null default '';
alter table public.pending_orders add column if not exists unit_price integer not null default 0;
alter table public.transactions add column if not exists variant_key text not null default '';
alter table public.transactions add column if not exists variant_name text not null default '';
alter table public.transactions add column if not exists unit_price integer not null default 0;

alter table public.transactions add column if not exists delivered_items jsonb not null default '[]'::jsonb;
alter table public.transactions add column if not exists delivered_text text not null default '';


-- Broadcast polling analytics/admin results.
create table if not exists public.broadcast_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  is_anonymous boolean not null default true,
  poll_type text not null default 'regular',
  allows_multiple_answers boolean not null default false,
  status text not null default 'draft',
  created_by bigint,
  source_chat_id bigint,
  source_message_id integer,
  source_poll_id text,
  broadcast_mode text not null default 'sendpoll',
  total_sent integer not null default 0,
  total_failed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broadcast_poll_messages (
  id bigserial primary key,
  broadcast_id uuid not null references public.broadcast_polls(id) on delete cascade,
  poll_id text not null unique,
  telegram_id bigint not null,
  message_id integer,
  options_state jsonb not null default '[]'::jsonb,
  total_voter_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.broadcast_poll_answers (
  id bigserial primary key,
  broadcast_id uuid not null references public.broadcast_polls(id) on delete cascade,
  poll_id text not null,
  telegram_id bigint not null,
  username text,
  first_name text,
  option_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (broadcast_id, telegram_id)
);

create index if not exists broadcast_poll_messages_broadcast_idx on public.broadcast_poll_messages (broadcast_id);
create index if not exists broadcast_poll_answers_broadcast_idx on public.broadcast_poll_answers (broadcast_id);

-- Source polling asli untuk mode global/forward.
alter table public.broadcast_polls add column if not exists source_chat_id bigint;
alter table public.broadcast_polls add column if not exists source_message_id integer;
alter table public.broadcast_polls add column if not exists source_poll_id text;
alter table public.broadcast_polls add column if not exists broadcast_mode text not null default 'sendpoll';

create index if not exists broadcast_poll_answers_poll_idx on public.broadcast_poll_answers (poll_id);

-- Auto Backup, Import Log, dan Promo Otomatis.
create table if not exists public.backup_logs (
  id bigserial primary key,
  type text not null default 'manual',
  status text not null default 'success',
  filename text not null default '',
  size_bytes integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.auto_promos (
  code text primary key,
  name text not null,
  description text not null default '',
  products jsonb not null default '[]'::jsonb,
  discount_type text not null default 'amount',
  discount_value integer not null default 0,
  min_qty integer not null default 1,
  min_spend integer not null default 0,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auto_promos_active_idx on public.auto_promos (active);
create index if not exists backup_logs_created_idx on public.backup_logs (created_at desc);
