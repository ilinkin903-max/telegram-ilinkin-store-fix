const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PAKASIR_SLUG = process.env.PAKASIR_SLUG || 'ilinkin-store';

const {
  normalizePakasirTransaction,
  validateWebhookPayload,
  paymentMatchesOrder,
  sendOrderReceipt,
  sendOwnerLog
} = require('../lib/paymentService');
const tg = require('../lib/telegram');
const { config } = require('../lib/config');

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


test('invoice produk hanya memakai tombol salin bawaan blok kode Telegram', async () => {
  const originalSendMessage = tg.sendMessage;
  let captured = null;
  tg.sendMessage = async (chatId, text, options) => {
    captured = { chatId, text, options };
    return { ok: true };
  };

  try {
    await sendOrderReceipt(
      123,
      { invoice_ref: 'INV-COPY', quantity: 1, amount: 1000, fee: 0 },
      { nama: 'Produk Uji', snk: 'Gunakan dengan baik.' },
      { order_ref: 'INV-COPY', product_name: 'Produk Uji', quantity: 1, total_price: 1000 },
      ['akun@example.com|password']
    );
    assert.equal(captured.chatId, 123);
    assert.match(captured.text, /<pre>akun@example\.com\|password<\/pre>/);
    assert.equal(captured.options.parse_mode, 'HTML');
    assert.equal(captured.options.reply_markup, undefined);
  } finally {
    tg.sendMessage = originalSendMessage;
  }
});

test('notifikasi owner mempertahankan format PESANAN SELESAI', async () => {
  const originalSendMessage = tg.sendMessage;
  const originalChannelLog = config.channelLog;
  let captured = null;
  config.channelLog = '@log_test';
  tg.sendMessage = async (chatId, text) => {
    captured = { chatId, text };
    return { ok: true };
  };

  try {
    await sendOwnerLog(
      { invoice_ref: '68C83CE131A3', quantity: 1, amount: 35026, fee: 26, telegram_id: 123 },
      { nama: 'ChatGPT' },
      { order_ref: '68C83CE131A3', product_name: 'ChatGPT', variant_name: 'Plus', quantity: 1, total_price: 35026 },
      { username: 'triyafwemfa' }
    );
    assert.equal(captured.chatId, '@log_test');
    assert.match(captured.text, /^✅ PESANAN SELESAI\n=======================/);
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
    config.channelLog = originalChannelLog;
  }
});
