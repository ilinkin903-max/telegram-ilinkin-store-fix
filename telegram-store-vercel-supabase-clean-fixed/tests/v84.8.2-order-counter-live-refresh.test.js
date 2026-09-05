const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function functionBlock(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `${name} tidak ditemukan`);
  const next = source.indexOf('\nasync function ', start + 20);
  return source.slice(start, next === -1 ? source.length : next);
}

test('migrasi membuat counter order atomik untuk semua jalur transaksi', () => {
  const sql = read('supabase/update-v84.8.2-order-counter-live-refresh.sql');
  assert.match(sql, /create table if not exists public\.store_metrics_v84_8_2/);
  assert.match(sql, /create table if not exists public\.store_order_metric_ledger_v84_8_2/);
  assert.match(sql, /create or replace function public\.sync_store_metrics_v84_8_2\(\)/);
  assert.match(sql, /metric_order_key = v_new_key/);
  assert.match(sql, /after insert or update or delete\s+on public\.transactions/);
  assert.match(sql, /on conflict \(metric_key\) do update set\s+orders_total = greatest/);
  assert.match(sql, /revision = metrics\.revision \+ 1/);
  const deleteStart = sql.indexOf("if tg_op = 'DELETE' then");
  const deleteEnd = sql.indexOf('end if;', deleteStart);
  const deleteBlock = sql.slice(deleteStart, deleteEnd);
  assert.match(deleteBlock, /revision = metrics\.revision \+ 1/);
  assert.doesNotMatch(deleteBlock, /orders_total = greatest|v_orders_delta/, 'hapus detail tidak boleh mengurangi total historis');
});

test('seed counter mempertahankan total lama dan hanya membaca transaksi completed', () => {
  const sql = read('supabase/update-v84.8.2-order-counter-live-refresh.sql');
  assert.match(sql, /where status = 'completed'/);
  assert.match(sql, /where key = 'historical_stats'/);
  assert.match(sql, /greatest\(live\.orders_total, historical\.orders_total\)/);
  assert.match(sql, /greatest\(live\.revenue_total, historical\.revenue_total\)/);
  assert.doesNotMatch(sql, /truncate\s+public\.transactions|drop table\s+public\.transactions/i);
});

test('RPC statistik baru memakai satu baris counter dan periode WIB bulan berjalan', () => {
  const sql = read('supabase/update-v84.8.2-order-counter-live-refresh.sql');
  const start = sql.indexOf('create or replace function public.stats_summary_v84_8_2()');
  assert.notEqual(start, -1);
  const block = sql.slice(start);
  assert.match(block, /metric_key = 'all_time'/);
  assert.match(block, /date_trunc\('day', now\(\) at time zone 'Asia\/Jakarta'\)/);
  assert.match(block, /date_trunc\('month', now\(\) at time zone 'Asia\/Jakarta'\)/);
  assert.match(block, /where t\.status = 'completed'/);
  assert.match(block, /'orders_today'/);
  assert.match(block, /'orders_month'/);
  assert.match(block, /'counter_version', 'v84\.8\.2'/);
  assert.match(block, /'revision'/);
});

test('RPC fallback lama juga mengecualikan transaksi batal', () => {
  const sql = read('supabase/update-v84.8.2-order-counter-live-refresh.sql');
  const start = sql.indexOf('create or replace function public.stats_summary_v62()');
  const end = sql.indexOf('create or replace function public.stats_summary_v84_8_2()', start);
  const block = sql.slice(start, end);
  assert.match(block, /where status = 'completed'/);
  assert.match(block, /'orders_today'/);
  assert.match(block, /'orders_month'/);
});

