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

test('dashboard banner memakai manager gambar/bawaan dengan urutan dan hapus', () => {
  assert.match(reseller, /id="addImageBannerRow"/);
  assert.match(reseller, /id="addNativeBannerRow"/);
  assert.match(reseller, /data-banner-name/);
  assert.match(reseller, /data-banner-url/);
  assert.match(reseller, /data-banner-up/);
  assert.match(reseller, /data-banner-down/);
  assert.match(reseller, /data-remove-banner/);
  assert.match(reseller, /name="banner_items"/);
});

test('produk bisa dipilih untuk bot+marketplace atau marketplace saja', () => {
  assert.match(reseller, /name="display_scope"/);
  assert.match(reseller, /Bot Telegram \+ Marketplace/);
  assert.match(reseller, /Marketplace saja/);
});

test('marketplace menampilkan harga termurah dan harga promo dicoret tanpa blok varian promo di kartu', () => {
  assert.match(js, /cardBestPromo/);
  assert.match(js, /productPriceText/);
  assert.match(js, /<del>/);
  assert.doesNotMatch(js, /cardVariantPromoRows/);
  assert.doesNotMatch(js, /variant-promo-row/);
});

test('unduh QRIS memakai endpoint server dan Telegram downloadFile', () => {
  assert.match(js, /action=qr-download/);
  assert.match(js, /tg\.downloadFile/);
  const api = fs.readFileSync(path.join(root, 'api', 'store-data.js'), 'utf8');
  assert.match(api, /Content-Disposition/);
  assert.match(api, /getQrDownloadByToken/);
  assert.match(api, /qr-download-token/);
  assert.doesNotMatch(api, /Access-Control-Allow-Origin/);
});

test('v53 memakai hero rasio 2,39:1 dan nama banner tidak ditampilkan di marketplace', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
  assert.match(css, /aspect-ratio:\s*2\.39\s*\/\s*1/);
  assert.doesNotMatch(js, /hero-slide-name/);
});

test('v54 menyediakan Flash Sale biru di menu Promo dan pemilihan per promo otomatis', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
  assert.match(html, /id="flashSaleSection"/);
  assert.match(html, /id="flashSaleCountdown"/);
  assert.match(js, /renderFlashSale/);
  assert.match(js, /flash_sale_eligible/);
  assert.match(js, /flash_sale_sold/);
  assert.match(css, /v54: Flash Sale biru/);
  assert.match(reseller, /id="flashSaleForm"/);
  assert.match(reseller, /name="flash_sale_start_at"/);
  assert.match(reseller, /name="flash_sale_end_at"/);
  assert.match(reseller, /id="promoFlashSale"/);
  assert.doesNotMatch(reseller, /id="addFlashSaleRow"/);
});

test('v53 menempatkan blok benefit setelah katalog', () => {
  assert.ok(html.indexOf('id="catalogSection"') < html.indexOf('footer-benefits'));
});

test('v53 meminta konfirmasi sebelum membuat pembayaran', () => {
  assert.match(html, /id="confirmModal"/);
  assert.match(html, /Lanjutkan dengan QRIS/);
  assert.match(js, /openCheckoutConfirmation/);
  assert.match(js, /confirmCheckoutButton/);
});


test('Flash Sale menampilkan nama varian tepat setelah nama produk dan jumlah terjual periode Flash Sale', () => {
  const namePos = js.indexOf('<h3 class="flash-name">');
  const variantPos = js.indexOf('<div class="flash-variant');
  const pricePos = js.indexOf('<div class="flash-price">');
  assert.ok(namePos >= 0 && variantPos > namePos && pricePos > variantPos);
  assert.match(js, /promo\.sold/);
  assert.match(js, /terjual/i);
});


test('v55 menampilkan link halaman pembayaran AutoGoPay bila tersedia', () => {
  assert.match(html, /id="paymentCheckoutLink"/);
  assert.match(js, /payment\.checkout_url/);
  assert.match(js, /Buka Halaman Pembayaran|paymentCheckoutLink/);
});


