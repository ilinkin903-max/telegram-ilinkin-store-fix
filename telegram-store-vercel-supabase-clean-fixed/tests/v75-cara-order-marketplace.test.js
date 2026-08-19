const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const botHandlers = fs.readFileSync(path.join(__dirname, '..', 'lib', 'botHandlers.js'), 'utf8');

test('tombol Cara Order selalu ada di menu bot', () => {
  assert.match(botHandlers, /Cara Order'.*callback_data: 'caraorder'/);
  assert.doesNotMatch(botHandlers, /Cara Order Bot/);
});

test('panduan Cara Order memakai alur Marketplace saat marketplace aktif', () => {
  assert.match(botHandlers, /Klik tombol \*Buka Marketplace\*/);
  assert.match(botHandlers, /Pilih produk yang ingin dibeli/);
  assert.match(botHandlers, /Beli Sekarang/);
  assert.match(botHandlers, /Pilih varian jika tersedia/);
  assert.match(botHandlers, /QRIS/);
  assert.match(botHandlers, /Sistem akan mengecek pembayaran otomatis/);
});

test('panduan tetap memiliki fallback Daftar Produk bila marketplace dimatikan', () => {
  assert.match(botHandlers, /menuMode === 'products'/);
  assert.match(botHandlers, /Klik tombol \*Daftar Produk\*/);
});
