const axios = require('axios');
const QRCode = require('qrcode');
const db = require('./db');
const paymentService = require('./paymentService');
const { config } = require('./config');
const { randomFee, randomRef } = require('./utils');

function httpError(message, statusCode = 400, code = 'BAD_REQUEST', details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

function driveFileId(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i,
    /docs\.google\.com\/uc\?[^#]*\bid=([a-zA-Z0-9_-]+)/i
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

function normalizePublicImageUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  const fileId = driveFileId(value);
  if (fileId) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
  if (/^https:\/\//i.test(value)) return value;
  return '';
}

function parseBannerUrls(value) {
  let rows = [];
  if (Array.isArray(value)) rows = value;
  else {
    const text = String(value || '').trim();
    if (!text) return [];
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) rows = parsed;
      } catch (_) {}
    }
    if (!rows.length) rows = text.split(/\r?\n|;/g);
  }
  const unique = [];
  for (const row of rows) {
    const url = normalizePublicImageUrl(row);
    if (url && !unique.includes(url)) unique.push(url);
    if (unique.length >= 10) break;
  }
  return unique;
}

function variantStock(variant) {
  return Array.isArray(variant?.stock) ? variant.stock.length : 0;
}

function sanitizeVariant(variant, index) {
  return {
    key: db.variantKey(variant, index),
    name: String(variant?.name || `Varian ${index + 1}`),
    price: Number(variant?.price || 0),
    stock: variantStock(variant),
    sold: Number(variant?.sold || 0),
    active: variant?.active !== false,
    description: String(variant?.description || ''),
    terms: String(variant?.snk || ''),
    note: String(variant?.note || ''),
    bulk_prices: db.normalizeBulkPrices(variant?.bulk_prices || [])
  };
}

function bestPromoForSelection(promos, productCode, variantKey, quantity, subtotal) {
  const candidates = (promos || [])
    .filter((promo) => db.promoIsActive(promo, productCode, quantity, subtotal, variantKey))
    .map((promo) => ({
      code: promo.code,
      name: promo.name || promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value || 0),
      discount_amount: db.promoDiscountAmount(promo, subtotal),
      end_at: promo.end_at || null
    }))
    .filter((promo) => promo.discount_amount > 0)
    .sort((a, b) => b.discount_amount - a.discount_amount || String(a.code).localeCompare(String(b.code)));
  return candidates[0] || null;
}

function sanitizeProduct(product, promos = []) {
  const variants = (Array.isArray(product?.variants) ? product.variants : [])
    .map(sanitizeVariant)
    .filter((variant) => variant.active);
  const buyableVariants = variants.filter((variant) => variant.stock > 0 && variant.price > 0);
  const baseStock = Array.isArray(product?.data) ? product.data.length : 0;
  const stock = variants.length ? variants.reduce((sum, variant) => sum + variant.stock, 0) : baseStock;
  const prices = (variants.length ? variants : [{ price: Number(product?.harga || 0) }])
    .map((variant) => Number(variant.price || 0))
    .filter((price) => price > 0);
  const priceMin = prices.length ? Math.min(...prices) : Number(product?.harga || 0);
  const priceMax = prices.length ? Math.max(...prices) : Number(product?.harga || 0);
  const promoVariant = buyableVariants[0] || variants[0] || null;
  const promo = bestPromoForSelection(
    promos,
    product.kode,
    promoVariant?.key || '',
    1,
    promoVariant?.price || Number(product?.harga || 0)
  );

  return {
    code: product.kode,
    name: product.nama,
    description: product.deskripsi || '',
    terms: product.snk || '',
    category: product.category || 'Lainnya',
    image_url: normalizePublicImageUrl(product.image_url),
    price: Number(product.harga || 0),
    price_min: priceMin,
    price_max: priceMax,
    stock,
    sold: Number(product.terjual || 0),
    active: product.active !== false,
    variants,
    bulk_prices: db.normalizeBulkPrices(product.bulk_prices || []),
    promo,
    available: product.active !== false && stock > 0 && (!variants.length || buyableVariants.length > 0)
  };
}

