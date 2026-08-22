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

function snap(id, text, buttons = []) {
  return { id, text, out: false, date: new Date().toISOString(), edit_date: null, buttons: buttons.map((x, i) => ({ key: `0:${i}`, row: 0, col: i, text: x, kind: 'callback' })), has_media: false, media_type: '' };
}
function msg(id, text, buttons = []) {
  return { id, message: text, out: false, date: new Date(), buttons: buttons.length ? [buttons.map((x) => ({ text: x, data: Buffer.from(x) }))] : [], async click() {} };
}

test('merge recorder menyimpan versi lama saat pesan Telegram yang sama diedit', () => {
  const first = workflow.mergeRecorderSnapshots([], [snap(10, '⏳ Loading...')], { visible_snapshots: [snap(10, '⏳ Loading...')] });
  const second = workflow.mergeRecorderSnapshots(first, [snap(10, '⚙️ Sedang membuat produk...')], { visible_snapshots: [snap(10, '⚙️ Sedang membuat produk...')] });
  assert.equal(second.length, 1);
  assert.equal(second[0].text, '⚙️ Sedang membuat produk...');
  assert.equal(second[0].versions.length, 1);
  assert.equal(second[0].versions[0].text, '⏳ Loading...');
});

test('pesan sementara tetap tersimpan walaupun kemudian hilang dari chat', () => {
  const loading = snap(20, '⏳ Loading...');
  const saved = workflow.mergeRecorderSnapshots([], [loading], { visible_snapshots: [loading] });
  const afterDelete = workflow.mergeRecorderSnapshots(saved, [], { visible_snapshots: [] });
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0].text, '⏳ Loading...');
  assert.equal(afterDelete[0].currently_visible, false);
});

test('live observer menangkap loading, edit, pesan final, dan mempertahankan yang hilang', async () => {
  let reads = 0;
  const client = {
    async getMessages() {
      reads += 1;
      if (reads === 1) return [msg(2, '⏳ Loading...'), msg(1, 'Menu awal')];
      if (reads === 2) return [msg(2, '⚙️ Sedang membuat produk...'), msg(1, 'Menu awal')];
      return [msg(3, 'Pilih durasi', ['7 Hari', '30 Hari']), msg(1, 'Menu awal')];
    }
  };
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const result = await workflow.observeRecorderResponses({
      target: '@supplier_bot',
      before_snapshots: [snap(1, 'Menu awal')],
      existing_snapshots: [],
      duration_ms: 1200
    });
    const loading = result.responses.find((x) => x.id === 2);
    const final = result.responses.find((x) => x.id === 3);
    assert.ok(loading);
    assert.equal(loading.currently_visible, false);
    assert.ok(loading.versions.some((v) => v.text === '⏳ Loading...'));
    assert.equal(loading.text, '⚙️ Sedang membuat produk...');
    assert.ok(final);
    assert.deepEqual(final.buttons.map((b) => b.text), ['7 Hari', '30 Hari']);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('API memiliki live long-poll recorder dan menyimpan baseline setiap step', () => {
  const api = read('api/reseller-data.js');
  const db = read('lib/db.js');
  assert.match(api, /workflow-record-poll/);
  assert.match(api, /observeRecorderResponses/);
  assert.match(api, /recorder_before_snapshots: Array\.isArray\(result\.before_snapshots\)/);
  assert.match(api, /response_snapshot: \{\}/);
  assert.match(db, /recorder_before_snapshots/);
});

test('recorder tidak lagi memaksa pilih pesan sebelum tombol atau teks berikutnya', () => {
  const api = read('api/reseller-data.js');
  assert.doesNotMatch(api, /Pilih dulu pesan mana yang direkam untuk step sebelumnya sebelum melanjutkan/);
  assert.match(api, /autoCandidate/);
  assert.match(api, /requestedMessageId/);
});

test('dashboard menjalankan live recorder dan menampilkan riwayat pesan yang hilang atau diedit', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /LIVE RECORDER AKTIF/);
  assert.match(ui, /workflow-record-poll/);
  assert.match(ui, /Riwayat perubahan pesan/);
  assert.match(ui, /TERSIMPAN · SUDAH HILANG\/BERUBAH/);
  assert.match(ui, /Paket → Durasi → Jumlah → Konfirmasi/);
});

test('migration v82.7 hanya menambah baseline recorder', () => {
  const sql = read('supabase/update-v82.7-continuous-workflow-recorder.sql');
  assert.match(sql, /add column if not exists recorder_before_snapshots jsonb/i);
  assert.doesNotMatch(sql, /drop table|delete from/i);
});
