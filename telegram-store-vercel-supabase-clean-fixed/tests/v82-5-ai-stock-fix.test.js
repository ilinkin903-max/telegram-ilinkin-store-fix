const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('v82.5 dashboard has AI Flow Assistant and safe draft generation', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /AI Flow Assistant/);
  assert.match(ui, /supplier-ai-generate-flow/);
  assert.match(ui, /Draft flow dari AI/);
  assert.match(ui, /Periksa sebelum Simpan/);
});

test('v82.5 stock test reads wrapped API data instead of undefined', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /var d=\(r&&r\.data\)\|\|\{\}/);
  assert.match(ui, /Stok supplier terdeteksi:/);
});

test('v82.5 supplier checkout does not fall back to local stock array', () => {
  const store = read('lib/storeService.js');
  assert.match(store, /!isPo && !isSupplier && availableStock < qty/);
});

test('v82.5 AI service encrypts provider key and restricts generated step types', () => {
  const ai = read('lib/aiFlowService.js');
  assert.match(ai, /aes-256-gcm/);
  assert.match(ai, /ALLOWED_STEP_TYPES/);
  assert.match(ai, /chat\/completions/);
  assert.match(ai, /AI hanya|Jangan menjalankan order|Jangan menjalankan/i);
});
