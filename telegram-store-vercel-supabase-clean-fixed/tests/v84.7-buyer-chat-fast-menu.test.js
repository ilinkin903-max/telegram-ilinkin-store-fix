const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard manager menyediakan chat pembeli pada seluruh area transaksi penting', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /id="buyerChatLookupInput"/);
  assert.match(dashboard, /id="buyerChatLookupOpen"/);
  assert.match(dashboard, /function buyerChatButton/);
  assert.match(dashboard, /function renderOrders/);
  assert.match(dashboard, /function renderPoOrders/);
  assert.match(dashboard, /function renderUsers/);
  assert.match(dashboard, /buyerChatButton\(o,'💬 Chat Pembeli'/);
  assert.match(dashboard, /buyerChatButton\(u,'💬 Chat'/);
  assert.match(dashboard, /modalBuyerActions/);
  assert.match(dashboard, /topUserActions/);
});

test('dashboard membuka username secara langsung dan mempunyai fallback ID Telegram', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /async function openBuyerChat/);
  assert.match(dashboard, /https:\/\/t\.me\//);
  assert.match(dashboard, /tg\.openTelegramLink\(publicUrl\)/);
  assert.match(dashboard, /tg:\/\/user\?id=/);
  assert.match(dashboard, /data-chat-user=/);
  assert.match(dashboard, /data-chat-username=/);
  assert.match(dashboard, /if\(buyer\.telegram_id\)\{/);
  assert.match(dashboard, /username:cleanTelegramUsername\(exact\.username\)/);
});

test('pencarian pembeli menerima ID, nama, @username, dan username biasa', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /function buyerLookupMatches/);
  assert.match(dashboard, /async function openBuyerLookup/);
  assert.match(dashboard, /\^@\+/);
  assert.match(dashboard, /cleanTelegramId\(value\)/);
  assert.match(dashboard, /apiSafe\('buyer-lookup',\[\],\{q:value\}\)/);
  assert.match(dashboard, /String\(u\.first_name\|\|''\).*toLowerCase/);
  assert.match(dashboard, /Ditemukan '\+rows\.length\+' akun/);
});

test('endpoint buyer lookup tetap owner-only dan mencari data di luar daftar browser', () => {
  const api = read('api/reseller-data.js');
  assert.match(api, /assertOwnerMiniApp\(req\)/);
  assert.match(api, /async function lookupBuyerAccounts/);
  assert.match(api, /db\.listUsers\(1000\)/);
  assert.match(api, /db\.listTransactions\(500\)/);
  assert.match(api, /db\.listPoOrders\(300\)/);
  assert.match(api, /tg\.callTelegram\('getChat'/);
  assert.match(api, /username: live\.username/);
  assert.match(api, /action === 'buyer-lookup'/);
});

test('inline JavaScript dashboard dapat dikompilasi', async () => {
  const handler = require(path.join(root, 'api', 'reseller.js'));
  let html = '';
  const res = {
    setHeader() {},
    status() { return this; },
    send(value) { html = String(value); return this; },
    end(value) { html = String(value || ''); return this; }
  };
  await handler({}, res);
  const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter(Boolean);
  assert.ok(blocks.length > 0, 'inline script dashboard tidak ditemukan');
  blocks.forEach((code, index) => {
    assert.doesNotThrow(() => new vm.Script(code, { filename: `reseller-inline-${index + 1}.js` }));
  });
});

test('menu bot memakai cache singkat dengan penggabungan request yang sama', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /BOT_SETTINGS_CACHE_MS = 8 \* 1000/);
  assert.match(bot, /BOT_WALLET_CACHE_MS = 3 \* 1000/);
  assert.match(bot, /BOT_HISTORY_CACHE_MS = 5 \* 1000/);
  assert.match(bot, /BOT_MEMBERSHIP_CACHE_MS = 15 \* 1000/);
  assert.match(bot, /BOT_SUPPLIER_CACHE_MS = 10 \* 1000/);
  assert.match(bot, /async function readThroughBotCache/);
  assert.match(bot, /entry\.promiseRevision/);
  assert.match(bot, /entry\.promise && \(!revisionKey \|\| Number\(entry\.promiseRevision/);
  assert.match(bot, /cachedWalletSummary/);
  assert.match(bot, /cachedUserHistory/);
  assert.match(bot, /cachedSupplierAvailability/);
  assert.match(bot, /touchBotUser/);
});

test('callback menu navigasi diakui lebih awal tanpa menghilangkan validasi tombol lain', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /const FAST_MENU_CALLBACKS = new Set/);
  assert.match(bot, /const earlyCallbackPromise = shouldAnswerMenuCallbackEarly\(cmd\)/);
  assert.match(bot, /if \(cmd === 'noop'\) return earlyCallbackPromise/);
  assert.match(bot, /requiredChannelState\(query\.from\.id, settings, \{ force: true \}\)/);
  assert.match(bot, /await answerCallback\(query, \{ text: 'Memeriksa keanggotaan\.\.\.' \}\)/);
  assert.match(bot, /show_alert: true/);
});

