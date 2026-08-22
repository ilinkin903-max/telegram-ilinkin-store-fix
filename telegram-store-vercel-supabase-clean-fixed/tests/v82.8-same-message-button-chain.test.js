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

function menuMessage(onClick) {
  const labels = ['Paket Pro', '30 Hari', '3', '✅ Konfirmasi'];
  return {
    id: 10,
    message: 'Pilih paket, durasi, dan jumlah pada pesan ini',
    out: false,
    date: new Date(),
    buttons: [labels.map((text) => ({ text, data: Buffer.from(text) }))],
    async click({ text }) { onClick(text); }
  };
}

function resultMessage() {
  return { id: 11, message: '✅ Selesai\nemail@example.com|password', out: false, date: new Date(), buttons: [] };
}

test('runtime dapat menekan beberapa tombol pada message id yang sama tanpa menunggu balasan baru', async () => {
  let started = false;
  let finished = false;
  const clicked = [];
  const client = {
    async sendMessage(target, payload) {
      if (payload.message === '/start') started = true;
    },
    async getMessages(target, options = {}) {
      const menu = menuMessage((text) => {
        clicked.push(text);
        if (text === '✅ Konfirmasi') finished = true;
      });
      const rows = finished ? [resultMessage(), menu] : (started ? [menu] : []);
      if (Array.isArray(options.ids) && options.ids.length) return rows.filter((row) => options.ids.includes(row.id));
      return rows;
    }
  };
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const result = await workflow.runWorkflowSteps({
      workflow: { target_username: '@supplier_bot', step_timeout_ms: 1800 },
      steps: [
        { action_type: 'text', action_value: '/start', response_snapshot: { id: 10, text: 'Pilih paket, durasi, dan jumlah pada pesan ini' }, response_selection_index: 0 },
        { action_type: 'button', action_value: 'Paket Pro', response_mode: 'same_message', response_snapshot: { id: 10 } },
        { action_type: 'button', action_value: '30 Hari', response_mode: 'same_message', response_snapshot: { id: 10 } },
        { action_type: 'button', action_value: '3', response_mode: 'same_message', response_snapshot: { id: 10 } },
        { action_type: 'button', action_value: '✅ Konfirmasi', response_mode: 'wait', response_snapshot: { id: 11, expected_text: '✅ Selesai{any}' }, capture_result: true }
      ],
      context: { quantity: 3 }
    });
    assert.deepEqual(clicked, ['Paket Pro', '30 Hari', '3', '✅ Konfirmasi']);
    assert.equal(result.completed, true);
    assert.match(result.result_text, /email@example\.com/);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('recorder menyimpan sumber pesan dan auto same_message saat tombol berikutnya ditekan pada pesan yang sama', () => {
  const api = read('api/reseller-data.js');
  const db = read('lib/db.js');
  assert.match(api, /source_message_snapshot: result\.source_message_snapshot/);
  assert.match(api, /response_mode: 'same_message'/);
  assert.match(api, /SATU pesan/);
  assert.match(db, /source_message_snapshot/);
  assert.match(db, /response_mode/);
});

test('dashboard menjelaskan dan menampilkan rangkaian tombol satu pesan', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /PESAN AKTIF · PILIH TOMBOL BERIKUTNYA/);
  assert.match(ui, /LANJUT DI PESAN YANG SAMA/);
  assert.match(ui, /Lanjut pilih tombol di pesan yang sama/);
  assert.match(ui, /SATU pesan memiliki beberapa pilihan/);
});

test('migration v82.8 hanya menambah metadata same-message dan tidak menghapus data', () => {
  const sql = read('supabase/update-v82.8-same-message-button-chain.sql');
  assert.match(sql, /add column if not exists source_message_snapshot jsonb/i);
  assert.match(sql, /add column if not exists response_mode text/i);
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i);
});
