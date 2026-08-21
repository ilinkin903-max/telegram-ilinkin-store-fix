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
    const topups = await db.listPendingTopupsAwaitingPayment(10).catch(() => []);
    for (const topup of topups) {
      const ref = String(topup.topup_ref || '');
      try {
        const transaction = await paymentService.verifyTopupTransaction(topup);
        if (transaction.status === 'completed') {
          const completed = await paymentService.completeTopupPayment({ topup, incoming: transaction, source: 'payment-cron-topup' });
          results.push({ topup: paymentService.displayPaymentReference(ref), state: completed.state || 'completed' });
        } else if (['expired', 'cancelled', 'failed'].includes(transaction.status)) {
          await db.cancelPendingTopup(topup.telegram_id, topup.topup_ref);
          results.push({ topup: paymentService.displayPaymentReference(ref), state: transaction.status });
        } else {
          results.push({ topup: paymentService.displayPaymentReference(ref), state: transaction.status || 'pending' });
        }
      } catch (error) {
        results.push({ topup: paymentService.displayPaymentReference(ref), state: 'error', error: error.message || String(error) });
      }
    }
    const notificationRecovery = await paymentService.recoverTransactionNotifications(30).catch((error) => [{ state: 'error', error: error.message || String(error) }]);
    return res.status(200).json({
      ok: true,
      version: getAppVersion(),
      checked: orders.length + topups.length,
      orders_checked: orders.length,
      topups_checked: topups.length,
      notification_recovery: notificationRecovery,
      results
    });
  } catch (error) {
    console.error('payment cron error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
};
