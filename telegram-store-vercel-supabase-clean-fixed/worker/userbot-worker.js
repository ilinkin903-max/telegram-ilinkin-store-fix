require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');

const apiId = Number(process.env.TG_API_ID || 0);
const apiHash = String(process.env.TG_API_HASH || '').trim();
const stringSession = String(process.env.TG_STRING_SESSION || '').trim();
const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const bridgeUrl = String(process.env.USERBOT_BRIDGE_URL || '').trim();
const bridgeSecret = String(process.env.USERBOT_BRIDGE_SECRET || '').trim();
const workerProfile = String(process.env.WORKER_PROFILE || 'default').trim() || 'default';
const workerId = String(process.env.WORKER_ID || `ilink-${process.pid}`).trim();
const concurrency = Math.max(1, Math.min(5, Number(process.env.WORKER_CONCURRENCY || 2)));
const pollInterval = Math.max(1000, Number(process.env.POLL_INTERVAL_MS || 2500));
const balanceSyncMs = Math.max(60_000, Number(process.env.BALANCE_SYNC_MINUTES || 5) * 60_000);

for (const [name, value] of Object.entries({ TG_API_ID: apiId, TG_API_HASH: apiHash, TG_STRING_SESSION: stringSession, SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: supabaseKey, USERBOT_BRIDGE_URL: bridgeUrl, USERBOT_BRIDGE_SECRET: bridgeSecret })) {
  if (!value) { console.error(`${name} belum diisi.`); process.exit(1); }
}

