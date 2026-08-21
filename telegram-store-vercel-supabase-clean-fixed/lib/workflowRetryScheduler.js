const { config } = require('./config');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVercelWaitUntil() {
  const symbol = Symbol.for('@vercel/request-context');
  const context = globalThis?.[symbol]?.get?.() || {};
  return typeof context.waitUntil === 'function' ? context.waitUntil.bind(context) : null;
}

function runnerSecret() {
  return String(config.jobRunnerSecret || config.webhookSecret || config.cronSecret || '').trim();
}

function isAuthorized(value) {
  const expected = runnerSecret();
  const supplied = String(value || '').trim();
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}

function publicBaseUrl() {
  const base = String(config.publicUrl || '').trim().replace(/\/$/, '');
  if (!base) throw new Error('PUBLIC_URL belum diisi untuk worker Workflow Reseller.');
  return base;
}

async function invokeWorkflowRunner(invoice, attempt = 0) {
  const secret = runnerSecret();
  if (!secret) throw new Error('JOB_RUNNER_SECRET, WEBHOOK_SECRET, atau CRON_SECRET diperlukan untuk worker Workflow Reseller.');
  const response = await fetch(`${publicBaseUrl()}/api/workflow-runner`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`
    },
    body: JSON.stringify({ invoice: String(invoice || '').trim(), attempt: Math.max(0, Number(attempt || 0)) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202 && response.status !== 409) {
    throw new Error(data.error || `Workflow runner HTTP ${response.status}`);
  }
  return data;
}

function runDetached(promise, label = 'workflow runner') {
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

async function continueLater(invoice, nextAttempt, delaySeconds) {
  await sleep(Math.max(3000, Number(delaySeconds || config.workflowRetryIntervalSeconds || 8) * 1000));
  return invokeWorkflowRunner(invoice, nextAttempt);
}

function scheduleWorkflowRetry(invoice, attempt = 0, delaySeconds = null) {
  const ref = String(invoice || '').trim();
  if (!ref || !runnerSecret() || !String(config.publicUrl || '').trim()) return false;
  const nextAttempt = Math.max(0, Number(attempt || 0));
  const max = Math.max(1, Number(config.workflowRetryMaxAttempts || 18));
  if (nextAttempt >= max) return false;
  return runDetached(
    continueLater(ref, nextAttempt, delaySeconds),
    `continue workflow ${ref}`
  );
}

module.exports = {
  runnerSecret,
  isAuthorized,
  invokeWorkflowRunner,
  scheduleWorkflowRetry
};
