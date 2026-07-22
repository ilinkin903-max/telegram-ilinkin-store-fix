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

function safeEqualHex(left, right) {
  const a = String(left || '').trim().toLowerCase();
  const b = String(right || '').trim().toLowerCase();
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

function pakasirSecretAllowed(req) {
  const incoming = requestSecret(req);
  const configured = String(config.pakasirWebhookSecret || '').trim();
  if (config.pakasirWebhookRequireSecret) {
    return Boolean(configured && incoming && incoming === configured);
  }
  return true;
}

async function processAutoGopayWebhook(req, res, payload) {
  if (!verifyAutoGopaySignature(req, payload)) {
    return res.status(401).json({ ok: false, error: 'Signature AutoGoPay tidak valid.' });
  }

  const validation = paymentService.validateAutoGopayWebhookPayload(payload);
  if (!validation.ok) {
    console.warn('Webhook AutoGoPay ditolak:', validation.reason, payload);
    return res.status(400).json({ ok: false, error: validation.reason });
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

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Webhook pembayaran aktif.',
      version: 'v55-autogopay-integration',
      active_provider: config.paymentProvider,
      configuration: {
        autogopayApiKeyConfigured: Boolean(config.autogopayApiKey),
        pakasirProjectConfigured: Boolean(config.pakasirSlug),
        pakasirApiKeyConfigured: Boolean(config.pakasirApiKey)
      },
      webhook_url: `${String(config.publicUrl || '').replace(/\/$/, '')}/api/payment-webhook`
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = parseWebhookBody(req);
    const hasAutoGopaySignature = Boolean(req?.headers?.['x-signature'] || req?.headers?.['x-callback-signature']);
    if (hasAutoGopaySignature || String(config.paymentProvider).toLowerCase() === 'autogopay') {
      return await processAutoGopayWebhook(req, res, payload);
    }
    return await processPakasirWebhook(req, res, payload);
  } catch (error) {
    console.error('payment webhook error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};
