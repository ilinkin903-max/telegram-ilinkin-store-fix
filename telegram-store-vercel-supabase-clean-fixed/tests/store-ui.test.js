const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'store.js'), 'utf8');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');

test('marketplace menyediakan unduh QRIS dan bubble detail pembayaran', () => {
  assert.match(html, /id="downloadQrButton"/);
  assert.match(html, /id="paymentBubble"/);
  assert.match(js, /ACTIVE_PAYMENT_KEY/);
  assert.match(js, /downloadQr/);
});

test('marketplace menyediakan carousel banner dan bubble customer service', () => {
  assert.match(html, /id="heroTrack"/);
  assert.match(html, /id="customerServiceBubble"/);
  assert.match(js, /renderHeroBanners/);
  assert.match(reseller, /name="banner_urls"/);
});

test('label Produk Pilihan dan mulai sudah dihapus dari kartu produk', () => {
  assert.doesNotMatch(html, /Produk Pilihan/i);
  assert.doesNotMatch(js, /<small>mulai<\/small>/i);
});

test('v52 memakai tema biru dan mendukung logo URL', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
  assert.match(css, /--primary:\s*#1769e0/i);
  assert.match(reseller, /name="logo_url"/);
  assert.match(js, /settings\.logo_url/);
});

test('dashboard banner memakai baris nama + link dengan tambah dan hapus', () => {
  assert.match(reseller, /id="addBannerRow"/);
  assert.match(reseller, /data-banner-name/);
  assert.match(reseller, /data-banner-url/);
  assert.match(reseller, /data-remove-banner/);
  assert.match(reseller, /name="banner_items"/);
});

test('produk bisa dipilih untuk bot+marketplace atau marketplace saja', () => {
  assert.match(reseller, /name="display_scope"/);
  assert.match(reseller, /Bot Telegram \+ Marketplace/);
  assert.match(reseller, /Marketplace saja/);
});

test('marketplace menampilkan harga promo dicoret dan promo varian', () => {
  assert.match(js, /<del>/);
  assert.match(js, /variant-promo-row/);
  assert.match(js, /variant-promo-chip/);
  assert.match(js, /salePriceText/);
});

test('unduh QRIS memakai endpoint server dan Telegram downloadFile', () => {
  assert.match(js, /action=qr-download/);
  assert.match(js, /tg\.downloadFile/);
  const api = fs.readFileSync(path.join(root, 'api', 'store-data.js'), 'utf8');
  assert.match(api, /Content-Disposition/);
  assert.match(api, /Access-Control-Allow-Origin/);
});

test('v53 memakai hero rasio 2,39:1 dan nama banner tidak ditampilkan di marketplace', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
  assert.match(css, /aspect-ratio:\s*2\.39\s*\/\s*1/);
  assert.doesNotMatch(js, /hero-slide-name/);
});

test('v53 menyediakan Flash Sale dengan countdown dan pengaturan reseller', () => {
  assert.match(html, /id="flashSaleSection"/);
  assert.match(html, /id="flashSaleCountdown"/);
  assert.match(js, /renderFlashSale/);
  assert.match(js, /bestFlashPromo/);
  assert.match(reseller, /Flash Sale Marketplace/);
  assert.match(reseller, /name="flash_sale_enabled"/);
  assert.match(reseller, /name="flash_sale_end_at"/);
  assert.match(reseller, /id="addFlashSaleRow"/);
});

test('v53 menempatkan blok benefit setelah katalog', () => {
  assert.ok(html.indexOf('id="catalogSection"') < html.indexOf('class="benefits"'));
});

test('v53 meminta konfirmasi sebelum membuat pembayaran', () => {
  assert.match(html, /id="confirmModal"/);
  assert.match(html, /Ya, Lanjut ke Pembayaran/);
  assert.match(js, /openCheckoutConfirmation/);
  assert.match(js, /confirmCheckoutButton/);
});
