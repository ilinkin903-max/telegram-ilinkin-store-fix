const { config } = require('./config');

let injectedFactory = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTarget(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Username bot supplier wajib diisi.');
  if (/^https?:\/\/t\.me\//i.test(raw)) return '@' + raw.replace(/^https?:\/\/t\.me\//i, '').split(/[/?#]/)[0].replace(/^@/, '');
  return raw.startsWith('@') ? raw : '@' + raw;
}

function configured() {
  return Boolean(Number(config.userbotApiId || 0) > 0 && String(config.userbotApiHash || '').trim() && String(config.userbotStringSession || '').trim());
}

function requireConfigured() {
  if (!configured()) {
    const error = new Error('Userbot belum dikonfigurasi. Isi TG_API_ID, TG_API_HASH, dan TG_STRING_SESSION di Vercel Environment Variables.');
    error.code = 'USERBOT_NOT_CONFIGURED';
    throw error;
  }
}

async function loadTeleproto() {
  let core = null;
  let sessions = null;
  let firstError = null;

  // Project ini CommonJS. Memakai require lebih dulu menghindari error Node/Vercel
  // `Directory import teleproto/sessions is not supported` yang dapat terjadi jika
  // package CommonJS dipaksa melalui resolver ESM.
  try {
    core = require('teleproto');
    try {
      sessions = require('teleproto/sessions');
    } catch (_) {
      sessions = require('teleproto/sessions/index.js');
    }
  } catch (error) {
    firstError = error;
    core = null;
    sessions = null;
  }

  // Fallback untuk release teleproto yang diekspor sebagai ESM.
  if (!core || !sessions) {
    try {
      core = await import('teleproto');
      try {
        sessions = await import('teleproto/sessions/index.js');
      } catch (_) {
        sessions = await import('teleproto/sessions');
      }
    } catch (error) {
      const detail = error?.message || firstError?.message || error || firstError;
      const wrapped = new Error(`Runtime teleproto tidak tersedia: ${detail}`);
      wrapped.code = 'TELEPROTO_RUNTIME';
      throw wrapped;
    }
  }

  const TelegramClient = core.TelegramClient || core.default?.TelegramClient;
  const StringSession = sessions.StringSession || sessions.default?.StringSession;
  if (!TelegramClient || !StringSession) {
    const wrapped = new Error('Runtime teleproto terpasang tetapi TelegramClient/StringSession tidak ditemukan.');
    wrapped.code = 'TELEPROTO_EXPORT';
    throw wrapped;
  }
  return { TelegramClient, StringSession };
}

async function defaultClientFactory() {
  requireConfigured();
  const { TelegramClient, StringSession } = await loadTeleproto();
  const session = new StringSession(String(config.userbotStringSession || '').trim());
  const client = new TelegramClient(session, Number(config.userbotApiId), String(config.userbotApiHash), {
    connectionRetries: 3,
    requestRetries: 2,
    autoReconnect: true,
    floodSleepThreshold: 10,
    sequentialUpdates: true
  });
  await client.connect();
  return client;
}

async function openClient() {
  const factory = injectedFactory || defaultClientFactory;
  return factory();
}

async function closeClient(client) {
  if (!client || injectedFactory) return;
  try { await client.disconnect(); } catch (_) {}
}

function safeNumber(value) {
  try {
    if (typeof value === 'bigint') return Number(value);
    if (value && typeof value.toJSNumber === 'function') return value.toJSNumber();
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  } catch (_) {
    return 0;
  }
}

function buttonText(button) {
  return String(button?.text || button?.button?.text || button?.originalButton?.text || '').trim();
}

function buttonKind(button) {
  const raw = button?.button || button?.originalButton || button || {};
  const name = String(raw.className || raw.constructor?.name || '').toLowerCase();
  if (raw.url || name.includes('url')) return 'url';
  if (raw.data || name.includes('callback')) return 'callback';
  return 'text';
}

function messageButtons(message) {
  const out = [];
  const rows = Array.isArray(message?.buttons)
    ? message.buttons
    : (Array.isArray(message?.replyMarkup?.rows) ? message.replyMarkup.rows.map((row) => row?.buttons || []) : []);
  (rows || []).forEach((row, rowIndex) => {
    const list = Array.isArray(row) ? row : (Array.isArray(row?.buttons) ? row.buttons : []);
    list.forEach((button, colIndex) => {
      const text = buttonText(button);
      if (!text) return;
      out.push({
        key: `${rowIndex}:${colIndex}`,
        row: rowIndex,
        col: colIndex,
        text,
        kind: buttonKind(button)
      });
    });
  });
  return out;
}

function snapshotMessage(message) {
  if (!message) return null;
  const id = safeNumber(message.id);
  const text = String(message.message ?? message.text ?? '').trim();
  const dateRaw = message.date instanceof Date ? message.date.toISOString() : (message.date || null);
  const editRaw = message.editDate instanceof Date ? message.editDate.toISOString() : (message.editDate || message.edit_date || null);
  return {
    id,
    text,
    out: Boolean(message.out),
    date: dateRaw,
    edit_date: editRaw,
    buttons: messageButtons(message),
    has_media: Boolean(message.media),
    media_type: message.media ? String(message.media.className || message.media.constructor?.name || 'media') : ''
  };
}

function snapshotSignature(snapshot) {
  if (!snapshot) return '';
  return JSON.stringify({ id: snapshot.id, text: snapshot.text, edit_date: snapshot.edit_date, buttons: snapshot.buttons });
}

async function listRecent(client, target, limit = 12) {
  const messages = await client.getMessages(target, { limit: Math.max(3, Math.min(30, Number(limit || 12))) });
  return Array.from(messages || []);
}

async function latestSupplierMessage(client, target) {
  const messages = await listRecent(client, target, 15);
  const incoming = messages.find((message) => !message?.out) || messages[0] || null;
  return incoming;
}

async function getMessageById(client, target, messageId) {
  const id = Number(messageId || 0);
  if (!id) return null;
  try {
    const rows = await client.getMessages(target, { ids: [id] });
    return Array.from(rows || [])[0] || null;
  } catch (_) {
    const rows = await listRecent(client, target, 20);
    return rows.find((item) => safeNumber(item?.id) === id) || null;
  }
}

async function waitForSupplierChange(client, target, beforeSnapshot, timeoutMs = 7000) {
  const start = Date.now();
  const beforeSig = snapshotSignature(beforeSnapshot);
  let latest = null;
  while (Date.now() - start < Math.max(1200, Number(timeoutMs || 7000))) {
    await sleep(Date.now() - start < 1200 ? 450 : 650);
    const message = await latestSupplierMessage(client, target);
    latest = snapshotMessage(message);
    if (latest && snapshotSignature(latest) !== beforeSig) return { message, snapshot: latest, changed: true };
  }
  if (!latest) {
    const message = await latestSupplierMessage(client, target).catch(() => null);
    latest = snapshotMessage(message);
    return { message, snapshot: latest, changed: false };
  }
  return { message: null, snapshot: latest, changed: false };
}

function normalizedResultHint(snapshot) {
  const text = String(snapshot?.text || '').trim();
  if (!text) return '';
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const preferred = lines.find((line) => line.length >= 4 && line.length <= 100 && !/@|https?:\/\//i.test(line)) || lines[0] || '';
  return preferred
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function responseLooksLikeExpected(actual, expected) {
  const actualText = String(actual?.text || '').trim();
  const expectedText = String(expected?.text || '').trim();
  if (!actualText || !expectedText) return false;
  const hint = normalizedResultHint(expected);
  if (!hint) return false;
  const normalizedActual = actualText.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
  return normalizedActual.includes(hint);
}

async function waitForCaptureResult(client, target, firstSnapshot, expectedSnapshot, timeoutMs) {
  if (responseLooksLikeExpected(firstSnapshot, expectedSnapshot)) return firstSnapshot;
  const totalWait = Math.max(4000, Math.min(15000, Number(timeoutMs || 7000) * 2));
  const start = Date.now();
  let latest = firstSnapshot || null;
  let signature = snapshotSignature(latest);
  while (Date.now() - start < totalWait) {
    await sleep(700);
    const message = await latestSupplierMessage(client, target).catch(() => null);
    const snap = snapshotMessage(message);
    if (!snap) continue;
    const nextSignature = snapshotSignature(snap);
    if (nextSignature !== signature) {
      latest = snap;
      signature = nextSignature;
      if (responseLooksLikeExpected(latest, expectedSnapshot)) return latest;
    }
  }
  return latest;
}

function renderTemplate(value, context = {}) {
  const map = {
    quantity: context.quantity ?? 1,
    invoice: context.invoice ?? 'TEST-ORDER',
    telegram_id: context.telegram_id ?? 0,
    username: context.username ?? 'user',
    custom_input: context.custom_input ?? ''
  };
  return String(value == null ? '' : value).replace(/\{(quantity|invoice|telegram_id|username|custom_input)\}/gi, (_, key) => String(map[String(key).toLowerCase()] ?? ''));
}

async function clickMessageButton(message, buttonValue) {
  const wanted = String(buttonValue || '').trim();
  if (!wanted) throw new Error('Teks tombol supplier kosong.');
  if (!message) throw new Error('Pesan supplier untuk tombol ini tidak ditemukan. Refresh balasan lalu coba lagi.');
  const match = messageButtons(message).find((button) => button.text === wanted);
  if (!match) throw new Error(`Tombol "${wanted}" tidak ditemukan pada pesan supplier terbaru.`);
  if (match.kind === 'url') throw new Error('Tombol URL tidak dapat direkam sebagai langkah order otomatis. Gunakan tombol callback/reply atau kirim teks.');
  if (typeof message.click !== 'function') throw new Error('Runtime Telegram tidak mendukung klik tombol pada pesan ini.');
  await message.click({ text: wanted });
  return match;
}

async function executeActionWithClient(client, options = {}) {
  const target = normalizeTarget(options.target);
  const actionType = String(options.action_type || options.actionType || '').trim().toLowerCase();
  const actionValue = String(options.action_value ?? options.actionValue ?? '').trim();
  if (!['text', 'button'].includes(actionType)) throw new Error('Jenis step harus text atau button.');
  if (!actionValue) throw new Error(actionType === 'button' ? 'Pilih tombol supplier.' : 'Teks yang dikirim tidak boleh kosong.');

  const beforeMessage = await latestSupplierMessage(client, target).catch(() => null);
  const before = snapshotMessage(beforeMessage);
  let previewValue = actionValue;

  if (actionType === 'text') {
    previewValue = renderTemplate(actionValue, options.context || {});
    if (!previewValue.trim()) throw new Error('Teks hasil template kosong.');
    await client.sendMessage(target, { message: previewValue });
  } else {
    let clickable = beforeMessage;
    if (options.message_id) clickable = await getMessageById(client, target, options.message_id) || beforeMessage;
    await clickMessageButton(clickable, actionValue);
  }

  const waited = await waitForSupplierChange(client, target, before, options.timeout_ms || options.timeoutMs || 7000);
  return {
    target,
    action_type: actionType,
    action_value: actionValue,
    preview_value: previewValue,
    before,
    response: waited.snapshot,
    response_changed: waited.changed
  };
}

async function executeRecorderAction(options = {}) {
  const client = await openClient();
  try {
    return await executeActionWithClient(client, options);
  } finally {
    await closeClient(client);
  }
}

async function refreshSupplierMessage(target) {
  const client = await openClient();
  try {
    const normalized = normalizeTarget(target);
    const message = await latestSupplierMessage(client, normalized);
    return snapshotMessage(message);
  } finally {
    await closeClient(client);
  }
}

async function checkStatus(live = false) {
  const base = {
    configured: configured(),
    api_id_configured: Number(config.userbotApiId || 0) > 0,
    api_hash_configured: Boolean(String(config.userbotApiHash || '').trim()),
    session_configured: Boolean(String(config.userbotStringSession || '').trim())
  };
  if (!live || !base.configured) return base;
  let client = null;
  try {
    client = await openClient();
    const me = await client.getMe();
    return {
      ...base,
      connected: true,
      account: {
        id: safeNumber(me?.id),
        username: me?.username || '',
        first_name: me?.firstName || me?.first_name || ''
      }
    };
  } catch (error) {
    return { ...base, connected: false, error: String(error?.message || error || 'Userbot gagal terhubung.') };
  } finally {
    await closeClient(client);
  }
}

async function runWorkflowSteps(options = {}) {
  const workflow = options.workflow || {};
  const steps = Array.isArray(options.steps) ? options.steps : [];
  const startIndex = Math.max(0, Number(options.start_index || 0));
  const context = options.context || {};
  const client = await openClient();
  try {
    const target = normalizeTarget(workflow.target_username);
    let lastResponse = options.last_response || null;
    for (let index = startIndex; index < steps.length; index += 1) {
      const step = steps[index];
      if (typeof options.on_before_step === 'function') await options.on_before_step({ index, step, last_response: lastResponse });
      const action = await executeActionWithClient(client, {
        target,
        action_type: step.action_type,
        action_value: step.action_value,
        message_id: lastResponse?.id || null,
        timeout_ms: Number(workflow.step_timeout_ms || config.userbotStepTimeoutMs || 7000),
        context
      });
      if (!action.response_changed || !action.response) {
        const error = new Error(`Supplier belum memberi balasan baru setelah step ${index + 1}: ${step.action_type === 'button' ? 'klik ' : 'kirim '}${step.action_value}`);
        error.code = 'SUPPLIER_RESPONSE_TIMEOUT';
        error.step_index = index;
        error.action_sent = true;
        error.last_response = action.response || lastResponse;
        throw error;
      }
      lastResponse = action.response;
      if (step.capture_result) {
        lastResponse = await waitForCaptureResult(
          client,
          target,
          lastResponse,
          step.response_snapshot || null,
          Number(workflow.step_timeout_ms || config.userbotStepTimeoutMs || 7000)
        );
      }
      if (typeof options.on_step === 'function') await options.on_step({ index, step, action, response: lastResponse });
      if (step.capture_result) {
        const resultText = String(lastResponse?.text || '').trim();
        if (!resultText) {
          const error = new Error('Step hasil tercapai, tetapi balasan supplier tidak berisi teks produk.');
          error.code = 'EMPTY_SUPPLIER_RESULT';
          error.step_index = index;
          error.action_sent = true;
          throw error;
        }
        return { completed: true, result_text: resultText, current_step: index + 1, last_response: lastResponse };
      }
    }
    return { completed: false, current_step: steps.length, last_response: lastResponse };
  } finally {
    await closeClient(client);
  }
}

function __setClientFactoryForTests(factory) {
  injectedFactory = factory || null;
}

module.exports = {
  configured,
  checkStatus,
  normalizeTarget,
  snapshotMessage,
  renderTemplate,
  executeRecorderAction,
  refreshSupplierMessage,
  runWorkflowSteps,
  __setClientFactoryForTests
};
