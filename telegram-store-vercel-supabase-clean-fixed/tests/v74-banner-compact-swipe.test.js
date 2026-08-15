const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const storeJs = fs.readFileSync(path.join(root, 'public', 'store.js'), 'utf8');
const storeCss = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
const botHandlers = fs.readFileSync(path.join(root, 'lib', 'botHandlers.js'), 'utf8');

test('banner manager default ringkas dengan preview, Edit, dan Posisi Banner', () => {
  assert.match(reseller, /bannerPreviewWrap/);
  assert.match(reseller, /data-banner-edit-toggle/);
  assert.match(reseller, /data-banner-position-toggle/);
  assert.match(reseller, /bannerEditPanel/);
  assert.match(reseller, /bannerPositionPanel/);
  assert.match(reseller, /function syncBannerPreview/);
});

test('marketplace banner mendukung swipe pointer dan drag', () => {
  assert.match(storeJs, /function wireBannerSwipe/);
  assert.match(storeJs, /onpointerdown/);
  assert.match(storeJs, /onpointermove/);
  assert.match(storeJs, /onpointerup/);
  assert.match(storeJs, /translate3d\(calc/);
  assert.match(storeCss, /touch-action: pan-y/);
  assert.match(storeCss, /hero-carousel\.dragging/);
});

test('indikator banner lebih transparan', () => {
  assert.match(storeCss, /background: rgba\(15,23,42,\.12\)/);
  assert.match(storeCss, /background: rgba\(255,255,255,\.42\)/);
});

test('Cara Order bot tetap tersedia dan memberi panduan pembelian', () => {
  assert.match(botHandlers, /‹❓› Cara Order/);
  assert.match(botHandlers, /CARA ORDER/);
  assert.match(botHandlers, /Buka Marketplace/);
  assert.match(botHandlers, /Daftar Produk/);
});