test('v63 seluruh submenu Pengaturan membuka halaman terpisah', () => {
  const reseller = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller.js'), 'utf8');
  assert.match(reseller, /class="settingsSubBtn" data-tab="storeSettings"/);
  assert.match(reseller, /class="settingsSubBtn" data-tab="bannerSettings"/);
  assert.match(reseller, /class="settingsSubBtn" data-tab="startSettings"/);
  assert.match(reseller, /class="settingsSubBtn" data-tab="license"/);
  assert.match(reseller, /class="settingsSubBtn" data-tab="deepStats"/);
  assert.match(reseller, /class="settingsSubBtn" data-tab="backup"/);
  assert.match(reseller, /class="settingsSubBtn" data-tab="maintenance"/);
  assert.match(reseller, /<section id="storeSettings" class="section">/);
  assert.match(reseller, /<section id="bannerSettings" class="section">/);
  assert.match(reseller, /<section id="startSettings" class="section">/);
  assert.match(reseller, /\.settingsSubNav\{display:grid;grid-template-columns:1fr/);
  assert.doesNotMatch(reseller, /data-settings-sub=/);
  assert.match(reseller, /data-promo-sub="flash"/);
});

test('v58 flash sale selalu satu baris horizontal', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'store.css'), 'utf8');
  assert.match(css, /flash-sale-grid[^{]*\{[^}]*display:\s*flex/i);
  assert.match(css, /flash-sale-grid[^{]*\{[^}]*flex-wrap:\s*nowrap/i);
  assert.match(css, /flash-sale-grid[^{]*\{[^}]*overflow-x:\s*auto/i);
});

test('marketplace memakai invoice_display agar prefix gateway tidak terlihat', () => {
  const storeJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'store.js'), 'utf8');
  assert.match(storeJs, /payment\.invoice_display \|\| payment\.invoice/);
  assert.match(storeJs, /row\.invoice_display \|\| row\.invoice/);
});

test('promo Flash Sale difilter dari promo biasa ketika jadwal tidak aktif', () => {
  const db = fs.readFileSync(path.join(__dirname, '..', 'lib', 'db.js'), 'utf8');
  const service = fs.readFileSync(path.join(__dirname, '..', 'lib', 'storeService.js'), 'utf8');
  assert.match(db, /promoAllowedByFlashSale/);
  assert.match(db, /flashSaleWindowState/);
  assert.match(service, /return !flashPromoCodeSet\.has\(code\) \|\| flashWindow\.active/);
});


test('v61 membersihkan kartu dashboard, produk, dan penjualan dari rincian yang tidak perlu', () => {
  const statsStart = reseller.indexOf('function renderStats()');
  const statsEnd = reseller.indexOf('function renderCharts()', statsStart);
  const statsBlock = reseller.slice(statsStart, statsEnd);
  assert.doesNotMatch(statsBlock, /Profit Bulan Ini/);
  assert.doesNotMatch(statsBlock, /Total Profit/);

  const productStart = reseller.indexOf('function renderProducts()');
  const productEnd = reseller.indexOf('function findProduct(', productStart);
  const productBlock = reseller.slice(productStart, productEnd);
  assert.doesNotMatch(productBlock, /Modal default|Margin normal|modal /i);
  assert.doesNotMatch(productBlock, /productBulkChips/);
  assert.match(productBlock, /stok/);

  const ordersStart = reseller.indexOf('function renderOrders()');
  const ordersEnd = reseller.indexOf('function userMatches(', ordersStart);
  const ordersBlock = reseller.slice(ordersStart, ordersEnd);
  assert.doesNotMatch(ordersBlock, /Omzet bersih|Modal supplier:|Profit kotor/i);
});

test('v61 detail penjualan ringkas dan Atur Modal memakai Profit Bersih', () => {
  const detailStart = reseller.indexOf('function openOrderProducts(');
  const detailEnd = reseller.indexOf('function orderMatches(', detailStart);
  const detailBlock = reseller.slice(detailStart, detailEnd);
  assert.doesNotMatch(detailBlock, /Omzet Bersih|Modal Supplier<|Profit Kotor/i);
  assert.match(detailBlock, /Fee Pembayaran/);
  assert.match(detailBlock, /orderStatusLabel\(o\)/);

  const costStart = reseller.indexOf('function openOrderCost(');
  const costEnd = reseller.indexOf('function openOrderProducts(', costStart);
  const costBlock = reseller.slice(costStart, costEnd);
  assert.match(costBlock, /Profit bersih/);
  assert.match(costBlock, /Simpan Modal & Hitung Profit Bersih/);
  assert.doesNotMatch(costBlock, /Profit kotor/);
});


