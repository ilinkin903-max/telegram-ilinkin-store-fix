const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
function read(file){ return fs.readFileSync(path.join(__dirname,'..',file),'utf8'); }

test('bot tidak mengirim gambar/video produk saat produk atau varian dipilih', () => {
  const bot = read('lib/botHandlers.js');
  assert.doesNotMatch(bot, /sendProductMedia/);
  const start = bot.indexOf('async function startOrderWithSelection');
  const end = bot.indexOf('async function handleVariantSelection', start);
  assert.ok(start > 0 && end > start);
  const block = bot.slice(start, end);
  assert.doesNotMatch(block, /sendPhotoRef|sendVideoRef|image_url|media_type/);
  assert.match(block, /return showConfirmation\(query, true, \{ order: savedOrder, product \}\);/);
});

test('media produk tetap tersedia untuk marketplace', () => {
  const store = read('public/store.js');
  const service = read('lib/storeService.js');
  assert.match(service, /image_url:/);
  assert.match(service, /media_type:/);
  assert.match(store, /productMediaMarkup/);
  assert.match(store, /detailMediaType === 'video'/);
});

test('fitur media start dan broadcast tetap tersedia', () => {
  const bot = read('lib/botHandlers.js');
  const api = read('api/reseller-data.js');
  assert.match(bot, /mediaValue && mediaType === 'video'/);
  assert.match(bot, /sendVideoRef\(chatId, mediaValue/);
  assert.match(api, /type === 'video'/);
  assert.match(api, /sendVideoRef\(id, video/);
});