const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries: 8, autoReconnect: true, floodSleepThreshold: 60 });
const lastBalanceSync = new Map();

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function nowIso() { return new Date().toISOString(); }
function normalizeBot(value) { const raw = String(value || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, ''); return raw ? `@${raw}` : ''; }
function template(text, ctx = {}) {
  return String(text == null ? '' : text).replace(/\{\{?([a-z0-9_]+)\}?\}/gi, (_, key) => String(ctx[String(key).toLowerCase()] ?? ''));
}
function regexOf(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const slash = text.match(/^\/(.*)\/([gimsuy]*)$/);
  try { return slash ? new RegExp(slash[1], slash[2]) : new RegExp(text, 'i'); } catch (_) { return null; }
}
function messageText(message) { return String(message?.message || message?.text || '').trim(); }
function fingerprint(message) {
  if (!message) return '';
  const buttons = Array.isArray(message.buttons) ? message.buttons.flat().map((b) => String(b?.text || '')).join('|') : '';
  return `${message.id || ''}:${message.editDate || ''}:${messageText(message)}:${buttons}`;
}
async function latestMessages(bot, limit = 12) { return client.getMessages(bot, { limit }); }
async function latestBotMessage(bot) {
  const messages = await latestMessages(bot, 10);
  return messages.find((m) => !m.out) || messages[0] || null;
}
function matchesText(text, step = {}) {
  const source = String(text || '');
  if (step.regex) { const rx = regexOf(step.regex); return rx ? rx.test(source) : false; }
  if (step.contains) return source.toLowerCase().includes(String(step.contains).toLowerCase());
  if (step.text) return source.trim().toLowerCase() === String(step.text).trim().toLowerCase();
  return true;
}
async function waitForMessage(bot, step = {}, previousFingerprint = '') {
  const timeout = Math.max(1000, Number(step.timeout_ms || 30000));
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const messages = await latestMessages(bot, 15);
    for (const message of messages) {
      if (message.out) continue;
      const fp = fingerprint(message);
      if (previousFingerprint && fp === previousFingerprint && !step.allow_same) continue;
      if (matchesText(messageText(message), step)) return message;
    }
    await sleep(650);
  }
  throw new Error(`Timeout menunggu balasan ${bot}${step.contains ? ` berisi "${step.contains}"` : ''}.`);
}
async function clickButton(bot, step, ctx, currentMessage = null, runState = null) {
  const wanted = template(step.text || '', ctx).trim();
  const rx = step.regex ? regexOf(template(step.regex, ctx)) : null;
  const messages = currentMessage ? [currentMessage, ...(await latestMessages(bot, 10))] : await latestMessages(bot, 10);
  for (const message of messages) {
    const rows = Array.isArray(message?.buttons) ? message.buttons : [];
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = 0; j < rows[i].length; j += 1) {
        const text = String(rows[i][j]?.text || '');
        const ok = rx ? rx.test(text) : text.trim().toLowerCase() === wanted.toLowerCase();
        if (!ok) continue;
        const before = fingerprint(message);
        await message.click({ i, j });
        if (step.commit && runState) runState.commitReached = true;
        if (step.wait_after === false) return message;
        return waitForMessage(bot, { timeout_ms: step.timeout_ms || 20000, allow_same: false }, before).catch(() => latestBotMessage(bot));
      }
    }
  }
  throw new Error(`Tombol "${wanted || step.regex || '?'}" tidak ditemukan di ${bot}.`);
}
function extractDelivery(text, regexText) {
  const raw = String(text || '').trim();
  const rx = regexOf(regexText);
  if (!rx) return raw;
  const match = raw.match(rx);
  if (!match) throw new Error('Pesan supplier diterima tetapi delivery_regex tidak cocok.');
  return String(match[1] || match[0] || '').trim();
}
async function runFlow(bot, flow, ctx, options = {}) {
  let current = await latestBotMessage(bot).catch(() => null);
  let captured = '';
  const trace = [];
  const runState = options.runState || { commitReached: false };
  for (let index = 0; index < flow.length; index += 1) {
    const step = flow[index] || {};
    const type = String(step.type || '').trim().toLowerCase();
    if (!type) continue;
    try {
      if (type === 'sleep') { await sleep(Math.max(0, Number(step.ms || step.delay_ms || 800))); continue; }
      if (type === 'send') {
        const text = template(step.text || '', ctx);
        const before = fingerprint(current);
        await client.sendMessage(bot, { message: text });
        if (step.commit) runState.commitReached = true;
        current = step.wait_after === false ? await latestBotMessage(bot) : await waitForMessage(bot, { timeout_ms: step.timeout_ms || 25000 }, before);
      } else if (type === 'start') {
        const before = fingerprint(current);
        await client.sendMessage(bot, { message: '/start' });
        current = await waitForMessage(bot, { timeout_ms: step.timeout_ms || 25000 }, before);
      } else if (type === 'click') {
        current = await clickButton(bot, step, ctx, current, runState);
      } else if (type === 'wait') {
        current = await waitForMessage(bot, step, fingerprint(current));
      } else if (type === 'capture') {
        if (!current) current = await latestBotMessage(bot);
        captured = extractDelivery(messageText(current), step.regex || options.deliveryRegex || '');
      } else {
        throw new Error(`Jenis flow tidak dikenal: ${type}`);
      }
      trace.push({ index, type, commit: !!step.commit, message_id: current?.id || null, text: messageText(current).slice(0, 300) });
      if (step.capture_delivery) captured = extractDelivery(messageText(current), step.delivery_regex || options.deliveryRegex || '');
    } catch (error) {
      error.commitReached = !!runState.commitReached;
      error.flowTrace = trace;
      throw error;
    }
  }
  if (!captured) {
    if (!current) current = await latestBotMessage(bot);
    captured = extractDelivery(messageText(current), options.deliveryRegex || '');
  }
  if (!captured) throw new Error('Flow selesai tetapi hasil produk kosong.');
  return { deliveredText: captured, trace, lastMessageId: current?.id || null, commitReached: !!runState.commitReached };
}

