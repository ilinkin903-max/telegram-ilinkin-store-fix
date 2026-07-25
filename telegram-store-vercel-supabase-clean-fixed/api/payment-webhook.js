const crypto = require('crypto');
const { config } = require('../lib/config');
const db = require('../lib/db');
const paymentService = require('../lib/paymentService');

function requestSecret(req) {
  return String(
    req?.query?.secret ||
    req?.headers?.['x-webhook-secret'] ||
    req?.headers?.['x-pakasir-secret'] ||
    ''
  ).trim();
}

function parseWebhookBody(req) {
  const body = req?.body;
  if (!body) return {};
  if (Buffer.isBuffer(body)) return parseWebhookBody({ body: body.toString('utf8') });
  if (typeof body === 'object') return body;

  const raw = String(body).trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  }
}

function normalizeSignature(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^sha256=/, '');
}

function safeEqualHex(left, right) {
  const a = normalizeSignature(left);
  const b = normalizeSignature(right);
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch (_) {
    return false;
  }
}

function verifyAutoGopaySignature(req, payload) {
  const incoming = String(
    req?.headers?.['x-signature'] ||
    req?.headers?.['x-callback-signature'] ||
    ''
  ).trim();
  if (!incoming || !config.autogopayApiKey) return false;

  const candidates = [];
  if (Buffer.isBuffer(req?.rawBody)) candidates.push(req.rawBody);
  else if (typeof req?.rawBody === 'string') candidates.push(req.rawBody);
  if (Buffer.isBuffer(req?.body)) candidates.push(req.body);
  else if (typeof req?.body === 'string') candidates.push(req.body);
  candidates.push(JSON.stringify(payload || {}));

  return candidates.some((candidate) => {
    const expected = crypto.createHmac('sha256', config.autogopayApiKey).update(candidate).digest('hex');
    return safeEqualHex(incoming, expected);
  });
}

function autoGopayRequestMeta(req, payload = {}) {
  const event = String(
    payload?.event ||
    req?.headers?.['x-callback-event'] ||
    ''
  ).trim().toLowerCase();
  const userAgent = String(req?.headers?.['user-agent'] || '').trim().toLowerCase();
  const queryProvider = String(req?.query?.provider || '').trim().toLowerCase();
  const verificationMode = ['1', 'true', 'yes'].includes(String(req?.query?.verify || '').trim().toLowerCase());
  const hasSignature = Boolean(
    req?.headers?.['x-signature'] ||
    req?.headers?.['x-callback-signature']
  );
  const transaction = payload?.transaction && typeof payload.transaction === 'object'
    ? payload.transaction
    : null;
  const transactionId = String(
    transaction?.id ||
    transaction?.transaction_id ||
    ''
  ).trim();
  const amount = Number(transaction?.amount || transaction?.total || 0);
  const status = String(
    transaction?.status ||
    transaction?.transaction_status ||
    ''
  ).trim().toLowerCase();

  return {
    event,
    userAgent,
    hasSignature,
    transaction,
    transactionId,
    amount,
    status,
    queryProvider,
    verificationMode,
    looksLikeAutoGopay: queryProvider === 'autogopay' || hasSignature || event.length > 0 || userAgent.includes('autogopay-callback')
  };
}

function isAutoGopayCallbackProbe(req, payload = {}, validSignature = false) {
  const meta = autoGopayRequestMeta(req, payload);
  const explicitProbe =
    payload?.test === true ||
    payload?.verification === true ||
    payload?.challenge != null ||
    ['ping', 'pong', 'test', 'callback.test', 'webhook.test', 'callback.verify', 'callback.verification'].includes(meta.event) ||
    ['test', 'verify', 'verification'].includes(meta.status);
  const hasUsableTransaction = Boolean(
    meta.transaction &&
    meta.transactionId &&
    Number.isFinite(meta.amount) &&
    meta.amount > 0
  );
  const providerIsAutoGopay = String(config.paymentProvider || '').toLowerCase() === 'autogopay';

  // v60 mendaftarkan callback dengan query verify=1. Request verifikasi yang
  // belum memiliki signature valid selalu dibalas HTTP 200 tanpa menyentuh order.
  // Webhook pembayaran asli tetap diproses karena membawa signature HMAC valid.
  if (meta.verificationMode && !meta.hasSignature) return true;

  // Probe eksplisit atau payload tanpa transaksi lengkap juga aman dijawab 200.
  return explicitProbe || (!hasUsableTransaction && (meta.looksLikeAutoGopay || providerIsAutoGopay));
}

function pakasirSecretAllowed(req) {
  const incoming = requestSecret(req);
  const configured = String(config.pakasirWebhookSecret || '').trim();
  if (config.pakasirWebhookRequireSecret) {
    return Boolean(configured && incoming && incoming === configured);
  }
  return true;
}

