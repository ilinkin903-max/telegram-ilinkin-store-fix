const crypto = require('crypto');
const db = require('./db');
const { config } = require('./config');

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function nowIso() { return new Date().toISOString(); }
function normalizeBot(value) {
  const raw = String(value || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  return raw ? `@${raw}` : '';
}
function configured() {
  return Number(config.tgApiId || 0) > 0 && Boolean(config.tgApiHash && config.tgStringSession);
}
function missingConfigError() {
  const error = new Error('Telegram User Session belum dikonfigurasi di Vercel. Isi TG_API_ID, TG_API_HASH, dan TG_STRING_SESSION.');
  error.code = 'TELEGRAM_SESSION_NOT_CONFIGURED';
  error.statusCode = 503;
  return error;
}
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
function messageButtonText(message) {
  const rows = Array.isArray(message?.buttons) ? message.buttons : [];
  return rows.flat().map((button) => String(button?.text || '').trim()).filter(Boolean).join('\n');
}
function captureSourceText(message, step = {}) {
  const source = String(step.source || step.capture_source || 'message').trim().toLowerCase();
  if (source === 'buttons' || source === 'keyboard') return messageButtonText(message);
  if (source === 'all' || source === 'message+buttons' || source === 'both') {
    return [messageText(message), messageButtonText(message)].filter(Boolean).join('\n');
  }
  return messageText(message);
}
function normalizeIndexedButtonLabel(value) {
  return String(value || '')
    .trim()
    .replace(/^\[?\d+\]?\s*[.)-]?\s*/i, '')
    .replace(/\s*\(\s*\d+\s*\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function fingerprint(message) {
  if (!message) return '';
  const buttons = Array.isArray(message.buttons) ? message.buttons.flat().map((b) => String(b?.text || '')).join('|') : '';
  return `${message.id || ''}:${message.editDate || ''}:${messageText(message)}:${buttons}`;
}
function matchesText(text, step = {}) {
  const source = String(text || '');
  if (step.regex) { const rx = regexOf(step.regex); return rx ? rx.test(source) : false; }
  if (step.contains) return source.toLowerCase().includes(String(step.contains).toLowerCase());
  if (step.text) return source.trim().toLowerCase() === String(step.text).trim().toLowerCase();
  return true;
}
function shouldRunStep(step = {}, ctx = {}) {
  const when = step && step.when;
  if (!when) return true;
  const quantity = Math.max(0, Number(ctx.quantity || 0));
  if (typeof when === 'string') {
    const normalized = when.replace(/\s+/g, '').toLowerCase();
    const match = normalized.match(/^quantity(>=|<=|==|=|>|<)(-?\d+(?:\.\d+)?)$/);
    if (!match) return true;
    const expected = Number(match[2]);
    if (match[1] === '>') return quantity > expected;
    if (match[1] === '>=') return quantity >= expected;
    if (match[1] === '<') return quantity < expected;
    if (match[1] === '<=') return quantity <= expected;
    return quantity === expected;
  }
  if (typeof when !== 'object') return true;
  if (when.quantity_eq != null && quantity !== Number(when.quantity_eq)) return false;
  if (when.quantity_ne != null && quantity === Number(when.quantity_ne)) return false;
  if (when.quantity_gt != null && !(quantity > Number(when.quantity_gt))) return false;
  if (when.quantity_gte != null && !(quantity >= Number(when.quantity_gte))) return false;
  if (when.quantity_lt != null && !(quantity < Number(when.quantity_lt))) return false;
  if (when.quantity_lte != null && !(quantity <= Number(when.quantity_lte))) return false;
  return true;
}
function parseNumeric(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return NaN;
  const normalized = text
    .replace(/[^0-9.,-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  return Number(normalized);
}
function parseStockFromText(text, regexText) {
  const raw = String(text || '').trim();
  if (/^\d+(?:[.,]\d+)?$/.test(raw)) return Math.max(0, Math.floor(parseNumeric(raw)));
  const regex = regexOf(regexText);
  if (!regex) {
    const fallback = raw.match(/(?:stok|stock)\s*[:=]?\s*(\d+)/i) || raw.match(/\b(\d+)\b/);
    if (!fallback) throw new Error('Stok tidak dapat dibaca. Isi Stock Regex pada produk supplier.');
    return Math.max(0, Math.floor(Number(fallback[1] || 0)));
  }
  const match = raw.match(regex);
  if (!match) throw new Error('Balasan supplier diterima tetapi Stock Regex tidak cocok.');
  const parsed = parseNumeric(match[1] ?? match[0]);
  if (!Number.isFinite(parsed)) throw new Error('Nilai stok supplier tidak valid.');
  return Math.max(0, Math.floor(parsed));
}

async function withClient(handler) {
  if (!configured()) throw missingConfigError();
  const { TelegramClient } = require('teleproto');
  const { StringSession } = require('teleproto/sessions');
  const client = new TelegramClient(
    new StringSession(String(config.tgStringSession || '')),
    Number(config.tgApiId),
    String(config.tgApiHash || ''),
    { connectionRetries: 4, autoReconnect: false, floodSleepThreshold: 30 }
  );
  try {
    await client.connect();
    if (!(await client.isUserAuthorized())) {
      const error = new Error('TG_STRING_SESSION tidak valid atau akun Telegram sudah logout.');
      error.code = 'TELEGRAM_SESSION_UNAUTHORIZED';
      error.statusCode = 503;
      throw error;
    }
    return await handler(client);
  } finally {
    try { await client.disconnect(); } catch (_) {}
  }
}

async function latestMessages(client, bot, limit = 12) { return client.getMessages(bot, { limit }); }
async function latestBotMessage(client, bot) {
  const messages = await latestMessages(client, bot, 10);
  return messages.find((m) => !m.out) || messages[0] || null;
}
async function waitForMessage(client, bot, step = {}, previousFingerprint = '') {
  const timeout = Math.max(1000, Math.min(45000, Number(step.timeout_ms || 25000)));
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const messages = await latestMessages(client, bot, 15);
    for (const message of messages) {
      if (message.out) continue;
      const fp = fingerprint(message);
      if (previousFingerprint && fp === previousFingerprint && !step.allow_same) continue;
      if (matchesText(messageText(message), step)) return message;
    }
    await sleep(550);
  }
  const error = new Error(`Timeout menunggu balasan ${bot}${step.contains ? ` berisi "${step.contains}"` : ''}.`);
  error.code = 'TELEGRAM_SUPPLIER_TIMEOUT';
  throw error;
}
async function clickButton(client, bot, step, ctx, currentMessage = null, runState = null) {
  const wanted = template(step.text || '', ctx).trim();
  const rx = step.regex ? regexOf(template(step.regex, ctx)) : null;
  const requestedIndex = Math.max(0, Math.floor(Number(step.button_index || step.index || 0)));
  const requestedRow = step.row != null ? Math.max(0, Math.floor(Number(step.row))) : null;
  const requestedCol = step.col != null ? Math.max(0, Math.floor(Number(step.col))) : null;
  const messages = currentMessage ? [currentMessage, ...(await latestMessages(client, bot, 10))] : await latestMessages(client, bot, 10);
  for (const message of messages) {
    const rows = Array.isArray(message?.buttons) ? message.buttons : [];
    let flatIndex = 0;
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = 0; j < rows[i].length; j += 1) {
        flatIndex += 1;
        const text = String(rows[i][j]?.text || '');
        let ok = false;
        if (requestedIndex > 0) {
          ok = flatIndex === requestedIndex;
          if (ok && step.expect_text) {
            const expectedRaw = template(step.expect_text, ctx);
            const expectedText = normalizeIndexedButtonLabel(expectedRaw);
            const actualText = normalizeIndexedButtonLabel(text);
            if (actualText !== expectedText) {
              const error = new Error(`Tombol nomor ${requestedIndex} berubah: diharapkan "${expectedRaw}", tetapi yang ditemukan "${text}".`);
              error.code = 'TELEGRAM_SUPPLIER_BUTTON_INDEX_MISMATCH';
              throw error;
            }
          }
        }
        else if (requestedRow != null && requestedCol != null) ok = i === requestedRow && j === requestedCol;
        else ok = rx ? rx.test(text) : text.trim().toLowerCase() === wanted.toLowerCase();
        if (!ok) continue;
        const before = fingerprint(message);
        await message.click({ i, j });
        if (step.commit && runState) runState.commitReached = true;
        if (step.wait_after === false) return message;
        return waitForMessage(client, bot, { timeout_ms: step.timeout_ms || 20000, allow_same: false }, before)
          .catch(() => latestBotMessage(client, bot));
      }
    }
  }
  const selector = requestedIndex > 0 ? `nomor ${requestedIndex}` : (requestedRow != null && requestedCol != null ? `baris ${requestedRow}, kolom ${requestedCol}` : (wanted || step.regex || '?'));
  const error = new Error(`Tombol "${selector}" tidak ditemukan di ${bot}.`);
  error.code = 'TELEGRAM_SUPPLIER_BUTTON_NOT_FOUND';
  throw error;
}
function extractText(text, regexText) {
  const raw = String(text || '').trim();
  const rx = regexOf(regexText);
  if (!rx) return raw;
  const match = raw.match(rx);
  if (!match) throw new Error('Pesan supplier diterima tetapi regex hasil tidak cocok.');
  return String(match[1] || match[0] || '').trim();
}
async function runFlow(client, bot, flow, ctx = {}, options = {}) {
  let current = await latestBotMessage(client, bot).catch(() => null);
  let captured = '';
  const trace = [];
  const runState = options.runState || { commitReached: false };
  for (let index = 0; index < (Array.isArray(flow) ? flow.length : 0); index += 1) {
    const step = flow[index] || {};
    const type = String(step.type || '').trim().toLowerCase();
    if (!type) continue;
    if (!shouldRunStep(step, ctx)) {
      trace.push({ index, type, skipped: true, reason: 'condition', when: step.when || null });
      continue;
    }
    try {
      if (type === 'sleep') {
        await sleep(Math.max(0, Math.min(10000, Number(step.ms || step.delay_ms || 700))));
        continue;
      }
      if (type === 'send') {
        const text = template(step.text || '', ctx);
        const before = fingerprint(current);
        await client.sendMessage(bot, { message: text });
        if (step.commit) runState.commitReached = true;
        current = step.wait_after === false ? await latestBotMessage(client, bot) : await waitForMessage(client, bot, { timeout_ms: step.timeout_ms || 25000 }, before);
      } else if (type === 'start') {
        const before = fingerprint(current);
        await client.sendMessage(bot, { message: '/start' });
        current = await waitForMessage(client, bot, { timeout_ms: step.timeout_ms || 25000 }, before);
      } else if (type === 'click') {
        current = await clickButton(client, bot, step, ctx, current, runState);
      } else if (type === 'wait') {
        current = await waitForMessage(client, bot, step, fingerprint(current));
      } else if (type === 'capture') {
        if (!current) current = await latestBotMessage(client, bot);
        captured = extractText(captureSourceText(current, step), step.regex || options.resultRegex || '');
      } else {
        throw new Error(`Jenis flow tidak dikenal: ${type}`);
      }
      trace.push({ index, type, commit: !!step.commit, message_id: current?.id || null, text: messageText(current).slice(0, 300) });
      if (step.capture_delivery || step.capture_result) captured = extractText(messageText(current), step.delivery_regex || step.regex || options.resultRegex || '');
    } catch (error) {
      error.commitReached = !!runState.commitReached;
      error.flowTrace = trace;
      throw error;
    }
  }
  if (!captured) {
    if (!current) current = await latestBotMessage(client, bot);
    const resultRegex = String(options.resultRegex || '').trim();
    if (resultRegex) {
      const rx = regexOf(resultRegex);
      const currentText = messageText(current);
      if (rx && !rx.test(currentText)) {
        // Supplier sering mengirim menu/daftar produk lebih dulu sebelum hasil akun.
        // Jangan langsung menerapkan delivery regex ke pesan menu; tunggu pesan yang benar-benar cocok.
        current = await waitForMessage(client, bot, { regex: resultRegex, timeout_ms: options.resultTimeoutMs || 45000 }, fingerprint(current));
      }
    }
    captured = extractText(messageText(current), resultRegex);
  }
  return { resultText: captured, trace, lastMessageId: current?.id || null, commitReached: !!runState.commitReached };
}

async function getConnectorAndProduct(productRef) {
  const product = await db.getTelegramSupplierProduct(productRef);
  if (!product) {
    const error = new Error('Produk Telegram supplier tidak ditemukan.');
    error.code = 'TELEGRAM_SUPPLIER_PRODUCT_NOT_FOUND';
    throw error;
  }
  const connector = await db.getTelegramSupplierConnector(product.connector_id);
  if (!connector) {
    const error = new Error('Connector Telegram supplier tidak ditemukan.');
    error.code = 'TELEGRAM_SUPPLIER_CONNECTOR_NOT_FOUND';
    throw error;
  }
  return { connector, product };
}

async function acquireInteractionLock(connectorId, purpose = 'stock', waitMs = 10000) {
  const token = `${purpose}-${crypto.randomUUID()}`;
  const deadline = Date.now() + Math.max(0, Number(waitMs || 0));
  do {
    const locked = await db.tryLockTelegramSupplierConnector(connectorId, token, 75).catch(() => false);
    if (locked) return token;
    if (Date.now() >= deadline) break;
    await sleep(650);
  } while (true);
  const error = new Error('Bot supplier sedang memproses transaksi lain. Silakan coba lagi sebentar.');
  error.code = 'TELEGRAM_SUPPLIER_BUSY';
  error.statusCode = 409;
  throw error;
}

async function refreshStock(productRef, options = {}) {
  const { connector, product } = await getConnectorAndProduct(productRef);
  const stockFlow = Array.isArray(product.stock_flow) ? product.stock_flow : [];
  const stockRegex = String(product.stock_regex || '').trim();
  const cacheSeconds = Math.max(5, Math.min(600, Number(product.stock_cache_seconds || 60)));
  const checkedAt = product.stock_checked_at ? new Date(product.stock_checked_at).getTime() : 0;
  const fresh = checkedAt > 0 && Date.now() - checkedAt < cacheSeconds * 1000;
  if (!options.force && fresh) return { connector, product, refreshed: false, stock: product.stock == null ? null : Number(product.stock) };
  if (!stockFlow.length) return { connector, product, refreshed: false, stock: product.stock == null ? null : Number(product.stock), noFlow: true };
  if (!configured()) throw missingConfigError();

  const token = await acquireInteractionLock(connector.id, 'stock', Number(options.waitMs || 8000));
  try {
    const bot = normalizeBot(connector.bot_username);
    const ctx = { product_name: product.name || '', external_code: product.external_code || '', quantity: 1 };
    const result = await withClient((client) => runFlow(client, bot, stockFlow, ctx, { resultRegex: stockRegex }));
    const stock = parseStockFromText(result.resultText, stockRegex);
    const updated = await db.updateTelegramSupplierProductRuntime(product.id, {
      stock,
      stock_text: result.resultText,
      stock_checked_at: nowIso()
    });
    await db.updateTelegramSupplierConnectorRuntime(connector.id, { status: 'online', last_error: '' }).catch(() => null);
    return { connector, product: updated || { ...product, stock, stock_text: result.resultText, stock_checked_at: nowIso() }, refreshed: true, stock, trace: result.trace };
  } catch (error) {
    await db.updateTelegramSupplierConnectorRuntime(connector.id, { status: 'error', last_error: String(error.message || error).slice(0, 500) }).catch(() => null);
    throw error;
  } finally {
    await db.unlockTelegramSupplierConnector(connector.id, token).catch(() => null);
  }
}

async function claimOrder(orderRef, waitMs = 25000) {
  const token = `order-${crypto.randomUUID()}`;
  const deadline = Date.now() + Math.max(0, Number(waitMs || 0));
  do {
    const job = await db.claimTelegramSupplierOrderByRef(orderRef, `vercel-${process.pid}`, token, 120).catch((error) => { throw error; });
    if (job) return { job, token };
    if (Date.now() >= deadline) break;
    await sleep(700);
  } while (true);
  return { job: null, token: '' };
}

async function executeOrder(orderRef, options = {}) {
  if (!configured()) throw missingConfigError();
  const claimed = await claimOrder(orderRef, Number(options.waitMs || 25000));
  if (!claimed.job) {
    const error = new Error('Bot supplier sedang memproses order lain. Pesanan tetap tersimpan dan dapat di-Retry Supplier.');
    error.code = 'TELEGRAM_SUPPLIER_BUSY';
    error.statusCode = 202;
    throw error;
  }
  const job = claimed.job;
  const token = claimed.token;
  const { connector, product } = await getConnectorAndProduct(job.supplier_product_ref || job.supplier_product_id);
  const bot = normalizeBot(connector.bot_username);
  const ctx = {
    quantity: Math.max(1, Number(job.quantity || 1)),
    order_ref: String(job.order_ref || ''),
    product_name: String(product.name || ''),
    external_code: String(product.external_code || ''),
    variant_name: String(job.raw_response?.variant_name || ''),
    telegram_id: Number(job.raw_response?.telegram_id || 0)
  };
  try {
    if (String(job.delivered_text || '').trim()) {
      return { job, connector, product, deliveredText: String(job.delivered_text).trim(), trace: job.worker_state?.trace || [], replay: true };
    }
    const flow = Array.isArray(job.flow_snapshot?.product?.order_flow) && job.flow_snapshot.product.order_flow.length
      ? job.flow_snapshot.product.order_flow
      : (Array.isArray(product.order_flow) ? product.order_flow : []);
    if (!flow.length) throw new Error(`Flow order ${product.name} masih kosong.`);
    const runState = { commitReached: false };
    const result = await withClient((client) => runFlow(client, bot, flow, ctx, { resultRegex: product.delivery_regex || job.flow_snapshot?.product?.delivery_regex || '', runState }));
    const deliveredText = String(result.resultText || '').trim();
    if (!deliveredText) throw new Error('Flow supplier selesai tetapi hasil produk kosong.');
    await db.upsertSupplierOrder({
      ...job,
      order_ref: job.order_ref,
      status: 'delivery_pending',
      delivered_text: deliveredText,
      error_code: '',
      error_message: '',
      worker_id: 'vercel-ondemand',
      worker_state: { trace: result.trace, last_message_id: result.lastMessageId, completed_flow_at: nowIso(), commit_reached: !!result.commitReached },
      locked_at: null,
      next_attempt_at: null
    });
    return { job, connector, product, deliveredText, trace: result.trace, commitReached: !!result.commitReached };
  } catch (error) {
    const deliveredText = String(error?.deliveryResult?.deliveredText || job.delivered_text || '').trim();
    const ambiguousCommit = !!error?.commitReached && !deliveredText;
    const attempts = Math.max(1, Number(job.attempt_count || 1));
    const retryable = !ambiguousCommit && attempts < 3;
    await db.upsertSupplierOrder({
      ...job,
      order_ref: job.order_ref,
      status: ambiguousCommit ? 'manual_review' : (retryable ? 'retry' : 'error'),
      delivered_text: deliveredText,
      error_code: ambiguousCommit ? 'USERBOT_REVIEW_REQUIRED' : (retryable ? 'USERBOT_RETRY' : 'USERBOT_FAILED'),
      error_message: String(error.message || error).slice(0, 1000),
      worker_id: '',
      locked_at: null,
      next_attempt_at: retryable ? new Date(Date.now() + 60000).toISOString() : null,
      worker_state: { failed_at: nowIso(), commit_reached: !!error?.commitReached, trace: error?.flowTrace || job.worker_state?.trace || [] }
    }).catch(() => null);
    throw error;
  } finally {
    await db.unlockTelegramSupplierConnector(connector.id, token).catch(() => null);
  }
}

module.exports = {
  configured,
  runFlow,
  refreshStock,
  executeOrder,
  parseStockFromText,
  normalizeBot
};
