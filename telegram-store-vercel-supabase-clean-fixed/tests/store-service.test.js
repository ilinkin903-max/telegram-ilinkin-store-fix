const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../lib/storeService');

test('Google Drive share URL diubah menjadi direct image URL', () => {
  assert.equal(
    store.normalizePublicImageUrl('https://drive.google.com/file/d/1AbCdEf_123-XYZ/view?usp=sharing'),
    'https://drive.google.com/uc?export=view&id=1AbCdEf_123-XYZ'
  );
});

test('URL HTTPS biasa dipertahankan dan URL tidak aman ditolak', () => {
  assert.equal(store.normalizePublicImageUrl('https://example.com/product.webp'), 'https://example.com/product.webp');
  assert.equal(store.normalizePublicImageUrl('http://example.com/product.webp'), '');
  assert.equal(store.normalizePublicImageUrl('javascript:alert(1)'), '');
});

test('Produk publik tidak membocorkan isi stok', () => {
  const product = store.sanitizeProduct({
    nama: 'Produk Test', kode: 'TEST', harga: 10000, deskripsi: 'Desc', snk: 'Terms',
    image_url: '', category: 'Akun', active: true, data: ['email|password', 'secret2'],
    variants: [], bulk_prices: [], terjual: 3
  }, []);
  assert.equal(product.stock, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(product, 'data'), false);
  assert.equal(JSON.stringify(product).includes('email|password'), false);
});

test('Varian publik hanya memuat jumlah stok, bukan kredensial', () => {
  const product = store.sanitizeProduct({
    nama: 'Varian Test', kode: 'VAR', harga: 1000, active: true, data: [], variants: [
      { name: '1 Bulan', sku: '1B', price: 5000, active: true, stock: ['akun1', 'akun2'] }
    ], bulk_prices: [], terjual: 1
  }, []);
  assert.equal(product.variants[0].stock, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(product.variants[0], 'stock_items'), false);
  assert.equal(JSON.stringify(product).includes('akun1'), false);
});
