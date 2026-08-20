const crypto = require('crypto');
const { TelegramClient, Api } = require('teleproto');
const { StringSession } = require('teleproto/sessions');
const { config } = require('../lib/config');

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function setupSecret() {
  return String(config.userbotSetupKey || config.webhookSecret || '').trim();
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function stateKey() {
  return crypto.createHash('sha256').update(`ilink-userbot-setup-v1:${setupSecret()}`).digest();
}

function sealState(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', stateKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, body].map((part) => part.toString('base64url')).join('.');
}

function openState(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('State login tidak valid. Kirim kode Telegram lagi.');
  const [ivText, tagText, bodyText] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', stateKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(bodyText, 'base64url')),
    decipher.final()
  ]).toString('utf8');
  const parsed = JSON.parse(plain);
  if (!parsed?.expires_at || Date.now() > Number(parsed.expires_at)) {
    throw new Error('Kode Telegram sudah kedaluwarsa. Kirim kode baru.');
  }
  return parsed;
}

function normalizePhone(value) {
  const phone = String(value || '').trim().replace(/[\s()-]/g, '');
  if (!/^\+\d{8,15}$/.test(phone)) {
    const error = new Error('Nomor Telegram harus format internasional, contoh +628123456789.');
    error.statusCode = 400;
    throw error;
  }
  return phone;
}

function apiCredentials() {
  const apiId = Number(config.tgApiId || 0);
  const apiHash = String(config.tgApiHash || '').trim();
  if (!apiId || !apiHash) {
    const error = new Error('Isi TG_API_ID dan TG_API_HASH di Vercel Environment Variables terlebih dahulu, lalu Redeploy.');
    error.statusCode = 503;
    throw error;
  }
  return { apiId, apiHash };
}

function authError(error) {
  const raw = String(error?.errorMessage || error?.message || error || 'Telegram login gagal.');
  const code = String(error?.errorMessage || error?.code || '').toUpperCase();
  if (/PHONE_CODE_INVALID/.test(raw) || code.includes('PHONE_CODE_INVALID')) return { status: 400, message: 'Kode Telegram salah. Periksa kode lalu coba lagi.' };
  if (/PHONE_CODE_EXPIRED/.test(raw) || code.includes('PHONE_CODE_EXPIRED')) return { status: 400, message: 'Kode Telegram sudah kedaluwarsa. Kirim kode baru.' };
  if (/PHONE_NUMBER_INVALID/.test(raw) || code.includes('PHONE_NUMBER_INVALID')) return { status: 400, message: 'Nomor Telegram tidak valid.' };
  if (/PASSWORD_HASH_INVALID/.test(raw) || code.includes('PASSWORD_HASH_INVALID')) return { status: 400, message: 'Password Two-Step Verification salah.' };
  if (/FLOOD_WAIT/i.test(raw)) return { status: 429, message: `Telegram membatasi percobaan login sementara. ${raw}` };
  if (/API_ID_INVALID/i.test(raw)) return { status: 400, message: 'TG_API_ID atau TG_API_HASH tidak valid.' };
  return { status: 502, message: raw.slice(0, 500) };
}

async function createClient(sessionText = '') {
  const { apiId, apiHash } = apiCredentials();
  const client = new TelegramClient(new StringSession(String(sessionText || '')), apiId, apiHash, {
    connectionRetries: 4,
    autoReconnect: false,
    floodSleepThreshold: 15
  });
  await client.connect();
  return { client, apiId, apiHash };
}

async function sendCode(phone) {
  const { client, apiId, apiHash } = await createClient('');
  try {
    const sent = await client.sendCode({ apiId, apiHash }, phone);
    const temporarySession = client.session.save();
    const state = sealState({
      phone,
      phone_code_hash: String(sent?.phoneCodeHash || ''),
      temporary_session: temporarySession,
      created_at: Date.now(),
      expires_at: Date.now() + (9 * 60 * 1000)
    });
    return {
      ok: true,
      state,
      via_app: Boolean(sent?.isCodeViaApp),
      message: sent?.isCodeViaApp
        ? 'Kode login dikirim ke aplikasi Telegram Anda.'
        : 'Kode login Telegram sudah dikirim.'
    };
  } finally {
    try { await client.disconnect(); } catch (_) {}
  }
}

