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

function normalizeButtonRole(value) {
  return String(value || '').trim().toLowerCase() === 'quantity' ? 'quantity' : 'static';
}

function quantityValueFromButtonText(value) {
  const text = String(value || '').trim();
  // Bentuk yang umum dari bot reseller: `1`, `• 1`, `1 akun`, `2 item`, `3x`.
  // Jangan menganggap `30 Hari` sebagai jumlah item.
  const match = text.match(/^[^0-9]*(\d{1,2})(?:\s*(?:akun|account|item|items|pcs|pc|x))?[^0-9]*$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number >= 1 && number <= 20 ? number : null;
}

function isLikelyQuantityButtonSnapshot(snapshot) {
  const values = Array.from(new Set((snapshot?.buttons || [])
    .map((button) => quantityValueFromButtonText(button?.text))
    .filter((value) => Number.isInteger(value))));
  if (values.length < 2) return false;
  values.sort((a, b) => a - b);
  const hasOneTwo = values.includes(1) && values.includes(2);
  const hasAdjacent = values.some((value, index) => index > 0 && value === values[index - 1] + 1);
  return hasOneTwo || hasAdjacent;
}

function inferButtonRole(actionValue, sourceSnapshot) {
  return quantityValueFromButtonText(actionValue) !== null && isLikelyQuantityButtonSnapshot(sourceSnapshot)
    ? 'quantity'
    : 'static';
}

function resolveButtonActionValue(actionValue, buttonRole, message, context = {}) {
  const requested = String(actionValue || '').trim();
  const role = normalizeButtonRole(buttonRole);
  if (role !== 'quantity' && inferButtonRole(requested, snapshotMessage(message)) !== 'quantity') return requested;

  const quantity = Math.max(1, Number(context?.quantity || 1));
  if (!Number.isInteger(quantity)) throw new Error('Jumlah pembelian tidak valid untuk tombol jumlah item.');
  const buttons = Array.isArray(message?.buttons) && message.buttons.length && !Array.isArray(message.buttons[0])
    ? message.buttons
    : messageButtons(message);
  const match = buttons.find((button) => quantityValueFromButtonText(button?.text) === quantity);
  if (!match) {
    const available = buttons.map((button) => quantityValueFromButtonText(button.text)).filter((value) => value !== null);
    throw new Error(`Tombol jumlah ${quantity} tidak tersedia pada pesan supplier. Pilihan yang ditemukan: ${available.length ? available.join(', ') : 'tidak ada'}.`);
  }
  return match.text;
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


function recorderSnapshotCore(snapshot = {}) {
  return {
    id: safeNumber(snapshot.id),
    text: String(snapshot.text || ''),
    out: Boolean(snapshot.out),
    date: snapshot.date || null,
    edit_date: snapshot.edit_date || null,
    buttons: Array.isArray(snapshot.buttons) ? snapshot.buttons : [],
    has_media: Boolean(snapshot.has_media),
    media_type: String(snapshot.media_type || '')
  };
}

function mergeRecorderSnapshots(existing = [], incoming = [], options = {}) {
  const limit = Math.max(10, Math.min(80, Number(options.limit || 50)));
  const now = new Date().toISOString();
  const rows = new Map();
  for (const raw of Array.isArray(existing) ? existing : []) {
    const id = safeNumber(raw?.id);
    if (!id) continue;
    rows.set(id, { ...raw, id, versions: Array.isArray(raw?.versions) ? raw.versions.slice(-8) : [] });
  }
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const id = safeNumber(raw?.id);
    if (!id) continue;
    const fresh = { ...recorderSnapshotCore(raw), captured_at: raw?.captured_at || now, currently_visible: true };
    const previous = rows.get(id);
    if (!previous) {
      rows.set(id, { ...fresh, versions: [] });
      continue;
    }
    const versions = Array.isArray(previous.versions) ? previous.versions.slice(-8) : [];
    if (snapshotSignature(previous) !== snapshotSignature(fresh)) {
      const priorCore = { ...recorderSnapshotCore(previous), captured_at: previous.captured_at || now };
      if (!versions.length || snapshotSignature(versions[versions.length - 1]) !== snapshotSignature(priorCore)) versions.push(priorCore);
    }
    rows.set(id, {
      ...previous,
      ...fresh,
      captured_at: previous.captured_at || fresh.captured_at || now,
      last_seen_at: now,
      versions: versions.slice(-8)
    });
  }
  const visibleIds = new Set((Array.isArray(options.visible_snapshots) ? options.visible_snapshots : incoming).map((x) => safeNumber(x?.id)).filter(Boolean));
  if (options.mark_visibility !== false) {
    for (const [id, row] of rows.entries()) rows.set(id, { ...row, currently_visible: visibleIds.has(id) });
  }
  return Array.from(rows.values()).sort((a, b) => safeNumber(a?.id) - safeNumber(b?.id)).slice(-limit);
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

async function waitForSupplierResponses(client, target, beforeSnapshots = [], timeoutMs = 7000, options = {}) {
  const timeout = Math.max(1200, Number(timeoutMs || 7000));
  const matcher = typeof options.matcher === 'function' ? options.matcher : null;
  const start = Date.now();
  const quietWindowMs = Math.min(2500, Math.max(1600, Math.round(timeout * 0.28)));
  const beforeMap = new Map((beforeSnapshots || []).filter(Boolean).map((snap) => [Number(snap.id || 0), snapshotSignature(snap)]));
  const collected = new Map();
  let lastChangeAt = 0;
  let latestSnapshots = [];
  let matchedResponse = null;

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
          const mergedVersion = mergeRecorderSnapshots(previous ? [previous] : [], [snap], { visible_snapshots: latestSnapshots, limit: 10 })[0] || snap;
          collected.set(id, mergedVersion);
          changedThisPoll = true;
          if (!matchedResponse && matcher && matcher(snap)) matchedResponse = mergedVersion;
        }
      }
    }
    if (changedThisPoll) lastChangeAt = Date.now();
    if (matchedResponse) break;
    if (!matcher && collected.size && lastChangeAt && Date.now() - lastChangeAt >= quietWindowMs) break;
  }

  const responses = mergeRecorderSnapshots(Array.from(collected.values()), [], { visible_snapshots: latestSnapshots, mark_visibility: true, limit: 50 });
  const fallback = latestSnapshots[latestSnapshots.length - 1] || null;
  return {
    responses,
    response: matchedResponse || responses[responses.length - 1] || fallback,
    changed: responses.length > 0,
    matched: Boolean(matchedResponse),
    matched_response: matchedResponse
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


function resolveStepTimeoutMs(workflow = {}, step = {}) {
  const custom = Number(step?.wait_timeout_ms);
  if (Number.isFinite(custom) && custom >= 1500) return Math.max(1500, Math.min(120000, Math.floor(custom)));
  const fallback = Number(workflow?.step_timeout_ms || config.userbotStepTimeoutMs || 7000);
  return Math.max(1500, Math.min(120000, Number.isFinite(fallback) ? Math.floor(fallback) : 7000));
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
  const responseMode = String(options.response_mode || options.responseMode || 'wait').trim().toLowerCase() === 'same_message' ? 'same_message' : 'wait';
  const requestedButtonRole = normalizeButtonRole(options.button_role || options.buttonRole);
  if (!['text', 'button'].includes(actionType)) throw new Error('Jenis step harus text atau button.');
  if (!actionValue) throw new Error(actionType === 'button' ? 'Pilih tombol supplier.' : 'Teks yang dikirim tidak boleh kosong.');

  const beforeMessages = await recentSupplierMessages(client, target, 20).catch(() => []);
  const beforeSnapshots = beforeMessages.map(snapshotMessage).filter(Boolean);
  const beforeMessage = beforeMessages[beforeMessages.length - 1] || null;
  const before = snapshotMessage(beforeMessage);
  let previewValue = actionValue;
  let actionSource = null;
  let effectiveButtonRole = requestedButtonRole;
  let clickedButtonValue = actionValue;

  if (actionType === 'text') {
    previewValue = renderTemplate(actionValue, options.context || {});
    if (!previewValue.trim()) throw new Error('Teks hasil template kosong.');
    await client.sendMessage(target, { message: previewValue });
  } else {
    let clickable = beforeMessage;
    if (options.message_id) clickable = await getMessageById(client, target, options.message_id) || beforeMessage;
    actionSource = snapshotMessage(clickable);
    effectiveButtonRole = requestedButtonRole === 'quantity' || inferButtonRole(actionValue, actionSource) === 'quantity' ? 'quantity' : 'static';
    clickedButtonValue = resolveButtonActionValue(actionValue, effectiveButtonRole, clickable, options.context || {});
    previewValue = clickedButtonValue;
    await clickMessageButton(clickable, clickedButtonValue);
  }

  const strictExpected = responseMode !== 'same_message' && options.wait_for_match === true && hasStrictEditableResponseMarker(options.response_snapshot || null);
  const requestedTimeout = Number(options.timeout_ms || options.timeoutMs || 7000);
  let waited;
  if (responseMode === 'same_message') {
    // Callback pilihan pada satu pesan tidak perlu menunggu timeout balasan normal.
    // Beri jeda singkat agar Telegram sempat memperbarui tombol/message, lalu lanjut.
    await sleep(Math.max(250, Math.min(700, Number(options.same_message_settle_ms || 450))));
    const latestSnapshots = await recentSupplierSnapshots(client, target, 20).catch(() => []);
    const beforeMap = new Map(beforeSnapshots.map((snap) => [Number(snap?.id || 0), snapshotSignature(snap)]));
    const changed = latestSnapshots.filter((snap) => {
      const oldSignature = beforeMap.get(Number(snap?.id || 0));
      return !oldSignature || oldSignature !== snapshotSignature(snap);
    });
    waited = {
      responses: mergeRecorderSnapshots([], changed, { visible_snapshots: latestSnapshots, mark_visibility: true, limit: 50 }),
      response: latestSnapshots[latestSnapshots.length - 1] || null,
      changed: changed.length > 0
    };
  } else {
    const waitTimeout = options.recorder_mode === true && actionType === 'button'
      ? Math.min(Math.max(1200, requestedTimeout), 1800)
      : requestedTimeout;
    waited = await waitForSupplierResponses(
      client,
      target,
      beforeSnapshots,
      waitTimeout,
      strictExpected ? { matcher: (snapshot) => responseMatchesRecorded(snapshot, options.response_snapshot || null) } : {}
    );
  }

  let activeSource = actionSource;
  if (actionType === 'button' && actionSource?.id) {
    const currentSource = await getMessageById(client, target, actionSource.id).catch(() => null);
    activeSource = snapshotMessage(currentSource) || actionSource;
  }
  const sameMessageResponse = responseMode === 'same_message'
    ? ((waited.responses || []).find((snap) => Number(snap?.id || 0) === Number(actionSource?.id || 0)) || activeSource || waited.response || null)
    : null;

  return {
    target,
    action_type: actionType,
    action_value: actionValue,
    preview_value: previewValue,
    clicked_button_value: clickedButtonValue,
    button_role: actionType === 'button' ? effectiveButtonRole : 'static',
    before,
    before_snapshots: beforeSnapshots,
    source_message_snapshot: actionSource || activeSource || null,
    source_message_current_snapshot: activeSource || actionSource || null,
    responses: waited.responses || [],
    response: sameMessageResponse || waited.response || null,
    response_changed: waited.changed,
    response_mode: responseMode
  };
}

async function observeRecorderResponses(options = {}) {
  const client = await openClient();
  try {
    const target = normalizeTarget(options.target);
    const durationMs = Math.max(1200, Math.min(9000, Number(options.duration_ms || options.durationMs || 4500)));
    const beforeSnapshots = Array.isArray(options.before_snapshots) ? options.before_snapshots.filter(Boolean) : [];
    const beforeMap = new Map(beforeSnapshots.map((snap) => [safeNumber(snap?.id), snapshotSignature(snap)]).filter(([id]) => id));
    let merged = mergeRecorderSnapshots(options.existing_snapshots || [], [], { mark_visibility: false, limit: options.limit || 50 });
    const started = Date.now();
    let latest = [];
    do {
      latest = await recentSupplierSnapshots(client, target, 20).catch(() => []);
      const changed = latest.filter((snap) => {
        const id = safeNumber(snap?.id);
        if (!id) return false;
        const baselineSignature = beforeMap.get(id);
        return !baselineSignature || baselineSignature !== snapshotSignature(snap);
      });
      merged = mergeRecorderSnapshots(merged, changed, {
        visible_snapshots: latest,
        mark_visibility: true,
        limit: options.limit || 50
      });
      if (Date.now() - started >= durationMs) break;
      await sleep(350);
    } while (Date.now() - started < durationMs);
    return {
      responses: merged,
      visible_message_ids: latest.map((snap) => safeNumber(snap?.id)).filter(Boolean),
      latest_response: merged.filter((snap) => snap.currently_visible !== false).slice(-1)[0] || merged.slice(-1)[0] || null
    };
  } finally {
    await closeClient(client);
  }
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
      const timeoutMs = resolveStepTimeoutMs(workflow, step);
      const responseMode = String(step.response_mode || 'wait').toLowerCase() === 'same_message' ? 'same_message' : 'wait';
      const action = await executeActionWithClient(client, {
        target,
        action_type: step.action_type,
        action_value: step.action_value,
        button_role: step.button_role || 'static',
        message_id: lastResponse?.id || null,
        timeout_ms: timeoutMs,
        response_mode: responseMode,
        response_snapshot: step.response_snapshot || null,
        wait_for_match: hasStrictEditableResponseMarker(step.response_snapshot || null) && responseMode !== 'same_message',
        context
      });
      if (responseMode === 'same_message') {
        lastResponse = action.response || lastResponse;
        if (!lastResponse?.id) {
          const error = new Error(`Pesan supplier untuk rangkaian tombol pada step ${index + 1} tidak ditemukan.`);
          error.code = 'SUPPLIER_SAME_MESSAGE_MISSING';
          error.step_index = index;
          error.action_sent = true;
          throw error;
        }
        if (typeof options.on_step === 'function') await options.on_step({ index, step, action, response: lastResponse });
        continue;
      }
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
          timeoutMs,
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
      const timeoutMs = resolveStepTimeoutMs(workflow, step);
      const responseMode = String(step.response_mode || 'wait').toLowerCase() === 'same_message' ? 'same_message' : 'wait';
      const action = await executeActionWithClient(client, {
        target,
        action_type: step.action_type,
        action_value: step.action_value,
        button_role: step.button_role || 'static',
        message_id: lastResponse?.id || null,
        timeout_ms: timeoutMs,
        response_mode: responseMode,
        response_snapshot: step.response_snapshot || null,
        wait_for_match: hasStrictEditableResponseMarker(step.response_snapshot || null) && responseMode !== 'same_message',
        context: options.context || { quantity: 1, invoice: 'STOCK-CHECK', telegram_id: 0, username: 'stock-check', custom_input: '' }
      });
      if (responseMode === 'same_message') {
        lastResponse = action.response || lastResponse;
        if (!lastResponse?.id) {
          const error = new Error(`Pesan supplier untuk rangkaian tombol saat cek stok pada step ${index + 1} tidak ditemukan.`);
          error.code = 'WORKFLOW_STOCK_SAME_MESSAGE_MISSING';
          throw error;
        }
        continue;
      }
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
  observeRecorderResponses,
  mergeRecorderSnapshots,
  refreshSupplierMessage,
  refreshSupplierMessages,
  selectResponseForStep,
  deriveTextSelectionRule,
  extractTextByRule,
  parseStockNumber,
  resolveStepTimeoutMs,
  quantityValueFromButtonText,
  isLikelyQuantityButtonSnapshot,
  inferButtonRole,
  resolveButtonActionValue,
  runWorkflowStockProbe,
  runWorkflowSteps,
  __setClientFactoryForTests
};
