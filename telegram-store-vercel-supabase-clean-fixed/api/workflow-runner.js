const paymentService = require('../lib/paymentService');
const workflowRetry = require('../lib/workflowRetryScheduler');
const { config } = require('../lib/config');
const { getAppVersion } = require('../lib/version');

function bearerToken(req) {
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  return bearer || String(req.headers?.['x-job-secret'] || '').trim();
}

function bodyOf(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch (_) { return {}; }
  }
  return req.body || {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!workflowRetry.runnerSecret()) return res.status(503).json({ ok: false, error: 'JOB_RUNNER_SECRET belum diatur.' });
  if (!workflowRetry.isAuthorized(bearerToken(req))) return res.status(401).json({ ok: false, error: 'Unauthorized.' });

  const body = bodyOf(req);
  const invoice = String(body.invoice || body.order_ref || '').trim();
  const attempt = Math.max(0, Number(body.attempt || 0));
  if (!invoice) return res.status(400).json({ ok: false, error: 'Invoice wajib diisi.' });

  try {
    const result = await paymentService.retryWorkflowOrder(invoice, {}, { forceRestart: false });
    return res.status(200).json({ ok: true, version: getAppVersion(), state: 'completed', invoice, attempt, data: result });
  } catch (error) {
    const code = String(error?.code || '').toUpperCase();
    // Hanya antrean sebelum workflow mulai yang boleh dicoba otomatis.
    // WORKFLOW_STILL_RUNNING tidak dijadwalkan ulang agar satu invoice tidak memiliki runner berantai.
    // v84.3: worker tidak pernah menjadwalkan ulang workflow yang gagal/busy.
    // Workflow yang gagal harus berhenti dan masuk ATTENTION. Restart hanya boleh dilakukan manual.
    // 409 sengaja: worker berhenti. Untuk status ATTENTION admin harus mengecek chat supplier
    // sebelum mengulang agar tidak terjadi pembelian ganda.
    return res.status(409).json({
      ok: false,
      version: getAppVersion(),
      state: 'attention',
      invoice,
      attempt,
      code: code || 'WORKFLOW_ERROR',
      error: error.message || String(error)
    });
  }
};