async function getConnectorAndProduct(job) {
  const connectorId = String(job.supplier_connector_id || '');
  const productId = String(job.supplier_product_ref || job.supplier_product_id || '');
  const [{ data: connector, error: cErr }, { data: product, error: pErr }] = await Promise.all([
    sb.from('telegram_supplier_connectors').select('*').eq('id', connectorId).maybeSingle(),
    sb.from('telegram_supplier_products').select('*').eq('id', productId).maybeSingle()
  ]);
  if (cErr) throw cErr;
  if (pErr) throw pErr;
  if (!connector || !product) throw new Error('Connector atau produk supplier pada queue tidak ditemukan.');
  return { connector, product };
}
async function updateJob(id, patch) {
  const { error } = await sb.from('supplier_orders').update({ ...patch, updated_at: nowIso() }).eq('id', id);
  if (error) throw error;
}
async function bridgeComplete(job, result, product) {
  const quantity = Math.max(1, Number(job.quantity || 1));
  const costTotalIdr = String(product.currency || '').toUpperCase() === 'IDR' ? Math.round(Number(product.cost_amount || 0) * quantity) : 0;
  const response = await axios.post(bridgeUrl, {
    action: 'complete', order_ref: job.order_ref, delivered_text: result.deliveredText, worker_id: workerId,
    worker_state: { trace: result.trace, last_message_id: result.lastMessageId, completed_at: nowIso() }, cost_total_idr: costTotalIdr
  }, { headers: { Authorization: `Bearer ${bridgeSecret}` }, timeout: 30000 });
  if (!response.data?.ok) throw new Error(response.data?.error || 'Bridge menolak hasil supplier.');
  return response.data.data;
}
async function processJob(job, slot) {
  const { connector, product } = await getConnectorAndProduct(job);
  const bot = normalizeBot(connector.bot_username);
  if (!connector.enabled) throw new Error(`Supplier ${connector.name} nonaktif.`);
  const ctx = {
    quantity: Math.max(1, Number(job.quantity || 1)), order_ref: String(job.order_ref || ''),
    product_name: String(product.name || ''), external_code: String(product.external_code || ''),
    variant_name: String(job.raw_response?.variant_name || ''), telegram_id: Number(job.raw_response?.telegram_id || 0)
  };
  console.log(`[slot ${slot}] ${job.order_ref} -> ${connector.name} ${product.name} x${ctx.quantity}`);
  await sb.from('telegram_supplier_connectors').update({ status: 'online', last_error: '', updated_at: nowIso() }).eq('id', connector.id);

  // Jika supplier sudah menghasilkan akun/key tetapi bridge ke Vercel sempat gagal,
  // jangan ulang klik/pembelian ke supplier. Cukup kirim ulang hasil yang tersimpan.
  if (String(job.delivered_text || '').trim()) {
    const replay = { deliveredText: String(job.delivered_text).trim(), trace: job.worker_state?.trace || [], lastMessageId: job.worker_state?.last_message_id || null, commitReached: true };
    await bridgeComplete(job, replay, product);
    console.log(`[slot ${slot}] ${job.order_ref} delivery replayed`);
    return;
  }

  const flow = Array.isArray(job.flow_snapshot?.product?.order_flow) && job.flow_snapshot.product.order_flow.length ? job.flow_snapshot.product.order_flow : (Array.isArray(product.order_flow) ? product.order_flow : []);
  if (!flow.length) throw new Error(`Flow order ${product.name} masih kosong.`);
  const runState = { commitReached: false };
  const result = await runFlow(bot, flow, ctx, { deliveryRegex: product.delivery_regex || job.flow_snapshot?.product?.delivery_regex || '', runState });
  try {
    await bridgeComplete(job, result, product);
  } catch (error) {
    error.deliveryResult = result;
    error.commitReached = true;
    throw error;
  }
  console.log(`[slot ${slot}] ${job.order_ref} delivered`);
}
async function markJobError(job, error) {
  const attempts = Math.max(1, Number(job.attempt_count || 1));
  const deliveredText = String(error?.deliveryResult?.deliveredText || job.delivered_text || '').trim();
  const ambiguousCommit = !!error?.commitReached && !deliveredText;
  const retry = deliveredText ? true : (!ambiguousCommit && attempts < 3);
  const nextStatus = ambiguousCommit ? 'manual_review' : (retry ? 'retry' : 'error');
  const errorCode = deliveredText ? 'DELIVERY_BRIDGE_RETRY' : (ambiguousCommit ? 'USERBOT_REVIEW_REQUIRED' : (retry ? 'USERBOT_RETRY' : 'USERBOT_FAILED'));
  const trace = error?.deliveryResult?.trace || error?.flowTrace || job.worker_state?.trace || [];
  await updateJob(job.id, {
    status: nextStatus, worker_id: '', locked_at: null,
    delivered_text: deliveredText || String(job.delivered_text || ''),
    next_attempt_at: retry ? new Date(Date.now() + 60_000).toISOString() : null,
    error_code: errorCode,
    error_message: String(error?.message || error || 'Userbot worker error').slice(0, 1000),
    worker_state: { failed_at: nowIso(), worker_id: workerId, attempt: attempts, commit_reached: !!error?.commitReached, trace }
  });
  if (job.supplier_connector_id) await sb.from('telegram_supplier_connectors').update({ status: 'error', last_error: String(error?.message || error).slice(0, 500), updated_at: nowIso() }).eq('id', job.supplier_connector_id);
}

