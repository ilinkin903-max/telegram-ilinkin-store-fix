const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('bot QRIS tidak menampilkan tombol halaman pembayaran', () => {
  const source = read('lib/botHandlers.js');
  assert.ok(source.includes("styledButton('🔄 Cek Pembayaran'"));
  assert.ok(!source.includes("text: '🌐 Buka Halaman Pembayaran'"));
});

test('invoice bot tetap memakai referensi lokal', () => {
  const source = read('lib/botHandlers.js');
  assert.ok(source.includes('const invoiceRef = requestedInvoice;'));
});

test('pembayaran otomatis memakai polling 30 detik tanpa callback wajib', () => {
  const config = read('lib/config.js');
  const poll = read('lib/paymentPollService.js');
  assert.ok(config.includes("PAYMENT_POLL_INTERVAL_SECONDS', '30'"));
  assert.ok(poll.includes('/api/payment-poll'));
  assert.ok(poll.includes('verifyPaymentTransaction(order)'));
});

test('marketplace tidak menampilkan link checkout eksternal', () => {
  const html = read('public/index.html');
  const js = read('public/store.js');
  assert.ok(!html.includes('paymentCheckoutLink'));
  assert.ok(!js.includes('paymentCheckoutLink'));
});

test('label provider pada UI adalah QRIS', () => {
  const source = read('lib/paymentService.js');
  assert.ok(source.includes("return 'QRIS';"));
});
