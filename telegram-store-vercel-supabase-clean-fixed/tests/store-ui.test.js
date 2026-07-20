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
