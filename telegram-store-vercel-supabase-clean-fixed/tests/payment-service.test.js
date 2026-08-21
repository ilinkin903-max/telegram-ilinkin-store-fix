const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PAKASIR_SLUG = process.env.PAKASIR_SLUG || 'ilinkin-store';

const {
  normalizePaymentStatus,
  normalizePakasirTransaction,
  normalizeAutoGopayTransaction,
  validateWebhookPayload,
  validateAutoGopayWebhookPayload,
  paymentMatchesOrder,
  displayPaymentReference,
  sendOrderReceipt,
  sendOwnerLog
} = require('../lib/paymentService');
const tg = require('../lib/telegram');
const { config } = require('../lib/config');
const db = require('../lib/db');


test('normalisasi response AutoGoPay generate dan status settlement', () => {
  const trx = normalizeAutoGopayTransaction({
    success: true,
    data: {
      transaction_id: '53bc6ed2-441d-4bd0-bc39-11fdfff5fedb',
      order_id: 'AUTOGOPAY-1774618440-2411',
      amount: 10000,
      transaction_status: 'settlement',
      qr_string: '000201010212...',
      checkout_url: 'https://autogopay.site/pay/token'
    }
  });
  assert.equal(trx.transaction_id, '53bc6ed2-441d-4bd0-bc39-11fdfff5fedb');
  assert.equal(trx.order_id, 'AUTOGOPAY-1774618440-2411');
  assert.equal(trx.amount, 10000);
  assert.equal(trx.status, 'completed');
  assert.equal(trx.qr_string, '000201010212...');
});

