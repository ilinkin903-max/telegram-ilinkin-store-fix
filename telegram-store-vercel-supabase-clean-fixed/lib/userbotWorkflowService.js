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

async function recentSupplierMessages(client, target, limit = 12) {
  const messages = await listRecent(client, target, limit);
  return Array.from(messages || [])
    .filter((message) => !message?.out)
    .sort((a, b) => safeNumber(a?.id) - safeNumber(b?.id));
}

async function recentSupplierSnapshots(client, target, limit = 12) {
  const messages = await recentSupplierMessages(client, target, limit);
  return messages.map(snapshotMessage).filter(Boolean);
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

async function waitForSupplierResponses(client, target, beforeSnapshots = [], timeoutMs = 7000) {
  const timeout = Math.max(1200, Number(timeoutMs || 7000));
  const start = Date.now();
  const quietWindowMs = Math.min(2500, Math.max(1600, Math.round(timeout * 0.28)));
  const beforeMap = new Map((beforeSnapshots || []).filter(Boolean).map((snap) => [Number(snap.id || 0), snapshotSignature(snap)]));
  const collected = new Map();
  let lastChangeAt = 0;
  let latestSnapshots = [];

  while (Date.now() - start < timeout) {
    await sleep(Date.now() - start < 1200 ? 350 : 500);
    latestSnapshots = await recentSupplierSnapshots(client, target, 20).catch(() => []);
    let changedThisPoll = false;
    for (const snap of latestSnapshots) {
      const id = Number(snap?.id || 0);
      if (!id) continue;
      const signature = snapshotSignature(snap);
      const oldSignature = beforeMap.get(id);
      if (!oldSignature || oldSignature !== signature) {
        const previous = collected.get(id);
        if (!previous || snapshotSignature(previous) !== signature) {
          collected.set(id, snap);
          changedThisPoll = true;
        }
      }
    }
    if (changedThisPoll) lastChangeAt = Date.now();
    if (collected.size && lastChangeAt && Date.now() - lastChangeAt >= quietWindowMs) break;
  }

  const responses = Array.from(collected.values()).sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  const fallback = latestSnapshots[latestSnapshots.length - 1] || null;
  return {
    responses,
    response: responses[responses.length - 1] || fallback,
    changed: responses.length > 0
  };
}

async function waitForSupplierChange(client, target, beforeSnapshot, timeoutMs = 7000) {
  const result = await waitForSupplierResponses(client, target, beforeSnapshot ? [beforeSnapshot] : [], timeoutMs);
  return { message: null, snapshot: result.response, changed: result.changed, responses: result.responses };
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

function expectedResponseText(expected) {
  if (!expected || typeof expected !== 'object') return '';
  if (Object.prototype.hasOwnProperty.call(expected, 'expected_text')) return String(expected.expected_text || '').trim();
  return String(expected.text || '').trim();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function editableResponsePattern(value, options = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const placeholders = [];
  const tokenized = raw.replace(/\{(number|any)\}/gi, (_, name) => {
    const token = `__WF_${String(name).toUpperCase()}_${'X'.repeat(placeholders.length + 1)}__`;
    placeholders.push([token, String(name).toLowerCase()]);
    return token;
  });
  let source = escapeRegex(tokenized).replace(/\s+/g, '\\s+');
  if (options.autoNumbers) source = source.replace(/\d[\d.,]*/g, '[-+]?\\d[\\d.,]*');
  for (const [token, name] of placeholders) {
    source = source.replace(escapeRegex(token), name === 'number' ? '[-+]?\\d[\\d.,]*' : '[\\s\\S]*?');
  }
  return new RegExp(source, 'i');
}

function responseLooksLikeExpected(actual, expected) {
  const actualText = String(actual?.text || '').trim();
  if (!actualText || !expected) return false;
  const hasCustomText = Object.prototype.hasOwnProperty.call(expected, 'expected_text');
  const expectedText = expectedResponseText(expected);
  if (!expectedText) return false;
  if (hasCustomText) {
    const pattern = editableResponsePattern(expectedText, { autoNumbers: true });
    return Boolean(pattern && pattern.test(actualText));
  }
  const hint = normalizedResultHint({ text: expectedText });
  if (!hint) return false;
  const normalizedActual = actualText.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
  return normalizedActual.includes(hint);
}

function buttonSignature(snapshot) {
  return (snapshot?.buttons || []).map((button) => String(button?.text || '').trim().toLowerCase()).filter(Boolean).join('|');
}

function responseMatchesRecorded(actual, expected) {
  if (!actual || !expected) return false;
  const expectedButtons = buttonSignature(expected);
  const actualButtons = buttonSignature(actual);
  const hasEditableText = Object.prototype.hasOwnProperty.call(expected, 'expected_text');
  const expectedText = expectedResponseText(expected);
  if (expectedButtons && expectedButtons !== actualButtons) return false;
  // Workflow lama tetap kompatibel: jika belum pernah mengatur penanda teks editable,
  // tombol yang sama masih boleh menjadi penanda. Setelah field expected_text disimpan,
  // teks tersebut wajib cocok sehingga salinan workflow tidak salah membaca produk lain.
  if (hasEditableText) return expectedText ? responseLooksLikeExpected(actual, expected) : Boolean(expectedButtons);
  if (expectedButtons) return true;
  return expectedText ? responseLooksLikeExpected(actual, expected) : false;
}

function hasStrictEditableResponseMarker(expected) {
  return Boolean(expected && Object.prototype.hasOwnProperty.call(expected, 'expected_text') && String(expected.expected_text || '').trim());
}

function selectResponseForStep(responses = [], step = {}) {
  const rows = Array.isArray(responses) ? responses.filter(Boolean) : [];
  if (!rows.length) return null;
  const expected = step?.response_snapshot || null;
  if (expected && Object.keys(expected).length) {
    const matched = rows.find((row) => responseMatchesRecorded(row, expected));
    if (matched) return matched;
    // Setelah admin menyimpan penanda teks editable, jangan fallback ke urutan pesan.
    // Mismatch harus berhenti agar workflow salinan tidak membaca produk lain.
    if (hasStrictEditableResponseMarker(expected)) return null;
  }
  const index = Number(step?.response_selection_index);
  if (Number.isInteger(index) && index >= 0 && index < rows.length) return rows[index];
  return rows[rows.length - 1];
}

async function waitForCaptureResult(client, target, initialResponses, expectedSnapshot, timeoutMs, selectionIndex = -1) {
  const initial = Array.isArray(initialResponses) ? initialResponses.filter(Boolean) : (initialResponses ? [initialResponses] : []);
  const matchedInitial = initial.find((snap) => responseMatchesRecorded(snap, expectedSnapshot));
  if (matchedInitial) return matchedInitial;
  if (!expectedSnapshot || !Object.keys(expectedSnapshot || {}).length) {
    if (selectionIndex >= 0 && selectionIndex < initial.length) return initial[selectionIndex];
    if (initial.length) return initial[initial.length - 1];
  }

  const totalWait = Math.max(4000, Math.min(18000, Number(timeoutMs || 7000) * 2));
  const before = await recentSupplierSnapshots(client, target, 20).catch(() => initial);
  const later = await waitForSupplierResponses(client, target, before, totalWait);
  const combined = initial.concat(later.responses || []);
  const matched = combined.find((snap) => responseMatchesRecorded(snap, expectedSnapshot));
  if (matched) return matched;
  if (hasStrictEditableResponseMarker(expectedSnapshot)) return null;
  if (selectionIndex >= 0 && selectionIndex < combined.length) return combined[selectionIndex];
  return combined[combined.length - 1] || later.response || null;
}


function deriveTextSelectionRule(textValue, startValue, endValue) {
  const text = String(textValue || '');
  const start = Math.max(0, Math.min(text.length, Number(startValue || 0)));
  const end = Math.max(start, Math.min(text.length, Number(endValue || 0)));
  if (end <= start) throw new Error('Pilih/blok bagian teks terlebih dahulu.');
  const selected = text.slice(start, end).trim();
  if (!selected) throw new Error('Bagian teks yang dipilih kosong.');

  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd < 0) lineEnd = text.length;
  let prefix = text.slice(lineStart, start);
  let suffix = text.slice(end, lineEnd);

  // Jika pilihan dimulai/berakhir tepat di batas baris, pakai baris tetangga sebagai anchor
  // agar bagian dinamis tetap dapat ditemukan pada order berikutnya.
  if (!prefix && lineStart > 0) {
    const previousEnd = lineStart - 1;
    const previousStart = text.lastIndexOf('\n', Math.max(0, previousEnd - 1)) + 1;
    prefix = text.slice(previousStart, lineStart);
  }
  if (!suffix && lineEnd < text.length) {
    let nextEnd = text.indexOf('\n', lineEnd + 1);
    if (nextEnd < 0) nextEnd = text.length;
    suffix = text.slice(lineEnd, nextEnd);
  }

  return {
    sample: selected,
    prefix: String(prefix || '').slice(-180),
    suffix: String(suffix || '').slice(0, 180),
    start,
    end
  };
}

function extractTextByRule(textValue, rule = {}, options = {}) {
  const text = String(textValue || '');
  const prefix = String(rule.prefix || '');
  const suffix = String(rule.suffix || '');
  let start = 0;
  if (prefix) {
    const index = text.indexOf(prefix);
    if (index < 0) {
      if (options.strict) throw new Error('Penanda awal bagian teks tidak ditemukan pada balasan supplier.');
      return '';
    }
    start = index + prefix.length;
  }
  let end = text.length;
  if (suffix) {
    const index = text.indexOf(suffix, start);
    if (index < 0) {
      if (options.strict) throw new Error('Penanda akhir bagian teks tidak ditemukan pada balasan supplier.');
      return '';
    }
    end = index;
  }
  const extracted = text.slice(start, end).trim();
  if (!extracted && options.strict) throw new Error('Bagian teks hasil ekstraksi kosong.');
  return extracted;
}

function parseStockNumber(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/-?\d[\d.,]*/);
  if (!match) throw new Error('Angka stok tidak ditemukan pada bagian teks yang dipilih.');
  const digits = String(match[0]).replace(/[^0-9-]/g, '');
  const number = Number(digits || 0);
  if (!Number.isFinite(number)) throw new Error('Nilai stok tidak valid.');
  return Math.max(0, Math.floor(number));
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

  const beforeMessages = await recentSupplierMessages(client, target, 20).catch(() => []);
  const beforeSnapshots = beforeMessages.map(snapshotMessage).filter(Boolean);
  const beforeMessage = beforeMessages[beforeMessages.length - 1] || null;
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

  const waited = await waitForSupplierResponses(client, target, beforeSnapshots, options.timeout_ms || options.timeoutMs || 7000);
  return {
    target,
    action_type: actionType,
    action_value: actionValue,
    preview_value: previewValue,
    before,
    responses: waited.responses || [],
    response: waited.response || null,
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

async function refreshSupplierMessages(target, limit = 8) {
  const client = await openClient();
  try {
    const normalized = normalizeTarget(target);
    return await recentSupplierSnapshots(client, normalized, Math.max(2, Math.min(20, Number(limit || 8))));
  } finally {
    await closeClient(client);
  }
}

async function refreshSupplierMessage(target) {
  const rows = await refreshSupplierMessages(target, 8);
  return rows[rows.length - 1] || null;
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
      if (!action.response_changed || !(action.responses || []).length) {
        const error = new Error(`Supplier belum memberi balasan baru setelah step ${index + 1}: ${step.action_type === 'button' ? 'klik ' : 'kirim '}${step.action_value}`);
        error.code = 'SUPPLIER_RESPONSE_TIMEOUT';
        error.step_index = index;
        error.action_sent = true;
        error.last_response = action.response || lastResponse;
        throw error;
      }
      const selectedResponse = selectResponseForStep(action.responses || [], step);
      if (!selectedResponse && hasStrictEditableResponseMarker(step.response_snapshot || null)) {
        const error = new Error(`Balasan supplier pada step ${index + 1} tidak cocok dengan Penanda Teks Balasan yang disimpan.`);
        error.code = 'SUPPLIER_RESPONSE_MISMATCH';
        error.step_index = index;
        error.action_sent = true;
        error.last_response = action.response || lastResponse;
        throw error;
      }
      lastResponse = selectedResponse || action.response;
      if (step.capture_result) {
        lastResponse = await waitForCaptureResult(
          client,
          target,
          action.responses || [],
          step.response_snapshot || null,
          Number(workflow.step_timeout_ms || config.userbotStepTimeoutMs || 7000),
          Number(step.response_selection_index ?? -1)
        );
        if (!lastResponse && hasStrictEditableResponseMarker(step.response_snapshot || null)) {
          const error = new Error(`Hasil supplier pada step ${index + 1} tidak cocok dengan Penanda Teks Balasan yang disimpan.`);
          error.code = 'SUPPLIER_RESULT_RESPONSE_MISMATCH';
          error.step_index = index;
          error.action_sent = true;
          throw error;
        }
      }
      if (typeof options.on_step === 'function') await options.on_step({ index, step, action, response: lastResponse });
      if (step.capture_result) {
        let resultText = String(lastResponse?.text || '').trim();
        const hasPartialRule = Boolean(String(step.result_extract_prefix || '') || String(step.result_extract_suffix || ''));
        if (hasPartialRule) {
          try {
            resultText = extractTextByRule(resultText, { prefix: step.result_extract_prefix || '', suffix: step.result_extract_suffix || '' }, { strict: true });
          } catch (extractError) {
            extractError.code = 'SUPPLIER_RESULT_EXTRACT_FAILED';
            extractError.step_index = index;
            extractError.action_sent = true;
            throw extractError;
          }
        }
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


async function runWorkflowStockProbe(options = {}) {
  const workflow = options.workflow || {};
  const steps = Array.isArray(options.steps) ? options.steps : [];
  const stockIndex = steps.findIndex((step) => step.capture_stock === true);
  if (stockIndex < 0) {
    const error = new Error('Workflow belum mempunyai bagian teks yang ditandai sebagai stok.');
    error.code = 'WORKFLOW_STOCK_NOT_CONFIGURED';
    throw error;
  }
  const client = await openClient();
  try {
    const target = normalizeTarget(workflow.target_username);
    let lastResponse = null;
    for (let index = 0; index <= stockIndex; index += 1) {
      const step = steps[index];
      const action = await executeActionWithClient(client, {
        target,
        action_type: step.action_type,
        action_value: step.action_value,
        message_id: lastResponse?.id || null,
        timeout_ms: Number(workflow.step_timeout_ms || config.userbotStepTimeoutMs || 7000),
        context: options.context || { quantity: 1, invoice: 'STOCK-CHECK', telegram_id: 0, username: 'stock-check', custom_input: '' }
      });
      if (!action.response_changed || !(action.responses || []).length) {
        const error = new Error(`Supplier belum memberi balasan saat cek stok pada step ${index + 1}.`);
        error.code = 'WORKFLOW_STOCK_RESPONSE_TIMEOUT';
        throw error;
      }
      const selectedResponse = selectResponseForStep(action.responses || [], step);
      if (!selectedResponse && hasStrictEditableResponseMarker(step.response_snapshot || null)) {
        const error = new Error(`Balasan cek stok pada step ${index + 1} tidak cocok dengan Penanda Teks Balasan yang disimpan.`);
        error.code = 'WORKFLOW_STOCK_RESPONSE_MISMATCH';
        throw error;
      }
      lastResponse = selectedResponse || action.response;
      if (index === stockIndex) {
        const rawText = String(lastResponse?.text || '').trim();
        if (!rawText) throw Object.assign(new Error('Pesan stok supplier tidak berisi teks.'), { code: 'WORKFLOW_STOCK_EMPTY' });
        let extracted = rawText;
        const hasRule = Boolean(String(step.stock_extract_prefix || '') || String(step.stock_extract_suffix || ''));
        if (hasRule) extracted = extractTextByRule(rawText, { prefix: step.stock_extract_prefix || '', suffix: step.stock_extract_suffix || '' }, { strict: true });
        const stock = parseStockNumber(extracted);
        return { stock, extracted_text: extracted, response: lastResponse, step_index: index };
      }
    }
    throw Object.assign(new Error('Step stok tidak tercapai.'), { code: 'WORKFLOW_STOCK_STEP_NOT_REACHED' });
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
  refreshSupplierMessages,
  selectResponseForStep,
  deriveTextSelectionRule,
  extractTextByRule,
  parseStockNumber,
  runWorkflowStockProbe,
  runWorkflowSteps,
  __setClientFactoryForTests
};