async function getCatalog(viewer = null) {
  const [products, settings, promos] = await Promise.all([
    db.listProducts({ activeOnly: true }),
    db.getShopSettings(),
    db.listAutoPromos(200).catch(() => [])
  ]);
  const publicProducts = products.map((product) => sanitizeProduct(product, promos));
  const categories = [...new Set(publicProducts.map((product) => product.category || 'Lainnya'))].sort((a, b) => a.localeCompare(b, 'id'));
  const bannerUrls = parseBannerUrls(settings.banner_urls || settings.banner_url);
  const bannerIntervalSeconds = Math.max(3, Math.min(15, Number(settings.banner_interval_seconds || 5)));
  return {
    settings: {
      store_name: settings.store_name || config.botName || 'iLink.in Store',
      store_description: settings.store_description || 'Produk digital otomatis, cepat, dan praktis.',
      logo_url: normalizePublicImageUrl(settings.logo_url),
      banner_url: bannerUrls[0] || '',
      banner_urls: bannerUrls,
      banner_interval_ms: bannerIntervalSeconds * 1000,
      customer_service_link: settings.customer_service_link || config.customerService || '',
      group_link: settings.group_link || config.channelStore || ''
    },
    bot_username: String(config.botUsername || '').replace(/^@/, ''),
    products: publicProducts,
    categories,
    viewer: viewer ? {
      telegram_ready: true,
      id: Number(viewer.id),
      first_name: viewer.first_name || '',
      username: viewer.username || '',
      is_owner: Number(viewer.id) === Number(config.ownerId)
    } : {
      telegram_ready: false,
      is_owner: false
    }
  };
}

function selectedProductVariant(product, requestedKey) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return { variant: null, index: -1, key: '' };
  const target = String(requestedKey || '').trim().toUpperCase();
  if (!target) throw httpError('Silakan pilih varian produk.', 400, 'VARIANT_REQUIRED');
  const found = db.findVariant(product, target);
  if (!found.variant || found.index < 0) throw httpError('Varian produk tidak ditemukan.', 404, 'VARIANT_NOT_FOUND');
  if (found.variant.active === false) throw httpError('Varian sedang tidak tersedia.', 409, 'VARIANT_OFF');
  return { ...found, key: db.variantKey(found.variant, found.index) };
}

async function ensureNoActiveOrder(telegramId) {
  const current = await db.getPendingOrder(telegramId);
  if (!current) return;
  const expired = current.expires_at && Date.now() > new Date(current.expires_at).getTime();
  if (expired || ['expired', 'cancelled', 'canceled', 'failed'].includes(String(current.status || '').toLowerCase())) {
    await db.deletePendingOrder(telegramId);
    return;
  }
  if (current.status === 'awaiting_payment' && current.invoice_ref) {
    throw httpError(
      'Masih ada pembayaran aktif. Selesaikan atau batalkan pesanan tersebut terlebih dahulu.',
      409,
      'ACTIVE_ORDER',
      { invoice: current.invoice_ref, expires_at: current.expires_at }
    );
  }
}

async function createPayment({ user, productCode, variantKey, quantity, voucherCode }) {
  if (!user?.id) throw httpError('Buka toko melalui Telegram agar identitas pembeli dapat diverifikasi.', 401, 'TELEGRAM_REQUIRED');
  if (!config.pakasirSlug || !config.pakasirApiKey) {
    throw httpError('Konfigurasi pembayaran Pakasir belum lengkap.', 503, 'PAYMENT_NOT_CONFIGURED');
  }

  const qty = Math.max(1, Math.min(100, Number(quantity || 1)));
  const code = String(productCode || '').trim().toUpperCase();
  if (!code) throw httpError('Produk belum dipilih.', 400, 'PRODUCT_REQUIRED');

  await ensureNoActiveOrder(Number(user.id));
  const product = await db.getProductByCode(code);
  if (!product || product.active === false) throw httpError('Produk tidak tersedia.', 404, 'PRODUCT_NOT_FOUND');

  const selected = selectedProductVariant(product, variantKey);
  const availableStock = selected.variant
    ? variantStock(selected.variant)
    : (Array.isArray(product.data) ? product.data.length : 0);
  if (availableStock < qty) {
    throw httpError(`Stok tidak mencukupi. Stok tersedia: ${availableStock}.`, 409, 'INSUFFICIENT_STOCK', { available_stock: availableStock });
  }

  const draftOrder = {
    telegram_id: Number(user.id),
    product_code: product.kode,
    variant_key: selected.key,
    variant_name: selected.variant?.name || '',
    unit_price: Number(selected.variant?.price || product.harga || 0),
    quantity: qty,
    status: 'draft'
  };
  const unitPrice = db.orderUnitPrice(product, draftOrder);
  const subtotal = unitPrice * qty;
  let voucherApplied = null;
  let promoApplied = null;
  let discount = 0;

  const manualVoucherCode = String(voucherCode || '').trim().toUpperCase();
  if (manualVoucherCode) {
    const voucher = await db.getVoucher(manualVoucherCode);
    if (!db.voucherIsValid(voucher, product.kode, Number(user.id), qty, subtotal, selected.key)) {
      throw httpError('Voucher tidak valid, belum aktif, sudah expired, limit habis, atau tidak berlaku untuk varian ini.', 400, 'INVALID_VOUCHER');
    }
    voucherApplied = voucher;
    discount = db.voucherDiscountAmount(voucher, subtotal);
  } else {
    promoApplied = await db.getBestAutoPromo(product.kode, Number(user.id), qty, subtotal, selected.key).catch(() => null);
    discount = promoApplied ? Number(promoApplied.discount_amount || 0) : 0;
  }

  discount = Math.min(subtotal, Math.max(0, Number(discount || 0)));
  const afterDiscount = Math.max(0, subtotal - discount);
  const fee = randomFee();
  const total = afterDiscount + fee;
  const invoice = randomRef();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const response = await axios.post('https://app.pakasir.com/api/transactioncreate/qris', {
    project: config.pakasirSlug,
    order_id: invoice,
    amount: total,
    api_key: config.pakasirApiKey
  }, { timeout: 20000 });

  const qrText = response.data?.payment?.payment_number || response.data?.payment_number || response.data?.qr_string;
  if (!qrText) throw httpError('Pakasir tidak mengirim QR pembayaran.', 502, 'QR_NOT_RECEIVED');

  const appliedCode = promoApplied ? `AUTO_PROMO:${promoApplied.code}` : (voucherApplied?.code || '');
  await db.upsertUser(user);
  await db.upsertPendingOrder({
    ...draftOrder,
    voucher_code: appliedCode,
    invoice_ref: invoice,
    amount: total,
    fee,
    status: 'awaiting_payment',
    expires_at: expiresAt
  });

  const watcher_scheduled = paymentService.schedulePaymentWatcher({
    invoiceRef: invoice,
    telegramId: Number(user.id)
  });
  const qr_data_url = await QRCode.toDataURL(qrText, { width: 640, margin: 2, errorCorrectionLevel: 'M' });

  return {
    invoice,
    product: product.nama,
    product_code: product.kode,
    variant: selected.variant?.name || '',
    quantity: qty,
    unit_price: unitPrice,
    subtotal,
    discount,
    discount_label: voucherApplied
      ? `Voucher ${voucherApplied.code}`
      : (promoApplied ? `Promo ${promoApplied.name || promoApplied.code}` : ''),
    after_discount: afterDiscount,
    fee,
    total,
    expires_at: expiresAt,
    qr_data_url,
    watcher_scheduled
  };
}

