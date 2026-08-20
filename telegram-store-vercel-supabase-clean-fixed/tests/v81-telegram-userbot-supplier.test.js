const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const telegramSupplier = require('../lib/telegramSupplierService');

function read(name) { return fs.readFileSync(path.join(__dirname, '..', name), 'utf8'); }

test('availability uses balance and supplier stock minimum', () => {
  const a = telegramSupplier.availabilityFromRows({ enabled: true, balance: 50000, status: 'online', currency: 'IDR' }, { active: true, cost_amount: 10000, stock: 3, stock_mode: 'balance', currency: 'IDR' });
  assert.equal(a.availableStock, 3);
  const b = telegramSupplier.availabilityFromRows({ enabled: true, balance: 25000, status: 'online' }, { active: true, cost_amount: 10000, stock: 10, stock_mode: 'balance' });
  assert.equal(b.availableStock, 2);
});

test('migration has connectors products queue and atomic claim', () => {
  const sql = read('supabase/update-v81-telegram-userbot-suppliers.sql');
  assert.match(sql, /telegram_supplier_connectors/);
  assert.match(sql, /telegram_supplier_products/);
  assert.match(sql, /claim_telegram_supplier_order/);
  assert.match(sql, /for update of c, so skip locked/i);
  assert.match(sql, /try_begin_telegram_supplier_balance_sync/);
});

test('worker is separate from Vercel and supports configurable flow', () => {
  const worker = read('worker/userbot-worker.js');
  assert.match(worker, /StringSession/);
  assert.match(worker, /type === 'click'/);
  assert.match(worker, /capture_delivery/);
  assert.match(worker, /claim_telegram_supplier_order/);
  assert.match(worker, /WORKER_CONCURRENCY/);
  assert.match(worker, /commitReached/);
  assert.match(worker, /manual_review/);
  assert.match(worker, /delivered_text/);
  assert.match(worker, /try_begin_telegram_supplier_balance_sync/);
});

test('Vercel bridge requires secret and completes Telegram supplier order', () => {
  const bridge = read('api/userbot-bridge.js');
  assert.match(bridge, /USERBOT_BRIDGE_SECRET|userbotBridgeSecret/);
  assert.match(bridge, /completeTelegramSupplierOrder/);
  assert.match(bridge, /timingSafeEqual/);
  assert.match(read('lib/paymentService.js'), /effectiveDelivery/);
  assert.match(read('lib/paymentService.js'), /sendSupplierDeliveryOnce/);
});

test('store bot and payment recognize telegram_userbot supplier source', () => {
  for (const file of ['lib/storeService.js','lib/botHandlers.js','lib/paymentService.js']) {
    assert.match(read(file), /telegram_userbot/, file);
  }
});

test('dashboard supports connector product and mapping actions', () => {
  const ui = read('api/reseller.js');
  const api = read('api/reseller-data.js');
  assert.match(ui, /Telegram Userbot Supplier/);
  assert.match(ui, /telegram-supplier-product-save/);
  assert.match(ui, /telegram-supplier-import/);
  assert.match(api, /telegram-supplier-save/);
  assert.match(api, /importTelegramSupplierProduct/);
});
