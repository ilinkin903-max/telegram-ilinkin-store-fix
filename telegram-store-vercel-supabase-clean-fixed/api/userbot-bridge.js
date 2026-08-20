const crypto = require('crypto');
const paymentService = require('../lib/paymentService');
const db = require('../lib/db');
const { config } = require('../lib/config');

function json(res, status, payload) {
  res.status(status).json(payload);
}

function safeEqual(left, right) {
  try {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) { return false; }
}

function bearer(req) {
  const header = String(req.headers?.authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function bodyOf(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch (_) { return {}; }
  }
  return req.body || {};
}

module.exports = async function handler(req, res) {
  try {
    if (!config.userbotBridgeSecret) return json(res, 503, { ok: false, error: 'USERBOT_BRIDGE_SECRET belum diatur.' });
    if (!safeEqual(bearer(req), config.userbotBridgeSecret)) return json(res, 401, { ok: false, error: 'Unauthorized.' });
    if (req.method === 'GET') return json(res, 200, { ok: true, service: 'ilink-userbot-bridge', version: '81' });
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method tidak didukung.' });

    const body = bodyOf(req);
    const action = String(body.action || '').trim().toLowerCase();
    if (action === 'complete') {
      const data = await paymentService.completeTelegramSupplierOrder(body.order_ref || body.invoice, body.delivered_text || body.delivery_text, {
        worker_id: body.worker_id || '',
        worker_state: body.worker_state || {},
        cost_total_idr: body.cost_total_idr || 0
      });
      return json(res, 200, { ok: true, data });
    }
    if (action === 'order-status') {
      const row = await db.getSupplierOrder(body.order_ref || body.invoice || '');
      return json(res, 200, { ok: true, data: row || null });
    }
    return json(res, 404, { ok: false, error: 'Action bridge tidak dikenal.' });
  } catch (error) {
    console.error('Userbot bridge error:', error);
    return json(res, error.statusCode || 500, { ok: false, error: error.message || String(error) });
  }
};
