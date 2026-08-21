const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './config' && parent && /userbotWorkflowService\.js$/.test(parent.filename || '')) {
    return { config: { userbotApiId: 12345, userbotApiHash: 'hash', userbotStringSession: 'session', userbotStepTimeoutMs: 1500 } };
  }
  return originalLoad.apply(this, arguments);
};
const workflow = require('../lib/userbotWorkflowService');
Module._load = originalLoad;

function incoming(id, text, buttonTexts = [], onClick = null) {
  const rows = buttonTexts.length ? [buttonTexts.map((label) => ({ text: label }))] : [];
  const msg = {
    id,
    message: text,
    out: false,
    date: new Date(),
    buttons: rows,
    async click({ text: wanted }) {
      if (!buttonTexts.includes(wanted)) throw new Error('button not found');
      if (onClick) await onClick(wanted);
    }
  };
  return msg;
}

function createFakeClient() {
  let latest = incoming(1, 'Awal');
  const client = {
    sent: [],
    setLatest(msg) { latest = msg; },
    async getMessages(_target, options = {}) {
      if (Array.isArray(options.ids)) return [latest];
      return [latest];
    },
    async sendMessage(_target, { message }) {
      this.sent.push(message);
      if (message === '/start') {
        this.setLatest(incoming(2, 'MENU UTAMA', ['Produk'], async () => {
          this.setLatest(incoming(3, 'Masukkan jumlah'));
        }));
      } else if (/^\d+$/.test(message)) {
        this.setLatest(incoming(4, 'HASIL PRODUK\nemail@example.com|password'));
      } else {
        this.setLatest(incoming(latest.id + 1, 'OK ' + message));
      }
    }
  };
  return client;
}

test('placeholder dinamis workflow dirender sesuai order', () => {
  assert.equal(
    workflow.renderTemplate('qty={quantity}|inv={invoice}|user={username}|id={telegram_id}', {
      quantity: 7, invoice: 'INV-7', username: 'freze', telegram_id: 99
    }),
    'qty=7|inv=INV-7|user=freze|id=99'
  );
});

test('workflow campuran kirim teks dan klik tombol dapat direplay sampai hasil', async () => {
  const client = createFakeClient();
  workflow.__setClientFactoryForTests(async () => client);
  try {
    const result = await workflow.runWorkflowSteps({
      workflow: { target_username: '@SupplierBot', step_timeout_ms: 1500 },
      context: { quantity: 7, invoice: 'INV-TEST', username: 'buyer', telegram_id: 11 },
      steps: [
        { action_type: 'text', action_value: '/start', capture_result: false },
        { action_type: 'button', action_value: 'Produk', capture_result: false },
        { action_type: 'text', action_value: '{quantity}', capture_result: true, response_snapshot: { text: 'HASIL PRODUK\ncontoh' } }
      ]
    });
    assert.equal(result.completed, true);
    assert.match(result.result_text, /HASIL PRODUK/);
    assert.deepEqual(client.sent, ['/start', '7']);
  } finally {
    workflow.__setClientFactoryForTests(null);
  }
});

test('migration v82 membuat tabel workflow server-side', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'update-v82-workflow-recorder.sql'), 'utf8');
  assert.match(sql, /create table if not exists public\.reseller_workflows/i);
  assert.match(sql, /create table if not exists public\.reseller_workflow_steps/i);
  assert.match(sql, /create table if not exists public\.reseller_workflow_runs/i);
  assert.match(sql, /action_type in \('text','button'\)/i);
});

test('dashboard menyediakan recorder tombol dan teks', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller.js'), 'utf8');
  assert.match(html, /Workflow Reseller/);
  assert.match(html, /Kirim Teks & Rekam/);
  assert.match(html, /data-workflow-button/);
  assert.match(html, /Balasan Ini = Hasil Produk/);
  assert.match(html, /\{quantity\}/);
});

test('fulfillment mengenali telegram_workflow sebelum ProdSeller', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'paymentService.js'), 'utf8');
  assert.match(src, /variantSource === 'telegram_workflow'/);
  assert.match(src, /processWorkflowDelivery/);
  assert.match(src, /if \(poWaiting && isWorkflowProduct\(/);
});

test('workflow activation tidak menghapus stok lokal dan menyimpan snapshot link lama', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller-data.js'), 'utf8');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'update-v82-workflow-recorder.sql'), 'utf8');
  assert.match(api, /previousLinkSnapshot/);
  assert.match(api, /restoreWorkflowProductLink/);
  assert.doesNotMatch(api, /delivery_mode:\s*'po',\s*stock:\s*\[\],\s*supplier_source:\s*'telegram_workflow'/);
  assert.match(sql, /previous_link_snapshot\s+jsonb/i);
});

test('workflow yang sibuk mempunyai worker retry otomatis tanpa mengulang ATTENTION', () => {
  const payment = fs.readFileSync(path.join(__dirname, '..', 'lib', 'paymentService.js'), 'utf8');
  const runner = fs.readFileSync(path.join(__dirname, '..', 'api', 'workflow-runner.js'), 'utf8');
  assert.match(payment, /scheduleWorkflowRetry\(invoice,\s*0\)/);
  assert.match(runner, /WORKFLOW_BUSY/);
  assert.match(runner, /WORKFLOW_STILL_RUNNING/);
  assert.match(runner, /'attention'/);
});

test('teleproto loader memprioritaskan CommonJS untuk menghindari directory import error Vercel', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'userbotWorkflowService.js'), 'utf8');
  assert.match(src, /require\('teleproto'\)/);
  assert.match(src, /require\('teleproto\/sessions'\)/);
  assert.match(src, /teleproto\/sessions\/index\.js/);
});

test('workflow reseller tidak masuk menu PO manual dan tidak bisa dikirim manual', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller-data.js'), 'utf8');
  assert.match(api, /function automatedSupplierLinkOf/);
  assert.match(api, /return !automatedSupplierLinkOf\(product, variant \|\| null\)/);
  assert.match(api, /poSupplierLink = automatedSupplierLinkOf\(poProduct, poVariant \|\| null\)/);
  assert.match(api, /Workflow Reseller/);
});

test('edit produk atau varian workflow mempertahankan stok lokal lama', () => {
  const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller-data.js'), 'utf8');
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller.js'), 'utf8');
  assert.match(api, /if \(currentSupplierSource === 'prodseller'\) updates\.stock = \[\];\s*else delete updates\.stock;/);
  assert.match(dashboard, /isWorkflowVariant \? variantStock\(v\) : \[\]/);
  assert.match(dashboard, /isWorkflowVariant\?variantStock\(old\):\[\]/);
});

test('default timeout workflow konsisten 7000 ms dan dependency teleproto dipasang oleh Vercel', () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'update-v82-workflow-recorder.sql'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  assert.match(schema, /step_timeout_ms integer not null default 7000/i);
  assert.match(migration, /step_timeout_ms integer not null default 7000/i);
  assert.equal(pkg.dependencies.teleproto, '1.228.5');
  assert.match(String(vercel.installCommand || ''), /npm install/i);
});
