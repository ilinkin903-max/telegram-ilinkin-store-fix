const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 12345, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 1800 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

test('bagian teks produk dapat direkam lalu diekstrak tanpa mengambil seluruh pesan', () => {
  const recorded = 'Order selesai\nPRODUK YANG DIDAPAT\nhttps://example.com/token-LAMA\nTerima kasih';
  const start = recorded.indexOf('https://');
  const end = recorded.indexOf('\nTerima kasih');
  const rule = workflow.deriveTextSelectionRule(recorded, start, end);
  assert.equal(rule.sample, 'https://example.com/token-LAMA');

  const live = 'Order selesai\nPRODUK YANG DIDAPAT\nhttps://example.com/token-BARU\nTerima kasih';
  assert.equal(workflow.extractTextByRule(live, rule, { strict: true }), 'https://example.com/token-BARU');
});

test('bagian angka stok dapat dipilih dan dibaca sebagai integer', () => {
  const text = 'ALIGHT MOTION\nSisa Stok : 74\nHarga : Rp 500';
  const start = text.indexOf('74');
  const rule = workflow.deriveTextSelectionRule(text, start, start + 2);
  const live = 'ALIGHT MOTION\nSisa Stok : 123\nHarga : Rp 500';
  const extracted = workflow.extractTextByRule(live, rule, { strict: true });
  assert.equal(workflow.parseStockNumber(extracted), 123);
});

test('stock probe berhenti tepat di step stok sehingga step pembelian setelahnya tidak dijalankan', () => {
  const src = read('lib/userbotWorkflowService.js');
  assert.match(src, /const stockIndex = steps\.findIndex\(\(step\) => step\.capture_stock === true\)/);
  assert.match(src, /for \(let index = 0; index <= stockIndex; index \+= 1\)/);
  assert.match(src, /if \(index === stockIndex\)/);
  assert.match(src, /return \{ stock, extracted_text: extracted/);
});

test('pemilihan produk dan varian melakukan refresh stok workflow dan gagal tertutup jika refresh gagal', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /refreshWorkflowStockForSelection\(product, null\)/);
  assert.match(bot, /refreshWorkflowStockForSelection\(product, variant\)/);
  assert.match(bot, /refreshed\.configured && \(refreshed\.busy \|\| refreshed\.error\)/);
  assert.match(bot, /Stok supplier gagal diperbarui/);
});

test('tombol produk menggunakan Stok, habis merah, dan indikator halaman hijau dalam tanda kurung', () => {
  const bot = read('lib/botHandlers.js');
  const start = bot.indexOf('function productButtons');
  const end = bot.indexOf('async function sendProductList', start);
  const segment = bot.slice(start, end);
  assert.match(segment, /`Stok \$\{readyStock\}`/);
  assert.doesNotMatch(segment, /Otomatis/);
  assert.match(segment, /soldOut \? 'danger' : 'success'/);
  assert.match(segment, /`\(\$\{page \+ 1\}\/\$\{totalPages\}\)`/);
  assert.match(segment, /callback_data: 'noop' \}, 'success'/);
});

test('dashboard recorder menyediakan seleksi bagian produk dan angka stok', () => {
  const ui = read('api/reseller.js');
  const api = read('api/reseller-data.js');
  assert.match(ui, /Bagian Terpilih = Produk/);
  assert.match(ui, /Bagian Terpilih = Stok/);
  assert.match(ui, /workflowSelectableText/);
  assert.match(ui, /workflowSelectedMessageRange/);
  assert.match(api, /action === 'workflow-mark-result'/);
  assert.match(api, /action === 'workflow-mark-stock'/);
  assert.match(api, /deriveTextSelectionRule/);
  assert.match(api, /parseStockNumber/);
});


test('stock probe live mengeksekusi prefix workflow dan tidak pernah mengirim step setelah capture_stock', async () => {
  let nextId = 1;
  const sent = [];
  const history = [];
  function incoming(text) {
    const row = { id: nextId++, message: text, out: false, date: new Date(), buttons: [], async click() {} };
    history.push(row);
    return row;
  }
  const client = {
    async getMessages(_target, options = {}) {
      if (Array.isArray(options.ids)) return history.filter((row) => options.ids.map(Number).includes(Number(row.id)));
      return history.slice().sort((a, b) => b.id - a.id);
    },
    async sendMessage(_target, { message }) {
      sent.push(message);
      if (message === '/start') incoming('MENU UTAMA');
      else if (message === 'cekstok') incoming('DETAIL PRODUK\nSisa Stok : 88\nHarga : Rp500');
      else if (message === 'BELI') incoming('INI TIDAK BOLEH TERJADI SAAT CEK STOK');
    },
    async disconnect() {}
  };
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const recorded = 'DETAIL PRODUK\nSisa Stok : 74\nHarga : Rp500';
    const start = recorded.indexOf('74');
    const rule = workflow.deriveTextSelectionRule(recorded, start, start + 2);
    const result = await workflow.runWorkflowStockProbe({
      workflow: { target_username: '@SupplierBot', step_timeout_ms: 1800 },
      steps: [
        { action_type: 'text', action_value: '/start', response_snapshot: { text: 'MENU UTAMA', buttons: [] } },
        { action_type: 'text', action_value: 'cekstok', capture_stock: true, response_snapshot: { text: recorded, buttons: [] }, stock_extract_prefix: rule.prefix, stock_extract_suffix: rule.suffix, stock_sample_text: rule.sample },
        { action_type: 'text', action_value: 'BELI' }
      ],
      context: { quantity: 1 }
    });
    assert.equal(result.stock, 88);
    assert.deepEqual(sent, ['/start', 'cekstok']);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('migration v82.4 hanya menambah kolom ekstraksi dan live stock', () => {
  const sql = read('supabase/update-v82.4-partial-result-live-stock.sql');
  assert.match(sql, /add column if not exists live_stock integer/i);
  assert.match(sql, /result_extract_prefix text/i);
  assert.match(sql, /capture_stock boolean/i);
  assert.match(sql, /stock_extract_prefix text/i);
  assert.match(sql, /one_stock_capture_idx/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /truncate/i);
});
