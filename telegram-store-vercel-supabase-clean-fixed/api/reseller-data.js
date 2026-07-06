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

function parseBulkPrices(value) {
  if (Array.isArray(value)) return value.map((item) => ({
    min_qty: numberOf(item.min_qty || item.qty || item.jumlah),
    price: numberOf(item.price || item.harga)
  })).filter((item) => item.min_qty > 0 && item.price > 0).sort((a, b) => a.min_qty - b.min_qty);
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(/[\n,]+/).map((line) => {
    const parts = line.split(/[=|:;]/).map((x) => x.trim()).filter(Boolean);
    return { min_qty: numberOf(parts[0]), price: numberOf(parts[1]) };
  }).filter((item) => item.min_qty > 0 && item.price > 0).sort((a, b) => a.min_qty - b.min_qty);
}

function parseStockList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  return String(value || '')
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseVariants(value) {
  if (Array.isArray(value)) return value.map((item, index) => ({
    name: String(item.name || item.nama || '').trim(),
    price: numberOf(item.price || item.harga),
    sku: String(item.sku || item.kode || `VAR${index + 1}`).trim().toUpperCase(),
    note: String(item.note || item.catatan || '').trim(),
    description: String(item.description || item.deskripsi || '').trim(),
    snk: String(item.snk || item.terms || item.syarat || '').trim(),
    stock: parseStockList(item.stock || item.stok || item.data || []),
    bulk_prices: parseBulkPrices(item.bulk_prices || item.bulkPrices || item.grosir || [])
  })).filter((item) => item.name);
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(/\n+/).map((line, index) => {
    const parts = line.split('|').map((x) => x.trim());
    const sku = String(parts[2] || `VAR${index + 1}`).trim().toUpperCase();
    return {
      name: parts[0] || '',
      price: numberOf(parts[1]),
      sku,
      stock: parseStockList(parts[3] || ''),
      bulk_prices: parseBulkPrices(parts[4] || ''),
      description: parts[5] || '',
      snk: parts[6] || '',
      note: parts.slice(7).join(' | ')
    };
  }).filter((item) => item.name);
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
        banner_url: body.banner_url,
        start_media_type: body.start_media_type,
        start_media_value: body.start_media_value,
        start_media_caption: body.start_media_caption
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
      const category = String(body.category || body.kategori || '').trim();
      const bulk_prices = parseBulkPrices(body.bulk_text || body.bulk_prices);
      const variants = parseVariants(body.variants_text || body.variant_text || body.variants);
      const hasVariants = variants.length > 0;
      const finalHarga = harga || (hasVariants ? numberOf(variants[0].price) : 0);
      const finalDeskripsi = deskripsi || (hasVariants ? (variants[0].description || 'Produk dengan varian.') : '');
      const finalSnk = snk || (hasVariants ? (variants[0].snk || 'Syarat mengikuti varian yang dipilih.') : '');
      if (!nama || !kode || !finalHarga || !finalDeskripsi || !finalSnk) return json(res, 400, { ok: false, error: hasVariants ? 'Nama, kode, dan minimal satu varian dengan harga wajib diisi.' : 'Nama, kode, harga, deskripsi, dan SnK wajib diisi.' });
      const product = await db.addProduct({ nama, kode, harga: finalHarga, deskripsi: finalDeskripsi, snk: finalSnk, image_url, category, bulk_prices, variants, data: splitStock(body.stock_text || '') });
      return json(res, 200, { ok: true, data: product });
    }


    if (action === 'toggle-product') {
      const code = String(body.kode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { ok: false, error: 'Kode produk wajib diisi.' });
      const product = await db.updateProductByCode(code, { active: boolOf(body.active) });
      if (!product) return json(res, 404, { ok: false, error: 'Produk tidak ditemukan.' });
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
      ['nama', 'kode', 'deskripsi', 'snk', 'image_url', 'category'].forEach((key) => { if (body[key] !== undefined) updates[key] = body[key]; });
      if (body.active !== undefined) updates.active = boolOf(body.active);
      if (body.kategori !== undefined) updates.category = body.kategori;
      if (body.harga !== undefined) updates.harga = numberOf(body.harga);
      if (body.bulk_text !== undefined || body.bulk_prices !== undefined) updates.bulk_prices = parseBulkPrices(body.bulk_text || body.bulk_prices);
      if (body.variants_text !== undefined || body.variant_text !== undefined || body.variants !== undefined) updates.variants = parseVariants(body.variants_text || body.variant_text || body.variants);
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
