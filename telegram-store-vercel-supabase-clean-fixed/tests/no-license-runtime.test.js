const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const runtimeFiles = [
  'lib/config.js',
  'lib/botHandlers.js',
  'api/store-data.js',
  'api/reseller-data.js',
  'api/reseller.js',
  '.env.example'
];

test('runtime tidak lagi memiliki modul atau konfigurasi lisensi eksternal', () => {
  assert.equal(fs.existsSync(path.join(root, 'lib', 'license.js')), false);
  const runtime = runtimeFiles.map(read).join('\n');
  assert.doesNotMatch(runtime, /require\(['"][^'"]*license[^'"]*['"]\)/i);
  assert.doesNotMatch(runtime, /LICENSE_(?:MANAGER_URL|API_SECRET|BOT_USERNAME|CODE|CHECK_ENABLED|FAIL_CLOSED)/);
  assert.doesNotMatch(runtime, /RENTAL_MANAGER_URL/);
  assert.doesNotMatch(runtime, /checkLicense|ensureLicenseActive|getRentalLicense|license-status/);
});

test('command dan dashboard owner tidak lagi menampilkan kontrol lisensi bot', () => {
  const bot = read('lib/botHandlers.js');
  const dashboard = read('api/reseller.js');
  assert.doesNotMatch(bot, /\/lisensi\b|\/license\b|\/masaaktif\b/);
  assert.doesNotMatch(dashboard, /data-tab="license"|id="licenseBox"|id="refreshLicense"/);
});

test('marketplace tetap aktif tanpa ketergantungan license manager', () => {
  const storeApi = read('api/store-data.js');
  assert.match(storeApi, /catalog\.store_active = true/);
  assert.match(storeApi, /catalog\.store_status = 'active'/);
  assert.doesNotMatch(storeApi, /STORE_INACTIVE|checkLicense/);
});
