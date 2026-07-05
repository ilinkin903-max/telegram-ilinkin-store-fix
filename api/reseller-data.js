const { assertOwnerMiniApp } = require('../lib/miniappAuth');
const db = require('../lib/db');
const tg = require('../lib/telegram');
const { splitStock } = require('../lib/utils');

function json(res, status, payload) {
  res.status(status).json(payload);
}

function bodyOf(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}

function numberOf(value) {
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  return Number(cleaned || 0);
}

function boolOf(value) {
  if (value === true || value === false) return value;
  const raw = String(value || '').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'on' || raw === 'aktif';
}

async function broadcast(payload = {}) {
  const users = await db.listUsers(1000);
  const targets = users.map((u) => Number(u.telegram_id)).filter(Boolean);
  const type = String(payload.type || 'text').toLowerCase();
  const message = String(payload.message || '').trim();
  const caption = String(payload.caption || '').trim();
  const photo = String(payload.photo || payload.image_url || '').trim();
  const sticker = String(payload.sticker || payload.sticker_file_id || '').trim();
  let sent = 0;
  let failed = 0;

  async function sendOne(id) {
    if (type === 'photo') {
      if (!photo) throw new Error('URL/file_id gambar wajib diisi.');
      return tg.sendPhotoRef(id, photo, { caption: caption || message || undefined });
    }
    if (type === 'sticker') {
      if (!sticker) throw new Error('File ID stiker wajib diisi.');
      await tg.sendSticker(id, sticker);
      if (message) await tg.sendMessage(id, message);
      return true;
    }
    if (!message) throw new Error('Pesan broadcast wajib diisi.');
    return tg.sendMessage(id, message);
  }

  for (let i = 0; i < targets.length; i += 10) {
    const part = targets.slice(i, i + 10);
    const results = await Promise.allSettled(part.map(sendOne));
    results.forEach((r) => { if (r.status === 'fulfilled') sent += 1; else failed += 1; });
  }
  return { total: targets.length, sent, failed, type };
}

