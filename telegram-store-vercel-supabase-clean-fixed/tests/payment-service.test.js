const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PAKASIR_SLUG = process.env.PAKASIR_SLUG || 'ilinkin-store';

const {
  normalizePakasirTransaction,
  validateWebhookPayload,
  paymentMatchesOrder
} = require('../lib/paymentService');

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
