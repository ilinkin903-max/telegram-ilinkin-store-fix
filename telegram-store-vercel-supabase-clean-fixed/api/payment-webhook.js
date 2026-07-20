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

function secretAllowed(req) {
  const incoming = requestSecret(req);
  const configured = String(config.pakasirWebhookSecret || '').trim();

  // Pakasir tidak menyediakan signature/header rahasia resmi. Karena transaksi
  // selalu diverifikasi ulang ke Transaction Detail API, secret dibuat opsional.
  // Aktifkan PAKASIR_WEBHOOK_REQUIRE_SECRET=true bila ingin mode ketat.
  if (config.pakasirWebhookRequireSecret) {
    return Boolean(configured && incoming && incoming === configured);
  }

  // Pada mode opsional, secret diabaikan sepenuhnya. Keamanan tetap dijaga
  // dengan pencocokan invoice/nominal/project dan verifikasi Transaction Detail API.
  // Ini juga membuat URL lama yang memiliki query secret berbeda tetap berfungsi.
  return true;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Webhook pembayaran Pakasir aktif.',
      version: 'v49-auto-payment-watcher-webhook-fix',
      configuration: {
        projectConfigured: Boolean(config.pakasirSlug),
        apiKeyConfigured: Boolean(config.pakasirApiKey),
        webhookSecretConfigured: Boolean(config.pakasirWebhookSecret),
        webhookSecretRequired: Boolean(config.pakasirWebhookRequireSecret)
      },
      recommendedWebhookPath: '/api/payment-webhook'
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    if (!secretAllowed(req)) {
      return res.status(401).json({ ok: false, error: 'Webhook secret tidak valid.' });
    }

    const payload = parseWebhookBody(req);
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
      return res.status(200).json({
        ok: true,
        state: existing ? 'already_completed' : 'invoice_not_found'
      });
    }

    if (Number(order.amount || 0) !== Number(incoming.amount || 0)) {
      console.error('Webhook amount tidak cocok:', {
        invoice: incoming.order_id,
        incoming: incoming.amount,
        expected: order.amount
      });
      return res.status(400).json({ ok: false, error: 'Nominal pembayaran tidak cocok.' });
    }

    // Status webhook tidak langsung dipercaya. Detail transaksi tetap diminta
    // kembali dari API Pakasir sebelum stok dipotong dan produk dikirim.
    const verified = await paymentService.verifyPakasirTransaction(order);
    if (verified.status !== 'completed') {
      return res.status(200).json({ ok: true, state: 'not_completed' });
    }

    const result = await paymentService.fulfillPaidOrder({
      order,
      source: 'pakasir-webhook'
    });

    return res.status(200).json({
      ok: true,
      state: result.state,
      invoice: incoming.order_id
    });
  } catch (error) {
    console.error('payment webhook error:', error);
    // HTTP 500 memungkinkan Pakasir mencoba ulang jika gangguan bersifat sementara.
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};
