const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('metadata ProdSeller dapat disimpan pada masing-masing varian', () => {
  const db = read('lib/db.js');
  const api = read('api/reseller-data.js');
  for (const field of ['supplier_source', 'supplier_product_id', 'supplier_price_usdt', 'supplier_public_price_usdt', 'supplier_stock', 'supplier_synced_at']) {
    assert.match(db, new RegExp(field));
    assert.match(api, new RegExp(field));
  }
});

test('dashboard dapat memilih produk baru atau varian produk yang sudah ada', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /Varian produk yang sudah ada/);
  assert.match(dashboard, /data-supplier-target-product/);
  assert.match(dashboard, /data-supplier-variant-name/);
  assert.match(dashboard, /target_mode:mode/);
  assert.match(dashboard, /target_product_code:/);
  assert.match(dashboard, /variant_name:/);
});

test('import reseller ke varian mempertahankan produk lama sebagai varian Utama bila perlu', () => {
  const api = read('api/reseller-data.js');
  assert.match(api, /targetMode === 'variant'/);
  assert.match(api, /base_variant_name \|\| 'Utama'/);
  assert.match(api, /stock: Array\.isArray\(target\.data\) \? target\.data : \[\]/);
  assert.match(api, /clearBaseStock \? \{ data: \[\] \}/);
  assert.match(api, /supplier_product_id: productId/);
});

test('marketplace menghitung stok live per Product ID supplier pada varian', () => {
  const store = read('lib/storeService.js');
  const publicStore = read('public/store.js');
  assert.match(store, /function supplierSelection\(product, variant = null\)/);
  assert.match(store, /supplierRefs\.add\(ref\.productId\)/);
  assert.match(store, /_supplier_availability_by_id/);
  assert.match(store, /prodseller\.getAvailability\(supplier\.productId/);
  assert.match(store, /has_supplier_variants/);
  assert.match(publicStore, /variant&&variant\.supplier_source/);
  assert.match(publicStore, /Stok tersedia:/);
});

test('checkout dan fulfillment memakai Product ID milik varian yang dipilih', () => {
  const payment = read('lib/paymentService.js');
  const bot = read('lib/botHandlers.js');
  assert.match(payment, /variantProductId/);
  assert.match(payment, /const supplierProductId = supplier\.productId/);
  assert.match(payment, /productId: supplierProductId/);
  assert.match(bot, /const supplier = supplierSelection\(product, order\)/);
  assert.match(bot, /prodseller\.getAvailability\(supplier\.productId/);
});

test('varian supplier tidak masuk PO manual dan stok lokalnya tidak dapat diedit', () => {
  const api = read('api/reseller-data.js');
  const dashboard = read('api/reseller.js');
  assert.match(api, /supplierLinkOf\(product, variant \|\| null\)/);
  assert.match(api, /supplierLinkOf\(poProduct, poVariant \|\| null\)/);
  assert.match(dashboard, /SUPPLIER OTOMATIS · PRODSELLER/);
  assert.match(dashboard, /(?:Stok|stok).*mengikuti saldo \+ stok ProdSeller/);
  assert.match(dashboard, /isSupplierVariant\?\[\]:variantStock\(old\)/);
});

test('produk campuran lokal dan supplier tetap didukung', () => {
  const store = read('lib/storeService.js');
  const bot = read('lib/botHandlers.js');
  assert.match(store, /hasSupplierVariants/);
  assert.match(store, /has_auto_variants/);
  assert.match(store, /has_po_variants/);
  assert.match(bot, /mixed_supplier/);
});
