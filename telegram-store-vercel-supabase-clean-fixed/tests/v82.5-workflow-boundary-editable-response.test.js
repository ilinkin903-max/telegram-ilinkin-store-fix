const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 1, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 1800 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

test('stok tidak bergantung pada angka contoh dan prefix-only membaca nilai terbaru', () => {
  const recorded = 'ALIGHT MOTION\nSisa Stok : 32';
  const start = recorded.indexOf('32');
  const rule = workflow.deriveTextSelectionRule(recorded, start, start + 2);
  assert.equal(rule.sample, '32');
  assert.match(rule.prefix, /Sisa Stok : $/);
  assert.equal(rule.suffix, '');
  const live = 'ALIGHT MOTION\nSisa Stok : 107';
  assert.equal(workflow.extractTextByRule(live, { prefix: rule.prefix, suffix: rule.suffix }, { strict: true }), '107');
  assert.equal(workflow.parseStockNumber('107'), 107);
});

test('suffix-only berarti seluruh bagian sebelum suffix adalah produk dinamis', () => {
  const live = 'akun-baru@example.com|PasswordBaru\n--- SELESAI ---';
  const extracted = workflow.extractTextByRule(live, { prefix: '', suffix: '\n--- SELESAI ---' }, { strict: true });
  assert.equal(extracted, 'akun-baru@example.com|PasswordBaru');
});

test('penanda balasan editable membedakan pesan dengan tombol yang sama', () => {
  const buttons = [{ text: 'Buy' }, { text: 'Back' }];
  const rows = [
    { id: 1, text: 'ALIGHT MOTION ( 32 )', buttons },
    { id: 2, text: 'ZOOM 7 HARI ( 88 )', buttons }
  ];
  const selected = workflow.selectResponseForStep(rows, {
    response_snapshot: {
      text: 'ALIGHT MOTION ( 32 )',
      expected_text: 'ZOOM 7 HARI ( {number} )',
      buttons
    },
    response_selection_index: -1
  });
  assert.equal(selected.id, 2);
});

test('penanda editable yang tidak cocok tidak fallback ke pesan ke-N', () => {
  const buttons = [{ text: 'Buy' }];
  const rows = [{ id: 1, text: 'ALIGHT MOTION ( 99 )', buttons }];
  const selected = workflow.selectResponseForStep(rows, {
    response_snapshot: { text: 'ALIGHT MOTION ( 32 )', expected_text: 'ZOOM 7 HARI', buttons },
    response_selection_index: 0
  });
  assert.equal(selected, null);
});

test('runtime extraction hanya memakai prefix dan suffix, bukan sample hasil rekaman', () => {
  const src = read('lib/userbotWorkflowService.js');
  assert.match(src, /const hasPartialRule = Boolean\(String\(step\.result_extract_prefix/);
  assert.doesNotMatch(src, /hasPartialRule = Boolean\([^\n]*result_sample_text/);
  assert.match(src, /const hasRule = Boolean\(String\(step\.stock_extract_prefix/);
  assert.doesNotMatch(src, /hasRule = Boolean\([^\n]*stock_sample_text/);

  const db = read('lib/db.js');
  assert.match(db, /updates\.stock_sample_text = ''/);
  assert.match(db, /updates\.result_sample_text = ''/);
});

test('editor step menyediakan penanda balasan serta batas teks stok dan produk yang editable', () => {
  const ui = read('api/reseller.js');
  const api = read('api/reseller-data.js');
  assert.match(ui, /Penanda Teks Balasan Supplier/);
  assert.match(ui, /name="response_expected_text"/);
  assert.match(ui, /name="stock_extract_prefix"/);
  assert.match(ui, /name="stock_extract_suffix"/);
  assert.match(ui, /name="result_extract_prefix"/);
  assert.match(ui, /name="result_extract_suffix"/);
  assert.match(api, /body\.response_expected_text/);
  assert.match(api, /updates\.stock_extract_prefix/);
  assert.match(api, /updates\.result_extract_prefix/);
});

test('pesan customer saat proses otomatis tidak membocorkan supplier', () => {
  const payment = read('lib/paymentService.js');
  const start = payment.indexOf('async function sendSupplierPendingNotice');
  const end = payment.indexOf('async function sendPoDeliveryReceipt', start);
  const block = payment.slice(start, end);
  assert.match(block, /Sistem sedang menyiapkan produk Anda secara otomatis/);
  assert.doesNotMatch(block, /mengambil produk dari supplier/i);
  assert.doesNotMatch(block, /supplier berhasil/i);
});
