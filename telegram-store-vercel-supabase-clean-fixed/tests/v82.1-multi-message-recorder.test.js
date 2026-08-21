const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 12345, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 1800 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

function message(id, text, buttons = []) {
  return {
    id,
    message: text,
    out: false,
    date: new Date(),
    buttons: buttons.length ? [buttons.map((label) => ({ text: label }))] : [],
    async click() {}
  };
}

test('recorder menangkap lebih dari satu pesan supplier setelah satu aksi', async () => {
  const history = [message(1, 'Pesan lama')];
  const client = {
    async getMessages(_target, options = {}) {
      if (Array.isArray(options.ids)) {
        const found = history.find((row) => Number(row.id) === Number(options.ids[0]));
        return found ? [found] : [];
      }
      return history.slice().sort((a, b) => b.id - a.id);
    },
    async sendMessage(_target, { message: text }) {
      assert.equal(text, '/start');
      history.push(message(2, 'INFO SALDO'));
      history.push(message(3, 'MENU PRODUK', ['Produk', 'Saldo']));
    }
  };
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const result = await workflow.executeRecorderAction({
      target: '@SupplierBot',
      action_type: 'text',
      action_value: '/start',
      timeout_ms: 1800,
      context: { quantity: 1 }
    });
    assert.equal(result.response_changed, true);
    assert.equal(result.responses.length, 2);
    assert.deepEqual(result.responses.map((row) => row.text), ['INFO SALDO', 'MENU PRODUK']);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('response yang dipilih admin diprioritaskan saat replay', () => {
  const responses = [
    { id: 10, text: 'INFO SALDO', buttons: [] },
    { id: 11, text: 'MENU PRODUK', buttons: [{ text: 'Produk' }] }
  ];
  const picked = workflow.selectResponseForStep(responses, {
    response_snapshot: { text: 'MENU PRODUK', buttons: [{ text: 'Produk' }] },
    response_selection_index: 1
  });
  assert.equal(picked.id, 11);
});

test('dashboard membagi step teks menjadi jumlah pembelian atau teks lainnya', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller.js'), 'utf8');
  assert.match(html, /Kategori Step Teks/);
  assert.match(html, /Jumlah Pembelian/);
  assert.match(html, /Teks \/ Perintah Lainnya/);
  assert.match(html, /data-workflow-select-message/);
  assert.match(html, /Supplier mengirim/);
});

test('API quantity selalu merekam placeholder quantity dan mendukung pemilihan message_id', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller-data.js'), 'utf8');
  assert.match(api, /textCategory === 'quantity'/);
  assert.match(api, /\? '\{quantity\}'/);
  assert.match(api, /workflow-select-message/);
  assert.match(api, /recent_message_snapshots/);
  assert.match(api, /response_snapshots/);
});

test('migration v82.1 hanya menambah kolom recorder multi-message', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'update-v82.1-multi-message-recorder.sql'), 'utf8');
  assert.match(sql, /recent_message_snapshots jsonb/i);
  assert.match(sql, /response_snapshots jsonb/i);
  assert.match(sql, /response_selection_index integer/i);
  assert.match(sql, /text_category text/i);
  assert.doesNotMatch(sql, /drop table/i);
});
