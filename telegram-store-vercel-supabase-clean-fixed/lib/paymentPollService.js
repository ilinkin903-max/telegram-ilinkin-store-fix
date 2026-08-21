const { config } = require('./config');
const db = require('./db');
const paymentService = require('./paymentService');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVercelWaitUntil() {
  const symbol = Symbol.for('@vercel/request-context');
  const context = globalThis?.[symbol]?.get?.() || {};
  return typeof context.waitUntil === 'function' ? context.waitUntil.bind(context) : null;
}

function pollSecret() {
  return String(config.jobRunnerSecret || config.webhookSecret || config.cronSecret || '').trim();
}

function isAuthorized(value) {
  const expected = pollSecret();
  const supplied = String(value || '').trim();
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}

function publicBaseUrl() {
  const base = String(config.publicUrl || '').trim().replace(/\/$/, '');
  if (!base) throw new Error('PUBLIC_URL belum diisi untuk polling pembayaran.');
  return base;
}

async function invokePoll({ type = 'order', reference, attempt = 0 } = {}) {
  const secret = pollSecret();
  if (!secret) throw new Error('JOB_RUNNER_SECRET, WEBHOOK_SECRET, atau CRON_SECRET diperlukan untuk polling pembayaran.');
  const response = await fetch(`${publicBaseUrl()}/api/payment-poll`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`
    },
    body: JSON.stringify({
      resource_type: type === 'topup' ? 'topup' : 'order',
      reference: String(reference || ''),
      attempt: Math.max(0, Number(attempt || 0))
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Payment poll HTTP ${response.status}`);
  return data;
}

function runDetached(promise, label = 'payment polling') {
  const guarded = Promise.resolve(promise).catch((error) => {
    console.error(`${label}:`, error.message || error);
  });
  const waitUntil = getVercelWaitUntil();
  if (waitUntil) {
    waitUntil(guarded);
    return true;
  }
  guarded.catch(() => null);
  return false;
}

function scheduleOrderPolling(invoiceRef) {
  if (String(config.paymentProvider || '').toLowerCase() !== 'autogopay') return false;
  return runDetached(invokePoll({ type: 'order', reference: invoiceRef, attempt: 0 }), `start order payment polling ${invoiceRef}`);
}

function scheduleTopupPolling(topupRef) {
  if (String(config.paymentProvider || '').toLowerCase() !== 'autogopay') return false;
  return runDetached(invokePoll({ type: 'topup', reference: topupRef, attempt: 0 }), `start topup payment polling ${topupRef}`);
}

function expired(row) {
  const value = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
  return Boolean(value && Number.isFinite(value) && value <= Date.now());
}

async function continueLater(type, reference, nextAttempt) {
  await sleep(Math.max(5000, Number(config.paymentPollIntervalSeconds || 30) * 1000));
  return invokePoll({ type, reference, attempt: nextAttempt });
}

async function runOrderPoll(invoiceRef, attempt = 0) {
  const invoice = String(invoiceRef || '').trim();
  if (!invoice) return { state: 'invalid_reference', stopped: true };
  const order = await db.getPendingOrderByInvoice(invoice);
  if (!order) return { state: 'not_found', stopped: true };
  if (String(order.status || '').toLowerCase() !== 'awaiting_payment') {
    return { state: String(order.status || 'stopped'), stopped: true };
  }

  if (expired(order)) {
    await paymentService.cancelPaymentTransaction(order).catch(() => null);
    await db.deletePendingOrder(order.telegram_id, order.invoice_ref).catch(() => null);
    return { state: 'expired', stopped: true };
  }

  try {
    const transaction = await paymentService.verifyPaymentTransaction(order);
    if (transaction.status === 'completed') {
      const result = await paymentService.fulfillPaidOrder({ order, source: 'payment-poll-30s' });
      return { state: result.state || 'completed', paid: true, stopped: true };
    }
    if (['cancelled', 'expired', 'failed'].includes(transaction.status)) {
      await db.deletePendingOrder(order.telegram_id, order.invoice_ref).catch(() => null);
      return { state: transaction.status, stopped: true };
    }
  } catch (error) {
    console.warn(`Poll pembayaran ${invoice}:`, error.message || error);
  }

  const nextAttempt = Math.max(0, Number(attempt || 0)) + 1;
  const maxAttempts = Math.max(1, Number(config.paymentPollMaxAttempts || 30));
  if (nextAttempt >= maxAttempts) {
    return { state: 'pending', stopped: true, reason: 'max_attempts' };
  }

  runDetached(
    continueLater('order', invoice, nextAttempt),
    `continue order payment polling ${invoice}`
  );
  return {
    state: 'pending',
    next_attempt: nextAttempt,
    next_check_seconds: Math.max(5, Number(config.paymentPollIntervalSeconds || 30)),
    continuation_accepted: true
  };
}

async function runTopupPoll(topupRef, attempt = 0) {
  const ref = String(topupRef || '').trim();
  if (!ref) return { state: 'invalid_reference', stopped: true };
  const topup = await db.getPendingTopupByRef(ref);
  if (!topup) return { state: 'not_found', stopped: true };
  if (String(topup.status || '').toLowerCase() !== 'awaiting_payment') {
    return { state: String(topup.status || 'stopped'), stopped: true };
  }

  if (expired(topup)) {
    await paymentService.cancelTopupTransaction(topup).catch(() => null);
    await db.cancelPendingTopup(topup.telegram_id, topup.topup_ref).catch(() => null);
    return { state: 'expired', stopped: true };
  }

  try {
    const transaction = await paymentService.verifyTopupTransaction(topup);
    if (transaction.status === 'completed') {
      const result = await paymentService.completeTopupPayment({ topup, incoming: transaction, source: 'payment-poll-30s' });
      return { state: result.state || 'completed', paid: true, stopped: true };
    }
    if (['cancelled', 'expired', 'failed'].includes(transaction.status)) {
      await db.cancelPendingTopup(topup.telegram_id, topup.topup_ref).catch(() => null);
      return { state: transaction.status, stopped: true };
    }
  } catch (error) {
    console.warn(`Poll top up ${ref}:`, error.message || error);
  }

  const nextAttempt = Math.max(0, Number(attempt || 0)) + 1;
  const maxAttempts = Math.max(1, Number(config.paymentPollMaxAttempts || 30));
  if (nextAttempt >= maxAttempts) {
    return { state: 'pending', stopped: true, reason: 'max_attempts' };
  }

  runDetached(
    continueLater('topup', ref, nextAttempt),
    `continue topup payment polling ${ref}`
  );
  return {
    state: 'pending',
    next_attempt: nextAttempt,
    next_check_seconds: Math.max(5, Number(config.paymentPollIntervalSeconds || 30)),
    continuation_accepted: true
  };
}

module.exports = {
  pollSecret,
  isAuthorized,
  invokePoll,
  scheduleOrderPolling,
  scheduleTopupPolling,
  runOrderPoll,
  runTopupPoll
};
