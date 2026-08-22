const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 1, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 7000 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

test('timeout khusus step mengalahkan default workflow', () => {
  assert.equal(workflow.resolveStepTimeoutMs({ step_timeout_ms: 7000 }, { wait_timeout_ms: 30000 }), 30000);
  assert.equal(workflow.resolveStepTimeoutMs({ step_timeout_ms: 9000 }, { wait_timeout_ms: null }), 9000);
  assert.equal(workflow.resolveStepTimeoutMs({ step_timeout_ms: 9000 }, {}), 9000);
});

test('timeout khusus step dibatasi aman hingga 2 menit', () => {
  assert.equal(workflow.resolveStepTimeoutMs({ step_timeout_ms: 7000 }, { wait_timeout_ms: 999999 }), 120000);
  assert.equal(workflow.resolveStepTimeoutMs({ step_timeout_ms: 7000 }, { wait_timeout_ms: 1500 }), 1500);
});

test('runtime strict marker memakai matcher dan tidak berhenti hanya karena quiet window', () => {
  const src = read('lib/userbotWorkflowService.js');
  assert.match(src, /wait_for_match: hasStrictEditableResponseMarker/);
  assert.match(src, /strictExpected \? \{ matcher:/);
  assert.match(src, /if \(!matcher && collected\.size/);
  assert.match(src, /if \(matchedResponse\) break/);
});

test('editor dan database mendukung waktu tunggu per step dengan fallback default', () => {
  const ui = read('api/reseller.js');
  const api = read('api/reseller-data.js');
  const db = read('lib/db.js');
  assert.match(ui, /Waktu Tunggu Step Ini \(ms\)/);
  assert.match(ui, /name="wait_timeout_ms"/);
  assert.match(ui, /Kosong = mengikuti default workflow/);
  assert.match(api, /updates\.wait_timeout_ms/);
  assert.match(db, /wait_timeout_ms:/);
  assert.match(db, /updates\.wait_timeout_ms/);
});

test('migration v82.6 menambah kolom timeout per step tanpa mengubah workflow lama', () => {
  const sql = read('supabase/update-v82.6-step-timeout-maintenance.sql');
  assert.match(sql, /add column if not exists wait_timeout_ms integer null/i);
  assert.match(sql, /set wait_timeout_ms = null/i);
});

test('pengaturan bot memiliki ON OFF dan pesan maintenance editable', () => {
  const ui = read('api/reseller.js');
  const db = read('lib/db.js');
  const api = read('api/reseller-data.js');
  assert.match(ui, /Status Bot Telegram/);
  assert.match(ui, /name="bot_enabled"/);
  assert.match(ui, /name="bot_maintenance_message"/);
  assert.match(db, /bot_enabled: 'true'/);
  assert.match(db, /bot_maintenance_message:/);
  assert.match(api, /bot_enabled: body\.bot_enabled/);
  assert.match(api, /bot_maintenance_message: body\.bot_maintenance_message/);
});

test('mode maintenance memblokir pelanggan tetapi owner tetap bypass', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /if \(!actor\?\.id \|\| isOwner\(actor\.id\)\) return false/);
  assert.match(bot, /settingEnabled\(settings\.bot_enabled, true\)/);
  assert.match(bot, /tg\.sendMessage\(chatId, botMaintenanceMessage\(settings\)\)/);
  assert.match(bot, /await blockCustomerDuringMaintenance\(update\)/);
});

test('default maintenance message tidak menyebut supplier', () => {
  const bot = read('lib/botHandlers.js');
  const start = bot.indexOf('function botMaintenanceMessage');
  const end = bot.indexOf('async function blockCustomerDuringMaintenance', start);
  const block = bot.slice(start, end);
  assert.match(block, /Bot sedang maintenance sementara/);
  assert.doesNotMatch(block, /supplier/i);
});

test('workflow benar-benar melewati pesan sementara dan menunggu balasan yang cocok', async () => {
  let reads = 0;
  const fakeClient = {
    async getMessages() {
      reads += 1;
      if (reads === 1) return [{ id: 1, out: false, message: 'Menu utama' }];
      if (reads <= 3) return [
        { id: 2, out: false, message: '⏳ Sedang diproses...' },
        { id: 1, out: false, message: 'Menu utama' }
      ];
      return [
        { id: 3, out: false, message: '✅ Pesanan berhasil\nakun@example.com|rahasia' },
        { id: 2, out: false, message: '⏳ Sedang diproses...' },
        { id: 1, out: false, message: 'Menu utama' }
      ];
    },
    async sendMessage() { return true; }
  };
  workflow.__setClientFactoryForTests(async () => fakeClient);
  try {
    const result = await workflow.runWorkflowSteps({
      workflow: { target_username: '@supplier_test_bot', step_timeout_ms: 1500 },
      steps: [{
        action_type: 'text',
        action_value: '/order',
        wait_timeout_ms: 2500,
        response_snapshot: { expected_text: '✅ Pesanan berhasil{any}' },
        response_selection_index: -1,
        capture_result: true
      }],
      context: { quantity: 1 }
    });
    assert.equal(result.completed, true);
    assert.match(result.result_text, /akun@example\.com/);
    assert.ok(reads >= 4);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});
