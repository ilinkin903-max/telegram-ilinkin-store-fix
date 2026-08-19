const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('v76 menambahkan konfigurasi ProdSeller hanya di server', () => {
  const config = read('lib/config.js');
  const env = read('.env.example');
  assert.match(config, /PRODSELLER_API_KEY/);
  assert.match(config, /https:\/\/prodseller\.com\/v1/);
  assert.match(env, /PRODSELLER_API_KEY=psk_/);
  assert.doesNotMatch(read('public/store.js'), /PRODSELLER_API_KEY/);
});

test('service ProdSeller memakai X-API-Key dan Idempotency-Key', () => {
  const service = read('lib/prodsellerService.js');
  assert.match(service, /'X-API-Key'/);
  assert.match(service, /'Idempotency-Key'/);
  assert.match(service, /POST', '\/orders'/);
  assert.match(service, /GET', '\/balance'/);
  assert.match(service, /GET', '\/products'/);
});

test('produk supplier dipilih satu per satu dari dashboard', () => {
  const api = read('api/reseller-data.js');
  const dashboard = read('api/reseller.js');
  assert.match(api, /prodseller-import/);
  assert.match(api, /supplier_product_id/);
  assert.match(dashboard, /Supplier \/ Reseller/);
  assert.match(dashboard, /Resellerkan Produk/);
  assert.match(dashboard, /Saldo ProdSeller/);
  assert.match(dashboard, /Harga Jual iLink/);
});

test('checkout memverifikasi stok supplier sebelum pelanggan membayar', () => {
  const store = read('lib/storeService.js');
  const bot = read('lib/botHandlers.js');
  assert.match(store, /prodseller\.(?:getAvailability|getProduct)\((?:product\.supplier_product_id|supplier\.productId)/);
  assert.match(store, /SUPPLIER_STOCK/);
  assert.match(bot, /prodseller\.(?:getAvailability|getProduct)\((?:product\.supplier_product_id|supplier\.productId)/);
  assert.match(bot, /supplierAvailabilityForProducts|prodseller\.(?:getAvailability|getProduct)/);
  assert.doesNotMatch(bot, /AUTO SUPPLIER/);
});

test('fulfillment supplier hanya setelah order lunas dan aman untuk retry', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /processProdSellerDelivery/);
  assert.match(payment, /idempotencyKey: `ilink-\$\{invoice\}`/);
  assert.match(payment, /retrySupplierOrder/);
  assert.match(payment, /supplier_delivery_notice:/);
  assert.match(payment, /markPoDelivered/);
});

test('migration v76 menyimpan metadata produk dan order supplier', () => {
  const sql = read('supabase/update-v76-prodseller-reseller.sql');
  assert.match(sql, /supplier_source/);
  assert.match(sql, /supplier_product_id/);
  assert.match(sql, /create table if not exists public\.supplier_orders/i);
  assert.match(sql, /order_ref text not null unique/i);
});
