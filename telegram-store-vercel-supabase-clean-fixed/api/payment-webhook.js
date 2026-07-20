const { config } = require('../lib/config');
const db = require('../lib/db');
const paymentService = require('../lib/paymentService');

function requestSecret(req) {
  return String(
    req?.query?.secret ||
    req?.headers?.['x-webhook-secret'] ||
    req?.headers?.['x-pakasir-secret'] ||
    ''
  );
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Webhook pembayaran Pakasir aktif.',
      version: 'v47-auto-payment-webhook'
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    if (config.pakasirWebhookSecret && requestSecret(req) !== config.pakasirWebhookSecret) {
      return res.status(401).json({ ok: false, error: 'Webhook secret tidak valid.' });
    }

    const validation = paymentService.validateWebhookPayload(req.body || {});
    if (!validation.ok) {
      console.warn('Webhook Pakasir ditolak:', validation.reason, req.body || {});
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

    // Pakasir menyarankan status webhook tetap divalidasi ulang melalui
    // Transaction Detail API sebelum produk diserahkan.
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
    // HTTP 500 memungkinkan penyedia webhook mencoba ulang bila terjadi
    // gangguan sementara pada Supabase, Telegram, atau koneksi server.
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};
