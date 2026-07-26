const db = require('../lib/db');
const paymentService = require('../lib/paymentService');
const { config } = require('../lib/config');
const { getAppVersion } = require('../lib/version');

function bearerToken(req) {
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  return bearer || String(req.headers?.['x-cron-secret'] || '').trim();
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!config.cronSecret) {
    return res.status(503).json({ ok: false, error: 'CRON_SECRET belum diatur.' });
  }
  if (bearerToken(req) !== String(config.cronSecret)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }

  try {
    const orders = await db.listPendingOrdersAwaitingPayment(10);
    const results = [];
    for (const order of orders) {
      const invoice = String(order.invoice_ref || '');
      try {
        const transaction = await paymentService.verifyPaymentTransaction(order);
        if (transaction.status === 'completed') {
          const fulfilled = await paymentService.fulfillPaidOrder({ order, source: 'payment-cron' });
          results.push({ invoice: paymentService.displayPaymentReference(invoice), state: fulfilled.state || 'completed' });
        } else if (['expired', 'cancelled', 'failed'].includes(transaction.status)) {
          await db.deletePendingOrder(order.telegram_id, order.invoice_ref);
          results.push({ invoice: paymentService.displayPaymentReference(invoice), state: transaction.status });
        } else {
          results.push({ invoice: paymentService.displayPaymentReference(invoice), state: transaction.status || 'pending' });
        }
      } catch (error) {
        results.push({ invoice: paymentService.displayPaymentReference(invoice), state: 'error', error: error.message || String(error) });
      }
    }
    return res.status(200).json({ ok: true, version: getAppVersion(), checked: orders.length, results });
  } catch (error) {
    console.error('payment cron error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};