test('v63 merapikan Flash Sale, katalog mobile, footer, dan grup Telegram', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
  assert.match(css, /grid-template-rows:\s*36px 15px auto 13px/);
  assert.match(js, /flash-variant' \+ \(promo\.variant \? '' : ' is-empty'\)/);
  assert.doesNotMatch(html, />Urutkan</);
  assert.match(css, /sort-control select \{ width:132px/);
  assert.ok(html.indexOf('footer-intro') < html.indexOf('footer-benefits'));
  assert.match(html, /telegram-community-card/);
  assert.match(html, /Telegram<\/strong>/);
});

test('v63 dashboard mendukung status CANCELED dan kartu user ringkas', () => {
  const dataApi = fs.readFileSync(path.join(root, 'api', 'reseller-data.js'), 'utf8');
  const db = fs.readFileSync(path.join(root, 'lib', 'db.js'), 'utf8');
  const sql = fs.readFileSync(path.join(root, 'supabase', 'update-v63-ui-order-status.sql'), 'utf8');
  assert.match(reseller, /orderStatusButton/);
  assert.match(reseller, /CANCELED/);
  assert.match(reseller, /Kembali/);
  assert.match(reseller, /userCardGrid/);
  assert.match(dataApi, /action === 'update-order-status'/);
  assert.match(db, /async function updateTransactionStatus/);
  assert.match(sql, /status text not null default 'completed'/);
});

test('pesan start memakai HTML sehingga nama toko bertitik tidak diberi backslash', () => {
  const bot = fs.readFileSync(path.join(root, 'lib', 'botHandlers.js'), 'utf8');
  const homeStart = bot.indexOf('async function buildHomeText');
  const homeEnd = bot.indexOf('function variantKey', homeStart);
  const home = bot.slice(homeStart, homeEnd);
  assert.match(home, /escapeHtml\(config\.botName\)/);
  assert.match(home, /parse_mode: 'HTML'/);
  assert.doesNotMatch(home, /escapeMarkdownText\(config\.botName\)/);
});


test('v64 menempatkan status penjualan segaris dengan nama produk', () => {
  assert.match(reseller, /orderTitleRow/);
  assert.match(reseller, /Tandai penjualan sebagai dibatalkan/);
  assert.match(reseller, /Ya, Tandai Dibatalkan/);
});

test('v64 merapikan kartu users pada layar sedang dan tombol hapus diperkecil', () => {
  assert.match(reseller, /userIdentity/);
  assert.match(reseller, /@media\(max-width:1024px\)/);
  assert.match(reseller, /\.userDelete\{[^}]*min-height:32px/);
});

test('v64 promo dan voucher memiliki kartu serta submenu ringkas', () => {
  assert.match(reseller, /promoCompactCard/);
  assert.match(reseller, /promoCompactBody/);
  assert.match(reseller, /promoSubGrid\{display:grid;grid-template-columns:repeat\(3/);
  assert.match(reseller, /id="discountValueHelp"/);
});

test('v64 menyediakan pengaturan tombol bot dan tombol Order Sekarang pada broadcast', () => {
  const bot = fs.readFileSync(path.join(root, 'lib', 'botHandlers.js'), 'utf8');
  const db = fs.readFileSync(path.join(root, 'lib', 'db.js'), 'utf8');
  const dataApi = fs.readFileSync(path.join(root, 'api', 'reseller-data.js'), 'utf8');
  assert.match(reseller, /name="bot_menu_mode"/);
  assert.match(bot, /settings\.bot_menu_mode/);
  assert.match(db, /bot_menu_mode: 'both'/);
  assert.match(reseller, /name="order_button_enabled"/);
  assert.match(dataApi, /broadcastOrderMarkup/);
  assert.match(dataApi, /Order Sekarang/);
});
