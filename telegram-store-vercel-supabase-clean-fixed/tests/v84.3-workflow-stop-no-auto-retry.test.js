const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

test('workflow busy langsung ATTENTION dan tidak dijadwalkan ulang', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /status: 'attention'/);
  assert.match(payment, /tidak akan dicoba otomatis/);
  assert.match(payment, /retry_scheduled: false/);
  assert.doesNotMatch(payment, /scheduleWorkflowRetry\(invoice, 0\)/);
});

test('scheduler retry dinonaktifkan secara keras', () => {
  const scheduler = read('lib/workflowRetryScheduler.js');
  assert.match(scheduler, /automatic retry is intentionally disabled/i);
  assert.match(scheduler, /return false;/);
});

test('workflow runner tidak melakukan auto retry setelah WORKFLOW_BUSY', () => {
  const runner = read('api/workflow-runner.js');
  assert.doesNotMatch(runner, /const retryable = \['WORKFLOW_BUSY'\]/);
  assert.match(runner, /v84\.3: worker tidak pernah menjadwalkan ulang/);
});

test('fulfillment tidak menjalankan workflow lagi bila run sudah ATTENTION', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /existingWorkflowRun/);
  assert.match(payment, /workflowRunStatus/);
  assert.match(payment, /existingWorkflowRun && workflowRunStatus !== 'queued'/);
  assert.match(payment, /Tidak ada retry otomatis/);
});

test('semua error workflow menjadi ATTENTION dan tidak kembali queued', () => {
  const payment = read('lib/paymentService.js');
  const catchBlock = payment.slice(payment.indexOf('async function processWorkflowDelivery'), payment.indexOf('async function retryWorkflowOrder'));
  assert.match(catchBlock, /const status = 'attention'/);
  assert.doesNotMatch(catchBlock, /WORKFLOW_BUSY.*?status,?\\s*'queued'/s);
});

test('debit supplier hanya dipanggil pada jalur delivery berhasil', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /if \(existingPo\?\.status === 'delivered'/);
  assert.match(payment, /if \(run\?\.status === 'delivered'/);
  assert.match(payment, /status: 'delivered', current_step: runtime\.current_step/);
  assert.match(payment, /settleWorkflowSupplierCost\(workflow, run, invoice, orderQuantity\)/);
  // Tidak ada pemanggilan settlement di blok WORKFLOW_BUSY/exception.
  const busyBlock = payment.slice(payment.indexOf("if (!locked)"), payment.indexOf("try {", payment.indexOf("if (!locked)")));
  assert.doesNotMatch(busyBlock, /settleWorkflowSupplierCost/);
  const catchIndex = payment.indexOf("} catch (error) {", payment.indexOf("async function processWorkflowDelivery"));
  const catchBlock = payment.slice(catchIndex, catchIndex + 2500);
  assert.doesNotMatch(catchBlock, /settleWorkflowSupplierCost/);
});

test('dashboard tetap menyediakan retry manual, bukan retry otomatis', () => {
  const ui = read('api/reseller.js');
  const api = read('api/reseller-data.js');
  assert.match(ui, /Ulangi Workflow dari Awal/);
  assert.match(api, /retryWorkflowOrder/);
});