async function processAutoGopayWebhook(req, res, payload) {
  const meta = autoGopayRequestMeta(req, payload);
  const validSignature = verifyAutoGopaySignature(req, payload);

  // Saat URL callback disimpan, AutoGoPay melakukan health-check/probe dan
  // hanya mengharapkan HTTP 200. Probe tidak memproses transaksi apa pun.
  // Jika probe membawa signature, signature tetap diverifikasi. Sebagian probe
  // hanya mengirim User-Agent/event tanpa payload transaksi lengkap.
  if (isAutoGopayCallbackProbe(req, payload, validSignature)) {
    console.info('AutoGoPay callback probe diterima.', {
      event: meta.event || 'callback.probe',
      signed: meta.hasSignature,
      signature_valid: meta.hasSignature ? validSignature : null
    });
    return res.status(200).json({
      success: true,
      state: 'callback_probe_ok',
      event: meta.event || 'callback.probe'
    });
  }

  if (!validSignature) {
    return res.status(401).json({ success: false, error: 'Signature AutoGoPay tidak valid.' });
  }

  const validation = paymentService.validateAutoGopayWebhookPayload(payload);
  if (!validation.ok) {
    console.warn('Webhook AutoGoPay ditolak:', validation.reason, payload);
    return res.status(400).json({ success: false, error: validation.reason });
  }

  const incoming = validation.transaction;
  if (incoming.status !== 'completed') {
    return res.status(200).json({ success: true, ignored: true, status: incoming.status });
  }

  const order = await db.getPendingOrderByProviderTransactionId(incoming.transaction_id)
    || (incoming.order_id ? await db.getPendingOrderByInvoice(incoming.order_id) : null);
  if (!order) {
    return res.status(200).json({ success: true, state: 'invoice_not_found' });
  }
  if (String(order.payment_provider || '').toLowerCase() !== 'autogopay') {
    return res.status(400).json({ success: false, error: 'Provider invoice tidak cocok.' });
  }
  if (Number(order.amount || 0) !== Number(incoming.amount || 0)) {
    console.error('Webhook AutoGoPay amount tidak cocok:', {
      transaction_id: incoming.transaction_id,
      incoming: incoming.amount,
      expected: order.amount
    });
    return res.status(400).json({ success: false, error: 'Nominal pembayaran tidak cocok.' });
  }

  const result = await paymentService.fulfillPaidOrder({
    order,
    source: 'autogopay-signed-webhook'
  });
  return res.status(200).json({
    success: true,
    state: result.state,
    transaction_id: incoming.transaction_id,
    invoice: order.invoice_ref
  });
}

async function processPakasirWebhook(req, res, payload) {
  if (!pakasirSecretAllowed(req)) {
    return res.status(401).json({ ok: false, error: 'Webhook secret tidak valid.' });
  }

  const validation = paymentService.validateWebhookPayload(payload);
  if (!validation.ok) {
    console.warn('Webhook Pakasir ditolak:', validation.reason, payload);
    return res.status(400).json({ ok: false, error: validation.reason });
  }

  const incoming = validation.transaction;
  if (incoming.status !== 'completed') {
    return res.status(200).json({ ok: true, ignored: true, status: incoming.status || 'unknown' });
  }

  const order = await db.getPendingOrderByInvoice(incoming.order_id);
  if (!order) {
    const existing = await db.getTransactionByOrderRef(incoming.order_id).catch(() => null);
    return res.status(200).json({ ok: true, state: existing ? 'already_completed' : 'invoice_not_found' });
  }
  if (Number(order.amount || 0) !== Number(incoming.amount || 0)) {
    return res.status(400).json({ ok: false, error: 'Nominal pembayaran tidak cocok.' });
  }

  const verified = await paymentService.verifyPakasirTransaction(order);
  if (verified.status !== 'completed') {
    return res.status(200).json({ ok: true, state: 'not_completed' });
  }

  const result = await paymentService.fulfillPaidOrder({ order, source: 'pakasir-webhook' });
  return res.status(200).json({ ok: true, state: result.state, invoice: incoming.order_id });
}

async function handler(req, res) {
  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.status(200).end();
  }
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Webhook pembayaran aktif.',
      version: 'v61-clean-reseller-dashboard',
      active_provider: config.paymentProvider,
      configuration: {
        autogopayApiKeyConfigured: Boolean(config.autogopayApiKey),
        pakasirProjectConfigured: Boolean(config.pakasirSlug),
        pakasirApiKeyConfigured: Boolean(config.pakasirApiKey)
      },
      webhook_url: `${String(config.publicUrl || '').replace(/\/$/, '')}/api/payment-webhook`,
      callback_registration_url: `${String(config.publicUrl || '').replace(/\/$/, '')}/api/payment-webhook?provider=autogopay&verify=1`
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = parseWebhookBody(req);
    const autoGopayMeta = autoGopayRequestMeta(req, payload);
    if (autoGopayMeta.looksLikeAutoGopay || String(config.paymentProvider).toLowerCase() === 'autogopay') {
      return await processAutoGopayWebhook(req, res, payload);
    }
    return await processPakasirWebhook(req, res, payload);
  } catch (error) {
    console.error('payment webhook error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};


module.exports = handler;
module.exports._test = {
  normalizeSignature,
  safeEqualHex,
  autoGopayRequestMeta,
  isAutoGopayCallbackProbe,
  verifyAutoGopaySignature
};
