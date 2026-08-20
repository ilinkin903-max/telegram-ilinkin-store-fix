const { assertOwnerMiniApp } = require('../lib/miniappAuth');
const db = require('../lib/db');
const tg = require('../lib/telegram');
const paymentService = require('../lib/paymentService');
const prodseller = require('../lib/prodsellerService');
const telegramSupplier = require('../lib/telegramSupplierService');
const aiFlow = require('../lib/aiFlowService');
const crypto = require('crypto');
const license = require('../lib/license');
const { splitStock } = require('../lib/utils');
const { config, getStorefrontUrl } = require('../lib/config');

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
  const raw = String(value ?? '').toLowerCase();
  if (['false', '0', 'off', 'nonaktif', 'inactive', 'mati'].includes(raw)) return false;
  return raw === 'true' || raw === '1' || raw === 'on' || raw === 'aktif' || raw === 'active' || raw === '';
}


function discountTypeOf(value) {
  const raw = String(value || 'amount').trim().toLowerCase();
  return ['percent', 'percentage', 'persen', '%'].includes(raw) ? 'percent' : 'amount';
}

function discountValueOf(value, type = 'amount') {
  const normalized = String(value ?? '').trim().replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = Number(normalized || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function enabledOf(value) {
  if (value === true || value === 1) return true;
  return ['true', '1', 'on', 'yes', 'aktif'].includes(String(value ?? '').trim().toLowerCase());
}

function broadcastOrderMarkup(payload = {}, req = null) {
  if (!enabledOf(payload.order_button_enabled)) return undefined;
  const target = String(payload.order_button_target || 'marketplace').trim().toLowerCase();
  if (target === 'products') {
    return { inline_keyboard: [[{ text: '🛒 Order Sekarang', callback_data: 'daftarproduk' }]] };
  }
  const url = getStorefrontUrl(req) || config.storeUrl || config.publicUrl;
  if (url) return { inline_keyboard: [[{ text: '🛒 Order Sekarang', web_app: { url } }]] };
  return { inline_keyboard: [[{ text: '🛒 Order Sekarang', callback_data: 'daftarproduk' }]] };
}

function parseCodeList(value, limit = 100) {
  let rows = [];
  if (Array.isArray(value)) rows = value;
  else {
    const raw = String(value || '').trim();
    if (!raw) return [];
    if (raw.startsWith('[')) { try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) rows = parsed; } catch (_) {} }
    if (!rows.length) rows = raw.split(/[\r\n,;|]+/g);
  }
  const seen = new Set();
  return rows.map((item) => String(typeof item === 'object' && item ? (item.code || item.kode || '') : item).trim().toUpperCase())
    .filter((code) => { if (!code || seen.has(code)) return false; seen.add(code); return true; })
    .slice(0, Math.max(1, Number(limit || 100)));
}

