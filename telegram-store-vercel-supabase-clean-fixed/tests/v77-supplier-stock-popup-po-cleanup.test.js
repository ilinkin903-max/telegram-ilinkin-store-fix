const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('pengiriman PO final memakai format PEMBAYARAN BERHASIL yang seragam', () => {
  const payment = read('lib/paymentService.js');
  const paidFn = payment.slice(payment.indexOf('async function sendPoPaidNotice'), payment.indexOf('async function sendSupplierPendingNotice'));
  const deliveryFn = payment.slice(payment.indexOf('async function sendPoDeliveryReceipt'), payment.indexOf('async function sendChannelWithRetry'));
  assert.doesNotMatch(paidFn, /PESANAN PRE-ORDER/);
  assert.doesNotMatch(deliveryFn, /PESANAN PO SUDAH DIKIRIM/);
  assert.match(payment, /✅ <b>PEMBAYARAN BERHASIL<\/b>/);
  assert.match(payment, /<b>SYARAT &amp; KETENTUAN<\/b>/);
  assert.match(payment, /<b>PRODUK YANG DIDAPAT<\/b>/);
  assert.match(deliveryFn, /sendCompletedReceipt/);
});

test('popup dashboard menutup menu bawah dan berada di lapisan teratas', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /\.modal\{[^}]*z-index:400/);
  assert.match(dashboard, /body\.modalOpen \.navTiles\{visibility:hidden;pointer-events:none\}/);
  assert.match(dashboard, /document\.body\.classList\.add\('modalOpen'\)/);
  assert.match(dashboard, /document\.body\.classList\.remove\('modalOpen'\)/);
});

test('stok supplier dihitung dari saldo dan stok aktual supplier', () => {
  const service = read('lib/prodsellerService.js');
  assert.match(service, /balanceStock = unitPrice > 0 \? Math\.max\(0, Math\.floor/);
  assert.match(service, /Math\.min\(balanceStock, supplierStock\)/);
  assert.match(service, /availableStock/);
  const store = read('lib/storeService.js');
  assert.match(store, /supplierAvailability|_supplier_available_stock/);
  assert.match(store, /prodseller\.availabilityFrom|prodseller\.getAvailability/);
  assert.match(store, /availability\.availableStock < qty/);
});

test('marketplace menampilkan jumlah stok untuk produk supplier dan workflow', () => {
  const storeJs = read('public/store.js');
  assert.match(storeJs, /isWorkflow \|\| isSupplier \|\| hasSupplierVariants \|\| hasWorkflowVariants/);
  assert.match(storeJs, /els\.detailStockBadge\.textContent = isWorkflow \? \('Stok ' \+ selectedStock\(\)\)/);
  assert.match(storeJs, /workflowVariant \? \('Stok ' \+ variant\.stock\)/);
  assert.doesNotMatch(storeJs, /AUTO SUPPLIER/);
});

test('produk supplier tidak dicampur ke menu Pesanan PO', () => {
  const api = read('api/reseller-data.js');
  const dashboard = read('api/reseller.js');
  assert.match(api, /automatedSupplierLinkOf|supplierLinkOf|supplierCodes/);
  assert.match(api, /filter\(\(order\) =>|supplierCodes\.has/);
  assert.match(api, /tidak dapat dikirim sebagai PO manual/);
  assert.match(dashboard, /SUPPLIER OTOMATIS · PRODSELLER/);
  assert.match(api, /tidak dapat dikirim sebagai PO manual/);
});