module.exports = async function handler(req, res) {
  try {
    assertOwnerMiniApp(req);
    const action = req.query?.action || '';

    if (req.method === 'GET' && action === 'stats') return json(res, 200, { ok: true, data: await db.getStats() });
    if (req.method === 'GET' && action === 'products') return json(res, 200, { ok: true, data: await db.listProducts() });
    if (req.method === 'GET' && action === 'orders') return json(res, 200, { ok: true, data: await db.listTransactions(100) });
    if (req.method === 'GET' && action === 'users') return json(res, 200, { ok: true, data: await db.listUsers(200) });
    if (req.method === 'GET' && action === 'vouchers') return json(res, 200, { ok: true, data: await db.listVouchers(200) });
    if (req.method === 'GET' && action === 'rekap') return json(res, 200, { ok: true, data: await db.getMonthlyRekap(req.query?.month, req.query?.year) });
    if (req.method === 'GET' && action === 'settings') return json(res, 200, { ok: true, data: await db.getShopSettings() });
    if (req.method === 'GET' && action === 'analytics') return json(res, 200, { ok: true, data: await db.getAnalytics(req.query?.month, req.query?.year) });

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method tidak didukung.' });

    const body = bodyOf(req);

    if (action === 'save-settings') {
      const data = await db.saveShopSettings({
        store_name: body.store_name,
        store_description: body.store_description,
        logo_url: body.logo_url,
        banner_url: body.banner_url
      });
      return json(res, 200, { ok: true, data });
    }

    if (action === 'add-product') {
      const nama = String(body.nama || '').trim();
      const kode = String(body.kode || '').trim().toUpperCase();
      const harga = numberOf(body.harga);
      const deskripsi = String(body.deskripsi || '').trim();
      const snk = String(body.snk || '').trim();
      const image_url = String(body.image_url || '').trim();
      if (!nama || !kode || !harga || !deskripsi || !snk) return json(res, 400, { ok: false, error: 'Nama, kode, harga, deskripsi, dan SnK wajib diisi.' });
      const product = await db.addProduct({ nama, kode, harga, deskripsi, snk, image_url, data: splitStock(body.stock_text || '') });
      return json(res, 200, { ok: true, data: product });
    }

    if (action === 'delete-product') {
      const code = String(body.kode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { ok: false, error: 'Kode produk wajib diisi.' });
      await db.deleteProduct(code);
      return json(res, 200, { ok: true });
    }

    if (action === 'add-stock') {
      const code = String(body.kode || '').trim().toUpperCase();
      const stockText = String(body.stock_text || '').trim();
      if (!code || !stockText) return json(res, 400, { ok: false, error: 'Kode dan stok wajib diisi.' });
      const result = await db.appendStock(code, stockText);
      if (!result) return json(res, 404, { ok: false, error: 'Produk tidak ditemukan.' });
      return json(res, 200, { ok: true, data: result.product, added: result.added });
    }

    if (action === 'edit-stock') {
      const code = String(body.kode || '').trim().toUpperCase();
      const stockText = String(body.stock_text || '').trim();
      if (!code) return json(res, 400, { ok: false, error: 'Kode produk wajib diisi.' });
      const product = await db.replaceStock(code, stockText);
      if (!product) return json(res, 404, { ok: false, error: 'Produk tidak ditemukan.' });
      return json(res, 200, { ok: true, data: product });
    }

    if (action === 'edit-product' || action === 'edit-product-full') {
      const code = String(body.current_code || body.kode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { ok: false, error: 'Kode produk wajib diisi.' });
      const updates = {};
      ['nama', 'kode', 'deskripsi', 'snk', 'image_url'].forEach((key) => { if (body[key] !== undefined) updates[key] = body[key]; });
      if (body.harga !== undefined) updates.harga = numberOf(body.harga);
      if (body.stock_text !== undefined) updates.stock = splitStock(body.stock_text || '');
      if (body.field && body.value !== undefined) updates[body.field] = body.field === 'harga' ? numberOf(body.value) : String(body.value || '').trim();
      const product = await db.updateProductByCode(code, updates);
      if (!product) return json(res, 404, { ok: false, error: 'Produk tidak ditemukan.' });
      return json(res, 200, { ok: true, data: product });
    }

    if (action === 'delete-user') {
      const telegramId = numberOf(body.telegram_id);
      if (!telegramId) return json(res, 400, { ok: false, error: 'ID Telegram user wajib diisi.' });
      await db.deleteUser(telegramId);
      return json(res, 200, { ok: true });
    }

    if (action === 'add-voucher') {
      const code = String(body.kode || '').trim().toUpperCase();
      const produk = String(body.produk || body.products || 'semua').trim();
      const potongan = numberOf(body.potongan || body.discount);
      const limit = numberOf(body.limit || body.usage_limit);
      if (!code || !potongan || !limit) return json(res, 400, { ok: false, error: 'Kode, potongan, dan limit voucher wajib diisi.' });
      const voucher = await db.addVoucher({ kode: code, produk, potongan, limit, description: body.description || '', active: body.active === undefined ? true : boolOf(body.active), expires_at: body.expires_at || null });
      return json(res, 200, { ok: true, data: voucher });
    }

    if (action === 'edit-voucher') {
      const code = String(body.current_code || body.kode_lama || body.kode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { ok: false, error: 'Kode voucher wajib diisi.' });
      const voucher = await db.updateVoucher(code, {
        kode: body.kode_baru || body.new_code || body.kode,
        produk: body.produk || body.products,
        potongan: body.potongan || body.discount,
        limit: body.limit || body.usage_limit,
        description: body.description || body.deskripsi,
        active: boolOf(body.active),
        expires_at: body.expires_at || null
      });
      if (!voucher) return json(res, 404, { ok: false, error: 'Voucher tidak ditemukan.' });
      return json(res, 200, { ok: true, data: voucher });
    }

    if (action === 'delete-voucher') {
      const code = String(body.kode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { ok: false, error: 'Kode voucher wajib diisi.' });
      await db.deleteVoucher(code);
      return json(res, 200, { ok: true });
    }

    if (action === 'broadcast') {
      const result = await broadcast(body);
      return json(res, 200, { ok: true, data: result });
    }

    return json(res, 404, { ok: false, error: 'Action tidak ditemukan.' });
  } catch (error) {
    console.error(error);
    return json(res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
