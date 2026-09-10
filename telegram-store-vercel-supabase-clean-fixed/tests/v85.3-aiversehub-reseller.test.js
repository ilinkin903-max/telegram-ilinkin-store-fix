const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function loadAiverseWithAxios(fakeAxios) {
  const servicePath = path.join(root, 'lib', 'aiverseHubService.js');
  delete require.cache[servicePath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent && parent.filename === servicePath && request === 'axios') return fakeAxios;
    if (parent && parent.filename === servicePath && request === './config') {
      return { config: { aiverseHubApiKey: 'AK_TEST_ONLY', aiverseHubBaseUrl: 'https://aiverse.test/api/v1' } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(servicePath);
  } finally {
    Module._load = originalLoad;
  }
}

test('AIVerseHub API key hanya dikonfigurasi di server', () => {
  const config = read('lib/config.js');
  const env = read('.env.example');
  assert.match(config, /AIVERSEHUB_API_KEY/);
  assert.match(config, /https:\/\/aiversehub\.store\/api\/v1/);
  assert.match(env, /AIVERSEHUB_API_KEY=AK_/);
  assert.doesNotMatch(read('public/store.js'), /AIVERSEHUB_API_KEY/);
});

test('AIVerseHub service memakai endpoint resmi dan X-API-Key', () => {
  const service = read('lib/aiverseHubService.js');
  assert.match(service, /'X-API-Key'/);
  assert.match(service, /request\('GET', '\/me'/);
  assert.match(service, /request\('GET', '\/products'/);
  assert.match(service, /request\('POST', '\/order'/);
  assert.match(service, /request\('GET', `\/order\/\$\{encodeURIComponent\(id\)\}`/);
});

test('client AIVerseHub mengirim order dan menormalisasi produk digital', async () => {
  const calls = [];
  const fakeAxios = async (options) => {
    calls.push(options);
    if (options.url.endsWith('/order') && options.method === 'POST') {
      return { data: {
        success: true,
        order_id: 'API_TEST_1',
        service_id: 'S_01',
        quantity: 2,
        total_cost: 20,
        new_balance: 80,
        products: ['CODE_A', 'CODE_B']
      } };
    }
    throw new Error(`unexpected request ${options.method} ${options.url}`);
  };
  const service = loadAiverseWithAxios(fakeAxios);
  const order = await service.createOrder({ productId: 'S_01', quantity: 2 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://aiverse.test/api/v1/order');
  assert.equal(calls[0].headers['X-API-Key'], 'AK_TEST_ONLY');
  assert.deepEqual(calls[0].data, { service_id: 'S_01', quantity: 2 });
  assert.equal(order.orderId, 'API_TEST_1');
  assert.equal(order.status, 'delivered');
  assert.deepEqual(service.deliveredItems(order), ['CODE_A', 'CODE_B']);
});

test('availability AIVerseHub dibatasi oleh stok provider dan saldo', () => {
  const service = loadAiverseWithAxios(async () => ({ data: {} }));
  const availability = service.availabilityFrom({
    balanceData: { wallet_balance: 25 },
    product: { id: 'S_01', price: 10, stock: 9, inStock: true }
  });
  assert.equal(availability.balanceStock, 2);
  assert.equal(availability.supplierStock, 9);
  assert.equal(availability.availableStock, 2);
});

test('dashboard dapat import katalog, melihat saldo, dan retry AIVerseHub', () => {
  const api = read('api/reseller-data.js');
  const dashboard = read('api/reseller.js');
  assert.match(api, /aiversehub-status/);
  assert.match(api, /aiversehub-products/);
  assert.match(api, /aiversehub-import/);
  assert.match(api, /force_aiverse_retry/);
  assert.match(dashboard, /AIVerseHub API/);
  assert.match(dashboard, /Saldo AIVerseHub/);
  assert.match(dashboard, /Paksa Retry AIVerseHub/);
  assert.match(dashboard, /aiversehub_unit_to_idr/);
  assert.match(dashboard, /aiversehub_markup_percent/);
});

test('checkout dan fulfillment mengenali AIVerseHub sebagai supplier otomatis', () => {
  const store = read('lib/storeService.js');
  const bot = read('lib/botHandlers.js');
  const payment = read('lib/paymentService.js');
  assert.match(store, /aiverseHub\.getAvailability\(supplier\.productId/);
  assert.match(bot, /aiverseHub\.getAvailability\(supplier\.productId/);
  assert.match(payment, /processAiverseHubDelivery/);
  assert.match(payment, /aiverseHub\.createOrder/);
  assert.match(payment, /supplier: 'aiversehub'/);
  assert.match(payment, /AIVERSEHUB_RETRY_CONFIRM_REQUIRED/);
});
