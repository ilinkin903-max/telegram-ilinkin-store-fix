const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('v82.3 migration membuat supplier manual, modal workflow, ledger, dan debit idempotent', () => {
  const sql = read('supabase/update-v82.3-workflow-editor-supplier-balance.sql');
  assert.match(sql, /create table if not exists public\.reseller_suppliers/i);
  assert.match(sql, /manual_balance_idr numeric\(18,2\)/i);
  assert.match(sql, /add column if not exists unit_cost_idr/i);
  assert.match(sql, /create table if not exists public\.reseller_supplier_ledger/i);
  assert.match(sql, /reseller_supplier_ledger_order_debit_uidx/i);
  assert.match(sql, /debit_reseller_supplier_balance_v823/i);
  assert.match(sql, /for update/i);
});

test('db mendukung edit/salin workflow dan edit/hapus step', () => {
  const db = read('lib/db.js');
  assert.match(db, /async function cloneResellerWorkflow/);
  assert.match(db, /async function updateResellerWorkflowStep/);
  assert.match(db, /async function deleteResellerWorkflowStep/);
  assert.match(db, /copied_from_workflow_id/);
  assert.match(db, /payload\.action_value = '\{quantity\}'/);
});

test('stok workflow dihitung dari saldo manual dibagi modal', () => {
  const db = read('lib/db.js');
  assert.match(db, /function workflowEstimatedStock/);
  assert.match(db, /Math\.floor\(balance \/ cost\)/);
  assert.match(db, /syncSupplierWorkflowStocks/);
  assert.match(db, /supplier_stock: stock/);
});

test('payment workflow mengecek saldo dan mendebit modal setelah hasil supplier didapat', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /workflowManualSupplierInfo/);
  assert.match(payment, /manualSupplier\.estimatedStock < orderQuantity/);
  assert.match(payment, /settleWorkflowSupplierCost/);
  assert.match(payment, /debitResellerSupplierBalance/);
  assert.match(payment, /releaseClaim\(targetLock\)/);
});

test('dashboard supplier ringkas dan workflow bisa edit/salin', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /id="resellerSupplierList"/);
  assert.match(ui, /\+ Tambah Supplier/);
  assert.match(ui, /Saldo Bot \(Manual\)/);
  assert.match(ui, /Jumlah Varian/);
  assert.match(ui, /data-reseller-supplier-products/);
  assert.match(ui, /data-reseller-supplier-edit/);
  assert.match(ui, /openWorkflowEdit/);
  assert.match(ui, /openWorkflowCopy/);
  assert.match(ui, /data-workflow-step-edit/);
  assert.match(ui, /workflow-step-update/);
  assert.match(ui, /workflow-step-delete/);
});

test('produk workflow bervarian tetap dipilih langsung per varian dan menampilkan stok saldo/modal', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /Produk yang Dituju/);
  assert.match(ui, /String\(p\.nama\|\|p\.kode\)\+' — '/);
  assert.match(ui, /WORKFLOW · stok/);
  assert.match(ui, /WORKFLOW RESELLER · STOK/);
});

test('API edit workflow aktif kembali menjadi draft untuk keselamatan', () => {
  const api = read('api/reseller-data.js');
  assert.match(api, /action === 'workflow-update'/);
  assert.match(api, /if \(current\.active\)/);
  assert.match(api, /active: false/);
  assert.match(api, /action === 'workflow-copy'/);
  assert.match(api, /action === 'workflow-step-update'/);
});
