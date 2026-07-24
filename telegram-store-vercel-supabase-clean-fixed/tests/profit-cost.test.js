const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

const db = require('../lib/db');
const root = path.resolve(__dirname, '..');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');
const resellerData = fs.readFileSync(path.join(root, 'api', 'reseller-data.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase', 'update-v60-profit-modal.sql'), 'utf8');
const setup = fs.readFileSync(path.join(root, 'api', 'setup-autogopay.js'), 'utf8');

test('profit dihitung dari total pembayaran dikurangi fee dan modal', () => {
  assert.equal(db.calculateProfit(35026, 26, 28000, true), 7000);
  assert.equal(db.calculateProfit(10000, 100, 12000, true), -2100);
  assert.equal(db.calculateProfit(10000, 100, 0, false), 0);
});

test('dashboard menyediakan modal default produk, modal varian, dan koreksi per checkout', () => {
  assert.match(reseller, /name="cost_price"/);
  assert.match(reseller, /data-vfield="cost"/);
  assert.match(reseller, /data-evfield="cost"/);
  assert.match(reseller, /data-order-cost/);
  assert.match(reseller, /Total Modal Supplier untuk Checkout Ini/);
  assert.match(resellerData, /action === 'update-order-cost'/);
});

test('alat toko berada di dalam panel Pengaturan Toko', () => {
  const panelStart = reseller.indexOf('id="settingsStorePanel"');
  const panelEnd = reseller.indexOf('id="settingsBannerPanel"');
  const tools = reseller.indexOf('class="storeToolsInline"');
  assert.ok(panelStart >= 0 && tools > panelStart && tools < panelEnd);
});

test('SQL v60 menyimpan sumber modal agar profit lama tidak salah dihitung', () => {
  assert.match(schema, /cost_source text not null default 'unset'/);
  assert.match(schema, /cost_updated_at timestamptz/);
  assert.match(schema, /profit_amount/);
});

test('setup AutoGoPay memeriksa callback dan mencoba payload cadangan', () => {
  assert.match(setup, /preflightCallback/);
  assert.match(setup, /callback-only/);
  assert.match(setup, /attempts/);
  assert.match(setup, /v60-profit-cost-autogopay-fix/);
});
