const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const service = fs.readFileSync(path.join(__dirname, '..', 'lib', 'telegramOnDemandService.js'), 'utf8');
const guide = fs.readFileSync(path.join(__dirname, '..', 'VINNSTORE-ALIGHT-TEST-FLOW.md'), 'utf8');

test('v82.10 accepts numbered Alight label with spaced stock suffix', () => {
  assert.ok(service.includes('function normalizeIndexedButtonLabel'));
  assert.ok(service.includes('.replace(/\\s*\\(\\s*\\d+\\s*\\)\\s*$/i'));
  assert.ok(guide.includes('(?:\\[\\d+\\]\\.\\s*)?ALIGHT\\s+MOTION\\s*\\(\\s*(\\d+)\\s*\\)'));
  assert.ok(guide.includes('[2]. ALIGHT MOTION ( 74 )'));
});

test('v82.10 waits for delivery-regex message instead of parsing menu text', () => {
  assert.ok(service.includes('Supplier sering mengirim menu/daftar produk lebih dulu'));
  assert.ok(service.includes("waitForMessage(client, bot, { regex: resultRegex, timeout_ms: options.resultTimeoutMs || 45000 }"));
});
