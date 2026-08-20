const crypto = require('crypto');
const db = require('./db');
const { config } = require('./config');

const CONFIG_KEY = 'supplier_ai_config_v1';
const ALLOWED_STEP_TYPES = new Set(['start','click','send','wait','capture','sleep']);

function cleanBaseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(raw)) throw new Error('Base URL AI harus menggunakan https://');
  return raw;
}
function encryptionSecret() {
  return String(config.aiConfigSecret || config.userbotSetupKey || config.webhookSecret || config.supabaseServiceRoleKey || '').trim();
}
function keyBytes() {
  const secret = encryptionSecret();
  if (!secret) throw new Error('Secret enkripsi AI belum tersedia. Isi AI_CONFIG_SECRET atau USERBOT_SETUP_KEY di Vercel.');
  return crypto.createHash('sha256').update(secret).digest();
}
function encrypt(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}
function decrypt(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parts = raw.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Format API key AI tersimpan tidak valid. Masukkan API key kembali.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(parts[1], 'base64url'));
  decipher.setAuthTag(Buffer.from(parts[2], 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
}
function maskKey(key) {
  const raw = String(key || '');
  if (!raw) return '';
  if (raw.length <= 8) return '••••••••';
  return `${raw.slice(0, 4)}••••••••${raw.slice(-4)}`;
}
async function readStored() {
  const row = await db.getRawShopSetting(CONFIG_KEY, {});
  return row && typeof row === 'object' && !Array.isArray(row) ? row : {};
}
async function getPublicConfig() {
  const row = await readStored();
  let apiKey = '';
  try { apiKey = row.api_key_enc ? decrypt(row.api_key_enc) : ''; } catch (_) {}
  return {
    enabled: row.enabled !== false,
    base_url: String(row.base_url || 'https://api.x.ai/v1'),
    model: String(row.model || 'grok-4.5'),
    backend: String(row.backend || 'chat_completions'),
    configured: Boolean(apiKey),
    api_key_masked: maskKey(apiKey),
    updated_at: row.updated_at || null
  };
}
async function getPrivateConfig() {
  const row = await readStored();
  const apiKey = row.api_key_enc ? decrypt(row.api_key_enc) : '';
  if (!apiKey) throw new Error('API Key AI belum disimpan.');
  return {
    enabled: row.enabled !== false,
    base_url: cleanBaseUrl(row.base_url || 'https://api.x.ai/v1'),
    model: String(row.model || 'grok-4.5').trim(),
    backend: String(row.backend || 'chat_completions').trim().toLowerCase(),
    api_key: apiKey
  };
}
async function saveConfig(input = {}) {
  const prev = await readStored();
  const apiKeyInput = String(input.api_key || '').trim();
  const next = {
    enabled: input.enabled === false || String(input.enabled).toLowerCase() === 'false' ? false : true,
    base_url: cleanBaseUrl(input.base_url || prev.base_url || 'https://api.x.ai/v1'),
    model: String(input.model || prev.model || 'grok-4.5').trim(),
    backend: ['responses','chat_completions'].includes(String(input.backend || prev.backend || 'chat_completions').toLowerCase()) ? String(input.backend || prev.backend || 'chat_completions').toLowerCase() : 'chat_completions',
    api_key_enc: apiKeyInput ? encrypt(apiKeyInput) : String(prev.api_key_enc || ''),
    updated_at: new Date().toISOString()
  };
  if (!next.model) throw new Error('Model AI wajib diisi.');
  await db.saveRawShopSetting(CONFIG_KEY, next);
  return getPublicConfig();
}
async function callAi(systemPrompt, userPrompt, options = {}) {
  const cfg = await getPrivateConfig();
  if (!cfg.enabled) throw new Error('AI Flow Assistant sedang dinonaktifkan.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(5000, Math.min(45000, Number(options.timeoutMs || 30000))));
  try {
    let url, body;
    if (cfg.backend === 'responses') {
      url = `${cfg.base_url}/responses`;
      body = { model: cfg.model, input: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.1 };
    } else {
      url = `${cfg.base_url}/chat/completions`;
      body = { model: cfg.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.1 };
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.api_key}` },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let json = {};
    try { json = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!response.ok) {
      const msg = json?.error?.message || json?.error || text || `HTTP ${response.status}`;
      throw new Error(`AI provider gagal: ${String(msg).slice(0, 400)}`);
    }
    let content = '';
    if (cfg.backend === 'responses') {
      content = String(json.output_text || '');
      if (!content && Array.isArray(json.output)) {
        for (const item of json.output) for (const part of (item?.content || [])) if (part?.text) content += part.text;
      }
    } else content = String(json?.choices?.[0]?.message?.content || '');
    if (!content.trim()) throw new Error('AI provider tidak mengembalikan teks.');
    return { content: content.trim(), model: cfg.model, backend: cfg.backend };
  } finally { clearTimeout(timer); }
}
function parseJsonObject(text) {
  let raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = raw.indexOf('{'); const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) raw = raw.slice(first, last + 1);
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI tidak menghasilkan objek JSON yang valid.');
  return parsed;
}
function validateFlow(flow, label) {
  if (!Array.isArray(flow)) throw new Error(`${label} harus berupa array.`);
  if (flow.length > 40) throw new Error(`${label} terlalu panjang (maksimal 40 langkah).`);
  return flow.map((step, i) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) throw new Error(`${label} langkah ${i + 1} tidak valid.`);
    const type = String(step.type || '').toLowerCase();
    if (!ALLOWED_STEP_TYPES.has(type)) throw new Error(`${label} langkah ${i + 1} memakai type yang tidak didukung: ${type || '-'}.`);
    const clean = { ...step, type };
    if (clean.button_index != null) clean.button_index = Math.max(1, Math.floor(Number(clean.button_index || 1)));
    if (clean.timeout_ms != null) clean.timeout_ms = Math.max(1000, Math.min(45000, Number(clean.timeout_ms || 25000)));
    if (clean.ms != null) clean.ms = Math.max(0, Math.min(10000, Number(clean.ms || 0)));
    return clean;
  });
}
function validateGenerated(obj) {
  const out = {
    stock_flow: validateFlow(obj.stock_flow || [], 'stock_flow'),
    stock_regex: String(obj.stock_regex || '').trim(),
    order_flow: validateFlow(obj.order_flow || [], 'order_flow'),
    delivery_regex: String(obj.delivery_regex || '').trim(),
    notes: String(obj.notes || '').trim().slice(0, 2000)
  };
  if (!out.order_flow.length) throw new Error('AI belum menghasilkan Flow Order.');
  return out;
}
async function testConnection() {
  const result = await callAi('Jawab singkat.', 'Balas persis dengan teks: ILINK_AI_OK', { timeoutMs: 20000 });
  return { ok: /ILINK_AI_OK/i.test(result.content), response: result.content.slice(0, 200), model: result.model, backend: result.backend };
}
async function generateFlow(input = {}) {
  const instructions = String(input.instructions || '').trim();
  if (!instructions) throw new Error('Tuliskan langkah/alur bot supplier terlebih dahulu.');
  const current = {
    product_name: String(input.product_name || ''), external_code: String(input.external_code || ''),
    current_stock_flow: Array.isArray(input.stock_flow) ? input.stock_flow : [], stock_regex: String(input.stock_regex || ''),
    current_order_flow: Array.isArray(input.order_flow) ? input.order_flow : [], delivery_regex: String(input.delivery_regex || ''),
    last_error: String(input.last_error || ''), last_stock_text: String(input.last_stock_text || '')
  };
  const system = `Anda adalah penyusun flow JSON untuk mesin Telegram supplier iLink. Jangan menjalankan order dan jangan memberi prose di luar JSON.\n`+
    `Type langkah yang VALID hanya: start, click, send, wait, capture, sleep.\n`+
    `click mendukung text, regex, button_index (mulai dari 1), expect_text, commit, wait_after, when.\n`+
    `when mendukung quantity_gt, quantity_gte, quantity_eq, quantity_lt, quantity_lte.\n`+
    `capture mendukung source: message, buttons, all.\n`+
    `Gunakan commit:true HANYA pada tombol final yang benar-benar memproses/memotong saldo supplier.\n`+
    `Untuk hasil akun, gunakan wait + capture_delivery:true + delivery_regex jika marker hasil diketahui.\n`+
    `Untuk stok yang tertulis di keyboard seperti ALIGHT MOTION (74), gunakan start lalu capture source buttons dan regex spesifik nama produk.\n`+
    `Kembalikan JSON object persis dengan keys: stock_flow, stock_regex, order_flow, delivery_regex, notes. Jangan gunakan markdown fence.`;
  const user = `Produk/config saat ini:\n${JSON.stringify(current, null, 2)}\n\nInstruksi admin:\n${instructions}\n\nSusun flow yang paling deterministik dan aman. Jangan mengarang tombol yang tidak disebutkan; jika instruksi tidak lengkap, tulis kekurangannya di notes tetapi tetap gunakan data yang tersedia.`;
  const result = await callAi(system, user, { timeoutMs: 35000 });
  return { ...validateGenerated(parseJsonObject(result.content)), model: result.model };
}

module.exports = { getPublicConfig, saveConfig, testConnection, generateFlow };
