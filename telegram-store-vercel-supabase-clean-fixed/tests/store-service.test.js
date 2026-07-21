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

test('Daftar banner memproses beberapa URL dan menghapus duplikat', () => {
  assert.deepEqual(
    store.parseBannerUrls('https://example.com/a.jpg\nhttps://example.com/b.jpg\nhttps://example.com/a.jpg'),
    ['https://example.com/a.jpg', 'https://example.com/b.jpg']
  );
});

test('Daftar banner mendukung link Google Drive dan menolak URL tidak aman', () => {
  assert.deepEqual(
    store.parseBannerUrls([
      'https://drive.google.com/file/d/1Banner_Test-99/view?usp=sharing',
      'http://example.com/tidak-aman.jpg',
      'javascript:alert(1)'
    ]),
    ['https://drive.google.com/uc?export=view&id=1Banner_Test-99']
  );
});

test('banner bernama dipertahankan sebagai pasangan nama dan URL', () => {
  assert.deepEqual(
    store.parseBannerItems(JSON.stringify([
      { name: 'Promo Canva', url: 'https://example.com/canva.jpg' },
      { name: 'Promo ChatGPT', url: 'https://example.com/chatgpt.jpg' }
    ])),
    [
      { name: 'Promo Canva', url: 'https://example.com/canva.jpg' },
      { name: 'Promo ChatGPT', url: 'https://example.com/chatgpt.jpg' }
    ]
  );
});

test('promo varian publik menyertakan harga asli dan harga setelah diskon', () => {
  const product = store.sanitizeProduct({
    nama: 'Gemini', kode: 'GEMINI', harga: 45000, active: true, data: [], display_scope: 'marketplace', variants: [
      { name: '18 Bulan Invite', sku: '18-BULAN-INVITE', price: 45000, active: true, stock: ['akun1'] }
    ], bulk_prices: [], terjual: 1
  }, [{
    code: 'INVITEHEMAT', name: 'Diskon Invite', active: true,
    products: ['GEMINI::18-BULAN-INVITE'], discount_type: 'amount', discount_value: 28500,
    min_qty: 1, min_spend: 0, usage_limit: 0, used_count: 0,
    start_at: '2020-01-01T00:00:00.000Z', end_at: '2099-01-01T00:00:00.000Z'
  }]);
  assert.equal(product.display_scope, 'marketplace');
  assert.equal(product.has_promo, true);
  assert.equal(product.variants[0].promo.original_price, 45000);
  assert.equal(product.variants[0].promo.final_price, 16500);
  assert.equal(product.sale_price_min, 16500);
});