test('checkout tetap membaca saldo dan stok supplier secara live', () => {
  const bot = read('lib/botHandlers.js');
  const pricing = bot.slice(bot.indexOf('async function calculateCheckoutPricing'), bot.indexOf('async function showPaymentMethods'));
  const walletPayment = bot.slice(bot.indexOf('async function createWalletPayment'), bot.indexOf('async function createPayment'));
  const paymentMethods = bot.slice(bot.indexOf('async function showPaymentMethods'), bot.indexOf('async function createWalletPayment'));
  assert.match(pricing, /prodseller\.getAvailability\(supplier\.productId, \{ force: true \}\)/);
  assert.match(walletPayment, /db\.getWalletSummary\(userId, 1\)/);
  assert.match(paymentMethods, /db\.getWalletSummary\(userId, 1\)/);
  assert.match(bot, /invalidateUserFastCache\(query\.from\.id\)/);
  assert.match(bot, /invalidateUserFastCache\(userId\)/);
});

test('versi paket tetap mengikuti rilis terbaru setelah fitur dashboard chat dan fast menu', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '84.8.2');
  assert.equal(read('VERSION').trim(), 'v84.8.2');
  assert.equal(read('VERSION.txt').trim(), 'v84.8.2');
});

test('buyer lookup runtime mengutamakan username Telegram terbaru dan membuang username lama', async () => {
  const authPath = require.resolve(path.join(root, 'lib', 'miniappAuth.js'));
  const apiPath = require.resolve(path.join(root, 'api', 'reseller-data.js'));
  const previousAuthModule = require.cache[authPath];
  const previousApiModule = require.cache[apiPath];

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: { assertOwnerMiniApp: () => ({ id: 999 }) }
  };
  delete require.cache[apiPath];

  const db = require(path.join(root, 'lib', 'db.js'));
  const tg = require(path.join(root, 'lib', 'telegram.js'));
  const original = {
    getUserByTelegramId: db.getUserByTelegramId,
    listTransactionsByUser: db.listTransactionsByUser,
    listPoOrders: db.listPoOrders,
    listUsers: db.listUsers,
    listTransactions: db.listTransactions,
    callTelegram: tg.callTelegram
  };

  db.getUserByTelegramId = async (id) => ({
    telegram_id: id,
    first_name: id === 444 ? 'Pembeli Ganti Username' : 'Pembeli Tanpa Username',
    username: id === 444 ? 'username_lama' : 'username_dilepas'
  });
  db.listTransactionsByUser = async () => [];
  db.listPoOrders = async () => [];
  db.listUsers = async () => [];
  db.listTransactions = async () => [];
  tg.callTelegram = async (_method, payload) => payload.chat_id === 444
    ? { id: 444, first_name: 'Pembeli Ganti Username', username: 'username_baru' }
    : { id: 555, first_name: 'Pembeli Tanpa Username' };

  const makeResponse = () => ({
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  });

  try {
    const handler = require(apiPath);
    const renamed = makeResponse();
    await handler({ method: 'GET', query: { action: 'buyer-lookup', q: '444' } }, renamed);
    assert.equal(renamed.statusCode, 200);
    assert.equal(renamed.body.data[0].username, 'username_baru');

    const removed = makeResponse();
    await handler({ method: 'GET', query: { action: 'buyer-lookup', q: '555' } }, removed);
    assert.equal(removed.statusCode, 200);
    assert.equal(removed.body.data[0].username, '');
  } finally {
    Object.assign(db, {
      getUserByTelegramId: original.getUserByTelegramId,
      listTransactionsByUser: original.listTransactionsByUser,
      listPoOrders: original.listPoOrders,
      listUsers: original.listUsers,
      listTransactions: original.listTransactions
    });
    tg.callTelegram = original.callTelegram;
    delete require.cache[apiPath];
    if (previousApiModule) require.cache[apiPath] = previousApiModule;
    if (previousAuthModule) require.cache[authPath] = previousAuthModule;
    else delete require.cache[authPath];
  }
});
