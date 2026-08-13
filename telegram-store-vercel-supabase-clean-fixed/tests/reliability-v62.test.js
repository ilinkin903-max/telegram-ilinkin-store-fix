const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const db = read('lib/db.js');
const auth = read('lib/miniappAuth.js');
const store = read('lib/storeService.js');
const storeApi = read('api/store-data.js');
const backupCron = read('api/backup-cron.js');
const paymentCron = read('api/payment-cron.js');
const sql = read('supabase/update-v62-security-reliability.sql');


test('v62 memakai RPC atomik untuk fulfillment dan lock baris produk', () => {
  assert.match(db, /fulfill_paid_order_v62/);
  assert.doesNotMatch(db, /currentStock\.slice\(0, quantity\)/);
  assert.match(sql, /create or replace function public\.fulfill_paid_order_v62/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /on conflict \(order_ref\) do nothing/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
});

test('lock pekerjaan dipisahkan dari shop_settings dan pembayaran fail-closed', () => {
  assert.match(sql, /create table if not exists public\.job_locks/i);
  assert.match(db, /claim_job_lock_v62/);
  assert.match(read('lib/paymentService.js'), /failClosed:\s*true/);
  assert.match(db, /from\('job_locks'\)/);
});

test('mode developer tidak dapat aktif di production dan hash aman dari beda panjang', () => {
  assert.match(auth, /VERCEL_ENV !== 'production'/);
  assert.match(auth, /NODE_ENV !== 'production'/);
  assert.match(auth, /calculated\.length === supplied\.length/);
});

test('statistik memakai agregasi database dan tidak dibatasi 1000 transaksi', () => {
  assert.match(db, /rpc\('stats_summary_v62'/);
  assert.match(sql, /create or replace function public\.stats_summary_v62/i);
  assert.match(db, /\.range\(from, from \+ pageSize - 1\)/);
});

test('invoice gateway dipertahankan case-sensitive', () => {
  assert.doesNotMatch(store, /String\(invoice \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(store, /const ref = String\(invoice \|\| ''\)\.trim\(\)/);
});

test('unduh QRIS memakai token singkat, bukan initData di query atau CORS wildcard', () => {
  assert.match(storeApi, /getQrDownloadByToken/);
  assert.match(storeApi, /qr-download-token/);
  assert.doesNotMatch(storeApi, /Access-Control-Allow-Origin/);
  assert.doesNotMatch(read('public/store.js'), /qr-download&invoice=.*initData/);
  assert.match(store, /issueQrDownloadToken/);
});

test('cron pembayaran dan backup wajib memakai CRON_SECRET', () => {
  assert.match(paymentCron, /config\.cronSecret/);
  assert.match(paymentCron, /Authorization|authorization/);
  assert.match(backupCron, /config\.cronSecret/);
  assert.doesNotMatch(backupCron, /if \(secret && config\.webhookSecret/);
});

test('paket tidak lagi membawa stok dan data user produksi', () => {
  for (const file of ['Database/Produk.json', 'Database/Trx.json', 'Database/User.json', 'Database/Voucher.json']) {
    assert.deepEqual(JSON.parse(read(file)), []);
  }
  assert.match(read('.gitignore'), /Database\/\*\.json/);
});

test('versi API memakai satu sumber VERSION', () => {
  assert.match(read('api/index.js'), /getAppVersion/);
  assert.match(read('api/telegram.js'), /getAppVersion/);
  assert.match(read('api/payment-webhook.js'), /getAppVersion/);
  assert.equal(read('VERSION.txt').trim(), 'v70-premium-3d-reseller-ui');
});