async function claimJob() {
  const { data, error } = await sb.rpc('claim_telegram_supplier_order', { p_worker_id: workerId, p_worker_profile: workerProfile });
  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

async function syncConnectorBalance(connector) {
  const cfg = connector.flow_config && typeof connector.flow_config === 'object' ? connector.flow_config : {};
  const flow = Array.isArray(cfg.balance_flow) ? cfg.balance_flow : [];
  if (!flow.length || !cfg.balance_regex) return false;
  const bot = normalizeBot(connector.bot_username);
  const result = await runFlow(bot, flow, {}, { deliveryRegex: cfg.balance_regex });
  const numberText = String(result.deliveredText || '').replace(/[^0-9.,-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const balance = Number(numberText);
  if (!Number.isFinite(balance)) throw new Error('Saldo supplier tidak dapat dibaca dari hasil balance_flow.');
  await sb.from('telegram_supplier_connectors').update({ balance, balance_text: result.deliveredText, balance_checked_at: nowIso(), status: 'online', last_error: '', updated_at: nowIso() }).eq('id', connector.id);
  lastBalanceSync.set(String(connector.id), Date.now());
  return true;
}
async function maybeSyncBalances() {
  const { data, error } = await sb.from('telegram_supplier_connectors').select('*').eq('enabled', true).eq('worker_profile', workerProfile);
  if (error) throw error;
  for (const connector of data || []) {
    if (Date.now() - Number(lastBalanceSync.get(String(connector.id)) || 0) < balanceSyncMs) continue;
    const { data: claimed, error: claimError } = await sb.rpc('try_begin_telegram_supplier_balance_sync', { p_connector_id: connector.id, p_worker_profile: workerProfile });
    if (claimError) throw claimError;
    if (!claimed) continue;
    try { await syncConnectorBalance(connector); } catch (error) {
      await sb.from('telegram_supplier_connectors').update({ status: 'error', last_error: String(error.message || error).slice(0, 500), updated_at: nowIso() }).eq('id', connector.id);
      lastBalanceSync.set(String(connector.id), Date.now());
    }
  }
}

async function slotLoop(slot) {
  while (true) {
    let job = null;
    try {
      job = await claimJob();
      if (!job) { if (slot === 1) await maybeSyncBalances().catch((e) => console.warn('Balance sync:', e.message)); await sleep(pollInterval); continue; }
      await processJob(job, slot);
    } catch (error) {
      console.error(`[slot ${slot}]`, error.message || error);
      if (job) await markJobError(job, error).catch((e) => console.error('Gagal update error job:', e.message));
      await sleep(1500);
    }
  }
}

(async () => {
  await client.connect();
  if (!(await client.isUserAuthorized())) throw new Error('TG_STRING_SESSION tidak valid atau sudah logout.');
  const me = await client.getMe();
  console.log(`iLink Userbot Worker v81 online sebagai ${me.username ? '@'+me.username : me.firstName || me.id} | profile=${workerProfile} | concurrency=${concurrency}`);
  await Promise.all(Array.from({ length: concurrency }, (_, i) => slotLoop(i + 1)));
})().catch((error) => { console.error(error); process.exit(1); });
