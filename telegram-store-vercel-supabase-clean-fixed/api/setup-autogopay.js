const axios = require('axios');
const { config, getPublicBaseUrl } = require('../lib/config');

module.exports = async function handler(req, res) {
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
  const callbackUrl = `${base}/api/payment-webhook`;
  const redirectUrl = config.autogopayRedirectUrl || base;

  try {
    const response = await axios.post(
      `${config.autogopayBaseUrl}/user/callback-url`,
      { callback_url: callbackUrl, redirect_url: redirectUrl },
      {
        headers: {
          Authorization: `Bearer ${config.autogopayApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    return res.status(200).json({
      ok: response.data?.success !== false,
      message: response.data?.message || 'Callback AutoGoPay berhasil diatur.',
      callback_url: callbackUrl,
      redirect_url: redirectUrl,
      provider_response: response.data?.data || null
    });
  } catch (error) {
    return res.status(Number(error.response?.status || 502)).json({
      ok: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'Gagal mengatur callback AutoGoPay.'
    });
  }
};
