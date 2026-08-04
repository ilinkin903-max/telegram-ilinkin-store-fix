-- v66: memperbaiki referral untuk user yang sudah pernah terdaftar tetapi belum memiliki referrer,
-- serta menambahkan fungsi registrasi referral yang lebih aman dan idempoten.
-- Jalankan setelah update-v65-referral-wallet-topup.sql.

create or replace function public.register_bot_user_v66(
  p_user jsonb,
  p_referral_code text default '',
  p_referral_enabled boolean default true,
  p_reward_amount integer default 0,
  p_reward_mode text default 'signup'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint := coalesce(nullif(p_user->>'telegram_id', '')::bigint, nullif(p_user->>'id', '')::bigint, 0);
  v_first_name text := nullif(trim(coalesce(p_user->>'first_name', '')), '');
  v_username text := nullif(trim(coalesce(p_user->>'username', '')), '');
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_mode text := lower(trim(coalesce(p_reward_mode, 'signup')));
  v_amount bigint := greatest(0, coalesce(p_reward_amount, 0));
  v_referrer public.bot_users%rowtype;
  v_user public.bot_users%rowtype;
  v_generated text;
  v_reward jsonb := null;
  v_try integer := 0;
  v_created boolean := false;
  v_ledger_id uuid;
begin
  if v_id <= 0 then raise exception 'TELEGRAM_ID_INVALID'; end if;
  if v_mode not in ('signup', 'first_purchase') then v_mode := 'signup'; end if;

  -- Menjamin dua update /start untuk user yang sama tidak diproses bersamaan.
  perform pg_advisory_xact_lock(hashtextextended('bot_user:' || v_id::text, 0));

  select * into v_user from public.bot_users where telegram_id = v_id for update;

  if found then
    update public.bot_users set
      first_name = coalesce(v_first_name, first_name),
      username = coalesce(v_username, username),
      updated_at = now()
    where telegram_id = v_id
    returning * into v_user;
  else
    loop
      v_try := v_try + 1;
      v_generated := upper(substr(encode(digest(v_id::text || ':' || gen_random_uuid()::text, 'sha256'), 'hex'), 1, 10));
      exit when not exists (select 1 from public.bot_users where upper(referral_code) = v_generated);
      if v_try > 10 then raise exception 'REFERRAL_CODE_GENERATION_FAILED'; end if;
    end loop;

    insert into public.bot_users(
      telegram_id, first_name, username, referral_code,
      referred_by, referral_status, referral_reward_amount,
      referral_rewarded_at, transaction_count, spending,
      balance_main, balance_referral, created_at, updated_at
    ) values (
      v_id, v_first_name, v_username, v_generated,
      null, 'none', 0, null, 0, 0, 0, 0, now(), now()
    ) returning * into v_user;
    v_created := true;
  end if;

  -- Tidak ada referral pada command /start biasa.
  if not p_referral_enabled then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'disabled', 'referral_reward', null);
  end if;
  if v_code = '' then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'no_code', 'referral_reward', null);
  end if;
  if v_amount <= 0 then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'zero_reward', 'referral_reward', null);
  end if;

  -- Referral yang sudah terhubung tidak boleh diganti atau dibayar dua kali.
  if v_user.referred_by is not null or v_user.referral_status in ('pending', 'rewarded') then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'already_referred', 'referral_reward', null);
  end if;

  -- User lama masih boleh memakai link referral selama belum pernah bertransaksi.
  -- Ini memperbaiki kasus user yang sudah tersimpan sebelum fitur v65 dipasang.
  if v_user.first_purchase_at is not null
     or coalesce(v_user.transaction_count, 0) > 0
     or coalesce(v_user.spending, 0) > 0
     or exists (select 1 from public.transactions where telegram_id = v_id limit 1) then
    update public.bot_users
       set referral_status = 'ineligible', updated_at = now()
     where telegram_id = v_id
     returning * into v_user;
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'already_purchased', 'referral_reward', null);
  end if;

  select * into v_referrer
    from public.bot_users
   where upper(referral_code) = v_code
   limit 1
   for update;

  if not found then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'invalid_code', 'referral_reward', null);
  end if;

  if v_referrer.telegram_id = v_id then
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'self_referral', 'referral_reward', null);
  end if;

  if v_mode = 'first_purchase' then
    update public.bot_users
       set referred_by = v_referrer.telegram_id,
           referral_status = 'pending',
           referral_reward_amount = v_amount,
           referral_rewarded_at = null,
           updated_at = now()
     where telegram_id = v_id
     returning * into v_user;

    return jsonb_build_object(
      'created', v_created,
      'user', to_jsonb(v_user),
      'referral_state', 'pending',
      'referral_reward', null
    );
  end if;

  -- Ledger menjadi gerbang idempotensi sebelum saldo ditambah.
  insert into public.wallet_ledger(
    entry_key, telegram_id, wallet_type, direction, amount,
    balance_after, reason, reference, created_at
  ) values (
    'referral:signup:' || v_id::text,
    v_referrer.telegram_id,
    'referral', 'credit', v_amount,
    0,
    'Bonus referral pengguna baru',
    v_id::text,
    now()
  ) on conflict (entry_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    select * into v_user from public.bot_users where telegram_id = v_id;
    return jsonb_build_object('created', v_created, 'user', to_jsonb(v_user), 'referral_state', 'already_rewarded', 'referral_reward', null);
  end if;

  update public.bot_users
     set balance_referral = balance_referral + v_amount,
         updated_at = now()
   where telegram_id = v_referrer.telegram_id
   returning * into v_referrer;

  update public.wallet_ledger
     set balance_after = v_referrer.balance_referral
   where id = v_ledger_id;

  update public.bot_users
     set referred_by = v_referrer.telegram_id,
         referral_status = 'rewarded',
         referral_reward_amount = v_amount,
         referral_rewarded_at = now(),
         updated_at = now()
   where telegram_id = v_id
   returning * into v_user;

  v_reward := jsonb_build_object(
    'telegram_id', v_referrer.telegram_id,
    'referrer_name', v_referrer.first_name,
    'referrer_username', v_referrer.username,
    'amount', v_amount,
    'invitee_id', v_id,
    'invitee_name', v_user.first_name,
    'invitee_username', v_user.username,
    'mode', 'signup'
  );

  return jsonb_build_object(
    'created', v_created,
    'user', to_jsonb(v_user),
    'referral_state', 'rewarded',
    'referral_reward', v_reward
  );
end;
$$;

revoke all on function public.register_bot_user_v66(jsonb, text, boolean, integer, text) from public, anon, authenticated;
grant execute on function public.register_bot_user_v66(jsonb, text, boolean, integer, text) to service_role;
