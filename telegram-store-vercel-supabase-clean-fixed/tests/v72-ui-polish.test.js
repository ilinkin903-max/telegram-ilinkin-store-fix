const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');

test('grafik menaruh omzet tepat di atas batang', () => {
  assert.match(reseller, /class=\"barValue\"/);
  assert.match(reseller, /class=\"barDate\"/);
  assert.match(reseller, /\.barValue\{/);
});

test('menu reseller desktop dipusatkan dan users satu kolom rapi', () => {
  assert.match(reseller, /@media\(min-width:1000px\)\{[\s\S]*\.navTiles\{justify-content:center\}/);
  assert.match(reseller, /\.userCardGrid\{grid-template-columns:1fr\}/);
});

test('promo mempertahankan judul rapi dan diskon tidak mudah overflow', () => {
  assert.match(reseller, /class=\"promoTitle\"/);
  assert.match(reseller, /\.promoDiscountValue b\{[\s\S]*overflow-wrap:anywhere/);
});

test('marketplace search ikut scroll, katalog turun, close tetap terlihat', () => {
  assert.match(css, /v72 — Marketplace spacing, scrolling search, and persistent close button/);
  assert.match(css, /\.topbar\{position:relative!important/);
  assert.match(css, /\.catalog-section\{margin-top:32px!important/);
  assert.match(css, /\.modal-close\{[\s\S]*position:sticky!important/);
});
