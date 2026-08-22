const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const payment = fs.readFileSync(path.join(root, 'lib/paymentService.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'lib/db.js'), 'utf8');
const reseller = fs.readFileSync(path.join(root, 'api/reseller.js'), 'utf8');
const statsSql = fs.readFileSync(path.join(root, 'supabase/update-v82.11-workflow-failure-cancel-stats.sql'), 'utf8');

test('workflow failure stops and notifies buyer once', () => {
  assert.match(payment, /sendWorkflowFailureNotice/);
  assert.match(payment, /menghentikan workflow pada langkah yang gagal|tidak melanjutkan langkah yang gagal/);
  assert.match(payment, /workflow_failure_notified/);
});

test('workflow retry uses same invoice and can restart from step zero', () => {
  assert.match(payment, /retryWorkflowOrder/);
  assert.match(payment, /forceRestart: options\.forceRestart === true/);
  assert.match(payment, /start_index: forceRestart \? 0/);
  assert.match(payment, /upsertResellerWorkflowRun/);
});

test('canceled transaction adjusts revenue and profit by the transaction values', () => {
  assert.match(db, /previousStatus/);
  assert.match(db, /revenue_total: direction \* Number\(data\.total_price/);
  assert.match(db, /profit_total: direction \* Number\(data\.profit_amount/);
});

test('live statistics exclude canceled transactions', () => {
  assert.match(statsSql, /where lower\(coalesce\(status, 'completed'\)\) = 'completed'/);
});

test('dashboard explains restart keeps the same marketplace sale', () => {
  assert.match(reseller, /penjualan marketplace tetap sama/);
  assert.match(reseller, /Ulangi Workflow dari Awal/);
});
