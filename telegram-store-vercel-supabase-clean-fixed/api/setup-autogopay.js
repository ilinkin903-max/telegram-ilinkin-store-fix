const axios = require('axios');
const { config, getPublicBaseUrl } = require('../lib/config');
const { getAppVersion } = require('../lib/version');

const VERSION = getAppVersion();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeUpstreamDetails(responseOrError) {
  const response = responseOrError?.response || responseOrError;
  const data = response?.data;
  if (data && typeof data === 'object') {
    return {
      message: data.message || data.error || data.detail || null,
      code: data.code || data.error_code || null,
      data
    };
  }
  if (typeof data === 'string') return { message: data.slice(0, 500), code: null, data };
  return { message: responseOrError?.message || null, code: null, data: null };
}

async function preflightCallback(callbackUrl) {
  try {
    const response = await axios.post(callbackUrl, {
      event: 'transaction.received',
      transaction: { id: 'callback-verification', amount: 1, status: 'settlement' }
    }, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'AutoGopay-Callback/1.0',
        'X-Callback-Event': 'transaction.received'
      },
      timeout: 8000,
      validateStatus: () => true
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data && typeof response.data === 'object' ? response.data : null
    };
  } catch (error) {
    return {
      ok: false,
      status: error.response?.status || null,
      error: error.message || 'Callback tidak dapat dihubungi.'
    };
  }
}

async function registerCallback({ callbackUrl, redirectUrl, includeRedirect = true }) {
  const body = includeRedirect
    ? { callback_url: callbackUrl, redirect_url: redirectUrl }
    : { callback_url: callbackUrl };

  return axios.post(
    `${config.autogopayBaseUrl}/user/callback-url`,
    body,
    {
      headers: {
        Authorization: `Bearer ${config.autogopayApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': `iLinkin-Store/${VERSION}`
      },
      timeout: 18000,
      validateStatus: () => true
    }
  );
}

function isSuccessResponse(response) {
  const data = response?.data && typeof response.data === 'object' ? response.data : {};
  return Boolean(
    response &&
    response.status >= 200 &&
    response.status < 300 &&
    data.success !== false &&
    data.ok !== false
  );
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const incomingSecret = String(req.query?.secret || req.headers?.['x-setup-secret'] || '').trim();
  if (!config.webhookSecret || incomingSecret !== String(config.webhookSecret).trim()) {
    return res.status(401).json({ ok: false, error: 'Secret setup salah.' });
  }
  if (!config.autogopayApiKey) {
    return res.status(503).json({ ok: false, error: 'AUTOGOPAY_API_KEY belum diisi di Vercel.' });
  }

  const base = getPublicBaseUrl(req);
  if (!base) return res.status(503).json({ ok: false, error: 'PUBLIC_URL belum diisi.' });

  const callbackUrl = `${base}/api/payment-webhook?provider=autogopay&verify=1`;
  const redirectUrl = config.autogopayRedirectUrl || base;
  const preflight = await preflightCallback(callbackUrl);

  if (!preflight.ok) {
    return res.status(502).json({
      ok: false,
      error: 'Callback pembayaran belum membalas HTTP 200.',
      callback_url: callbackUrl,
      callback_preflight: preflight,
      version: VERSION,
      hint: 'Pastikan deployment v62 sudah Ready, PAYMENT_PROVIDER=autogopay, lalu buka /api/payment-webhook dan pastikan statusnya 200.'
    });
  }

  const attempts = [
    { includeRedirect: true, wait: 0 },
    { includeRedirect: true, wait: 1200 },
    { includeRedirect: false, wait: 1800 }
  ];
  const attemptResults = [];

  try {
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      if (attempt.wait) await sleep(attempt.wait);

      const response = await registerCallback({
        callbackUrl,
        redirectUrl,
        includeRedirect: attempt.includeRedirect
      });
      const details = safeUpstreamDetails(response);
      attemptResults.push({
        attempt: index + 1,
        payload: attempt.includeRedirect ? 'callback+redirect' : 'callback-only',
        status: response.status,
        message: details.message || null,
        code: details.code || null
      });

      if (isSuccessResponse(response)) {
        const data = response.data && typeof response.data === 'object' ? response.data : {};
        return res.status(200).json({
          ok: true,
          message: data.message || 'Callback AutoGoPay berhasil diatur.',
          callback_url: callbackUrl,
          redirect_url: redirectUrl,
          callback_preflight: preflight,
          attempts: attemptResults,
          provider_response: data.data || null,
          version: VERSION
        });
      }

      // 4xx biasanya berarti API key/payload salah dan tidak akan pulih dengan retry.
      if (response.status >= 400 && response.status < 500) break;
    }

    const last = attemptResults[attemptResults.length - 1] || {};
    return res.status(502).json({
      ok: false,
      error: last.message || `AutoGoPay mengembalikan HTTP ${last.status || 502}.`,
      upstream_status: last.status || null,
      upstream_code: last.code || null,
      callback_url: callbackUrl,
      redirect_url: redirectUrl,
      callback_preflight: preflight,
      attempts: attemptResults,
      version: VERSION,
      hint: 'Callback toko sudah membalas 200. Jika upstream tetap 502, coba lagi beberapa menit kemudian dan periksa API key/status layanan AutoGoPay.'
    });
  } catch (error) {
    const upstream = safeUpstreamDetails(error);
    return res.status(502).json({
      ok: false,
      error: upstream.message || 'Gagal menghubungi AutoGoPay.',
      upstream_status: error.response?.status || null,
      upstream_code: upstream.code,
      callback_url: callbackUrl,
      redirect_url: redirectUrl,
      callback_preflight: preflight,
      attempts: attemptResults,
      version: VERSION,
      hint: 'Callback toko sudah diperiksa. Lihat Vercel Function Logs dan status layanan AutoGoPay.'
    });
  }
};

module.exports._test = {
  isSuccessResponse,
  safeUpstreamDetails
};
