const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const service = fs.readFileSync(path.join(__dirname, '..', 'lib', 'telegramOnDemandService.js'), 'utf8');
const guide = fs.readFileSync(path.join(__dirname, '..', 'VINNSTORE-ALIGHT-TEST-FLOW.md'), 'utf8');

test('v82.4 can capture supplier stock from keyboard button text', () => {
  assert.match(service, /function messageButtonText\(/);
  assert.match(service, /source === 'buttons'/);
  assert.match(service, /captureSourceText\(current, step\)/);
});

test('v82.4 includes Alight Motion keyboard stock flow and regex', () => {
  assert.match(guide, /"type":"capture","source":"buttons"/);
  assert.match(guide, /ALIGHT\\s\*MOTION\\s\*\\\(\(\\d\+\)\\\)/);
  assert.match(guide, /stok `74`/);
});
