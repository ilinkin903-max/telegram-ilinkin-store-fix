const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('v82.2 mempunyai jurnal step unik per invoice untuk memblokir replay supplier', () => {
  const sql = read('supabase/update-v82.2-workflow-guard-receipt.sql');
  const db = read('lib/db.js');
  const payment = read('lib/paymentService.js');
  assert.match(sql, /create table if not exists public\.reseller_workflow_run_steps/i);
  assert.match(sql, /unique\(order_ref, step_order\)/i);
  assert.match(db, /claimResellerWorkflowRunStep/);
  assert.match(db, /completeResellerWorkflowRunStep/);
  assert.match(payment, /Step \$\{index \+ 1\} sudah pernah mulai dikirim ke supplier/);
  assert.match(payment, /resetResellerWorkflowRunStepGuards/);
});

test('runner tidak menjadwalkan ulang invoice yang sudah running', () => {
  const runner = read('api/workflow-runner.js');
  assert.doesNotMatch(runner, /const retryable = \['WORKFLOW_BUSY'\]\.includes\(code\)/);
  assert.doesNotMatch(runner, /\['WORKFLOW_BUSY', 'WORKFLOW_STILL_RUNNING'\]/);
});

test('produk workflow bervarian dipilih langsung sebagai target varian', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /id="workflowTarget"/);
  assert.match(ui, /setiap varian tampil sebagai pilihan terpisah/);
  assert.match(ui, /String\(p\.nama\|\|p\.kode\)\+' — '\+String\(v\.name/);
  assert.match(ui, /syncWorkflowTargetHidden/);
});

test('receipt final seragam dan tidak mengandung tombol Salin Produk', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /sendCompletedReceipt/);
  assert.match(payment, /✅ <b>PEMBAYARAN BERHASIL<\/b>/);
  assert.match(payment, /<b>SYARAT &amp; KETENTUAN<\/b>/);
  assert.match(payment, /<b>PRODUK YANG DIDAPAT<\/b>/);
  assert.match(payment, /receiptMethodLabel/);
  assert.match(payment, /AutoGoPay/);
  assert.doesNotMatch(payment, /Salin Produk/);
  assert.doesNotMatch(payment, /copy_text/);
});
