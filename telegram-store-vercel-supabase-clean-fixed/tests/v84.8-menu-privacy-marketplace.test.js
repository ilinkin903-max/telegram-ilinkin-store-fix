const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('username pembeli pada notifikasi transaksi channel disamarkan sebagian', () => {
  const payment = require('../lib/paymentService');
  assert.equal(payment.maskChannelUsername('@usernamepanjang'), '@use***ng');
  assert.equal(payment.maskChannelUsername('abcdef'), '@ab***ef');
  assert.equal(payment.maskChannelUsername('abc'), '@a*c');
  assert.equal(payment.maskChannelUsername(''), '');
  assert.equal(payment.channelBuyerLabel({ username: 'usernamepanjang' }, 123), '@use***ng');
  assert.equal(payment.channelBuyerLabel({ first_name: 'Pembeli' }, 123), 'Pembeli');
  assert.equal(payment.channelBuyerLabel({}, 123), '123');

  const source = read('lib/paymentService.js');
  const poNotice = source.slice(source.indexOf('async function sendOwnerPoWaitingLog'), source.indexOf('async function sendOwnerLog'));
  const completedNotice = source.slice(source.indexOf('async function sendOwnerLog'), source.indexOf('async function notifyFirstPurchaseReferral'));
  assert.match(poNotice, /channelBuyerLabel\(buyer, order\?\.telegram_id\)/);
  assert.match(completedNotice, /channelBuyerLabel\(buyer, order\?\.telegram_id\)/);
});

test('dashboard menyimpan URL atau username bot Nokos tanpa migration tabel baru', () => {
  const db = read('lib/db.js');
  const api = read('api/reseller-data.js');
  const dashboard = read('api/reseller.js');
  assert.match(db, /nokos_link: ''/);
  assert.match(db, /'nokos_link'/);
  assert.match(api, /nokos_link: body\.nokos_link/);
  assert.match(dashboard, /name="nokos_link"/);
  assert.match(dashboard, /@BotNokos, BotNokos, t\.me\/BotNokos/);
  assert.match(dashboard, /'group_link','nokos_link','bot_menu_mode'/);
});

test('tombol Nokos berada di sebelah Daftar Produk dan menerima username tanpa @', () => {
  const source = read('lib/botHandlers.js');
  assert.match(source, /function normalizeTelegramTargetUrl/);
  assert.match(source, /\^\[A-Za-z0-9_\]\{5,32\}\$/);
  assert.match(source, /return `https:\/\/t\.me\/\$\{username\}`/);

  const helpers = require('../lib/botHandlers')._test;
  assert.equal(helpers.normalizeTelegramTargetUrl('@BotNokos'), 'https://t.me/BotNokos');
  assert.equal(helpers.normalizeTelegramTargetUrl('BotNokos'), 'https://t.me/BotNokos');
  assert.equal(helpers.normalizeTelegramTargetUrl('t.me/BotNokos?start=paket'), 'https://t.me/BotNokos?start=paket');
  assert.equal(helpers.normalizeTelegramTargetUrl('https://example.com/nokos'), 'https://example.com/nokos');
  assert.equal(helpers.normalizeTelegramTargetUrl('javascript:alert(1)'), '');

  const keyboard = helpers.homeKeyboard(null, 123, { bot_menu_mode: 'both', nokos_link: 'BotNokos' }).inline_keyboard;
  const productRow = keyboard.find((row) => row.some((button) => button.callback_data === 'daftarproduk'));
  assert.ok(productRow);
  assert.equal(productRow.length, 2);
  assert.equal(productRow[0].text, '‹📦› Daftar Produk');
  assert.equal(productRow[1].text, '‹📱› Nokos');
  assert.equal(productRow[1].url, 'https://t.me/BotNokos');
  assert.equal(productRow[1].style, 'primary');
});

test('label menu saldo dipersingkat dan Cara Order memakai tombol biru', () => {
  const bot = read('lib/botHandlers.js');
  const keyboard = bot.slice(bot.indexOf('function homeKeyboard'), bot.indexOf('async function editMessage'));
  assert.match(keyboard, /‹💰› Saldo & Referral/);
  assert.doesNotMatch(keyboard, /Saldo, Top Up & Referral/);
  assert.match(keyboard, /styledButton\('‹❓› Cara Order', \{ callback_data: 'caraorder' \}, 'primary'\)/);
});

test('marketplace mengganti indikator workflow Otomatis menjadi jumlah stok', () => {
  const store = read('public/store.js');
  const card = store.slice(store.indexOf('function productCard'), store.indexOf('function filterProducts'));
  const estimate = store.slice(store.indexOf('function updateProductEstimate'), store.indexOf('function renderVariants'));
  const variants = store.slice(store.indexOf('function renderVariants'), store.indexOf('function openProduct'));
  assert.match(card, /isWorkflow \|\| isSupplier \|\| hasSupplierVariants \|\| hasWorkflowVariants/);
  assert.match(card, /'Stok ' \+ Math\.max\(0, Number\(product\.stock \|\| 0\)\)/);
  assert.doesNotMatch(card, /isWorkflow \? 'Otomatis'/);
  assert.match(estimate, /isWorkflow \? \('Stok tersedia: ' \+ selectedStock\(\)/);
  assert.match(estimate, /isWorkflow \? \('Stok ' \+ selectedStock\(\)\)/);
  assert.match(variants, /workflowVariant \? \('Stok ' \+ variant\.stock\)/);
});

test('metadata rilis v84.8.1 konsisten', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '84.8.1');
  assert.equal(read('VERSION').trim(), 'v84.8.1');
  assert.equal(read('VERSION.txt').trim(), 'v84.8.1');
  assert.match(read('api/index.js'), /Link Auto Order · v84\.8\.1/);
});