test('webhook AutoGoPay memerlukan transaction id dan nominal valid', () => {
  const valid = validateAutoGopayWebhookPayload({
    event: 'transaction.received',
    transaction: { id: 'TRX-001', amount: 50000, status: 'settlement' }
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.transaction.status, 'completed');

  const invalid = validateAutoGopayWebhookPayload({
    event: 'transaction.received',
    transaction: { amount: 50000, status: 'settlement' }
  });
  assert.equal(invalid.ok, false);
});

test('prefix AUTOGOPAY disembunyikan hanya pada tampilan invoice', () => {
  assert.equal(displayPaymentReference('AUTOGOPAY-1774618440-2411'), '1774618440-2411');
  assert.equal(displayPaymentReference('AUTOGOPAY:ABC123'), 'ABC123');
  assert.equal(displayPaymentReference('INV-001'), 'INV-001');
});

test('status payment gateway dinormalisasi', () => {
  assert.equal(normalizePaymentStatus('settlement'), 'completed');
  assert.equal(normalizePaymentStatus('expire'), 'expired');
  assert.equal(normalizePaymentStatus('cancel'), 'cancelled');
});

test('normalize payload webhook Pakasir completed', () => {
  const trx = normalizePakasirTransaction({
    amount: 16500,
    order_id: 'INV-001',
    project: 'ilinkin-store',
    status: 'completed',
    payment_method: 'qris'
  });
  assert.deepEqual(trx, {
    amount: 16500,
    order_id: 'INV-001',
    project: 'ilinkin-store',
    status: 'completed',
    payment_method: 'qris',
    completed_at: null
  });
});

test('webhook hanya diterima untuk project dan nominal valid', () => {
  const valid = validateWebhookPayload({
    amount: 16500,
    order_id: 'INV-002',
    project: 'ilinkin-store',
    status: 'completed'
  }, 'ilinkin-store');
  assert.equal(valid.ok, true);

  const invalidProject = validateWebhookPayload({
    amount: 16500,
    order_id: 'INV-002',
    project: 'proyek-lain',
    status: 'completed'
  }, 'ilinkin-store');
  assert.equal(invalidProject.ok, false);

  const invalidAmount = validateWebhookPayload({
    amount: 0,
    order_id: 'INV-002',
    project: 'ilinkin-store',
    status: 'completed'
  }, 'ilinkin-store');
  assert.equal(invalidAmount.ok, false);
});

test('detail transaksi harus cocok dengan invoice lokal', () => {
  const order = { invoice_ref: 'INV-003', amount: 45123 };
  assert.equal(paymentMatchesOrder({
    order_id: 'INV-003',
    amount: 45123,
    project: 'ilinkin-store',
    status: 'completed'
  }, order), true);

  assert.equal(paymentMatchesOrder({
    order_id: 'INV-003',
    amount: 45124,
    project: 'ilinkin-store',
    status: 'completed'
  }, order), false);
});

test('payload webhook bersarang dan alias field tetap dapat dibaca', () => {
  const trx = normalizePakasirTransaction({
    data: {
      orderId: 'INV-NESTED',
      slug: 'ILINKIN-STORE',
      total: '35026',
      payment_status: 'COMPLETED',
      method: 'qris'
    }
  });
  assert.equal(trx.order_id, 'INV-NESTED');
  assert.equal(trx.project, 'ILINKIN-STORE');
  assert.equal(trx.amount, 35026);
  assert.equal(trx.status, 'completed');
  assert.equal(trx.payment_method, 'qris');
});

test('pencocokan project Pakasir tidak sensitif huruf besar kecil', () => {
  const valid = validateWebhookPayload({
    amount: 524,
    order_id: 'INV-CASE',
    project: 'ILINKIN-STORE',
    status: 'completed'
  }, 'ilinkin-store');
  assert.equal(valid.ok, true);
});


test('invoice produk memakai format pembayaran berhasil tanpa tombol salin', async () => {
  const originalSendMessage = tg.sendMessage;
  const captured = [];
  tg.sendMessage = async (chatId, text, options) => {
    captured.push({ chatId, text, options });
    return { ok: true };
  };

  try {
    await sendOrderReceipt(
      123,
      { invoice_ref: '1786544825-181', quantity: 1, amount: 3026, fee: 26, unit_price: 3000, payment_provider: 'autogopay' },
      { nama: 'Canva', snk: '1 Bulan Pro\nLogin via Link, 1 Email 1 Link' },
      { order_ref: '1786544825-181', product_name: 'Canva', variant_name: '1 Bulan Pro', quantity: 1, unit_price: 3000, total_price: 3026, payment_fee: 26, payment_method: 'gateway', created_at: '2026-08-12T14:29:00.000Z' },
      ['https://www.canva.com/brand/join?token=TEST']
    );
    assert.equal(captured.length, 1);
    assert.equal(captured[0].chatId, 123);
    assert.match(captured[0].text, /✅ <b>PEMBAYARAN BERHASIL<\/b>/);
    assert.match(captured[0].text, /Invoice: <b>1786544825-181<\/b>/);
    assert.match(captured[0].text, /Produk: <b>Canva - 1 Bulan Pro<\/b>/);
    assert.match(captured[0].text, /Harga: <b>Rp\s*3\.000<\/b>/);
    assert.match(captured[0].text, /Metode: <b>AutoGoPay<\/b>/);
    assert.match(captured[0].text, /Fee: <b>Rp\s*26<\/b>/);
    assert.match(captured[0].text, /• 1 Bulan Pro/);
    assert.match(captured[0].text, /<b>PRODUK YANG DIDAPAT<\/b>/);
    assert.match(captured[0].text, /<pre>https:\/\/www\.canva\.com\/brand\/join\?token=TEST<\/pre>/);
    assert.equal(captured[0].options.parse_mode, 'HTML');
    assert.equal(captured[0].options.reply_markup, undefined);
    assert.doesNotMatch(captured[0].text, /Salin Produk/);
  } finally {
    tg.sendMessage = originalSendMessage;
  }
});

test('notifikasi owner memakai channel transaksi dan format TRANSAKSI BERHASIL', async () => {
  const originalSendMessage = tg.sendMessage;
  const originalGetShopSettings = db.getShopSettings;
  const originalClaimOnce = db.claimOnce;
  const originalMarkClaimDone = db.markClaimDone;
  const originalReleaseClaim = db.releaseClaim;
  let captured = null;
  tg.sendMessage = async (chatId, text) => {
    captured = { chatId, text };
    return { ok: true };
  };
  db.getShopSettings = async () => ({ transaction_notifications_enabled: true, transaction_channel_id: '@log_test' });
  db.claimOnce = async () => true;
  db.markClaimDone = async () => true;
  db.releaseClaim = async () => true;

  try {
    await sendOwnerLog(
      { invoice_ref: '68C83CE131A3', quantity: 1, amount: 35026, fee: 26, telegram_id: 123 },
      { nama: 'ChatGPT' },
      { order_ref: '68C83CE131A3', product_name: 'ChatGPT', variant_name: 'Plus', quantity: 1, total_price: 35026 },
      { username: 'triyafwemfa' }
    );
    assert.equal(captured.chatId, '@log_test');
    assert.match(captured.text, /^✅ TRANSAKSI BERHASIL\n=======================/);
    assert.match(captured.text, /User: @triyafwemfa/);
    assert.match(captured.text, /Trx ID: 68C83CE131A3/);
    assert.match(captured.text, /Produk: ChatGPT - Plus/);
    assert.match(captured.text, /Harga: Rp\s*35\.000/);
    assert.match(captured.text, /Jumlah Beli: 1/);
    assert.match(captured.text, /Fee: Rp\s*26/);
    assert.match(captured.text, /Total Harga: Rp\s*35\.026/);
    assert.match(captured.text, /Tanggal:/);
  } finally {
    tg.sendMessage = originalSendMessage;
    db.getShopSettings = originalGetShopSettings;
    db.claimOnce = originalClaimOnce;
    db.markClaimDone = originalMarkClaimDone;
    db.releaseClaim = originalReleaseClaim;
  }
});
