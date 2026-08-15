const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const storeJs = fs.readFileSync(path.join(root, 'public', 'store.js'), 'utf8');
const storeCss = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
const storeHtml = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const storeService = fs.readFileSync(path.join(root, 'lib', 'storeService.js'), 'utf8');
const botHandlers = fs.readFileSync(path.join(root, 'lib', 'botHandlers.js'), 'utf8');

test('promo tidak menduplikasi judul dan tombol edit hapus kembali ke bawah', () => {
  assert.match(reseller, /var promoTitle=String\(x\.name\|\|x\.code\|\|'Promo'\)/);
  assert.match(reseller, /String\(x\.description\)\.trim\(\)!==promoTitle\.trim\(\)/);
  assert.match(reseller, /promoCompactActions promoBottomActions/);
  assert.doesNotMatch(reseller, /class="promoHeadTools"><div class="promoCompactActions"/);
});

test('dashboard bisa menambah banner gambar dan banner bawaan serta mengubah urutan', () => {
  assert.match(reseller, /id="addImageBannerRow"/);
  assert.match(reseller, /id="addNativeBannerRow"/);
  assert.match(reseller, /data-banner-up/);
  assert.match(reseller, /data-banner-down/);
  assert.match(reseller, /data-banner-kicker/);
  assert.match(reseller, /data-banner-title/);
  assert.match(reseller, /data-banner-bg/);
  assert.match(reseller, /data-banner-text-color/);
  assert.match(reseller, /data-banner-position/);
  assert.match(reseller, /data-banner-vertical/);
});

test('marketplace merender banner bawaan dan banner gambar dalam satu carousel', () => {
  assert.match(storeService, /type: 'native'/);
  assert.match(storeService, /background_color/);
  assert.match(storeService, /text_position/);
  assert.match(storeJs, /function renderNativeBannerSlide/);
  assert.match(storeJs, /hero-native-slide/);
  assert.match(storeCss, /\.hero-native-slide\{/);
  assert.match(storeCss, /\.native-banner-title\{/);
});

test('Cara Order marketplace mengikuti mode tombol toko', () => {
  assert.match(storeHtml, /id="marketplaceGuideRow"/);
  assert.match(storeHtml, /id="marketplaceHowToButton"/);
  assert.match(storeHtml, /id="howToModal"/);
  assert.match(storeJs, /menuMode === 'products'/);
  assert.match(storeService, /bot_menu_mode:/);
  assert.match(botHandlers, /‹❓› Cara Order/);
});
