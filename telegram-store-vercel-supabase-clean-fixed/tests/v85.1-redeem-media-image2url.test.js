const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
function read(file){ return fs.readFileSync(path.join(__dirname,'..',file),'utf8'); }

test('kode redeem polos dicek sesudah flow topup/voucher dan sebelum unknown command', () => {
  const bot = read('lib/botHandlers.js');
  const topup = bot.indexOf("pendingTopup?.status === 'waiting_amount'");
  const voucher = bot.indexOf("pending?.status === 'waiting_voucher'");
  const plain = bot.indexOf('kode redeem boleh dikirim langsung tanpa /redeem');
  const unknown = bot.indexOf("Perintah tidak dikenal. Ketik /start");
  assert.ok(topup > 0 && voucher > topup && plain > voucher && unknown > plain);
  const block = bot.slice(plain, unknown);
  assert.match(block, /db\.getRedeemCode\(plainRedeemCode\)/);
  assert.match(block, /processRedeemCode\(chatId, from, plainRedeemCode\)/);
  assert.match(block, /\^\[A-Z0-9-\]\{4,64\}\$/);
});

test('Media Hub memakai Image2URL dan punya fallback workspace video', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /data-tab="mediaHub"/);
  assert.match(ui, /https:\/\/www\.image2url\.com\/id\/dashboard/);
  assert.match(ui, /https:\/\/www\.image2url\.com\/id\/video-to-url/);
  assert.match(ui, /image2urlUploadBtn/);
  assert.match(ui, /api\('image2url-upload'/);
  assert.match(ui, /mediaUseProduct/);
  assert.match(ui, /mediaUseBroadcast/);
  assert.match(ui, /mediaUseStart/);
});

test('backend upload gambar memproxy ke endpoint Image2URL dengan validasi aman', () => {
  const api = read('api/reseller-data.js');
  const start = api.indexOf('async function uploadImageToImage2Url');
  const end = api.indexOf('async function broadcast', start);
  const block = api.slice(start, end);
  assert.match(block, /https:\/\/www\.image2url\.com\/api\/upload/);
  assert.match(block, /2 \* 1024 \* 1024/);
  assert.match(block, /image\\\/\(\?:png\|jpe\?g\|gif\|webp\)/);
  assert.match(block, /FormData/);
  assert.match(block, /new Blob/);
  assert.match(api, /action === 'image2url-upload'/);
});

test('produk menyimpan media_type dan marketplace merender video', () => {
  const db = read('lib/db.js');
  const store = read('lib/storeService.js');
  const ui = read('public/store.js');
  const html = read('public/index.html');
  const sql = read('supabase/update-v85.1-media.sql');
  assert.match(db, /media_type:/);
  assert.match(store, /media_type:/);
  assert.match(sql, /add column if not exists media_type/i);
  assert.match(sql, /products_media_type_check/i);
  assert.match(html, /id="detailVideo"/);
  assert.match(ui, /productMediaMarkup/);
  assert.match(ui, /detailMediaType === 'video'/);
});

test('Telegram mendukung video untuk start dan broadcast tanpa mengirim media produk saat dipilih', () => {
  const tg = read('lib/telegram.js');
  const bot = read('lib/botHandlers.js');
  const api = read('api/reseller-data.js');
  assert.match(tg, /async function sendVideoRef/);
  assert.match(tg, /callTelegram\('sendVideo'/);
  assert.match(bot, /mediaValue && mediaType === 'video'/);
  assert.doesNotMatch(bot, /sendProductMedia/);
  assert.match(api, /type === 'video'/);
  assert.match(api, /sendVideoRef\(id, video/);
});
