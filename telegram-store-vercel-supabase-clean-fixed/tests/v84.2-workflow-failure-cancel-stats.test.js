const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const payment = fs.readFileSync(path.join(root, 'lib/paymentService.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'lib/db.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'api/reseller.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/reseller-data.js'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'supabase/update-v84.2-workflow-failure-cancel-stats.sql'), 'utf8');

test('workflow error stops at the failing step and sets ATTENTION', () => {
  assert.match(payment, /status = error\?\.code === 'WORKFLOW_BUSY' \? 'queued' : 'attention'/);
  assert.match(payment, /sendWorkflowFailureNotice/);
  assert.match(payment, /tidak melanjutkan langkah yang gagal|menghentikan workflow pada langkah yang gagal/);
});

test('failed workflow can be manually restarted from step 0 without a new marketplace transaction', () => {
  assert.match(payment, /forceRestart: options\.forceRestart === true/);
  assert.match(payment, /start_index: forceRestart \? 0/);
  assert.match(payment, /upsertResellerWorkflowRun/);
  assert.match(payment, /order_ref: invoice/);
  assert.match(payment, /supplier_balance_debited_at: run\?\.supplier_balance_debited_at \|\| null/);
  assert.match(api, /action === 'workflow-retry-order'/);
  assert.match(ui, /Ulangi Workflow dari Awal/);
  assert.match(ui, /penjualan marketplace tetap sama/);
});

test('buyer gets a single idempotent workflow failure notice', () => {
  assert.match(payment, /workflow_failure_notice:/);
  assert.match(payment, /Pesanan Anda sudah tercatat/);
  assert.match(payment, /tunggu beberapa saat/);
  assert.match(payment, /hubungi admin/);
});

test('completed to canceled subtracts transaction revenue and profit', () => {
  assert.match(db, /previousStatus === 'completed'/);
  assert.match(db, /direction \* Number\(data\.total_price \|\| 0\)/);
  assert.match(db, /direction \* Number\(data\.profit_amount \|\| 0\)/);
});

test('live stats use completed transactions only, so canceled is excluded', () => {
  assert.match(sql, /where lower\(coalesce\(status, 'completed'\)\) = 'completed'/);
  assert.match(db, /orders: Number\(summary\.orders_total \|\| 0\)/);
  assert.match(db, /omzet: Number\(summary\.revenue_total \|\| 0\)/);
  assert.match(db, /\.eq\('status', 'completed'\)/);
});

test('workflow restart warning is visible in dashboard', () => {
  assert.match(ui, /Workflow akan diulang dari \/start/);
  assert.match(ui, /Tidak dibuat penjualan baru di marketplace/);
  assert.match(ui, /pembelian supplier ganda/);
});
