const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('v82.9 bot checkout reuses fresh Telegram supplier stock instead of forcing a second MTProto check', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /async function telegramAvailabilityForCheckout\(productId\)/);
  assert.match(bot, /live:\s*true,\s*\n\s*force:\s*false,\s*\n\s*allowCached:\s*true/);
  assert.match(bot, /await telegramAvailabilityForCheckout\(supplier\.productId\)/);
  assert.doesNotMatch(bot, /telegramSupplier\.getAvailability\(supplier\.productId, \{ live: true, force: true, allowCached: false/);
});

test('v82.9 wallet and QRIS callbacks do not validate Telegram supplier against local stock arrays', () => {
  const bot = read('lib/botHandlers.js');
  const expected = /!isSupplierProduct\(product, order\) && !isPoOrder\(product, order\) && availableStockForOrder\(product, order\)/g;
  const matches = bot.match(expected) || [];
  assert.equal(matches.length, 2);
});

test('v82.9 confirmation live stock check respects fresh supplier cache', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /getAvailability\(ref, \{ live: true, force: false, allowCached: true, waitMs: 8000 \}\)/);
});
