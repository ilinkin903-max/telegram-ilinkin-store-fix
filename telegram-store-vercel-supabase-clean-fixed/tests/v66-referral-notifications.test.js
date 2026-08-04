const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase', 'update-v66-referral-notifications-fix.sql'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
const db = fs.readFileSync(path.join(root, 'lib', 'db.js'), 'utf8');
const bot = fs.readFileSync(path.join(root, 'lib', 'botHandlers.js'), 'utf8');
const payment = fs.readFileSync(path.join(root, 'lib', 'paymentService.js'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'lib', 'walletNotifications.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'lib', 'config.js'), 'utf8');


test('v66 memperbaiki referral untuk user lama yang belum pernah bertransaksi', () => {
  assert.match(sql, /create or replace function public\.register_bot_user_v66/i);
  assert.match(sql, /select \* into v_user from public\.bot_users where telegram_id = v_id for update/i);
  assert.match(sql, /User lama masih boleh memakai link referral/i);
  assert.match(sql, /coalesce\(v_user\.transaction_count, 0\) > 0/i);
  assert.match(sql, /exists \(select 1 from public\.transactions where telegram_id = v_id/i);
  assert.match(sql, /referral_state', 'rewarded'/i);
  assert.match(db, /rpc\('register_bot_user_v66'/i);
});

test('bonus signup menggunakan ledger sebagai gerbang idempotensi', () => {
  assert.match(sql, /insert into public\.wallet_ledger[\s\S]*on conflict \(entry_key\) do nothing[\s\S]*returning id into v_ledger_id/i);
  assert.match(sql, /if v_ledger_id is null then/i);
  assert.match(sql, /balance_referral = balance_referral \+ v_amount/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\('bot_user:'/i);
});

test('schema instalasi baru membundel fungsi v66', () => {
  assert.match(schema, /v66 bundled migration/i);
  assert.match(schema, /register_bot_user_v66/i);
});

test('notifikasi referral dikirim ke user dan channel', () => {
  assert.match(bot, /REFERRAL BERHASIL DIGUNAKAN/i);
  assert.match(bot, /walletNotifications\.notifyReferralReward/i);
  assert.match(payment, /walletNotifications\.notifyReferralReward/i);
  assert.match(notifications, /SALDO REFERRAL MASUK/i);
  assert.match(notifications, /Mode:/i);
});

test('notifikasi top up dikirim ke channel hanya setelah kredit baru', () => {
  assert.match(payment, /if \(!result\.already_completed\)/i);
  assert.match(payment, /walletNotifications\.notifyTopupSuccess/i);
  assert.match(notifications, /TOP UP SALDO BERHASIL/i);
  assert.match(notifications, /Saldo Masuk:/i);
  assert.match(notifications, /Total Bayar:/i);
});

test('channel saldo dapat memakai WALLET_CHANNEL dengan fallback CHANNEL_LOG', () => {
  assert.match(config, /walletChannel: required\('WALLET_CHANNEL', required\('CHANNEL_LOG', ''\)\)/i);
  assert.match(notifications, /config\.walletChannel \|\| config\.channelLog/i);
});
