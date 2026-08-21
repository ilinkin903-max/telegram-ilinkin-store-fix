const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('settings support required channel, transaction channel and hidden total users', () => {
  const db = read('lib/db.js');
  const api = read('api/reseller-data.js');
  const ui = read('api/reseller.js');
  for (const key of ['show_total_users','join_required_enabled','required_channel_id','required_channel_link','transaction_notifications_enabled','transaction_channel_id']) {
    assert.match(db, new RegExp(key));
    assert.match(api, new RegExp(key));
    assert.match(ui, new RegExp(key));
  }
});

test('telegram membership check gates bot usage and has recheck button', () => {
  const telegram = read('lib/telegram.js');
  const handlers = read('lib/botHandlers.js');
  assert.match(telegram, /getChatMember/);
  assert.match(handlers, /requiredChannelState/);
  assert.match(handlers, /JOIN CHANNEL TERLEBIH DAHULU/);
  assert.match(handlers, /Saya Sudah Join/);
  assert.match(handlers, /checkjoin/);
});

test('legacy Markdown escaping no longer adds visible slashes before punctuation', () => {
  const handlers = read('lib/botHandlers.js');
  const fn = handlers.slice(handlers.indexOf('function escapeMarkdownText'), handlers.indexOf('function formatProductInfoText'));
  assert.doesNotMatch(fn, /~>\#\+/);
  assert.doesNotMatch(fn, /\{\}\.\!/);
  assert.match(fn, /MarkdownV2/);
});

test('transaction success notification also covers supplier fulfillment and uses configurable channel', () => {
  const payment = read('lib/paymentService.js');
  assert.match(payment, /transactionChannelTarget/);
  assert.match(payment, /transaction_channel_id/);
  assert.match(payment, /claimTransactionNotice\('completed'/);
  assert.match(payment, /await sendOwnerLog\(order, product, result\.transaction, currentBuyer\)/);
});

test('mobile edit save dock is placed near bottom instead of 108px above it', () => {
  const ui = read('api/reseller.js');
  assert.doesNotMatch(ui, /editSaveDock\{bottom:108px!important\}/);
  assert.match(ui, /editSaveDock\{bottom:max\(12px,env\(safe-area-inset-bottom\)\)!important\}/);
});
