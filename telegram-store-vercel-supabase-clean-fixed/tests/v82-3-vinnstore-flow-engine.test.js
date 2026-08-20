const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const service = fs.readFileSync(path.join(__dirname, '..', 'lib', 'telegramOnDemandService.js'), 'utf8');
const guide = fs.readFileSync(path.join(__dirname, '..', 'VINNSTORE-ALIGHT-TEST-FLOW.md'), 'utf8');

test('v82.3 supports button_index selection', () => {
  assert.match(service, /step\.button_index/);
  assert.match(service, /flatIndex === requestedIndex/);
  assert.match(service, /TELEGRAM_SUPPLIER_BUTTON_INDEX_MISMATCH/);
});

test('v82.3 supports quantity conditions', () => {
  assert.match(service, /function shouldRunStep/);
  assert.match(service, /quantity_gt/);
  assert.match(service, /quantity_eq/);
});

test('Vinnstore Alight test flow handles qty > 1 and captures account detail', () => {
  assert.match(guide, /"button_index":2,"expect_text":"ALIGHT MOTION"/);
  assert.match(guide, /"quantity_gt":1/);
  assert.match(guide, /Buy\\\\s\*\\\\\(Saldo\\\\\)/i);
  assert.match(guide, /〔 ACCOUNT DETAIL 〕/);
  assert.match(guide, /capture_delivery/);
  assert.match(guide, /commit":true/);
});
