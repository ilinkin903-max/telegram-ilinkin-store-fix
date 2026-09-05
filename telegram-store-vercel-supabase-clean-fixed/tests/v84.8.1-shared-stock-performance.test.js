const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function sharedProductFixture() {
  return {
    kode: 'SHARED1',
    nama: 'Produk Shared',
    harga: 10000,
    active: true,
    display_scope: 'both',
    delivery_mode: 'auto',
    data: ['pool-1', 'pool-2'],
    variants: [
      { name: 'A', price: 10000, sku: 'A', stock_mode: 'shared', stock: ['backup-a'] },
      { name: 'B', price: 12000, sku: 'B', stock_mode: 'shared', stock: ['backup-b'] },
      { name: 'C', price: 15000, sku: 'C', stock_mode: 'separate', stock: ['local-c'] }
    ]
  };
}

test('normalisasi database mempertahankan pilihan stock_mode shared', () => {
  const db = require('../lib/db');
  const variants = db.normalizeVariants([
    { name: 'Shared', price: 10000, sku: 'SHARED', stock_mode: 'shared', stock: ['cadangan'] },
    { name: 'Separate', price: 12000, sku: 'SEPARATE', stock_mode: 'separate', stock: ['lokal'] }
  ]);
  assert.equal(variants[0].stock_mode, 'shared');
  assert.equal(variants[1].stock_mode, 'separate');
});

test('stok bersama dipakai per varian tetapi hanya dihitung sekali pada total produk', () => {
  const db = require('../lib/db');
  const product = sharedProductFixture();
  assert.equal(db.productAvailableStock(product, 'A'), 2);
  assert.equal(db.productAvailableStock(product, 'B'), 2);
  assert.equal(db.productAvailableStock(product, 'C'), 1);
  assert.equal(db.productAvailableStock(product), 3);
  assert.deepEqual(db.variantStockItems(product, product.variants[0]), ['pool-1', 'pool-2']);
  assert.deepEqual(db.variantStockItems(product, product.variants[2]), ['local-c']);
});

test('marketplace menampilkan stok shared dengan benar tanpa membocorkan isi credential', () => {
  const store = require('../lib/storeService');
  const safe = store.sanitizeProduct(sharedProductFixture());
  assert.equal(safe.stock, 3);
  assert.deepEqual(safe.variants.map((variant) => variant.stock), [2, 2, 1]);
  assert.deepEqual(safe.variants.map((variant) => variant.stock_mode), ['shared', 'shared', 'separate']);
  const serialized = JSON.stringify(safe);
  assert.doesNotMatch(serialized, /pool-1|pool-2|backup-a|backup-b|local-c/);
});

test('dashboard menjelaskan sumber stok dan menjaga cadangan stok terpisah', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /data-local-variant-stock/);
  assert.match(dashboard, /function syncAddVariantStockSource/);
  assert.match(dashboard, /field\.classList\.toggle\('hidden', shared\)/);
  assert.match(dashboard, /variantUsesSharedStock\(v\) \? variantStock\(v\)/);
  assert.match(dashboard, /Shared = semua varian memakai satu pool Stok Produk Bersama/);
});

test('gateway dan saldo mengurangi pool shared secara atomik tanpa menimpa stok lokal varian', () => {
  for (const file of ['supabase/schema.sql', 'supabase/update-v84.8.1-shared-stock-speed.sql']) {
    const sql = read(file);
    for (const functionName of ['fulfill_paid_order_v62', 'fulfill_wallet_order_v65']) {
      const start = sql.indexOf(`create or replace function public.${functionName}(`);
      assert.notEqual(start, -1, `${functionName} tidak ditemukan pada ${file}`);
      const next = sql.indexOf('create or replace function public.', start + 40);
      const block = sql.slice(start, next === -1 ? sql.length : next);
      assert.match(block, /if lower\(coalesce\(v_variant->>'stock_mode','separate'\)\) = 'shared' then\s+v_stock := coalesce\(v_product\.stock, '\[\]'::jsonb\)/);
      assert.match(block, /if lower\(coalesce\(v_variant->>'stock_mode','separate'\)\) <> 'shared' then\s+v_variants := jsonb_set/);
      assert.match(block, /stock = case when lower\(coalesce\(v_variant->>'stock_mode','separate'\)\) = 'shared' then v_rest else stock end/);
    }
  }
});

test('migrasi v84.8.1 bersifat idempoten dan tidak menghapus data produk', () => {
  const migration = read('supabase/update-v84.8.1-shared-stock-speed.sql');
  assert.match(migration, /^-- v84\.8\.1/m);
  assert.match(migration, /create or replace function public\.fulfill_paid_order_v62/);
  assert.match(migration, /create or replace function public\.fulfill_wallet_order_v65/);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\.products/i);
});

