const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const storeCss = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
const storeHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

test('reseller kembali ke UI klasik dan navigasi berada di bawah', () => {
  assert.match(reseller, /v71: UI klasik kembali \+ menu utama selalu di bawah/);
  assert.match(reseller, /\.navTiles\{[\s\S]*position:fixed;[\s\S]*bottom:max\(/);
  assert.match(reseller, /\.editSaveDock\{bottom:108px!important\}/);
});

test('marketplace memakai visual klasik yang sama dan bottom navigation', () => {
  assert.match(storeCss, /v71 — Unified Classic UI/);
  assert.match(storeCss, /--nb-purple:#8557e8/);
  assert.match(storeCss, /\.product-card\{[\s\S]*border:3px solid #050505/);
  assert.match(storeCss, /\.mobile-nav\{[\s\S]*position:fixed;[\s\S]*bottom:max\(/);
  assert.match(storeHtml, /<nav class="mobile-nav"/);
});

test('fitur penting marketplace dan PO tetap ada', () => {
  assert.match(storeHtml, /id="walletBalanceChip"/);
  assert.match(storeHtml, /id="paymentMethodWallet"/);
  assert.match(storeHtml, /id="flashSaleSection"/);
  assert.match(reseller, /id="poOrders"/);
  assert.match(reseller, /id="promoUnifiedForm"/);
});
