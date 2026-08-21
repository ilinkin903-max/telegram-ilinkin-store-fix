const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'store.js'), 'utf8');
const db = fs.readFileSync(path.join(root, 'lib', 'db.js'), 'utf8');
const service = fs.readFileSync(path.join(root, 'lib', 'storeService.js'), 'utf8');
const payment = fs.readFileSync(path.join(root, 'lib', 'paymentService.js'), 'utf8');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const resellerApi = fs.readFileSync(path.join(root, 'api', 'reseller-data.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'update-v68-marketplace-po.sql'), 'utf8');

test('banner marketplace menggunakan clone agar loop terus tanpa lompat visual', () => {
  assert.match(js, /renderItems = \[items\[items\.length - 1\]\]\.concat\(items, \[items\[0\]\]\)/);
  assert.match(js, /heroTrack\.ontransitionend/);
  assert.match(js, /state\.bannerPosition === count \+ 1/);
});

test('gambar produk, flash sale, dan detail dipaksa rasio 1 banding 1 termasuk HP', () => {
  assert.match(css, /\.product-image-wrap,\s*\.flash-image-wrap,\s*\.detail-image-wrap \{ aspect-ratio: 1 \/ 1; \}/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.detail-image-wrap \{ aspect-ratio: 1 \/ 1; \}/);
});

test('deskripsi detail dapat dilipat dan dibuka lengkap', () => {
  assert.match(html, /id="detailDescriptionToggle"/);
  assert.match(js, /function setDetailDescription/);
  assert.match(css, /detail-description\.collapsed/);
  assert.match(js, /Tampilkan lebih sedikit/);
});

test('promo memakai persen dan harga promo ditampilkan sebelum harga coret', () => {
  assert.match(js, /function discountPercent/);
  assert.match(js, /card-badge promo">-' \+ pct \+ '%/);
  assert.match(js, /'<strong>' \+ escapeHtml\(rupiah\(bestPromo\.final\)\) \+ '<\/strong><del>'/);
  assert.doesNotMatch(js, /variant-promo-chip[^\n]*hemat/i);
});

test('produk dapat diset AUTO atau PRE-ORDER dari dashboard', () => {
  assert.match(reseller, /name="delivery_mode"/);
  assert.match(reseller, /Pre-Order · saya kirim manual setelah pembayaran/);
  assert.match(reseller, /data-tab="poOrders"/);
  assert.match(resellerApi, /delivery_mode/);
});

test('PO tidak memotong stok dan dicatat menunggu pengiriman secara atomik', () => {
  assert.match(migration, /create or replace function public\.fulfill_po_order_v68/);
  assert.match(migration, /for update/);
  assert.match(migration, /'po', 'waiting_delivery'/);
  assert.doesNotMatch(migration, /set stock\s*=/i);
  assert.match(db, /fulfill_po_wallet_order_v(?:68|69)/);
  assert.match(db, /fulfill_po_paid_order_v(?:68|69)/);
});

test('pembayaran PO masuk status awaiting_delivery bukan mengirim stok otomatis', () => {
  assert.match(service, /result\.po_waiting \? 'awaiting_delivery' : 'completed'/);
  assert.match(payment, /sendPoPaidNotice/);
  assert.match(payment, /sendOwnerPoWaitingLog/);
  assert.match(payment, /poWaiting \? 'awaiting_delivery' : 'completed'/);
});

test('seller harus mengonfirmasi sebelum data PO dikirim dan canceled diblokir', () => {
  assert.match(reseller, /Konfirmasi Pengiriman PRE-ORDER/);
  assert.match(reseller, /Kirim ke Pembeli/);
  assert.match(resellerApi, /Penjualan ini sudah CANCELED\. Produk PO tidak dikirim/);
  assert.match(resellerApi, /sendPoDeliveryReceipt/);
  assert.match(resellerApi, /markPoDelivered/);
});

test('data PO panjang dipecah menjadi beberapa pesan receipt agar tidak terpotong', () => {
  assert.match(payment, /splitReceiptProduct/);
  assert.match(payment, /LANJUTAN PRODUK YANG DIDAPAT/);
  assert.match(payment, /Produk dilanjutkan pada pesan berikutnya/);
});

test('notifikasi pembayaran PO dapat dicoba ulang jika Telegram sempat gagal', () => {
  assert.match(payment, /po_paid_notice:\$\{invoice\}/);
  assert.match(payment, /releaseClaim\(noticeKey\)/);
  assert.match(payment, /markClaimDone\(noticeKey/);
});
