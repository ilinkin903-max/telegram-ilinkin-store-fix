const paymentPoll = require('../lib/paymentPollService');
const { getAppVersion } = require('../lib/version');

function getVercelWaitUntil() {
  const symbol = Symbol.for('@vercel/request-context');
  const context = globalThis?.[symbol]?.get?.() || {};
  return typeof context.waitUntil === 'function' ? context.waitUntil.bind(context) : null;
}

function suppliedSecret(req) {
  const auth = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
  return auth || String(req.headers?.['x-job-runner-secret'] || req.headers?.['x-cron-secret'] || '').trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!paymentPoll.isAuthorized(suppliedSecret(req))) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = body.resource_type === 'topup' ? 'topup' : 'order';
    const reference = String(body.reference || '').trim();
    const attempt = Math.max(0, Number(body.attempt || 0));
    if (!reference) return res.status(400).json({ ok: false, error: 'reference wajib diisi.' });

    const task = type === 'topup'
      ? paymentPoll.runTopupPoll(reference, attempt)
      : paymentPoll.runOrderPoll(reference, attempt);
    const guarded = Promise.resolve(task).catch((error) => console.error('payment-poll background:', error));
    const waitUntil = getVercelWaitUntil();
    if (waitUntil) waitUntil(guarded);
    else guarded.catch(() => null);

    return res.status(202).json({
      ok: true,
      accepted: true,
      version: getAppVersion(),
      resource_type: type,
      reference,
      attempt
    });
  } catch (error) {
    console.error('payment-poll endpoint:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};
