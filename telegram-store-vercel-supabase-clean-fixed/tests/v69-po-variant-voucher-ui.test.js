const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const db = read('lib/db.js');
const service = read('lib/storeService.js');
const payment = read('lib/paymentService.js');
const bot = read('lib/botHandlers.js');
const storeApi = read('api/store-data.js');
const reseller = read('api/reseller.js');
const resellerApi = read('api/reseller-data.js');
const storeJs = read('public/store.js');
const css = read('public/store.css');
const sql = read('supabase/update-v69-po-variant-voucher-ui.sql');

test('PO dapat diatur per varian dan disimpan di JSON varian', () => {
  assert.match(db, /delivery_mode: normalizeDeliveryMode\(item\?\.delivery_mode/);
  assert.match(db, /function variantDeliveryMode/);
  assert.match(reseller, /Sistem Pengiriman Varian/);
  assert.match(reseller, /data-vfield="delivery"/);
  assert.match(reseller, /data-evfield="delivery"/);
  assert.match(resellerApi, /delivery_mode: \['auto', 'po'\]/);
});

test('checkout menyimpan snapshot mode pengiriman dan PO memakai RPC v69', () => {
  assert.match(db, /delivery_mode: normalizeDeliveryMode\(input\.delivery_mode, 'auto'\)/);
  assert.match(db, /fulfill_po_wallet_order_v69/);
  assert.match(db, /fulfill_po_paid_order_v69/);
  assert.match(sql, /pending_orders add column if not exists delivery_mode/);
  assert.match(sql, /v_variant->>'delivery_mode'/);
  assert.match(sql, /SELECTION_NOT_PO/);
});

test('bot juga menghormati mode PO per varian', () => {
  assert.match(bot, /isPoProduct\(product, variant\)/);
  assert.match(bot, /isPoOrder\(product, order\)/);
  assert.match(bot, /delivery_mode: isPoProduct\(product, variant\) \? 'po' : 'auto'/);
});

test('voucher dihitung server sebelum modal konfirmasi dibuka', () => {
  assert.match(service, /async function previewCheckout/);
  assert.match(storeApi, /action === 'checkout-preview'/);
  assert.match(storeJs, /await api\('checkout-preview'/);
  assert.match(storeJs, /Total setelah diskon/);
  assert.match(storeJs, /preview\.discount/);
  assert.match(storeJs, /renderPaymentMethods\(Number\(preview\.after_discount/);
});

test('pesan produk PO tetap memuat SnK snapshot dan data produk mudah disalin', () => {
  assert.match(sql, /terms_snapshot text not null default ''/);
  assert.match(sql, /v_terms_snapshot/);
  assert.match(payment, /poOrder\?\.terms_snapshot/);
  assert.match(payment, /SYARAT &amp; KETENTUAN/);
  assert.match(payment, /<pre>\$\{escapeHtml\(raw\)\}<\/pre>/);
  assert.match(payment, /Tekan lama\/blok data produk/);
  assert.match(resellerApi, /sendPoDeliveryReceipt\(po\.telegram_id, po, deliveryText, product\)/);
});

test('Flash Sale dipadatkan dan menampilkan rating serta terjual dekat harga', () => {
  assert.match(storeJs, /class="flash-meta"/);
  assert.match(storeJs, /★ 5\.0/);
  assert.match(css, /\.flash-body \{[\s\S]*gap: 3px/);
  assert.match(css, /\.flash-variant\.is-empty \{ display: none; \}/);
  assert.match(css, /\.flash-stock-track \{[\s\S]*height: 7px/);
});

test('tombol simpan edit produk menjadi dock mengambang untuk HP dan tablet', () => {
  assert.match(reseller, /class="editSaveDock"/);
  assert.match(reseller, /\.editSaveDock\{position:sticky/);
  assert.match(reseller, /@media\(max-width:900px\)\{#modalEditForm\{padding-bottom:76px\}\.editSaveDock\{position:fixed/);
});