async function getOrderStatus(user, invoice) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const ref = String(invoice || '').trim().toUpperCase();
  if (!ref) throw httpError('Invoice wajib diisi.', 400, 'INVOICE_REQUIRED');

  const transaction = await db.getTransactionByOrderRef(ref);
  if (transaction) {
    if (Number(transaction.telegram_id) !== Number(user.id)) throw httpError('Invoice bukan milik akun ini.', 403, 'FORBIDDEN');
    return {
      status: 'completed',
      invoice: ref,
      product: transaction.product_name,
      variant: transaction.variant_name || '',
      quantity: Number(transaction.quantity || 1),
      total: Number(transaction.total_price || 0),
      completed_at: transaction.created_at
    };
  }

  const order = await db.getPendingOrderByInvoice(ref);
  if (!order) return { status: 'not_found', invoice: ref };
  if (Number(order.telegram_id) !== Number(user.id)) throw httpError('Invoice bukan milik akun ini.', 403, 'FORBIDDEN');
  const expired = order.expires_at && Date.now() > new Date(order.expires_at).getTime();
  return {
    status: expired ? 'expired' : String(order.status || 'pending'),
    invoice: ref,
    amount: Number(order.amount || 0),
    expires_at: order.expires_at || null
  };
}

async function cancelOrder(user, invoice) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const ref = String(invoice || '').trim().toUpperCase();
  const transaction = ref ? await db.getTransactionByOrderRef(ref) : null;
  if (transaction) throw httpError('Pesanan sudah dibayar dan tidak dapat dibatalkan.', 409, 'ORDER_COMPLETED');
  const order = ref ? await db.getPendingOrderByInvoice(ref) : await db.getPendingOrder(Number(user.id));
  if (!order) return { cancelled: false, status: 'not_found' };
  if (Number(order.telegram_id) !== Number(user.id)) throw httpError('Pesanan bukan milik akun ini.', 403, 'FORBIDDEN');
  await db.deletePendingOrder(Number(user.id));
  return { cancelled: true, invoice: order.invoice_ref || ref };
}

async function getHistory(user, limit = 20) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const rows = await db.listTransactionsByUser(Number(user.id), Math.max(1, Math.min(50, Number(limit || 20))));
  return rows.map((row) => ({
    invoice: row.order_ref,
    product: row.product_name,
    variant: row.variant_name || '',
    quantity: Number(row.quantity || 1),
    total: Number(row.total_price || 0),
    created_at: row.created_at,
    status: 'completed'
  }));
}

module.exports = {
  normalizePublicImageUrl,
  parseBannerUrls,
  sanitizeProduct,
  getCatalog,
  createPayment,
  getOrderStatus,
  cancelOrder,
  getHistory,
  httpError
};
