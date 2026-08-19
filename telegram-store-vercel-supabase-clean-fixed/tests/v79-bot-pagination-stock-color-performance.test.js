const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('daftar produk bot memakai pagination 10 produk per halaman', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /const PRODUCT_PAGE_SIZE = 10/);
  assert.match(bot, /products\.slice\(start, start \+ PRODUCT_PAGE_SIZE\)/);
  assert.match(bot, /produkpage:\$\{page - 1\}/);
  assert.match(bot, /produkpage:\$\{page \+ 1\}/);
  assert.match(bot, /⬅️ Sebelumnya/);
  assert.match(bot, /Selanjutnya ➡️/);
});

test('produk supplier di bot tampil sebagai stok ready berdasarkan saldo dan stok ProdSeller', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /supplierAvailabilityForProducts/);
  assert.match(bot, /prodseller\.getBalance\(\)/);
  assert.match(bot, /prodseller\.getProduct\(productId\)/);
  assert.match(bot, /prodseller\.availabilityFrom/);
  assert.match(bot, /readyStockForVariant/);
  assert.match(bot, /readyStockForProduct/);
  assert.doesNotMatch(bot, /AUTO SUPPLIER/);
});

test('varian supplier tidak lagi memakai array stok lokal untuk menentukan stok', () => {
  const bot = read('lib/botHandlers.js');
  const fn = bot.slice(bot.indexOf('async function handleVariantSelection'), bot.indexOf('async function showConfirmation'));
  assert.match(fn, /isSupplierProduct\(product, variant\)/);
  assert.match(fn, /readyStockForVariant\(product, variant, availabilityMap\)/);
});

test('tombol bot menggunakan style warna resmi Telegram', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /function styledButton/);
  assert.match(bot, /'primary'/);
  assert.match(bot, /'success'/);
  assert.match(bot, /'danger'/);
  assert.match(bot, /Konfirmasi'.*'success'/);
  assert.match(bot, /Batalkan'.*'danger'/);
});

test('read berat bot diberi cache singkat dan start tidak mengulang upsert setelah registrasi referral', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /BOT_CACHE_MS = 30 \* 1000/);
  assert.match(bot, /cachedStats/);
  assert.match(bot, /cachedSettings/);
  assert.match(bot, /cachedBotProducts/);
  assert.match(bot, /skipUpsert: true/);
});
