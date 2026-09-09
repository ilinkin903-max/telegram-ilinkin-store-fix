const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('v85 migration menyediakan redeem code atomik sekali pakai', () => {
  const sql = read('supabase/update-v85-redeem-codes.sql');
  for (const token of [
    'create table if not exists public.redeem_codes',
    'claim_redeem_code_v85',
    'complete_redeem_code_v85',
    'release_redeem_code_v85',
    "status in ('active','processing','redeemed','disabled')"
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /redeem_codes_code_upper_uidx/);
  assert.match(sql, /status = 'processing'.*raise exception 'REDEEM_BUSY'/s);
  assert.match(sql, /REDEEM-%/);
});

test('schema utama memuat fitur redeem dan guard referral', () => {
  const schema = read('supabase/schema.sql');
  assert.match(schema, /create table if not exists public\.redeem_codes/i);
  assert.match(schema, /create or replace function public\.claim_redeem_code_v85/i);
  assert.match(schema, /create or replace function public\.reward_referral_after_transaction_v65\(\)\s*\nreturns trigger/i);
  assert.match(schema, /order_ref, ''\)\) like 'REDEEM-%'/i);
  assert.doesNotMatch(schema, /service_role;\s*\nreturns trigger/i);
});

test('menu buyer menampilkan Redeem hijau di sebelah Saldo & Referral', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /styledButton\('‹💰› Saldo & Referral'.*?'success'\),\s*\n\s*styledButton\('‹🎁› Redeem'.*?'success'\)/s);
  assert.match(bot, /if \(cmd === 'redeem'\)/);
  assert.match(bot, /lower\.startsWith\('\/redeem'\)/);
  assert.match(bot, /force_reply: true/);
});

test('redeem diproses sebagai produk gratis melalui fulfillment yang sama dan dikunci atomik', () => {
  const bot = read('lib/botHandlers.js');
  const start = bot.indexOf('async function processRedeemCode');
  const end = bot.indexOf('async function beginTopup', start);
  const block = bot.slice(start, end);
  assert.match(block, /db\.claimRedeemCode\(code, from\.id\)/);
  assert.match(block, /invoice = `REDEEM-\$\{code\}`/);
  assert.match(block, /payment_method: 'redeem'/);
  assert.match(block, /amount: 0/);
  assert.match(block, /paymentService\.fulfillPaidOrder/);
  assert.match(block, /db\.completeRedeemCode\(code, from\.id, invoice\)/);
  assert.match(block, /db\.releaseRedeemCode\(code, from\.id\)/);
});

test('owner API mewajibkan varian pada produk bervarian dan dapat generate banyak kode', () => {
  const api = read('api/reseller-data.js');
  assert.match(api, /action === 'generate-redeem-codes'/);
  assert.match(api, /Produk ini memiliki varian\. Pilih varian untuk kode redeem/);
  assert.match(api, /Array\.from\(\{ length: count \}/);
  assert.match(api, /crypto\.randomBytes\(6\)/);
  assert.match(api, /action === 'toggle-redeem-code'/);
  assert.match(api, /action === 'delete-redeem-code'/);
});

test('dashboard owner menyediakan generator dan daftar kode redeem per varian', () => {
  const ui = read('api/reseller.js');
  for (const token of ['data-tab="redeem"', 'redeemGenerateForm', 'redeemTarget', 'redeemCodeList', 'generate-redeem-codes']) {
    assert.ok(ui.includes(token), `missing ${token}`);
  }
  assert.match(ui, /Array\.isArray\(p\.variants\)/);
  assert.match(ui, /Pilih Produk \/ Varian/);
  assert.match(ui, /r\.status!==['"]processing['"]/);
  assert.match(ui, /toISOString\(\)/);
});

test('kode processing tidak dapat diubah atau dihapus owner', () => {
  const db = read('lib/db.js');
  assert.match(db, /current\.status === 'processing'.*tidak dapat diubah/s);
  assert.match(db, /current\.status === 'processing'.*tidak dapat dihapus/s);
  assert.match(db, /neq\('status', 'processing'\)/);
});

test('redeem tidak memberi bonus referral first purchase', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /payment_method.*redeem.*notifyFirstPurchaseReferral/s);
  const sql = read('supabase/update-v85-redeem-codes.sql');
  assert.match(sql, /payment_method, ''\)\) = 'redeem'.*REDEEM-%/s);
});


test('metadata rilis v85.2.1 konsisten', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version, '85.2.1');
  assert.equal(lock.version, '85.2.1');
  assert.equal(lock.packages[''].version, '85.2.1');
  assert.equal(read('VERSION').trim(), 'v85.2.1');
  assert.equal(read('VERSION.txt').trim(), 'v85.2.1');
});