async function completeLogin({ stateToken, code, password }) {
  const state = openState(stateToken);
  const { client, apiId, apiHash } = await createClient(state.temporary_session);
  try {
    if (password) {
      await client.signInWithPassword(
        { apiId, apiHash },
        {
          password: async () => String(password),
          onError: async (error) => { throw error; }
        }
      );
    } else {
      try {
        await client.invoke(new Api.auth.SignIn({
          phoneNumber: state.phone,
          phoneCodeHash: state.phone_code_hash,
          phoneCode: String(code || '').replace(/\s/g, '')
        }));
      } catch (error) {
        const text = String(error?.errorMessage || error?.message || error || '');
        if (/SESSION_PASSWORD_NEEDED/i.test(text)) {
          const passwordState = sealState({
            phone: state.phone,
            phone_code_hash: state.phone_code_hash,
            temporary_session: client.session.save(),
            password_needed: true,
            created_at: Date.now(),
            expires_at: Date.now() + (9 * 60 * 1000)
          });
          return {
            ok: false,
            needs_password: true,
            state: passwordState,
            message: 'Akun Telegram memakai Two-Step Verification. Masukkan password 2FA.'
          };
        }
        throw error;
      }
    }

    if (!(await client.isUserAuthorized())) throw new Error('Login belum terotorisasi. Coba kirim kode Telegram lagi.');
    const me = await client.getMe().catch(() => null);
    const session = String(client.session.save() || '').trim();
    if (!session) throw new Error('Login berhasil tetapi session string kosong.');
    return {
      ok: true,
      session,
      account: me ? {
        id: String(me.id || ''),
        username: me.username || '',
        first_name: me.firstName || '',
        last_name: me.lastName || ''
      } : null,
      message: 'Login berhasil. Copy TG_STRING_SESSION di bawah dan simpan ke Vercel.'
    };
  } finally {
    try { await client.disconnect(); } catch (_) {}
  }
}

module.exports = async function handler(req, res) {
  noStore(res);

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      api_id_configured: Number(config.tgApiId || 0) > 0,
      api_hash_configured: Boolean(String(config.tgApiHash || '').trim()),
      setup_key_configured: Boolean(setupSecret()),
      session_configured: Boolean(String(config.tgStringSession || '').trim())
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const incomingKey = String(req.body?.setup_key || req.headers?.['x-userbot-setup-key'] || '').trim();
  if (!setupSecret()) return res.status(503).json({ ok: false, error: 'USERBOT_SETUP_KEY/WEBHOOK_SECRET belum dikonfigurasi di Vercel.' });
  if (!safeEqual(incomingKey, setupSecret())) return res.status(401).json({ ok: false, error: 'Setup Key salah.' });

  const action = String(req.body?.action || '').trim().toLowerCase();
  try {
    if (action === 'send_code') {
      const phone = normalizePhone(req.body?.phone);
      const result = await sendCode(phone);
      return res.status(200).json(result);
    }
    if (action === 'login') {
      if (!req.body?.state) return res.status(400).json({ ok: false, error: 'State login kosong. Kirim kode Telegram lagi.' });
      if (!req.body?.password && !String(req.body?.code || '').trim()) {
        return res.status(400).json({ ok: false, error: 'Masukkan kode Telegram.' });
      }
      const result = await completeLogin({
        stateToken: req.body.state,
        code: req.body.code,
        password: req.body.password
      });
      return res.status(200).json(result);
    }
    return res.status(400).json({ ok: false, error: 'Action tidak dikenal.' });
  } catch (error) {
    const mapped = authError(error);
    return res.status(error.statusCode || mapped.status || 500).json({ ok: false, error: mapped.message || 'Setup userbot gagal.' });
  }
};

module.exports._test = { normalizePhone, sealState, openState, authError };
