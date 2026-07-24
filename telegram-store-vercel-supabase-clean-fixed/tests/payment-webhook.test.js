const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.AUTOGOPAY_API_KEY = 'agp_test_callback_key';
process.env.PAYMENT_PROVIDER = 'autogopay';

const handler = require('../api/payment-webhook');
const { isAutoGopayCallbackProbe, normalizeSignature } = handler._test;

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

function sign(payload) {
  return crypto
    .createHmac('sha256', process.env.AUTOGOPAY_API_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');
}

test('callback probe bertanda tangan dikembalikan HTTP 200', async () => {
  const payload = { event: 'callback.test', test: true };
  const req = {
    method: 'POST',
    headers: {
      'user-agent': 'AutoGopay-Callback/1.0',
      'x-callback-event': 'callback.test',
      'x-signature': sign(payload)
    },
    body: payload
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.state, 'callback_probe_ok');
});

test('health-check AutoGoPay tanpa transaksi tidak diproses sebagai pembayaran', async () => {
  const req = {
    method: 'POST',
    headers: { 'user-agent': 'AutoGopay-Callback/1.0' },
    body: {}
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.state, 'callback_probe_ok');
});


test('probe generik tanpa header AutoGoPay tetap mendapat HTTP 200 saat provider aktif', async () => {
  const req = {
    method: 'POST',
    headers: { 'user-agent': 'axios/1.7.7' },
    body: {}
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.state, 'callback_probe_ok');
});

test('probe kosong dengan signature tidak valid tetap hanya di-ACK dan tidak memproses order', async () => {
  const req = {
    method: 'POST',
    headers: {
      'user-agent': 'AutoGopay-Callback/1.0',
      'x-signature': 'deadbeef'
    },
    body: {}
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.state, 'callback_probe_ok');
});


test('URL verifikasi v60 meng-ACK payload transaksi tiruan tanpa signature', async () => {
  const payload = {
    event: 'transaction.received',
    transaction: { id: 'VERIFY-ONLY', amount: 1, status: 'settlement' }
  };
  const req = {
    method: 'POST',
    query: { provider: 'autogopay', verify: '1' },
    headers: { 'user-agent': 'AutoGopay-Callback/1.0' },
    body: payload
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.state, 'callback_probe_ok');
});


test('URL verify tetap menolak transaksi bertanda tangan tidak valid', async () => {
  const payload = {
    event: 'transaction.received',
    transaction: { id: 'TRX-BAD-SIGNATURE', amount: 50000, status: 'settlement' }
  };
  const req = {
    method: 'POST',
    query: { provider: 'autogopay', verify: '1' },
    headers: {
      'user-agent': 'AutoGopay-Callback/1.0',
      'x-signature': 'deadbeef'
    },
    body: payload
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /Signature AutoGoPay tidak valid/);
});

test('payload transaksi nyata tetap wajib memakai signature', async () => {
  const payload = {
    event: 'transaction.received',
    transaction: { id: 'TRX-REAL', amount: 50000, status: 'settlement' }
  };
  const req = {
    method: 'POST',
    headers: {
      'user-agent': 'AutoGopay-Callback/1.0',
      'x-callback-event': 'transaction.received'
    },
    body: payload
  };
  const res = makeResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /Signature AutoGoPay tidak valid/);
});

test('probe tidak menganggap transaksi valid sebagai health-check', () => {
  const req = {
    headers: {
      'user-agent': 'AutoGopay-Callback/1.0',
      'x-callback-event': 'transaction.received',
      'x-signature': 'deadbeef'
    }
  };
  const payload = {
    event: 'transaction.received',
    transaction: { id: 'TRX-001', amount: 10000, status: 'settlement' }
  };
  assert.equal(isAutoGopayCallbackProbe(req, payload), false);
});

test('signature dengan prefix sha256 tetap dapat dinormalisasi', () => {
  assert.equal(normalizeSignature('sha256=ABCDEF'), 'abcdef');
});
