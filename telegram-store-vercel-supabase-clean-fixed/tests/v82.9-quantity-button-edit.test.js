const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 1, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 1800 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

function quantityMenu(onClick) {
  return {
    id: 10,
    message: 'Pilih jumlah akun',
    out: false,
    buttons: [[1, 2, 3, 4, 5].map((n) => ({ text: `• ${n}`, data: Buffer.from(String(n)) }))],
    async click({ text }) { onClick(text); }
  };
}

test('quantity button otomatis mengikuti jumlah order, bukan angka saat rekam', async () => {
  let clicked = '';
  const client = {
    async getMessages(target, options = {}) {
      const menu = quantityMenu((text) => { clicked = text; });
      if (Array.isArray(options.ids) && options.ids.length) return options.ids.includes(10) ? [menu] : [];
      return [menu];
    },
    async sendMessage() {}
  };
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const result = await workflow.runWorkflowSteps({
      workflow: { target_username: '@supplier_bot', step_timeout_ms: 1800 },
      steps: [
        { action_type: 'button', action_value: '• 1', button_role: 'quantity', response_mode: 'same_message', response_snapshot: { id: 10 } }
      ],
      context: { quantity: 3 }
    });
    assert.equal(clicked, '• 3');
    assert.equal(result.completed, false);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('runtime quantity resolver memilih label angka yang sesuai termasuk bullet', () => {
  const snapshot = { id: 10, buttons: [
    { text: '• 1' }, { text: '• 2' }, { text: '• 3' }, { text: '• 4' }, { text: '• 5' }
  ] };
  assert.equal(workflow.isLikelyQuantityButtonSnapshot(snapshot), true);
  assert.equal(workflow.resolveButtonActionValue('• 1', 'quantity', snapshot, { quantity: 3 }), '• 3');
  assert.equal(workflow.quantityValueFromButtonText('• 5'), 5);
});

test('auto-detect menu angka saat step lama belum punya button_role', () => {
  const snapshot = { id: 10, buttons: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }] };
  assert.equal(workflow.inferButtonRole('1', snapshot), 'quantity');
});

test('dashboard memberi warna tombol yang sudah direkam dan menyediakan daftar tombol untuk edit', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /workflowButtonSelected/);
  assert.match(ui, /data-workflow-pick-button/);
  assert.match(ui, /Tombol pada Pesan Bot/);
  assert.match(ui, /Jumlah Item Otomatis sesuai quantity/);
  assert.match(ui, /button_role/);
});

test('API dan database menyimpan button_role serta clone mempertahankannya', () => {
  const api = read('api/reseller-data.js');
  const db = read('lib/db.js');
  assert.match(api, /button_role: result\.button_role/);
  assert.match(api, /String\(body\.button_role/);
  assert.match(db, /button_role/);
  assert.match(db, /button_role: step\.button_role/);
});

test('migration v82.9 hanya menambah metadata tombol dinamis', () => {
  const sql = read('supabase/update-v82.9-quantity-button-edit.sql');
  assert.match(sql, /add column if exists? public\.reseller_workflow_steps|alter table if exists public\.reseller_workflow_steps/i);
  assert.match(sql, /add column if not exists button_role text/i);
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i);
});
