const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(name) { return fs.readFileSync(path.join(__dirname, '..', name), 'utf8'); }

test('v82 migration adds connector lock, stock flow and once-only balance deduction', () => {
  const sql = read('supabase/update-v82-vercel-ondemand-telegram-supplier.sql');
  assert.match(sql, /interaction_lock_token/);
  assert.match(sql, /stock_flow/);
  assert.match(sql, /claim_telegram_supplier_order_by_ref/);
  assert.match(sql, /deduct_telegram_supplier_balance_once/);
  assert.match(sql, /balance_deducted/);
});

test('Vercel on-demand engine uses Telegram StringSession and commit protection', () => {
  const src = read('lib/telegramOnDemandService.js');
  assert.match(src, /TG_STRING_SESSION|tgStringSession/);
  assert.match(src, /StringSession/);
  assert.match(src, /commitReached/);
  assert.match(src, /manual_review/);
  assert.match(src, /tryLockTelegramSupplierConnector/);
  assert.match(src, /disconnect/);
});

test('payment fulfillment starts Telegram supplier on Vercel and stores result before delivery', () => {
  const src = read('lib/paymentService.js');
  assert.match(src, /telegramOnDemand\(\)\.executeOrder/);
  assert.match(src, /getVercelWaitUntil/);
  assert.match(src, /completeTelegramSupplierOrder/);
  assert.match(src, /deductTelegramSupplierBalanceOnce/);
});

test('marketplace has on-demand stock refresh for telegram supplier', () => {
  const api = read('api/store-data.js');
  const service = read('lib/storeService.js');
  const ui = read('public/store.js');
  assert.match(api, /supplier-stock/);
  assert.match(service, /getLiveSupplierStock/);
  assert.match(service, /telegram_userbot/);
  assert.match(ui, /refreshSelectedSupplierStock/);
  assert.match(ui, /telegram_userbot/);
});

test('dashboard can save manual balance and stock flow', () => {
  const ui = read('api/reseller.js');
  const db = read('lib/db.js');
  assert.match(ui, /Saldo Supplier Manual/);
  assert.match(ui, /Flow Cek Stok/);
  assert.match(ui, /Stock Regex/);
  assert.match(ui, /Cek Stok Sekarang/);
  assert.match(db, /stock_flow/);
  assert.match(db, /balance:/);
});