test('perubahan status transaksi menyelaraskan jumlah dan spending user tanpa double count saat insert', () => {
  const sql = read('supabase/update-v84.8.2-order-counter-live-refresh.sql');
  assert.match(sql, /sync_bot_user_transaction_metrics_v84_8_2/);
  assert.match(sql, /after update of status, total_price, telegram_id/);
  assert.doesNotMatch(sql, /create trigger transactions_bot_user_metrics_v84_8_2\s+after insert/i);
  assert.match(sql, /transaction_count = greatest\(0, coalesce\(transaction_count, 0\) \+ v_count_delta\)/);
  assert.match(sql, /spending = greatest\(0::bigint/);
});

test('database layer memprioritaskan RPC kanonik dan mengekspos revision untuk refresh ringan', () => {
  const db = read('lib/db.js');
  assert.match(db, /rpc\('stats_summary_v84_8_2'\)/);
  assert.match(db, /normalizeStatsSummary\(data \|\| \{\}, \{ canonical: true \}\)/);
  assert.match(db, /async function getLiveSalesStats\(\)/);
  assert.match(db, /statsRevision: Number\(summary\.revision \|\| 0\)/);
  assert.match(db, /summary\.canonical\s+\? Number\(summary\.orders_total/);
});

test('rekap, analytics, dan jam ramai tidak menghitung order canceled', () => {
  const db = read('lib/db.js');
  for (const name of ['getMonthlyRekap', 'getAnalytics', 'listTransactionsInRange']) {
    assert.match(functionBlock(db, name), /\.eq\('status', 'completed'\)/, `${name} harus memfilter completed`);
  }
});

test('endpoint live dashboard tidak boleh dicache dan hanya memuat ulang order saat berubah', () => {
  const api = read('api/reseller-data.js');
  assert.match(api, /Cache-Control', 'private, no-store, max-age=0, must-revalidate'/);
  assert.match(api, /action === 'dashboard-live'/);
  assert.match(api, /db\.getLiveSalesStats\(\)/);
  assert.match(api, /known_orders/);
  assert.match(api, /known_revision/);
  assert.match(api, /includeOrders \? await db\.listTransactions\(100\) : null/);
});

test('dashboard menyegarkan total order setiap lima detik tanpa cache browser', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /cache:'no-store'/);
  assert.match(dashboard, /url\+='&_ts='\+Date\.now\(\)/);
  assert.match(dashboard, /api\('dashboard-live',null,liveQuery\)/);
  assert.match(dashboard, /setInterval\(function\(\)\{ refreshDashboardLive\(false\); \},5000\)/);
  assert.match(dashboard, /document\.visibilityState === 'hidden'/);
  assert.match(dashboard, /\['Total Order',s\.orders\|\|0\]/);
  assert.match(dashboard, /s\.omzetToday!==undefined/);
  assert.match(dashboard, /var ordersChanged=Array\.isArray\(data\.orders\)/);
  assert.match(dashboard, /load\(\)\.finally\(function\(\)/);
});

test('cache bot dan marketplace memakai revision agar write baru langsung terlihat', () => {
  const bot = read('lib/botHandlers.js');
  const store = read('lib/storeService.js');
  const db = read('lib/db.js');
  assert.match(bot, /runtimeCache\.getRevision\(revisionKey\)/);
  assert.match(bot, /entry\.promiseRevision/);
  assert.match(store, /runtimeCache\.getRevision\(revisionKey\)/);
  assert.match(store, /`wallet:\$\{Number\(userId\)\}`/);
  assert.match(store, /'catalog'/);
  assert.match(db, /runtimeCache\.transactionCommitted\(result\.transaction\?\.telegram_id \|\| payloadOrder\.telegram_id\)/);
});

test('runtime cache menaikkan semua domain yang terdampak transaksi', () => {
  const runtimeCache = require('../lib/runtimeCache');
  const id = 840082;
  const before = {
    stats: runtimeCache.getRevision('stats'),
    products: runtimeCache.getRevision('products'),
    catalog: runtimeCache.getRevision('catalog'),
    dashboard: runtimeCache.getRevision('dashboard'),
    wallet: runtimeCache.getRevision(`wallet:${id}`),
    history: runtimeCache.getRevision(`history:${id}`)
  };
  runtimeCache.transactionCommitted(id);
  assert.equal(runtimeCache.getRevision('stats'), before.stats + 1);
  assert.equal(runtimeCache.getRevision('products'), before.products + 1);
  assert.equal(runtimeCache.getRevision('catalog'), before.catalog + 1);
  assert.equal(runtimeCache.getRevision('dashboard'), before.dashboard + 1);
  assert.equal(runtimeCache.getRevision(`wallet:${id}`), before.wallet + 1);
  assert.equal(runtimeCache.getRevision(`history:${id}`), before.history + 1);
});

test('releaseClaim hanya didefinisikan dan diekspor sekali', () => {
  const db = read('lib/db.js');
  assert.equal((db.match(/async function releaseClaim\(/g) || []).length, 1);
  const exportBlock = db.slice(db.indexOf('module.exports = {'));
  assert.equal((exportBlock.match(/^\s*releaseClaim,\s*$/gm) || []).length, 1);
});

test('schema instalasi baru menyertakan migrasi v84.8.2', () => {
  const schema = read('supabase/schema.sql');
  assert.match(schema, /v84\.8\.2 - canonical order counter and live dashboard refresh/);
  assert.match(schema, /create trigger transactions_store_metrics_v84_8_2/);
  assert.match(schema, /create or replace function public\.stats_summary_v84_8_2\(\)/);
  assert.match(schema, /create or replace function public\.reconcile_store_metrics_v84_8_2\(/);
});

test('restore backup direkonsiliasi dan transaksi tanpa order_ref memakai primary key', () => {
  const sql = read('supabase/update-v84.8.2-order-counter-live-refresh.sql');
  const db = read('lib/db.js');
  assert.match(sql, /create or replace function public\.reconcile_store_metrics_v84_8_2\(/);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\('store_metrics_v84_8_2'/);
  assert.match(sql, /order by orders_total desc, revenue_total desc, quantity_sold desc, source_priority desc/);
  assert.match(db, /const metricsBaseline = includeTransactions/);
  assert.match(db, /upsertTransactionBackupRows\(tables\.transactions\)/);
  assert.match(db, /delete copy\.id/);
  assert.match(db, /upsertRows\('transactions', byOrderRef, 'order_ref'\)/);
  assert.match(db, /upsertRows\('transactions', byId, 'id'\)/);
  assert.match(db, /rpc\('reconcile_store_metrics_v84_8_2', params\)/);
  assert.match(db, /runtimeCache\.bumpMany\(\['stats', 'products', 'catalog', 'settings', 'dashboard'\]\)/);
});

test('metadata rilis v84.8.2 konsisten', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version, '84.8.2');
  assert.equal(lock.version, '84.8.2');
  assert.equal(lock.packages[''].version, '84.8.2');
  assert.equal(read('VERSION').trim(), 'v84.8.2');
  assert.equal(read('VERSION.txt').trim(), 'v84.8.2');
  assert.match(read('api/index.js'), /Link Auto Order · v84\.8\.2/);
});
