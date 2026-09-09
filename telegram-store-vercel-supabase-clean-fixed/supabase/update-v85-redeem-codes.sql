-- v85.0.0 - Redeem code produk/varian satu kali pakai.
-- Jalankan file ini di Supabase SQL Editor sebelum memakai fitur Redeem.

create table if not exists public.redeem_codes (
  code text primary key,
  product_code text not null,
  variant_key text not null default '',
  variant_name text not null default '',
  quantity integer not null default 1 check (quantity > 0 and quantity <= 100),
  status text not null default 'active' check (status in ('active','processing','redeemed','disabled')),
  active boolean not null default true,
  expires_at timestamptz,
  claimed_by bigint,
  claimed_at timestamptz,
  redeemed_by bigint,
  redeemed_at timestamptz,
  order_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists redeem_codes_code_upper_uidx on public.redeem_codes (upper(code));
create index if not exists redeem_codes_created_at_idx on public.redeem_codes (created_at desc);
create index if not exists redeem_codes_status_idx on public.redeem_codes (status, active);
create index if not exists redeem_codes_product_idx on public.redeem_codes (product_code, variant_key);
create unique index if not exists redeem_codes_order_ref_uidx on public.redeem_codes (order_ref) where order_ref is not null;

create or replace function public.claim_redeem_code_v85(
  p_code text,
  p_telegram_id bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_user bigint := coalesce(p_telegram_id, 0);
  v_row public.redeem_codes%rowtype;
  v_now timestamptz := now();
begin
  if v_code = '' then raise exception 'REDEEM_CODE_REQUIRED'; end if;
  if v_user <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;

  perform pg_advisory_xact_lock(hashtextextended('redeem:' || v_code, 0));
  select * into v_row from public.redeem_codes where upper(code) = v_code limit 1 for update;
  if not found then raise exception 'REDEEM_NOT_FOUND'; end if;

  if not coalesce(v_row.active, true) or v_row.status = 'disabled' then raise exception 'REDEEM_DISABLED'; end if;
  if v_row.expires_at is not null and v_row.expires_at <= v_now then raise exception 'REDEEM_EXPIRED'; end if;
  if v_row.status = 'redeemed' or v_row.redeemed_at is not null then raise exception 'REDEEM_USED'; end if;

  -- Klaim processing yang macet lebih dari 10 menit boleh diambil ulang.
  if v_row.status = 'processing' and v_row.claimed_at is not null and v_row.claimed_at > (v_now - interval '10 minutes') then
    raise exception 'REDEEM_BUSY';
  end if;

  update public.redeem_codes
     set status = 'processing',
         claimed_by = v_user,
         claimed_at = v_now,
         updated_at = v_now
   where code = v_row.code
   returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.complete_redeem_code_v85(
  p_code text,
  p_telegram_id bigint,
  p_order_ref text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_user bigint := coalesce(p_telegram_id, 0);
  v_ref text := trim(coalesce(p_order_ref, ''));
  v_row public.redeem_codes%rowtype;
begin
  if v_code = '' or v_user <= 0 or v_ref = '' then raise exception 'REDEEM_COMPLETE_INVALID'; end if;
  update public.redeem_codes
     set status = 'redeemed',
         active = false,
         redeemed_by = v_user,
         redeemed_at = now(),
         order_ref = v_ref,
         claimed_by = v_user,
         updated_at = now()
   where upper(code) = v_code
     and (status = 'processing' or status = 'redeemed')
     and (claimed_by = v_user or redeemed_by = v_user)
   returning * into v_row;
  if not found then raise exception 'REDEEM_COMPLETE_CONFLICT'; end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.release_redeem_code_v85(
  p_code text,
  p_telegram_id bigint
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_user bigint := coalesce(p_telegram_id, 0);
begin
  update public.redeem_codes
     set status = case when active then 'active' else 'disabled' end,
         claimed_by = null,
         claimed_at = null,
         updated_at = now()
   where upper(code) = v_code
     and status = 'processing'
     and claimed_by = v_user
     and redeemed_at is null;
  return found;
end;
$$;

revoke all on function public.claim_redeem_code_v85(text, bigint) from public, anon, authenticated;
revoke all on function public.complete_redeem_code_v85(text, bigint, text) from public, anon, authenticated;
revoke all on function public.release_redeem_code_v85(text, bigint) from public, anon, authenticated;
grant execute on function public.claim_redeem_code_v85(text, bigint) to service_role;
grant execute on function public.complete_redeem_code_v85(text, bigint, text) to service_role;
grant execute on function public.release_redeem_code_v85(text, bigint) to service_role;

-- Redeem adalah hadiah produk, bukan pembelian pertama untuk program referral.
-- order_ref REDEEM-* dipakai sebagai guard kompatibel karena fungsi stok lama v62
-- belum selalu menyimpan payment_method ke transaksi.
create or replace function public.reward_referral_after_transaction_v65()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitee public.bot_users%rowtype;
  v_referrer public.bot_users%rowtype;
  v_amount bigint;
begin
  if lower(coalesce(new.status, 'completed')) <> 'completed' then return new; end if;
  if lower(coalesce(new.payment_method, '')) = 'redeem' or upper(coalesce(new.order_ref, '')) like 'REDEEM-%' then return new; end if;

  select * into v_invitee from public.bot_users where telegram_id = new.telegram_id for update;
  if not found then return new; end if;

  if v_invitee.first_purchase_at is null then
    update public.bot_users set first_purchase_at = new.created_at, updated_at = now()
     where telegram_id = new.telegram_id;
  end if;

  if v_invitee.referral_status <> 'pending' or v_invitee.referred_by is null then return new; end if;
  v_amount := greatest(0, coalesce(v_invitee.referral_reward_amount, 0));
  if v_amount <= 0 then
    update public.bot_users set referral_status = 'ineligible', updated_at = now()
     where telegram_id = new.telegram_id;
    return new;
  end if;

  select * into v_referrer from public.bot_users where telegram_id = v_invitee.referred_by for update;
  if not found then
    update public.bot_users set referral_status = 'ineligible', updated_at = now()
     where telegram_id = new.telegram_id;
    return new;
  end if;

  update public.bot_users
     set balance_referral = balance_referral + v_amount,
         updated_at = now()
   where telegram_id = v_referrer.telegram_id
   returning * into v_referrer;

  insert into public.wallet_ledger(
    entry_key, telegram_id, wallet_type, direction, amount,
    balance_after, reason, reference, created_at
  ) values (
    'referral:first_purchase:' || new.telegram_id::text,
    v_referrer.telegram_id, 'referral', 'credit', v_amount,
    v_referrer.balance_referral, 'Bonus referral setelah pembelian pertama',
    new.telegram_id::text, now()
  ) on conflict (entry_key) do nothing;

  update public.bot_users
     set referral_status = 'rewarded',
         referral_rewarded_at = now(),
         updated_at = now()
   where telegram_id = new.telegram_id;

  return new;
end;
$$;

notify pgrst, 'reload schema';
