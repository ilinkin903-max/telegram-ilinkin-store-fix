const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase', 'update-v65-referral-wallet-topup.sql'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
const db = fs.readFileSync(path.join(root, 'lib', 'db.js'), 'utf8');
const bot = fs.readFileSync(path.join(root, 'lib', 'botHandlers.js'), 'utf8');
const payment = fs.readFileSync(path.join(root, 'lib', 'paymentService.js'), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'api', 'payment-webhook.js'), 'utf8');
const cron = fs.readFileSync(path.join(root, 'api', 'payment-cron.js'), 'utf8');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const resellerData = fs.readFileSync(path.join(root, 'api', 'reseller-data.js'), 'utf8');

test('v65 menambahkan dua saldo, referral, ledger, dan pending top up', () => {
  assert.match(sql, /balance_main bigint not null default 0/i);
  assert.match(sql, /balance_referral bigint not null default 0/i);
  assert.match(sql, /referral_code text/i);
  assert.match(sql, /create table if not exists public\.wallet_ledger/i);
  assert.match(sql, /create table if not exists public\.pending_topups/i);
  assert.match(sql, /referral_reward_mode/i);
  assert.match(sql, /topup_min_amount/i);
  assert.match(sql, /wallet_payment_enabled/i);
});

test('registrasi referral hanya memberi satu hadiah dan mendukung mode langsung atau pembelian pertama', () => {
  assert.match(sql, /if found then[\s\S]*return jsonb_build_object\('created', false/i);
  assert.match(sql, /v_mode not in \('signup', 'first_purchase'\)/i);
  assert.match(sql, /v_referrer\.telegram_id <> v_id/i);
  assert.match(sql, /'referral:signup:' \|\| v_id::text/i);
  assert.match(sql, /on conflict \(entry_key\) do nothing/i);
  assert.match(bot, /startReferralCode\(text\)/);
  assert.match(bot, /registerUserWithReferral/);
  assert.match(bot, /\?start=ref_/);
});

test('bonus referral pembelian pertama diproses oleh trigger database', () => {
  assert.match(sql, /create or replace function public\.reward_referral_after_transaction_v65/i);
  assert.match(sql, /after insert on public\.transactions/i);
  assert.match(sql, /referral_status <> 'pending'/i);
  assert.match(sql, /'referral:first_purchase:' \|\| new\.telegram_id::text/i);
  assert.match(payment, /BONUS REFERRAL MASUK/);
  assert.match(payment, /referral_notice:first_purchase/);
});

test('checkout saldo atomik memakai saldo utama dahulu lalu saldo referral', () => {
  assert.match(sql, /create or replace function public\.fulfill_wallet_order_v65/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /from public\.products[\s\S]*for update/i);
  assert.match(sql, /from public\.bot_users[\s\S]*for update/i);
  assert.match(sql, /v_main_used := least\(coalesce\(v_user\.balance_main, 0\), p_total_price\)/i);
  assert.match(sql, /v_ref_used := greatest\(0, v_remaining\)/i);
  assert.match(db, /fulfill_wallet_order_v65/);
  assert.match(bot, /Bayar dengan Saldo/);
});

test('top up divalidasi dan dikreditkan tepat satu kali', () => {
  assert.match(sql, /perform pg_advisory_xact_lock\(hashtextextended\('topup:' \|\| v_ref/i);
  assert.match(sql, /if v_topup\.status = 'completed'/i);
  assert.match(sql, /TOPUP_AMOUNT_MISMATCH/i);
  assert.match(sql, /'topup:' \|\| v_ref/i);
  assert.match(webhook, /completeTopupPayment/);
  assert.match(webhook, /getPendingTopupByProviderTransactionId/);
  assert.match(cron, /listPendingTopupsAwaitingPayment/);
  assert.match(cron, /payment-cron-topup/);
});

test('bot menyediakan halaman saldo, top up, referral, dan pilihan pembayaran', () => {
  assert.match(bot, /Saldo & Referral/);
  assert.match(bot, /\/saldo/);
  assert.match(bot, /\/topup/);
  assert.match(bot, /\/referral/);
  assert.match(bot, /Bagikan Link Referral/);
  assert.match(bot, /Saldo Utama dipakai lebih dahulu, kemudian Saldo Referral/);
  assert.match(bot, /callback_data: 'bayarsaldo'/);
  assert.match(bot, /callback_data: 'bayarqris'/);
});

test('dashboard memiliki pengaturan referral dan editor saldo setiap user', () => {
  assert.match(reseller, /data-tab="walletSettings"/);
  assert.match(reseller, /id="walletSettingsForm"/);
  assert.match(reseller, /name="referral_reward_mode"/);
  assert.match(reseller, /Langsung saat pengguna baru membuka \/start/);
  assert.match(reseller, /Setelah pengguna baru menyelesaikan pembelian pertama/);
  assert.match(reseller, /name="topup_min_amount"/);
  assert.match(reseller, /data-balance-user/);
  assert.match(reseller, /function openUserBalance/);
  assert.match(reseller, /Saldo Utama/);
  assert.match(reseller, /Saldo Referral/);
});

test('API owner dapat mengubah kedua saldo dengan catatan ledger', () => {
  assert.match(resellerData, /action === 'set-user-balances'/);
  assert.match(resellerData, /db\.setUserBalances/);
  assert.match(resellerData, /actorId: Number\(owner\?\.id/);
  assert.match(db, /set_user_balances_v65/);
  assert.match(sql, /'admin:' \|\| v_ref \|\| ':main'/i);
  assert.match(sql, /'admin:' \|\| v_ref \|\| ':referral'/i);
});

test('schema instalasi baru sudah membundel migrasi v65', () => {
  assert.match(schema, /v65 bundled migration/i);
  assert.match(schema, /create table if not exists public\.wallet_ledger/i);
  assert.match(schema, /create or replace function public\.fulfill_wallet_order_v65/i);
});
