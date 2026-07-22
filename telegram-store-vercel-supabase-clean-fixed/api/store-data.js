const { getMiniAppUser } = require('../lib/miniappAuth');
const store = require('../lib/storeService');
const license = require('../lib/license');

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(status).json(payload);
}

function bodyOf(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch (_) { return {}; }
}

module.exports = async function handler(req, res) {
  try {
    const action = String(req.query?.action || 'catalog').toLowerCase();
    const user = getMiniAppUser(req);

    if (req.method === 'GET' && action === 'catalog') {
      const [catalog, licenseState] = await Promise.all([store.getCatalog(user), license.checkLicense()]);
      catalog.store_active = licenseState.active !== false;
      catalog.store_status = licenseState.status || 'active';
      return json(res, 200, { ok: true, data: catalog });
    }

    if (req.method === 'GET' && action === 'order-status') {
      return json(res, 200, { ok: true, data: await store.getOrderStatus(user, req.query?.invoice) });
    }

    if (req.method === 'GET' && action === 'qr-download') {
      const file = await store.getQrDownload(user, req.query?.invoice);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      return res.status(200).send(file.buffer);
    }

    if (req.method === 'GET' && action === 'history') {
      return json(res, 200, { ok: true, data: await store.getHistory(user, req.query?.limit) });
    }

    if (req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method tidak didukung.' });
    }

    const body = bodyOf(req);
    if (action === 'checkout') {
      const licenseState = await license.checkLicense();
      if (licenseState.active === false) {
        const error = new Error('Toko sedang tidak aktif. Silakan hubungi admin.');
        error.statusCode = 503;
        error.code = 'STORE_INACTIVE';
        throw error;
      }
      const data = await store.createPayment({
        user,
        productCode: body.product_code,
        variantKey: body.variant_key,
        quantity: body.quantity,
        voucherCode: body.voucher_code
      });
      return json(res, 200, { ok: true, data });
    }

    if (action === 'cancel-order') {
      return json(res, 200, { ok: true, data: await store.cancelOrder(user, body.invoice) });
    }

    return json(res, 404, { ok: false, error: 'Action tidak ditemukan.' });
  } catch (error) {
    console.error('Store API error:', error);
    return json(res, Number(error.statusCode || 500), {
      ok: false,
      error: error.message || 'Terjadi kesalahan pada server.',
      code: error.code || 'SERVER_ERROR',
      details: error.details || undefined
    });
  }
};
