const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const payment = fs.readFileSync(path.join(root, 'lib/paymentService.js'), 'utf8');

test('payment watcher hard-stop: run non-queued tidak memanggil processWorkflowDelivery lagi', () => {
  assert.match(payment, /if \(existingWorkflowRun && workflowRunStatus !== 'queued'\)/);
  const start = payment.indexOf("if (poWaiting && isWorkflowProduct(product, result.transaction || order))");
  const end = payment.indexOf("} else if (poWaiting && isProdSellerProduct", start);
  const block = payment.slice(start, end);
  assert.match(block, /HARD STOP/);
  assert.match(block, /Tidak ada retry otomatis/);
});

test('automatic retryWorkflowOrder ditolak jika invoice sudah punya run', () => {
  assert.match(payment, /if \(!options\.forceRestart && existingRun\)/);
  assert.match(payment, /error\.code = existingRun\.error_code \|\| 'WORKFLOW_STOPPED'/);
});

test('manual restart tidak menghapus tanda debit saldo supplier sebelumnya', () => {
  assert.match(payment, /supplier_balance_debited_at: forceRestart \? \(run\?\.supplier_balance_debited_at \|\| null\) : null/);
});
