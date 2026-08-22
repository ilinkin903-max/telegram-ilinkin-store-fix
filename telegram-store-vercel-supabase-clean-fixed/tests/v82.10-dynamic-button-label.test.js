const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }
const originalLoad = Module._load;
Module._load = function(request, parent) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 1, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 1800 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

test('PRIVATE (6) direplay ke PRIVATE (23) karena angka dalam kurung dinamis', async () => {
  let clicked = '';
  const client = {
    async getMessages(target, options = {}) {
      const msg = {
        id: 50,
        message: 'Pilih layanan',
        out: false,
        buttons: [[{ text: 'PRIVATE (23)', data: Buffer.from('private-callback') }]],
        async click({ text }) { clicked = text; }
      };
      if (Array.isArray(options.ids) && options.ids.length) return options.ids.includes(50) ? [msg] : [];
      return [msg];
    },
    async sendMessage() {}
  };
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const result = await workflow.runWorkflowSteps({
      workflow: { target_username: '@supplier_bot', step_timeout_ms: 1800 },
      steps: [{
        action_type: 'button',
        action_value: 'PRIVATE (6)',
        response_mode: 'same_message',
        source_message_snapshot: { id: 50, buttons: [{ row: 0, col: 0, text: 'PRIVATE (6)', match_key: 'private (#)', data: Buffer.from('private-callback').toString('base64') }] }
      }],
      context: { quantity: 1 }
    });
    assert.equal(clicked, 'PRIVATE (23)');
    assert.equal(result.completed, false);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('• Individual dan ○ Individual memiliki match key yang sama', () => {
  assert.equal(workflow.normalizeButtonText('• Individual'), 'individual');
  assert.equal(workflow.normalizeButtonText('○ Individual'), 'individual');
  assert.equal(workflow.normalizeButtonText('PRIVATE (6)'), 'private (#)');
  assert.equal(workflow.normalizeButtonText('PRIVATE (23)'), 'private (#)');
});

test('response button signature helper dinormalisasi pada sumber runtime', () => {
  const source = read('lib/userbotWorkflowService.js');
  assert.ok(source.includes('function normalizeButtonText'));
  assert.ok(source.includes('match_key: normalizeButtonText(text)'));
  assert.ok(source.includes('function buttonSignature(snapshot)'));
  assert.ok(source.includes('normalizeButtonText(button?.text)'));
});

test('dashboard mengenali tombol yang dipilih walau label bullet/stok berubah', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /bKey=String\(b\.match_key\|\|b\.text\|\|'\'\)/);
  assert.match(ui, /replace\(\/\\\(\\s\*\[-\+\]\?\\d/);
});