async function updateFlashPromoMembership({ currentCode = '', code = '', enabled = false } = {}) {
  const settings = await db.getShopSettings();
  const oldCode = String(currentCode || '').trim().toUpperCase();
  const newCode = String(code || '').trim().toUpperCase();
  let codes = parseCodeList(settings.flash_sale_promo_codes, 100);
  if (oldCode) codes = codes.filter((item) => item !== oldCode);
  if (newCode) codes = codes.filter((item) => item !== newCode);
  if (enabled && newCode) codes.push(newCode);
  await db.saveShopSettings({ flash_sale_promo_codes: JSON.stringify(codes) });
  return codes;
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
  if (Array.isArray(value)) {
    const seen = new Set();
    const out = [];
    value.map((item, index) => ({
      name: String(item.name || item.nama || '').trim(),
      price: numberOf(item.price || item.harga),
      cost_price: numberOf(item.cost_price || item.costPrice || item.modal || item.harga_modal),
      sku: String(item.sku || item.kode || `VAR${index + 1}`).trim().toUpperCase(),
      note: String(item.note || item.catatan || '').trim(),
      description: String(item.description || item.deskripsi || '').trim(),
      snk: String(item.snk || item.terms || item.syarat || '').trim(),
      delivery_mode: ['auto', 'po'].includes(String(item.delivery_mode || item.deliveryMode || '').trim().toLowerCase())
        ? String(item.delivery_mode || item.deliveryMode).trim().toLowerCase()
        : '',
      active: item.active === undefined ? true : boolOf(item.active),
      stock: parseStockList(item.stock || item.stok || item.data || []),
      bulk_prices: parseBulkPrices(item.bulk_prices || item.bulkPrices || item.grosir || []),
      supplier_source: String(item.supplier_source || item.supplierSource || '').trim().toLowerCase(),
      supplier_product_id: String(item.supplier_product_id || item.supplierProductId || '').trim(),
      supplier_price_usdt: Number(item.supplier_price_usdt || item.supplierPriceUsdt || 0),
      supplier_public_price_usdt: Number(item.supplier_public_price_usdt || item.supplierPublicPriceUsdt || 0),
      supplier_stock: (item.supplier_stock ?? item.supplierStock) == null ? null : Number(item.supplier_stock ?? item.supplierStock),
      supplier_synced_at: item.supplier_synced_at || item.supplierSyncedAt || null
    })).forEach((item, index) => {
      if (!item.name || Number(item.price || 0) <= 0) return;
      // Prevent old broken rows from multiline description/SnK becoming variants.
      // Characters like '-', '|', ':', ';' are safe inside description/SnK because
      // structured Mini App data is used and not split into variant rows.
      if (/^[-•*]+\s+/.test(item.name) && /^VAR\d+$/i.test(item.sku || '')) return;
      const key = String(item.sku || `${item.name}:${item.price}:${index}`).trim().toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  // Legacy fallback for old text-based variant input. Keep this intentionally strict:
  // a valid variant line must contain pipe separators and a numeric price. Lines from
  // multiline descriptions/SnK such as "- garansi 7 hari", "catatan: ...", or
  // text containing random symbols must never become new variants.
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(/\n+/).map((line, index) => {
    const text = String(line || '').trim();
    if (!text.includes('|')) return null;
    const parts = text.split('|').map((x) => x.trim());
    const price = numberOf(parts[1]);
    if (!parts[0] || !price) return null;
    const sku = String(parts[2] || `VAR${index + 1}`).trim().toUpperCase();
    return {
      name: parts[0],
      price,
      sku,
      stock: parseStockList(parts[3] || ''),
      bulk_prices: parseBulkPrices(parts[4] || ''),
      description: parts[5] || '',
      snk: parts[6] || '',
      active: parts[7] === undefined ? true : boolOf(parts[7]),
      cost_price: numberOf(parts[8]),
      delivery_mode: ['auto', 'po'].includes(String(parts[9] || '').trim().toLowerCase()) ? String(parts[9]).trim().toLowerCase() : '',
      note: parts.slice(10).join(' | ')
    };
  }).filter(Boolean);
}

function parseVariantPayload(body) {
  // Prefer structured JSON array from the Mini App. This prevents multiline
  // descriptions/SnK from being split into extra variants when a legacy
  // variants_text field is also present in the submitted form.
  if (Array.isArray(body.variants)) return parseVariants(body.variants);
  if (Array.isArray(body.variant_text)) return parseVariants(body.variant_text);
  if (Array.isArray(body.variants_text)) return parseVariants(body.variants_text);
  if (body.variants !== undefined && typeof body.variants !== 'string') return parseVariants(body.variants);
  if (body.variant_text !== undefined && String(body.variant_text || '').trim()) return parseVariants(body.variant_text);
  if (body.variants_text !== undefined && String(body.variants_text || '').trim()) return parseVariants(body.variants_text);
  if (body.variants !== undefined) return parseVariants(body.variants);
  return [];
}


function shortHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}


function prodsellerPriceIdr(priceUsdt, settings = {}) {
  const rate = Math.max(1, Number(settings.prodseller_usdt_to_idr || 16500));
  const markup = Math.max(0, Number(settings.prodseller_markup_percent || 25));
  const raw = Math.max(0, Number(priceUsdt || 0)) * rate * (1 + markup / 100);
  return Math.max(1000, Math.ceil(raw / 500) * 500);
}

function prodsellerCode(productId) {
  return `PS${shortHash(String(productId || '')).slice(0, 8).toUpperCase()}`;
}

function supplierLinkOf(product, variant = null) {
  const source = String(variant?.supplier_source || (!variant ? product?.supplier_source : '') || '').trim().toLowerCase();
  const productId = String(variant?.supplier_product_id || (!variant ? product?.supplier_product_id : '') || '').trim();
  if (!['prodseller','telegram_userbot'].includes(source) || !productId) return null;
  return {
    source,
    productId,
    priceUsdt: Number(variant?.supplier_price_usdt ?? product?.supplier_price_usdt ?? 0),
    publicPriceUsdt: Number(variant?.supplier_public_price_usdt ?? product?.supplier_public_price_usdt ?? 0),
    stock: (variant?.supplier_stock ?? product?.supplier_stock) == null ? null : Number(variant?.supplier_stock ?? product?.supplier_stock),
    syncedAt: variant?.supplier_synced_at || product?.supplier_synced_at || null
  };
}

function localSupplierLinks(products = []) {
  const links = [];
  for (const product of products || []) {
    const direct = supplierLinkOf(product, null);
    if (direct) links.push({ ...direct, product, variant: null, variantIndex: -1, link_type: 'product' });
    (Array.isArray(product?.variants) ? product.variants : []).forEach((variant, index) => {
      const link = supplierLinkOf(product, variant);
      if (link) links.push({ ...link, product, variant, variantIndex: index, link_type: 'variant' });
    });
  }
  return links;
}

async function getProdSellerStatus() {
  const localProducts = await db.listProducts().catch(() => []);
  const selected = localSupplierLinks(localProducts).filter((link) => link.source === 'prodseller');
  if (!prodseller.configured()) return { configured: false, balance: null, membership: '', selected_count: selected.length };
  const balance = await prodseller.getBalance();
  return {
    configured: true,
    balance: Number(balance.balance || 0),
    membership: String(balance.membership || ''),
    username: String(balance.username || ''),
    telegramId: balance.telegramId || null,
    selected_count: selected.length
  };
}

async function getProdSellerCatalog() {
  const [remoteProducts, localProducts, settings] = await Promise.all([
    prodseller.listProducts(),
    db.listProducts(),
    db.getShopSettings()
  ]);
  const localBySupplierId = new Map();
  localSupplierLinks(localProducts).filter((link) => link.source === 'prodseller').forEach((link) => {
    const id = String(link.productId || '');
    if (id && !localBySupplierId.has(id)) localBySupplierId.set(id, link);
  });
  return remoteProducts.map((item) => {
    const link = localBySupplierId.get(String(item.id || '')) || null;
    const local = link?.product || null;
    return {
      id: String(item.id || ''),
      name: String(item.name || ''),
      description: String(item.description || ''),
      price: Number(item.price || 0),
      publicPrice: Number(item.publicPrice || 0),
      imageUrl: String(item.imageUrl || ''),
      delivery: item.delivery || {},
      sold: Number(item.sold || 0),
      inStock: item.inStock !== false,
      suggested_price_idr: prodsellerPriceIdr(item.price, settings),
      selected: Boolean(local),
      link_type: link?.link_type || '',
      local_code: local?.kode || '',
      local_name: local?.nama || '',
      local_variant_name: link?.variant?.name || '',
      local_variant_key: link?.variant ? String(link.variant.sku || '') : '',
      local_price: Number(link?.variant?.price || local?.harga || 0),
      local_active: link?.variant ? link.variant.active !== false : (local ? local.active !== false : false),
      local_synced_at: link?.syncedAt || local?.supplier_synced_at || null
    };
  });
}

async function importProdSellerProduct(body = {}) {
  const productId = String(body.product_id || body.productId || '').trim();
  if (!productId) throw new Error('Pilih produk ProdSeller terlebih dahulu.');
  const [detailRaw, catalog, settings, localProducts] = await Promise.all([
    prodseller.getProduct(productId),
    prodseller.listProducts(),
    db.getShopSettings(),
    db.listProducts()
  ]);
  const listItem = (Array.isArray(catalog) ? catalog : []).find((item) => String(item.id || '') === productId) || {};
  const detail = { ...listItem, ...(detailRaw || {}) };
  const supplierPrice = Number(detail.price || 0);
  const rate = Math.max(1, Number(settings.prodseller_usdt_to_idr || 16500));
  const defaultPrice = prodsellerPriceIdr(supplierPrice, settings);
  const sellingPrice = Math.max(1000, Number(body.selling_price || body.harga || defaultPrice));
  const costIdr = Math.max(0, Math.round(supplierPrice * rate));
  const syncedAt = new Date().toISOString();
  const targetMode = String(body.target_mode || body.targetMode || 'product').trim().toLowerCase() === 'variant' ? 'variant' : 'product';

  if (targetMode === 'variant') {
    const targetCode = String(body.target_product_code || body.targetProductCode || '').trim().toUpperCase();
    if (!targetCode) throw new Error('Pilih produk iLink yang akan dijadikan produk induk varian.');
    const target = localProducts.find((p) => String(p.kode || '').trim().toUpperCase() === targetCode);
    if (!target) throw new Error('Produk induk iLink tidak ditemukan. Muat ulang dashboard lalu coba lagi.');
    if (supplierLinkOf(target, null)) throw new Error('Produk supplier mandiri tidak dapat dijadikan produk induk. Pilih produk iLink biasa.');

    let variants = Array.isArray(target.variants) ? target.variants.map((v) => ({ ...v })) : [];
    let clearBaseStock = false;
    if (!variants.length) {
      variants.push({
        name: String(body.base_variant_name || 'Utama').trim() || 'Utama',
        price: Number(target.harga || 0),
        cost_price: Number(target.cost_price || 0),
        sku: `${String(target.kode || 'PROD').trim().toUpperCase()}-UTAMA`,
        note: '',
        description: String(target.deskripsi || ''),
        snk: String(target.snk || ''),
        delivery_mode: String(target.delivery_mode || 'auto').toLowerCase() === 'po' ? 'po' : 'auto',
        active: true,
        stock: Array.isArray(target.data) ? target.data : [],
        bulk_prices: Array.isArray(target.bulk_prices) ? target.bulk_prices : []
      });
      clearBaseStock = true;
    }

    const linkedIndex = variants.findIndex((variant) => {
      const link = supplierLinkOf(target, variant);
      return link && link.source === 'prodseller' && String(link.productId) === productId;
    });
    const variantName = String(body.variant_name || body.variantName || detail.name || 'Varian Supplier').trim();
    const supplierVariant = {
      ...(linkedIndex >= 0 ? variants[linkedIndex] : {}),
      name: variantName,
      price: sellingPrice,
      cost_price: costIdr,
      sku: linkedIndex >= 0
        ? String(variants[linkedIndex].sku || prodsellerCode(productId)).trim().toUpperCase()
        : `${prodsellerCode(productId)}-V`,
      note: 'Supplier otomatis ProdSeller',
      description: String(body.description || detail.description || target.deskripsi || 'Produk digital dikirim otomatis setelah pembayaran berhasil.'),
      snk: String(body.snk || 'Produk diproses otomatis melalui supplier setelah pembayaran berhasil. Simpan data akun/key yang diterima dengan baik.'),
      delivery_mode: 'po',
      active: body.active === undefined ? (linkedIndex >= 0 ? variants[linkedIndex].active !== false : true) : boolOf(body.active),
      stock: [],
      bulk_prices: linkedIndex >= 0 && Array.isArray(variants[linkedIndex].bulk_prices) ? variants[linkedIndex].bulk_prices : [],
      supplier_source: 'prodseller',
      supplier_product_id: productId,
      supplier_price_usdt: supplierPrice,
      supplier_public_price_usdt: Number(detail.publicPrice || 0),
      supplier_stock: detail.stock == null ? null : Number(detail.stock),
      supplier_synced_at: syncedAt
    };
    if (linkedIndex >= 0) variants[linkedIndex] = supplierVariant;
    else variants.push(supplierVariant);

    const updated = await db.updateProductByCode(target.kode, {
      variants,
      ...(clearBaseStock ? { data: [] } : {})
    });
    return { ...updated, reseller_target: 'variant', reseller_variant: supplierVariant };
  }

  const existing = localProducts.find((p) => {
    const link = supplierLinkOf(p, null);
    return link && String(link.productId) === productId;
  }) || null;
  const base = {
    harga: sellingPrice,
    cost_price: costIdr,
    supplier_source: 'prodseller',
    supplier_product_id: productId,
    supplier_price_usdt: supplierPrice,
    supplier_public_price_usdt: Number(detail.publicPrice || 0),
    supplier_stock: detail.stock == null ? null : Number(detail.stock),
    supplier_synced_at: syncedAt,
    delivery_mode: 'po',
    display_scope: String(body.display_scope || existing?.display_scope || 'both') === 'marketplace' ? 'marketplace' : 'both',
    active: body.active === undefined ? (existing ? existing.active !== false : true) : boolOf(body.active)
  };
  if (existing) {
    return db.updateProductByCode(existing.kode, {
      ...base,
      image_url: existing.image_url || String(detail.imageUrl || ''),
      category: String(body.category || existing.category || settings.prodseller_default_category || 'Produk Digital')
    });
  }
  return db.addProduct({
    ...base,
    nama: String(body.name || detail.name || 'Produk ProdSeller').trim(),
    kode: prodsellerCode(productId),
    deskripsi: String(detail.description || 'Produk digital dikirim otomatis setelah pembayaran berhasil.'),
    snk: 'Produk diproses otomatis melalui supplier setelah pembayaran berhasil. Simpan data akun/key yang diterima dengan baik.',
    image_url: String(detail.imageUrl || ''),
    category: String(body.category || settings.prodseller_default_category || 'Produk Digital'),
    stock: []
  });
}


function telegramSupplierCode(productRef) {
  return `TG${shortHash(String(productRef || '')).slice(0, 8).toUpperCase()}`;
}

async function getTelegramSuppliersDashboard() {
  const [connectors, products, localProducts] = await Promise.all([
    db.listTelegramSupplierConnectors(),
    db.listTelegramSupplierProducts(),
    db.listProducts()
  ]);
  const localLinks = localSupplierLinks(localProducts).filter((link) => link.source === 'telegram_userbot');
  const localByRef = new Map();
  localLinks.forEach((link) => { if (!localByRef.has(String(link.productId))) localByRef.set(String(link.productId), link); });
  const connectorMap = new Map(connectors.map((c) => [String(c.id), c]));
  return {
    connectors,
    products: products.map((row) => {
      const connector = connectorMap.get(String(row.connector_id)) || null;
      const link = localByRef.get(String(row.id)) || null;
      return {
        ...row,
        connector_name: connector?.name || '',
        connector_code: connector?.code || '',
        bot_username: connector?.bot_username || '',
        connector_status: connector?.status || 'offline',
        connector_balance: connector?.balance ?? null,
        selected: Boolean(link),
        link_type: link?.link_type || '',
        local_code: link?.product?.kode || '',
        local_name: link?.product?.nama || '',
        local_variant_name: link?.variant?.name || '',
        local_price: Number(link?.variant?.price || link?.product?.harga || 0)
      };
    })
  };
}

async function importTelegramSupplierProduct(body = {}) {
  const ref = String(body.supplier_product_ref || body.product_id || '').trim();
  if (!ref) throw new Error('Pilih produk Telegram supplier terlebih dahulu.');
  const [supplierProduct, localProducts] = await Promise.all([db.getTelegramSupplierProduct(ref), db.listProducts()]);
  if (!supplierProduct || supplierProduct.active === false) throw new Error('Produk Telegram supplier tidak ditemukan atau nonaktif.');
  const connector = await db.getTelegramSupplierConnector(supplierProduct.connector_id);
  if (!connector) throw new Error('Connector Telegram supplier tidak ditemukan.');
  const sellingPrice = Math.max(1000, Number(body.selling_price || body.harga || 0));
  if (!sellingPrice) throw new Error('Harga jual iLink wajib diisi.');
  const costIdr = String(supplierProduct.currency || connector.currency || '').toUpperCase() === 'IDR' ? Math.max(0, Math.round(Number(supplierProduct.cost_amount || 0))) : Math.max(0, Number(body.cost_price_idr || 0));
  const targetMode = String(body.target_mode || 'product').toLowerCase() === 'variant' ? 'variant' : 'product';
  const supplierLabel = `Supplier otomatis Telegram · ${connector.name || connector.bot_username}`;

  if (targetMode === 'variant') {
    const targetCode = String(body.target_product_code || '').trim().toUpperCase();
    if (!targetCode) throw new Error('Pilih produk induk iLink.');
    const target = localProducts.find((p) => String(p.kode || '').trim().toUpperCase() === targetCode);
    if (!target) throw new Error('Produk induk iLink tidak ditemukan.');
    if (supplierLinkOf(target, null)) throw new Error('Produk supplier mandiri tidak dapat dijadikan produk induk. Pilih produk iLink biasa.');
    let variants = Array.isArray(target.variants) ? target.variants.map((v) => ({ ...v })) : [];
    let clearBaseStock = false;
    if (!variants.length) {
      variants.push({
        name: 'Utama', price: Number(target.harga || 0), cost_price: Number(target.cost_price || 0),
        sku: `${String(target.kode || 'PROD').trim().toUpperCase()}-UTAMA`, note: '', description: String(target.deskripsi || ''), snk: String(target.snk || ''),
        delivery_mode: String(target.delivery_mode || 'auto').toLowerCase() === 'po' ? 'po' : 'auto', active: true,
        stock: Array.isArray(target.data) ? target.data : [], bulk_prices: Array.isArray(target.bulk_prices) ? target.bulk_prices : []
      });
      clearBaseStock = true;
    }
    const linkedIndex = variants.findIndex((variant) => {
      const link = supplierLinkOf(target, variant);
      return link && link.source === 'telegram_userbot' && String(link.productId) === ref;
    });
    const supplierVariant = {
      ...(linkedIndex >= 0 ? variants[linkedIndex] : {}),
      name: String(body.variant_name || supplierProduct.name || 'Varian Supplier').trim(),
      price: sellingPrice,
      cost_price: costIdr,
      sku: linkedIndex >= 0 ? String(variants[linkedIndex].sku || telegramSupplierCode(ref)).trim().toUpperCase() : `${telegramSupplierCode(ref)}-V`,
      note: supplierLabel,
      description: String(body.description || target.deskripsi || 'Produk dikirim otomatis melalui supplier Telegram setelah pembayaran.'),
      snk: String(body.snk || 'Produk diproses otomatis melalui supplier setelah pembayaran berhasil. Simpan data akun/key yang diterima dengan baik.'),
      delivery_mode: 'po', active: true, stock: [], bulk_prices: linkedIndex >= 0 ? (variants[linkedIndex].bulk_prices || []) : [],
      supplier_source: 'telegram_userbot', supplier_product_id: ref,
      supplier_price_usdt: 0, supplier_public_price_usdt: 0, supplier_stock: null, supplier_synced_at: new Date().toISOString()
    };
    if (linkedIndex >= 0) variants[linkedIndex] = supplierVariant; else variants.push(supplierVariant);
    const updated = await db.updateProductByCode(target.kode, { variants, ...(clearBaseStock ? { data: [] } : {}) });
    return { ...updated, reseller_target: 'variant', reseller_variant: supplierVariant };
  }

  const existingLink = localSupplierLinks(localProducts).find((link) => link.source === 'telegram_userbot' && String(link.productId) === ref && link.link_type === 'product');
  const base = {
    harga: sellingPrice, cost_price: costIdr, supplier_source: 'telegram_userbot', supplier_product_id: ref,
    supplier_price_usdt: 0, supplier_public_price_usdt: 0, supplier_stock: null, supplier_synced_at: new Date().toISOString(),
    delivery_mode: 'po', display_scope: 'both', active: true, data: []
  };
  if (existingLink?.product) return db.updateProductByCode(existingLink.product.kode, base);
  return db.addProduct({
    ...base, nama: String(body.name || supplierProduct.name).trim(), kode: telegramSupplierCode(ref),
    deskripsi: String(body.description || 'Produk digital dikirim otomatis melalui supplier Telegram setelah pembayaran.'),
    snk: String(body.snk || 'Produk diproses otomatis melalui supplier setelah pembayaran berhasil. Simpan data akun/key yang diterima dengan baik.'),
    image_url: '', category: String(body.category || 'Produk Digital'), stock: []
  });
}

async function broadcast(payload = {}, req = null) {
  const typeForLock = String(payload.type || 'text').toLowerCase();
  const requestId = String(payload.request_id || payload.requestId || '').trim();
  const lockSource = requestId || JSON.stringify({
    type: typeForLock,
    message: String(payload.message || '').trim(),
    caption: String(payload.caption || '').trim(),
    photo: String(payload.photo || payload.image_url || '').trim(),
    sticker: String(payload.sticker || payload.sticker_file_id || '').trim()
  });
  // request_id dibuat baru setiap kali owner menekan Kirim. Dengan begitu konten/foto/stiker
  // yang sama boleh dikirim ulang, sementara retry HTTP dari permintaan yang sama tetap aman.
  const claimKey = `broadcast_job:miniapp:${shortHash(lockSource)}`;
  const locked = await db.claimOnce(claimKey, requestId ? 6 * 60 * 60 : 30, { label: 'Mini App Broadcast', request_id: requestId || null }).catch(() => true);
  if (!locked) {
    const error = new Error('Permintaan broadcast yang sama sedang diproses. Tunggu hasil pengiriman pertama.');
    error.statusCode = 409;
    throw error;
  }
  const users = await db.listUsers(1000);
  const targets = [...new Set(users.map((u) => Number(u.telegram_id)).filter(Boolean))];
  const type = String(payload.type || 'text').toLowerCase();
  const message = String(payload.message || '').trim();
  const caption = String(payload.caption || '').trim();
  const photo = String(payload.photo || payload.image_url || '').trim();
  const sticker = String(payload.sticker || payload.sticker_file_id || '').trim();
  const orderMarkup = broadcastOrderMarkup(payload, req);
  let sent = 0;
  let failed = 0;
  const errors = [];

  async function sendOne(id) {
    if (type === 'photo') {
      if (!photo) throw new Error('URL/file_id gambar wajib diisi.');
      return tg.sendPhotoRef(id, photo, { caption: caption || message || undefined, ...(orderMarkup ? { reply_markup: orderMarkup } : {}) });
    }
    if (type === 'sticker') {
      if (!sticker) throw new Error('File ID stiker wajib diisi.');
      if (message) {
        await tg.sendSticker(id, sticker);
        await tg.sendMessage(id, message, orderMarkup ? { reply_markup: orderMarkup } : {});
      } else {
        await tg.sendSticker(id, sticker, orderMarkup ? { reply_markup: orderMarkup } : {});
      }
      return true;
    }
    if (!message) throw new Error('Pesan broadcast wajib diisi.');
    return tg.sendMessage(id, message, orderMarkup ? { reply_markup: orderMarkup } : {});
  }

  for (let i = 0; i < targets.length; i += 10) {
    const part = targets.slice(i, i + 10);
    const results = await Promise.allSettled(part.map(sendOne));
    results.forEach((r) => {
      if (r.status === 'fulfilled') sent += 1;
      else { failed += 1; if (errors.length < 3) errors.push(String(r.reason?.message || r.reason || 'Gagal mengirim')); }
    });
  }
  const result = { total: targets.length, sent, failed, type, errors };
  await db.markClaimDone(claimKey, result).catch(() => null);
  return result;
}

module.exports = async function handler(req, res) {
  try {
    const owner = assertOwnerMiniApp(req);
    const action = req.query?.action || '';

    if (req.method === 'GET' && action === 'license-status') return json(res, 200, { ok: true, data: await license.checkLicense({ force: true }) });
    if (req.method === 'GET' && action === 'stats') return json(res, 200, { ok: true, data: await db.getStats() });
    if (req.method === 'GET' && action === 'products') return json(res, 200, { ok: true, data: await db.listProducts() });
    if (req.method === 'GET' && action === 'orders') return json(res, 200, { ok: true, data: await db.listTransactions(100) });
    if (req.method === 'GET' && action === 'po-orders') {
      const [orders, products] = await Promise.all([db.listPoOrders(150), db.listProducts()]);
      const productMap = new Map((products || []).map((product) => [String(product.kode || '').trim().toUpperCase(), product]));
      const visibleOrders = (orders || []).filter((order) => {
        const product = productMap.get(String(order.product_code || '').trim().toUpperCase());
        if (!product) return true;
        const variant = db.findVariant(product, String(order.variant_key || '')).variant;
        return !supplierLinkOf(product, variant || null);
      });
      return json(res, 200, { ok: true, data: visibleOrders });
    }
    if (req.method === 'GET' && action === 'users') return json(res, 200, { ok: true, data: await db.listUsers(200) });
    if (req.method === 'GET' && action === 'vouchers') return json(res, 200, { ok: true, data: await db.listVouchers(200) });
    if (req.method === 'GET' && action === 'rekap') return json(res, 200, { ok: true, data: await db.getMonthlyRekap(req.query?.month, req.query?.year) });
    if (req.method === 'GET' && action === 'settings') return json(res, 200, { ok: true, data: await db.getShopSettings() });
    if (req.method === 'GET' && action === 'prodseller-status') return json(res, 200, { ok: true, data: await getProdSellerStatus() });
    if (req.method === 'GET' && action === 'prodseller-products') return json(res, 200, { ok: true, data: await getProdSellerCatalog() });
    if (req.method === 'GET' && action === 'telegram-suppliers') return json(res, 200, { ok: true, data: await getTelegramSuppliersDashboard() });
    if (req.method === 'GET' && action === 'supplier-ai-config') return json(res, 200, { ok: true, data: await aiFlow.getPublicConfig() });
    if (req.method === 'GET' && action === 'supplier-ai-models') return json(res, 200, { ok: true, data: await aiFlow.listAvailableModels() });
    if (req.method === 'GET' && action === 'supplier-orders') return json(res, 200, { ok: true, data: await db.listSupplierOrders(100) });
    if (req.method === 'GET' && action === 'analytics') return json(res, 200, { ok: true, data: await db.getAnalytics(req.query?.month, req.query?.year) });
    if (req.method === 'GET' && action === 'polls') return json(res, 200, { ok: true, data: await db.listBroadcastPolls(100) });
    if (req.method === 'GET' && action === 'maintenance-stats') return json(res, 200, { ok: true, data: await db.getMaintenanceStats() });
    if (req.method === 'GET' && action === 'backup-export') {
      const data = await db.exportBackupData();
      await db.addBackupLog({ type: 'manual-download', status: 'success', filename: `backup-${Date.now()}.json`, size_bytes: JSON.stringify(data).length });
      return json(res, 200, { ok: true, data });
    }
    if (req.method === 'GET' && action === 'backup-logs') return json(res, 200, { ok: true, data: await db.listBackupLogs(30) });
    if (req.method === 'GET' && action === 'deep-stats') return json(res, 200, { ok: true, data: await db.getDeepStats() });
    if (req.method === 'GET' && action === 'promos') {
      const [promos, settings] = await Promise.all([db.listAutoPromos(200), db.getShopSettings()]);
      const flashCodes = new Set(parseCodeList(settings.flash_sale_promo_codes, 100));
      return json(res, 200, { ok: true, data: promos.map((promo) => ({ ...promo, flash_sale: flashCodes.has(String(promo.code || '').trim().toUpperCase()) })) });
    }
    if (req.method === 'GET' && action === 'poll-result') {
      const id = String(req.query?.id || '').trim();
      if (!id) return json(res, 400, { ok: false, error: 'ID polling wajib diisi.' });
      return json(res, 200, { ok: true, data: await db.getBroadcastPollResult(id) });
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method tidak didukung.' });

    if (action === 'prodseller-import') {
      const body = bodyOf(req);
      const data = await importProdSellerProduct(body);
      return json(res, 200, { ok: true, data });
    }

    if (action === 'supplier-ai-config-save') {
      const body = bodyOf(req);
      const data = await aiFlow.saveConfig(body);
      return json(res, 200, { ok: true, data });
    }
    if (action === 'supplier-ai-test') {
      const data = await aiFlow.testConnection();
      return json(res, 200, { ok: true, data });
    }
    if (action === 'supplier-ai-generate-flow') {
      const body = bodyOf(req);
      const data = await aiFlow.generateFlow(body);
      return json(res, 200, { ok: true, data });
    }

    if (action === 'telegram-supplier-save') {
      const body = bodyOf(req);
      let flowConfig = body.flow_config;
      if (typeof flowConfig === 'string') {
        try { flowConfig = JSON.parse(flowConfig || '{}'); } catch (_) { return json(res, 400, { ok: false, error: 'Flow config supplier harus JSON valid.' }); }
      }
      const data = await db.saveTelegramSupplierConnector({ ...body, flow_config: flowConfig || {} });
      return json(res, 200, { ok: true, data });
    }
    if (action === 'telegram-supplier-delete') {
      const body = bodyOf(req);
      await db.deleteTelegramSupplierConnector(body.id);
      return json(res, 200, { ok: true });
    }
    if (action === 'telegram-supplier-product-save') {
      const body = bodyOf(req);
      const data = await db.saveTelegramSupplierProduct(body);
      return json(res, 200, { ok: true, data });
    }
    if (action === 'telegram-supplier-stock-check') {
      const body = bodyOf(req);
      const id = String(body.id || body.product_id || '').trim();
      if (!id) return json(res, 400, { ok: false, error: 'ID produk supplier wajib diisi.' });
      const data = await telegramSupplier.getAvailability(id, { live: true, force: true, allowCached: false, waitMs: 12000 });
      return json(res, 200, { ok: true, data });
    }
    if (action === 'telegram-supplier-product-delete') {
      const body = bodyOf(req);
      await db.deleteTelegramSupplierProduct(body.id);
      return json(res, 200, { ok: true });
    }
    if (action === 'telegram-supplier-import') {
      const body = bodyOf(req);
      const data = await importTelegramSupplierProduct(body);
      return json(res, 200, { ok: true, data });
    }
    if (action === 'telegram-supplier-retry') {
      const body = bodyOf(req);
      const data = await paymentService.retrySupplierOrder(body.order_ref || body.invoice || '', { id: config.ownerId, first_name: 'Owner' });
      return json(res, 200, { ok: true, data });
    }

    if (action === 'prodseller-retry') {
      const body = bodyOf(req);
      const data = await paymentService.retrySupplierOrder(body.order_ref || body.invoice || '', { id: config.ownerId, first_name: 'Owner' });
      return json(res, 200, { ok: true, data });
    }

    const body = bodyOf(req);

    if (action === 'backup-send') {
      const backup = await db.exportBackupData();
      const content = JSON.stringify(backup, null, 2);
      const filename = `backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;
      await tg.sendDocument(require('../lib/config').config.ownerId, filename, content, { caption: '✅ Backup manual database bot.' });
      const log = await db.addBackupLog({ type: 'manual-telegram', status: 'success', filename, size_bytes: content.length });
      return json(res, 200, { ok: true, data: log });
    }

    if (action === 'backup-import') {
      const payload = typeof body.backup === 'string' ? JSON.parse(body.backup) : (body.backup || body);
      const includeTransactions = body.include_transactions === true || String(body.include_transactions || '').toLowerCase() === 'true';
      const result = await db.importBackupData(payload, { include_transactions: includeTransactions });
      return json(res, 200, { ok: true, data: result });
    }

    if (action === 'promo-save') {
      const code = String(body.code || body.kode || '').trim().toUpperCase();
      const currentCode = String(body.current_code || '').trim().toUpperCase();
      const discountType = discountTypeOf(body.discount_type);
      const discountValue = discountValueOf(body.discount_value ?? body.discount ?? body.potongan, discountType);
      if (!code || discountValue <= 0) {
        return json(res, 400, { ok: false, error: 'Kode dan nilai diskon promo otomatis wajib diisi lebih dari 0.' });
      }
      if (discountType === 'percent' && discountValue > 100) {
        return json(res, 400, { ok: false, error: 'Diskon persen maksimal 100%.' });
      }
      const promo = await db.saveAutoPromo({ ...body, code, discount_type: discountType, discount_value: discountValue });
      const flashCodes = await updateFlashPromoMembership({
        currentCode,
        code: promo.code || code,
        enabled: body.flash_sale !== undefined && boolOf(body.flash_sale)
      });
      return json(res, 200, { ok: true, data: { ...promo, flash_sale: flashCodes.includes(String(promo.code || code).toUpperCase()) } });
    }

    if (action === 'promo-delete') {
      const code = String(body.code || body.kode || '').trim().toUpperCase();
      await db.deleteAutoPromo(code);
      await updateFlashPromoMembership({ currentCode: code, code: '', enabled: false });
      return json(res, 200, { ok: true });
    }

    if (action === 'save-settings') {
      const data = await db.saveShopSettings({
        store_name: body.store_name,
        store_description: body.store_description,
        logo_url: body.logo_url,
        banner_url: body.banner_url,
        banner_urls: body.banner_urls,
        banner_items: body.banner_items,
        banner_interval_seconds: body.banner_interval_seconds,
        flash_sale_enabled: body.flash_sale_enabled,
        flash_sale_title: body.flash_sale_title,
        flash_sale_start_at: body.flash_sale_start_at,
        flash_sale_end_at: body.flash_sale_end_at,
        flash_sale_products: body.flash_sale_products,
        flash_sale_promo_codes: body.flash_sale_promo_codes,
        start_media_type: body.start_media_type,
        start_media_value: body.start_media_value,
        start_media_caption: body.start_media_caption,
        customer_service_link: body.customer_service_link,
        group_link: body.group_link,
        bot_menu_mode: body.bot_menu_mode,
        join_channel_required: body.join_channel_required,
        join_channel_id: body.join_channel_id,
        join_channel_link: body.join_channel_link,
        bot_show_total_users: body.bot_show_total_users,
        referral_enabled: body.referral_enabled,
        referral_reward_amount: body.referral_reward_amount,
        referral_reward_mode: body.referral_reward_mode,
        topup_enabled: body.topup_enabled,
        wallet_payment_enabled: body.wallet_payment_enabled,
        topup_min_amount: body.topup_min_amount,
        topup_max_amount: body.topup_max_amount,
        prodseller_usdt_to_idr: body.prodseller_usdt_to_idr,
        prodseller_markup_percent: body.prodseller_markup_percent,
        prodseller_default_category: body.prodseller_default_category
      });
      return json(res, 200, { ok: true, data });
    }

    if (action === 'add-product') {
      const nama = String(body.nama || '').trim();
      const kode = String(body.kode || '').trim().toUpperCase();
      const harga = numberOf(body.harga);
      const cost_price = numberOf(body.cost_price || body.modal || body.harga_modal);
      const deskripsi = String(body.deskripsi || '').trim();
      const snk = String(body.snk || '').trim();
      const image_url = String(body.image_url || '').trim();
      const category = String(body.category || body.kategori || '').trim();
      const display_scope = String(body.display_scope || 'both').toLowerCase() === 'marketplace' ? 'marketplace' : 'both';
      const delivery_mode = String(body.delivery_mode || 'auto').toLowerCase() === 'po' ? 'po' : 'auto';
      const bulk_prices = parseBulkPrices(body.bulk_text || body.bulk_prices);
      const variants = parseVariantPayload(body);
      const hasVariants = variants.length > 0;
      const finalHarga = harga || (hasVariants ? numberOf(variants[0].price) : 0);
      const finalCostPrice = cost_price || (hasVariants ? numberOf(variants[0].cost_price) : 0);
      const finalDeskripsi = deskripsi || (hasVariants ? (variants[0].description || 'Produk dengan varian.') : '');
      const finalSnk = snk || (hasVariants ? (variants[0].snk || 'Syarat mengikuti varian yang dipilih.') : '');
      if (!nama || !kode || !finalHarga || !finalDeskripsi || !finalSnk) return json(res, 400, { ok: false, error: hasVariants ? 'Nama, kode, dan minimal satu varian dengan harga wajib diisi.' : 'Nama, kode, harga, deskripsi, dan SnK wajib diisi.' });
      const product = await db.addProduct({ nama, kode, harga: finalHarga, cost_price: finalCostPrice, deskripsi: finalDeskripsi, snk: finalSnk, image_url, category, display_scope, delivery_mode, bulk_prices, variants, data: delivery_mode === 'po' ? [] : splitStock(body.stock_text || '') });
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
      ['nama', 'kode', 'deskripsi', 'snk', 'image_url', 'category', 'display_scope', 'delivery_mode'].forEach((key) => { if (body[key] !== undefined) updates[key] = body[key]; });
      if (body.active !== undefined) updates.active = boolOf(body.active);
      if (body.kategori !== undefined) updates.category = body.kategori;
      if (body.harga !== undefined) updates.harga = numberOf(body.harga);
      if (body.cost_price !== undefined || body.modal !== undefined || body.harga_modal !== undefined) updates.cost_price = numberOf(body.cost_price || body.modal || body.harga_modal);
      if (body.bulk_text !== undefined || body.bulk_prices !== undefined) updates.bulk_prices = parseBulkPrices(body.bulk_text || body.bulk_prices);
      if (body.variants_text !== undefined || body.variant_text !== undefined || body.variants !== undefined) updates.variants = parseVariantPayload(body);
      if (body.stock_text !== undefined) updates.stock = splitStock(body.stock_text || '');
      if (body.field && body.value !== undefined) updates[body.field] = ['harga','cost_price','modal','harga_modal'].includes(body.field) ? numberOf(body.value) : String(body.value || '').trim();
      const currentProduct = await db.getProductByCode(code);
      if (['prodseller','telegram_userbot'].includes(String(currentProduct?.supplier_source || '').toLowerCase())) {
        updates.delivery_mode = 'po';
        updates.stock = [];
      }
      const product = await db.updateProductByCode(code, updates);
      if (!product) return json(res, 404, { ok: false, error: 'Produk tidak ditemukan.' });
      return json(res, 200, { ok: true, data: product });
    }

    if (action === 'fulfill-po') {
      const orderRef = String(body.order_ref || '').trim();
      const deliveryText = String(body.delivery_text || '').trim();
      if (!orderRef) return json(res, 400, { ok: false, error: 'Invoice PO wajib diisi.' });
      if (!deliveryText) return json(res, 400, { ok: false, error: 'Masukkan produk/akun yang akan dikirim ke pembeli.' });
      const po = await db.getPoOrder(orderRef);
      if (!po) return json(res, 404, { ok: false, error: 'Pesanan PO tidak ditemukan.' });
      if (String(po.status || '') === 'delivered') return json(res, 200, { ok: true, data: { already_delivered: true, po_order: po } });
      if (String(po.status || '') !== 'waiting_delivery') return json(res, 409, { ok: false, error: 'Pesanan PO ini tidak sedang menunggu pengiriman.' });
      const poProduct = await db.getProductByCode(po.product_code).catch(() => null);
      const poVariant = poProduct ? db.findVariant(poProduct, po.variant_key || '').variant : null;
      if (supplierLinkOf(poProduct, poVariant || null)) {
        return json(res, 409, { ok: false, error: 'Pesanan supplier otomatis diproses melalui Supplier / Reseller dan tidak dapat dikirim sebagai PO manual.' });
      }
      const transactionBeforeSend = await db.getTransactionByOrderRef(orderRef).catch(() => null);
      if (String(transactionBeforeSend?.status || 'completed').toLowerCase() === 'canceled') {
        return json(res, 409, { ok: false, error: 'Penjualan ini sudah CANCELED. Produk PO tidak dikirim.' });
      }

      const claimKey = `po_send:${orderRef}`;
      const claimed = await db.claimOnce(claimKey, 60 * 60, { order_ref: orderRef, actor_id: Number(owner?.id || 0) }, { failClosed: true });
      if (!claimed) return json(res, 409, { ok: false, error: 'Pengiriman PO ini sedang diproses. Muat ulang beberapa saat lagi.' });

      let telegramSent = false;
      try {
        const product = poProduct || await db.getProductByCode(po.product_code).catch(() => null);
        await paymentService.sendPoDeliveryReceipt(po.telegram_id, po, deliveryText, product);
        telegramSent = true;
        const result = await db.markPoDelivered(orderRef, deliveryText, Number(owner?.id || config.ownerId || 0));
        const transaction = result.transaction || await db.getTransactionByOrderRef(orderRef).catch(() => null);
        const buyer = await db.getUserByTelegramId(po.telegram_id).catch(() => null);
        await paymentService.sendOwnerLog(
          { invoice_ref: orderRef, telegram_id: po.telegram_id, fee: Number(transaction?.payment_fee || 0), quantity: po.quantity, variant_name: po.variant_name },
          product || { nama: po.product_name, kode: po.product_code },
          transaction || { order_ref: orderRef, product_name: po.product_name, product_code: po.product_code, variant_name: po.variant_name, quantity: po.quantity, total_price: po.total_price },
          buyer || { telegram_id: po.telegram_id, username: po.username }
        ).catch(() => null);
        await db.markClaimDone(claimKey, { order_ref: orderRef, state: 'delivered' }).catch(() => null);
        return json(res, 200, { ok: true, data: result });
      } catch (error) {
        // Jika pesan Telegram belum terkirim, lock aman dilepas agar seller dapat mencoba lagi.
        // Jika pesan sudah terkirim tetapi update DB gagal, lock dibiarkan sampai TTL untuk mencegah pengiriman ganda.
        if (!telegramSent) await db.releaseClaim(claimKey).catch(() => null);
        throw error;
      }
    }

    if (action === 'set-user-balances') {
      const telegramId = numberOf(body.telegram_id);
      const balanceMain = Number(body.balance_main);
      const balanceReferral = Number(body.balance_referral);
      if (!telegramId) return json(res, 400, { ok: false, error: 'ID Telegram user wajib diisi.' });
      if (!Number.isFinite(balanceMain) || !Number.isFinite(balanceReferral) || balanceMain < 0 || balanceReferral < 0) {
        return json(res, 400, { ok: false, error: 'Saldo Utama dan Saldo Referral harus berupa angka nol atau lebih.' });
      }
      const user = await db.setUserBalances(telegramId, balanceMain, balanceReferral, {
        reason: String(body.reason || 'Penyesuaian saldo dari Reseller Dashboard').trim(),
        actorId: Number(owner?.id || config.ownerId || 0),
        reference: `dashboard-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
      });
      return json(res, 200, { ok: true, data: user });
    }

    if (action === 'delete-user') {
      const telegramId = numberOf(body.telegram_id);
      if (!telegramId) return json(res, 400, { ok: false, error: 'ID Telegram user wajib diisi.' });
      await db.deleteUser(telegramId);
      return json(res, 200, { ok: true });
    }

    if (action === 'add-voucher') {
      const code = String(body.kode || body.code || '').trim().toUpperCase();
      const produk = String(body.produk || body.products || 'semua').trim();
      const discountType = discountTypeOf(body.discount_type);
      const discountValue = discountValueOf(body.discount_value ?? body.potongan ?? body.discount, discountType);
      const limit = numberOf(body.limit || body.usage_limit);
      if (!code || !discountValue || !limit) return json(res, 400, { ok: false, error: 'Kode, nilai diskon, dan limit voucher wajib diisi.' });
      if (discountType === 'percent' && discountValue > 100) return json(res, 400, { ok: false, error: 'Diskon persen maksimal 100%.' });
      const voucher = await db.addVoucher({
        kode: code,
        produk,
        discount_type: discountType,
        discount_value: discountValue,
        potongan: discountValue,
        min_qty: body.min_qty || 1,
        min_spend: body.min_spend || 0,
        limit,
        description: body.description || '',
        active: body.active === undefined ? true : boolOf(body.active),
        start_at: body.start_at || null,
        expires_at: body.expires_at || body.end_at || null
      });
      return json(res, 200, { ok: true, data: voucher });
    }

    if (action === 'edit-voucher') {
      const code = String(body.current_code || body.kode_lama || body.kode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { ok: false, error: 'Kode voucher wajib diisi.' });
      const discountType = discountTypeOf(body.discount_type);
      const discountValue = discountValueOf(body.discount_value ?? body.potongan ?? body.discount, discountType);
      if (discountValue <= 0) return json(res, 400, { ok: false, error: 'Nilai diskon voucher wajib lebih dari 0.' });
      if (discountType === 'percent' && discountValue > 100) return json(res, 400, { ok: false, error: 'Diskon persen maksimal 100%.' });
      const voucher = await db.updateVoucher(code, {
        kode: body.kode_baru || body.new_code || body.kode,
        produk: body.produk || body.products,
        discount_type: discountType,
        discount_value: discountValue,
        potongan: discountValue,
        min_qty: body.min_qty || 1,
        min_spend: body.min_spend || 0,
        limit: body.limit || body.usage_limit,
        description: body.description || body.deskripsi,
        active: boolOf(body.active),
        start_at: body.start_at || null,
        expires_at: body.expires_at || body.end_at || null
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

    if (action === 'update-order-cost') {
      const orderRef = String(body.order_ref || body.invoice || '').trim();
      const costTotal = numberOf(body.cost_total || body.modal_total || body.modal);
      if (!orderRef) return json(res, 400, { ok: false, error: 'Invoice transaksi wajib diisi.' });
      const transaction = await db.updateTransactionCost(orderRef, costTotal);
      if (!transaction) return json(res, 404, { ok: false, error: 'Transaksi tidak ditemukan.' });
      return json(res, 200, { ok: true, data: transaction });
    }

    if (action === 'update-order-status') {
      const orderRef = String(body.order_ref || body.invoice || '').trim();
      const status = String(body.status || '').trim().toLowerCase();
      if (!orderRef) return json(res, 400, { ok: false, error: 'Invoice transaksi wajib diisi.' });
      if (!['completed', 'canceled'].includes(status)) return json(res, 400, { ok: false, error: 'Status transaksi tidak valid.' });
      const transaction = await db.updateTransactionStatus(orderRef, status);
      if (!transaction) return json(res, 404, { ok: false, error: 'Transaksi tidak ditemukan.' });
      return json(res, 200, { ok: true, data: transaction });
    }

    if (action === 'broadcast') {
      const result = await broadcast(body, req);
      return json(res, 200, { ok: true, data: result });
    }

    if (action === 'delete-poll') {
      const id = String(body.id || body.poll_id || '').trim();
      if (!id) return json(res, 400, { ok: false, error: 'ID polling wajib diisi.' });
      await db.deleteBroadcastPoll(id);
      return json(res, 200, { ok: true });
    }

    if (action === 'maintenance-cleanup') {
      const result = await db.cleanupDatabase(body);
      return json(res, 200, { ok: true, data: result });
    }

    return json(res, 404, { ok: false, error: 'Action tidak ditemukan.' });
  } catch (error) {
    console.error(error);
    return json(res, error.statusCode || 500, { ok: false, error: error.message });
  }
};
