const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('reseller UI provides STOK BERSAMA and STOK TERPISAH options for every variant', () => {
  const code = read('api/reseller.js');
  assert.match(code, /data-vfield="stock_mode"/);
  assert.match(code, /data-evfield="stock_mode"/);
  assert.match(code, /STOK TERPISAH · khusus varian ini/);
  assert.match(code, /STOK BERSAMA · gunakan Stok Produk utama/);
});

test('reseller openStockProduct modal shows shared stock column and hides shared variants from separate list', () => {
  const code = read('api/reseller.js');
  // Must separate shared variants and separate variants
  assert.match(code, /var sharedVars=\(p\.variants\|\|\[\]\)\.filter\(variantUsesSharedStock\);/);
  assert.match(code, /var separateVars=\(p\.variants\|\|\[\]\)\.filter\(function\(v\)\{\s*return !variantUsesSharedStock\(v\);\s*\}\);/);
  // Shared stock card rendered
  assert.match(code, /id="appendSharedStock"/);
  // Only separate variants rendered in the list
  assert.match(code, /separateVars\.map\(function\(v,i\)/);
});

test('reseller openManageProduct modal shows shared stock column and hides shared variants from separate list', () => {
  const code = read('api/reseller.js');
  assert.match(code, /id="manageSharedStock"/);
  assert.match(code, /var sharedVars=\(p\.variants\|\|\[\]\)\.filter\(variantUsesSharedStock\);/);
  assert.match(code, /var separateVars=\(p\.variants\|\|\[\]\)\.filter\(function\(v\)\{\s*return !variantUsesSharedStock\(v\);\s*\}\);/);
  assert.match(code, /separateVars\.map\(function\(v,i\)/);
});

test('reseller mergeVariantStockArray handles shared stock without failing on removed DOM cards', () => {
  const code = read('api/reseller.js');
  assert.match(code, /var isShared=variantUsesSharedStock\(v\);/);
  assert.match(code, /if\(isShared\)\{\s*stock=\[\];\s*\}/);
});

test('db module normalizes variant stock_mode and handles shared stock in count calculations', () => {
  const code = read('lib/db.js');
  assert.match(code, /stock_mode:\s*String\(item\?\.stock_mode/);
  assert.match(code, /const hasShared = variants\.some\(\(v\) => String\(v\.stock_mode/);
});

test('botHandlers supports shared variant stock and single product pool calculation', () => {
  const code = read('lib/botHandlers.js');
  assert.match(code, /function stockOfVariant\(variant,\s*product = null\)/);
  assert.match(code, /String\(variant\?\.stock_mode \|\| ''\)\.trim\(\)\.toLowerCase\(\) === 'shared'/);
  assert.match(code, /readyStockForVariant\(product,\s*variant,\s*availabilityMap\)/);
});

test('storeService normalizes shared stock and calculates available pool correctly', () => {
  const code = read('lib/storeService.js');
  assert.match(code, /function variantStock\(variant,\s*product = null\)/);
  assert.match(code, /hasSharedVariants \? baseStock : 0/);
});

test('edit product modal removes shared stock pool editor and keeps stock management in Stok/Kelola', () => {
  const code = read('api/reseller.js');
  assert.doesNotMatch(code, /id="editSharedStock"/);
  assert.doesNotMatch(code, /id="editSharedStockWrap"/);
});

test('bot variant selection and order stock checks pass product context for shared variants', () => {
  const code = read('lib/botHandlers.js');
  assert.match(code, /stockOfVariant\(variant,\s*product\)\.length < 1/);
  assert.match(code, /stockOfVariant\(variant,\s*product\)\.length/);
});