test('marketplace memakai cache singkat, request paralel, dan timeout supplier cepat', () => {
  const service = read('lib/storeService.js');
  assert.match(service, /STORE_PUBLIC_CATALOG_CACHE_MS = 5 \* 1000/);
  assert.match(service, /STORE_WALLET_CACHE_MS = 2500/);
  assert.match(service, /STORE_USER_TOUCH_CACHE_MS = 30 \* 1000/);
  assert.match(service, /STORE_SUPPLIER_CATALOG_TIMEOUT_MS = 1500/);
  assert.match(service, /Promise\.all\(\[catalogPromise, touchPromise, walletPromise\]\)/);
  assert.match(service, /readThroughStoreCache/);
  assert.match(service, /if \(!force && entry\.promise\) return entry\.promise/);
});

test('bot menggunakan cache produk dan hasil write pending order tanpa round-trip ulang', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /async function cachedBotProductByCode/);
  assert.match(bot, /let product = await cachedBotProductByCode\(code\)/);
  assert.match(bot, /async function showConfirmation\(query, edit = false, context = \{\}\)/);
  assert.match(bot, /const order = context\.order \|\| await db\.getPendingOrder\(userId\)/);
  assert.match(bot, /const product = context\.product \|\| await cachedBotProductByCode\(order\.product_code\)/);
  assert.match(bot, /showConfirmation\(query, true, \{ order: savedOrder, product \}\)/);
});

test('request ProdSeller identik digabung dan timeout katalog diteruskan', async () => {
  const servicePath = require.resolve('../lib/prodsellerService');
  const axiosPath = require.resolve('axios');
  const configPath = require.resolve('../lib/config');
  const previousService = require.cache[servicePath];
  const previousAxios = require.cache[axiosPath];
  const previousConfig = require.cache[configPath];
  let calls = 0;
  const timeouts = [];
  const mockAxios = async (options) => {
    calls += 1;
    timeouts.push(options.timeout);
    await new Promise((resolve) => setTimeout(resolve, 15));
    return { data: { id: 'same-product', price: 1, stock: 10, inStock: true } };
  };

  require.cache[axiosPath] = { id: axiosPath, filename: axiosPath, loaded: true, exports: mockAxios };
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: { config: { prodsellerApiKey: 'test-key', prodsellerBaseUrl: 'https://supplier.test/v1' } }
  };
  delete require.cache[servicePath];

  try {
    const supplier = require(servicePath);
    const [first, second] = await Promise.all([
      supplier.getProduct('same-product', { timeout: 1500 }),
      supplier.getProduct('same-product', { timeout: 1500 })
    ]);
    assert.equal(first.id, 'same-product');
    assert.equal(second.id, 'same-product');
    assert.equal(calls, 1);
    assert.deepEqual(timeouts, [1500]);
  } finally {
    delete require.cache[servicePath];
    if (previousService) require.cache[servicePath] = previousService;
    if (previousAxios) require.cache[axiosPath] = previousAxios;
    else delete require.cache[axiosPath];
    if (previousConfig) require.cache[configPath] = previousConfig;
    else delete require.cache[configPath];
  }
});

test('pengecekan lisensi paralel digabung menjadi satu rangkaian request', async () => {
  const licensePath = require.resolve('../lib/license');
  const axiosPath = require.resolve('axios');
  const configPath = require.resolve('../lib/config');
  const previousLicense = require.cache[licensePath];
  const previousAxios = require.cache[axiosPath];
  const previousConfig = require.cache[configPath];
  let calls = 0;
  const axiosMock = {
    get: async (url) => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (String(url).includes('api.telegram.org')) {
        return { data: { ok: true, result: { username: 'BotCepat' } } };
      }
      return { data: { active: true, status: 'active', bot_username: 'BotCepat' } };
    }
  };

  require.cache[axiosPath] = { id: axiosPath, filename: axiosPath, loaded: true, exports: axiosMock };
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: { config: {
      licenseCheckEnabled: 'true',
      licenseManagerUrl: 'https://license.test',
      licenseApiSecret: 'secret',
      licenseCode: '',
      licenseFailClosed: 'false',
      licenseBotUsername: 'BotCepat',
      botUsername: 'BotCepat',
      botToken: 'telegram-token'
    } }
  };
  delete require.cache[licensePath];

  try {
    const license = require(licensePath);
    const [first, second] = await Promise.all([license.checkLicense(), license.checkLicense()]);
    assert.equal(first.active, true);
    assert.equal(second.active, true);
    assert.equal(calls, 2, 'hanya satu getMe dan satu license-check yang boleh berjalan');
  } finally {
    delete require.cache[licensePath];
    if (previousLicense) require.cache[licensePath] = previousLicense;
    if (previousAxios) require.cache[axiosPath] = previousAxios;
    else delete require.cache[axiosPath];
    if (previousConfig) require.cache[configPath] = previousConfig;
    else delete require.cache[configPath];
  }
});

test('metadata rilis v84.8.1 konsisten', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '84.8.1');
  assert.equal(read('VERSION').trim(), 'v84.8.1');
  assert.equal(read('VERSION.txt').trim(), 'v84.8.1');
  assert.match(read('api/index.js'), /Link Auto Order · v84\.8\.1/);
});
