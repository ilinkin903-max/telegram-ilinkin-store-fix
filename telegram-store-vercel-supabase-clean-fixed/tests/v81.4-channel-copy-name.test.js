const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('transaction notification lock has direct job_locks fallback', () => {
  const db = read('lib/db.js');
  assert.match(db, /claim_job_lock_v62/);
  assert.match(db, /from\('job_locks'\)\.insert/);
  assert.match(db, /23505/);
});

test('completed order notification is independent from buyer receipt and can be recovered', () => {
  const payment = read('lib/paymentService.js');
  const completedBranch = payment.slice(payment.indexOf('// Catat transaksi ke channel lebih dulu'), payment.indexOf('await db.deletePendingOrder'));
  assert.ok(completedBranch.indexOf('await sendOwnerLog') < completedBranch.indexOf('await sendOrderReceipt'));
  assert.match(payment, /recoverTransactionNotifications/);
  assert.match(payment, /sendChannelWithRetry/);
  const cron = read('api/payment-cron.js');
  const adminApi = read('api/reseller-data.js');
  const ui = read('api/reseller.js');
  assert.match(cron, /recoverTransactionNotifications\(30\)/);
  assert.match(adminApi, /retry-transaction-notifications/);
  assert.match(ui, /Pulihkan Notif 30 Order/);
});

test('delivered product uses code block without copy buttons', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /PRODUK YANG DIDAPAT/);
  assert.match(payment, /<pre>/);
  assert.doesNotMatch(payment, /copyProductKeyboard/);
  assert.doesNotMatch(payment, /copy_text:\s*\{/);
  assert.doesNotMatch(payment, /Salin Produk/);
});

test('store name is used by bot and synced to Telegram display name', () => {
  const handlers = read('lib/botHandlers.js');
  const telegram = read('lib/telegram.js');
  const adminApi = read('api/reseller-data.js');
  const ui = read('api/reseller.js');
  assert.match(handlers, /settings\.store_name \|\| config\.botName/);
  assert.match(telegram, /setMyName/);
  assert.match(adminApi, /tg\.setMyName/);
  assert.match(ui, /Nama Toko \/ Bot/);
});
