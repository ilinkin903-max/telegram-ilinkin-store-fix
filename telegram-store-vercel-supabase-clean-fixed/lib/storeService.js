const axios = require('axios');
const crypto = require('crypto');
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

function qrTokenSecret() {
  return String(config.qrDownloadSecret || config.botToken || '').trim();
}

function safeEqualText(left, right) {
  try {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

function issueQrDownloadToken(invoice, telegramId, expiresAt = null) {
  const secret = qrTokenSecret();
  if (!secret) throw httpError('QR_DOWNLOAD_SECRET belum diatur.', 503, 'QR_TOKEN_NOT_CONFIGURED');
  const gatewayExpiry = expiresAt ? new Date(expiresAt).getTime() : 0;
  const maxExpiry = Date.now() + 20 * 60 * 1000;
  const expiryMs = gatewayExpiry > Date.now() ? Math.min(gatewayExpiry, maxExpiry) : maxExpiry;
  const payload = Buffer.from(JSON.stringify({
    i: String(invoice || '').trim(),
    u: Number(telegramId || 0),
    e: Math.floor(expiryMs / 1000)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyQrDownloadToken(token) {
  const secret = qrTokenSecret();
  const [payload, signature, extra] = String(token || '').split('.');
  if (!secret || !payload || !signature || extra !== undefined) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqualText(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.i || !Number(data?.u) || !Number(data?.e) || Date.now() >= Number(data.e) * 1000) return null;
    return { invoice: String(data.i), telegramId: Number(data.u), expiresAt: Number(data.e) * 1000 };
  } catch (_) {
    return null;
  }
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

function bannerHex(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
}

function bannerChoice(value, allowed, fallback) {
  const text = String(value || '').trim().toLowerCase();
  return allowed.includes(text) ? text : fallback;
}

function parseBannerUrls(value) {
  return parseBannerItems(value).filter((item) => item.type === 'image' && item.url).map((item) => item.url);
}

function parseBannerItems(value) {
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

  const out = [];
  const seenImageUrls = new Set();
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const obj = row && typeof row === 'object' ? row : { url: row };
    const type = String(obj.type || obj.kind || (obj.url || obj.link || obj.image_url ? 'image' : 'native')).trim().toLowerCase() === 'native'
      ? 'native'
      : 'image';
    const name = String(obj.name || obj.nama || obj.label || `${type === 'native' ? 'Banner Bawaan' : 'Banner'} ${index + 1}`).trim();

    if (type === 'native') {
      const title = String(obj.title || obj.judul || 'Cepat, aman, langsung terkirim').trim().slice(0, 120);
      const description = String(obj.description || obj.deskripsi || '').trim().slice(0, 260);
      const kicker = String(obj.kicker || obj.eyebrow || '').trim().slice(0, 60);
      if (!title && !description && !kicker) continue;
      out.push({
        type: 'native',
        name: name || `Banner Bawaan ${index + 1}`,
        kicker,
        title,
        description,
        background_color: bannerHex(obj.background_color || obj.bg || obj.color, '#1769e0'),
        background_color_2: bannerHex(obj.background_color_2 || obj.bg2 || obj.color_2, '#0d47a1'),
        text_color: bannerHex(obj.text_color || obj.foreground_color, '#ffffff'),
        accent_color: bannerHex(obj.accent_color || obj.button_color, '#ffe15a'),
        text_position: bannerChoice(obj.text_position || obj.position, ['left', 'center', 'right'], 'left'),
        vertical_position: bannerChoice(obj.vertical_position || obj.vertical, ['top', 'center', 'bottom'], 'center'),
        button_text: String(obj.button_text || obj.cta_text || '').trim().slice(0, 40),
        button_target: bannerChoice(obj.button_target || obj.cta_target, ['catalog', 'cara_order', 'none'], 'catalog')
      });
    } else {
      const url = normalizePublicImageUrl(obj.url || obj.link || obj.image_url || '');
      if (!url || seenImageUrls.has(url)) continue;
      seenImageUrls.add(url);
      out.push({ type: 'image', name: name || `Banner ${index + 1}`, url });
    }
    if (out.length >= 12) break;
  }
  return out;
}

function parseFlashSaleProductCodes(value) {
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
    if (!rows.length) rows = text.split(/[\r\n,;|]+/g);
  }
  const seen = new Set();
  return rows.map((row) => String(typeof row === 'object' && row ? (row.code || row.kode || row.product_code || '') : row).trim().toUpperCase())
    .filter((code) => {
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    }).slice(0, 8);
}

function parseFlashSalePromoCodes(value) {
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
    if (!rows.length) rows = text.split(/[\r\n,;|]+/g);
  }
  const seen = new Set();
  return rows.map((row) => String(typeof row === 'object' && row ? (row.code || row.kode || row.promo_code || '') : row).trim().toUpperCase())
    .filter((code) => {
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    }).slice(0, 100);
}

function variantStock(variant) {
  return Array.isArray(variant?.stock) ? variant.stock.length : 0;
}

function promoDisplay(promo, originalPrice) {
  if (!promo || Number(originalPrice || 0) <= 0) return null;
  const original = Number(originalPrice || 0);
  const discount = Math.min(original, Math.max(0, Number(promo.discount_amount || 0)));
  if (!discount) return null;
  return {
    ...promo,
    original_price: original,
    final_price: Math.max(0, original - discount)
  };
}

function sanitizeVariant(variant, index, promos = [], productCode = '', flashPromos = [], productDeliveryMode = 'auto') {
  const key = db.variantKey(variant, index);
  const price = Number(variant?.price || 0);
  const promo = promoDisplay(bestPromoForSelection(promos, productCode, key, 1, price), price);
  const flashPromo = promoDisplay(bestPromoForSelection(flashPromos, productCode, key, 1, price), price);
  return {
    key,
    name: String(variant?.name || `Varian ${index + 1}`),
    price,
    stock: variantStock(variant),
    sold: Number(variant?.sold || 0),
    active: variant?.active !== false,
    description: String(variant?.description || ''),
    terms: String(variant?.snk || ''),
    note: String(variant?.note || ''),
    delivery_mode: db.normalizeDeliveryMode(variant?.delivery_mode, ''),
    effective_delivery_mode: db.normalizeDeliveryMode(variant?.delivery_mode, db.normalizeDeliveryMode(productDeliveryMode, 'auto')),
    bulk_prices: db.normalizeBulkPrices(variant?.bulk_prices || []),
    promo,
    flash_promo: flashPromo,
    flash_sale_sold: 0,
    display_price: promo ? promo.final_price : price
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

function sanitizeProduct(product, promos = [], flashPromos = []) {
  const productDeliveryMode = db.normalizeDeliveryMode(product?.delivery_mode, 'auto');
  const isPo = productDeliveryMode === 'po';
  const variants = (Array.isArray(product?.variants) ? product.variants : [])
    .map((variant, index) => sanitizeVariant(variant, index, promos, product.kode, flashPromos, productDeliveryMode))
    .filter((variant) => variant.active);
  const buyableVariants = variants.filter((variant) => variant.price > 0 && (variant.effective_delivery_mode === 'po' || variant.stock > 0));
  const baseStock = Array.isArray(product?.data) ? product.data.length : 0;
  const stock = variants.length ? variants.reduce((sum, variant) => sum + (variant.effective_delivery_mode === 'po' ? 0 : variant.stock), 0) : (isPo ? 0 : baseStock);
  const prices = (variants.length ? variants : [{ price: Number(product?.harga || 0) }])
    .map((variant) => Number(variant.price || 0))
    .filter((price) => price > 0);
  const displayPrices = variants.length
    ? variants.map((variant) => Number(variant.display_price || variant.price || 0)).filter((price) => price >= 0)
    : [];
  const priceMin = prices.length ? Math.min(...prices) : Number(product?.harga || 0);
  const priceMax = prices.length ? Math.max(...prices) : Number(product?.harga || 0);
  const basePromo = variants.length
    ? null
    : promoDisplay(bestPromoForSelection(promos, product.kode, '', 1, Number(product?.harga || 0)), Number(product?.harga || 0));
  const baseFlashPromo = variants.length
    ? null
    : promoDisplay(bestPromoForSelection(flashPromos, product.kode, '', 1, Number(product?.harga || 0)), Number(product?.harga || 0));
  const salePriceMin = variants.length
    ? (displayPrices.length ? Math.min(...displayPrices) : priceMin)
    : (basePromo ? basePromo.final_price : priceMin);
  const salePriceMax = variants.length
    ? (displayPrices.length ? Math.max(...displayPrices) : priceMax)
    : (basePromo ? basePromo.final_price : priceMax);
  const hasPromo = Boolean(basePromo || variants.some((variant) => variant.promo));

  return {
    code: product.kode,
    name: product.nama,
    description: product.deskripsi || '',
    terms: product.snk || '',
    category: product.category || 'Lainnya',
    image_url: normalizePublicImageUrl(product.image_url),
    display_scope: String(product.display_scope || 'both') === 'marketplace' ? 'marketplace' : 'both',
    delivery_mode: productDeliveryMode,
    has_po_variants: variants.some((variant) => variant.effective_delivery_mode === 'po'),
    has_auto_variants: variants.some((variant) => variant.effective_delivery_mode === 'auto'),
    price: Number(product.harga || 0),
    price_min: priceMin,
    price_max: priceMax,
    sale_price_min: salePriceMin,
    sale_price_max: salePriceMax,
    stock,
    sold: Number(product.terjual || 0),
    active: product.active !== false,
    variants,
    bulk_prices: db.normalizeBulkPrices(product.bulk_prices || []),
    promo: basePromo,
    flash_promo: baseFlashPromo,
    flash_sale_eligible: Boolean(baseFlashPromo || variants.some((variant) => variant.flash_promo)),
    flash_sale_sold: 0,
    has_promo: hasPromo,
    available: product.active !== false && (variants.length
      ? buyableVariants.length > 0
      : (isPo ? Number(product?.harga || 0) > 0 : stock > 0))
  };
}

async function getCatalog(viewer = null) {
  const [products, settings, promos] = await Promise.all([
    db.listProducts({ activeOnly: true }),
    db.getShopSettings(),
    db.listAutoPromos(200).catch(() => [])
  ]);
  let wallet = null;
  if (viewer?.id) {
    await db.upsertUser(viewer).catch((error) => {
      console.warn('Gagal memperbarui user marketplace:', error.message || error);
    });
    wallet = await db.getWalletSummary(Number(viewer.id), 1).catch((error) => {
      console.warn('Saldo marketplace belum tersedia:', error.message || error);
      return null;
    });
  }
  const flashPromoCodes = parseFlashSalePromoCodes(settings.flash_sale_promo_codes);
  const flashPromoCodeSet = new Set(flashPromoCodes);
  const flashWindow = db.flashSaleWindowState(settings);
  const activePromos = promos.filter((promo) => {
    const code = String(promo.code || '').trim().toUpperCase();
    return !flashPromoCodeSet.has(code) || flashWindow.active;
  });
  const flashPromos = flashWindow.active
    ? promos.filter((promo) => flashPromoCodeSet.has(String(promo.code || '').trim().toUpperCase()))
    : [];
  const publicProducts = products
    .filter((product) => String(product.display_scope || 'both') !== 'telegram')
    .map((product) => sanitizeProduct(product, activePromos, flashPromos));

  const flashStartAt = String(settings.flash_sale_start_at || '').trim();
  const flashEndAt = String(settings.flash_sale_end_at || '').trim();
  const flashEnabled = String(settings.flash_sale_enabled || '').toLowerCase() === 'true';
  const flashStartTime = flashStartAt ? new Date(flashStartAt).getTime() : NaN;
  const flashEndTime = flashEndAt ? new Date(flashEndAt).getTime() : NaN;
  if (flashEnabled && Number.isFinite(flashStartTime) && Number.isFinite(flashEndTime)) {
    const rangeEnd = new Date(Math.min(Date.now(), flashEndTime)).toISOString();
    const flashTransactions = await db.listTransactionsInRange(new Date(flashStartTime).toISOString(), rangeEnd).catch(() => []);
    const soldByProduct = new Map();
    const soldByVariant = new Map();
    for (const trx of flashTransactions) {
      const productCode = String(trx.product_code || '').trim().toUpperCase();
      const variantKey = String(trx.variant_key || '').trim().toUpperCase();
      const qty = Math.max(0, Number(trx.quantity || 0));
      soldByProduct.set(productCode, (soldByProduct.get(productCode) || 0) + qty);
      if (variantKey) {
        const key = `${productCode}::${variantKey}`;
        soldByVariant.set(key, (soldByVariant.get(key) || 0) + qty);
      }
    }
    publicProducts.forEach((product) => {
      const productCode = String(product.code || '').trim().toUpperCase();
      product.flash_sale_sold = soldByProduct.get(productCode) || 0;
      (product.variants || []).forEach((variant) => {
        const variantKey = String(variant.key || '').trim().toUpperCase();
        variant.flash_sale_sold = soldByVariant.get(`${productCode}::${variantKey}`) || 0;
      });
    });
  }

  const categories = [...new Set(publicProducts.map((product) => product.category || 'Lainnya'))].sort((a, b) => a.localeCompare(b, 'id'));
  const bannerItems = parseBannerItems(settings.banner_items || settings.banner_urls || settings.banner_url);
  const bannerUrls = bannerItems.filter((item) => item.type === 'image' && item.url).map((item) => item.url);
  const bannerIntervalSeconds = Math.max(3, Math.min(15, Number(settings.banner_interval_seconds || 5)));
  return {
    settings: {
      store_name: settings.store_name || config.botName || 'iLink.in Store',
      store_description: settings.store_description || 'Produk digital otomatis, cepat, dan praktis.',
      logo_url: normalizePublicImageUrl(settings.logo_url),
      banner_url: bannerUrls[0] || '',
      banner_urls: bannerUrls,
      banner_items: bannerItems,
      banner_interval_ms: bannerIntervalSeconds * 1000,
      flash_sale_enabled: flashEnabled,
      flash_sale_title: String(settings.flash_sale_title || 'FLASH SALE').trim() || 'FLASH SALE',
      flash_sale_start_at: flashStartAt,
      flash_sale_end_at: flashEndAt,
      flash_sale_promo_codes: flashPromoCodes,
      flash_sale_product_codes: parseFlashSaleProductCodes(settings.flash_sale_products),
      customer_service_link: settings.customer_service_link || config.customerService || '',
      group_link: settings.group_link || config.channelStore || '',
      bot_menu_mode: ['marketplace', 'products', 'both'].includes(String(settings.bot_menu_mode || '').toLowerCase())
        ? String(settings.bot_menu_mode).toLowerCase()
        : 'both',
      wallet_payment_enabled: String(settings.wallet_payment_enabled ?? 'true').toLowerCase() !== 'false'
    },
    bot_username: String(config.botUsername || '').replace(/^@/, ''),
    products: publicProducts,
    categories,
    viewer: viewer ? {
      telegram_ready: true,
      id: Number(viewer.id),
      first_name: viewer.first_name || '',
      username: viewer.username || '',
      is_owner: Number(viewer.id) === Number(config.ownerId),
      wallet_ready: Boolean(wallet),
      wallet: wallet ? {
        balance_main: Number(wallet.balance_main || 0),
        balance_referral: Number(wallet.balance_referral || 0),
        balance_total: Number(wallet.balance_total || 0)
      } : {
        balance_main: 0,
        balance_referral: 0,
        balance_total: 0
      }
    } : {
      telegram_ready: false,
      is_owner: false,
      wallet_ready: false,
      wallet: { balance_main: 0, balance_referral: 0, balance_total: 0 }
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
    await db.deletePendingOrder(telegramId, current.invoice_ref);
    return;
  }
  if (current.status === 'awaiting_payment' && current.invoice_ref) {
    throw httpError(
      'Masih ada pembayaran aktif. Selesaikan atau batalkan pesanan tersebut terlebih dahulu.',
      409,
      'ACTIVE_ORDER',
      { invoice: current.invoice_ref, invoice_display: paymentService.displayPaymentReference(current.invoice_ref), expires_at: current.expires_at }
    );
  }
}

async function prepareCheckout({ user, productCode, variantKey, quantity, voucherCode, skipActiveOrderCheck = false }) {
  if (!user?.id) throw httpError('Buka toko melalui Telegram agar identitas pembeli dapat diverifikasi.', 401, 'TELEGRAM_REQUIRED');

  const qty = Math.max(1, Math.min(100, Number(quantity || 1)));
  const code = String(productCode || '').trim().toUpperCase();
  if (!code) throw httpError('Produk belum dipilih.', 400, 'PRODUCT_REQUIRED');

  if (!skipActiveOrderCheck) await ensureNoActiveOrder(Number(user.id));
  const product = await db.getProductByCode(code);
  if (!product || product.active === false) throw httpError('Produk tidak tersedia.', 404, 'PRODUCT_NOT_FOUND');

  const selected = selectedProductVariant(product, variantKey);
  const deliveryMode = db.variantDeliveryMode(product, selected.variant);
  const isPo = deliveryMode === 'po';
  const availableStock = selected.variant
    ? variantStock(selected.variant)
    : (Array.isArray(product.data) ? product.data.length : 0);
  if (!isPo && availableStock < qty) {
    throw httpError(`Stok tidak mencukupi. Stok tersedia: ${availableStock}.`, 409, 'INSUFFICIENT_STOCK', { available_stock: availableStock });
  }

  const draftOrder = {
    telegram_id: Number(user.id),
    product_code: product.kode,
    variant_key: selected.key,
    variant_name: selected.variant?.name || '',
    unit_price: Number(selected.variant?.price || product.harga || 0),
    quantity: qty,
    delivery_mode: deliveryMode,
    status: 'draft'
  };
  const unitPrice = db.orderUnitPrice(product, draftOrder);
  const costUnit = db.orderUnitCost(product, draftOrder);
  const costTotal = costUnit * qty;
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
  const appliedCode = promoApplied ? `AUTO_PROMO:${promoApplied.code}` : (voucherApplied?.code || '');
  return {
    user,
    product,
    selected,
    qty,
    draftOrder,
    unitPrice,
    costUnit,
    costTotal,
    subtotal,
    voucherApplied,
    promoApplied,
    discount,
    afterDiscount,
    appliedCode,
    deliveryMode
  };
}

async function previewCheckout({ user, productCode, variantKey, quantity, voucherCode }) {
  const checkout = await prepareCheckout({
    user, productCode, variantKey, quantity, voucherCode, skipActiveOrderCheck: true
  });
  return {
    product: checkout.product.nama,
    product_code: checkout.product.kode,
    variant: checkout.selected.variant?.name || '',
    variant_key: checkout.selected.key || '',
    quantity: checkout.qty,
    unit_price: checkout.unitPrice,
    subtotal: checkout.subtotal,
    discount: checkout.discount,
    discount_label: discountLabelForCheckout(checkout),
    after_discount: checkout.afterDiscount,
    voucher_code: checkout.voucherApplied?.code || '',
    promo_code: checkout.promoApplied?.code || '',
    delivery_mode: checkout.deliveryMode
  };
}

function discountLabelForCheckout(checkout) {
  return checkout.voucherApplied
    ? `Voucher ${checkout.voucherApplied.code}`
    : (checkout.promoApplied ? `Promo ${checkout.promoApplied.name || checkout.promoApplied.code}` : '');
}

async function createPayment({ user, productCode, variantKey, quantity, voucherCode }) {
  if (!paymentService.paymentConfigured()) {
    throw httpError(`Konfigurasi pembayaran ${paymentService.paymentProviderLabel()} belum lengkap.`, 503, 'PAYMENT_NOT_CONFIGURED');
  }

  const checkout = await prepareCheckout({ user, productCode, variantKey, quantity, voucherCode });
  const {
    product, selected, qty, draftOrder, unitPrice, costUnit, costTotal,
    subtotal, discount, afterDiscount, appliedCode, deliveryMode
  } = checkout;
  const fee = randomFee();
  const total = afterDiscount + fee;
  const checkoutKey = `checkout_rate:${Number(user.id)}`;
  const checkoutClaimed = await db.claimOnce(checkoutKey, 30, { telegram_id: Number(user.id), method: 'qris' }, { failClosed: true });
  if (!checkoutClaimed) {
    throw httpError('Permintaan checkout sedang diproses. Tunggu beberapa detik lalu coba lagi.', 429, 'CHECKOUT_BUSY');
  }

  const requestedInvoice = randomRef();
  let gatewayPayment;
  try {
    gatewayPayment = await paymentService.createPaymentTransaction({ amount: total, invoiceRef: requestedInvoice });
  } catch (error) {
    await db.releaseClaim(checkoutKey).catch(() => null);
    throw httpError(error.message || 'Payment gateway gagal membuat QRIS.', 502, 'QR_NOT_RECEIVED');
  }
  const invoice = gatewayPayment.order_id || requestedInvoice;
  const expiresAt = gatewayPayment.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const qrText = gatewayPayment.qr_string;

  try {
    await db.upsertUser(user);
    await db.upsertPendingOrder({
      ...draftOrder,
      cost_unit: costUnit,
      cost_total: costTotal,
      cost_source: costUnit > 0 ? 'snapshot' : 'unset',
      voucher_code: appliedCode,
      invoice_ref: invoice,
      amount: total,
      fee,
      status: 'awaiting_payment',
      expires_at: expiresAt,
      qr_payload: qrText,
      payment_method: 'gateway',
      payment_provider: gatewayPayment.provider,
      provider_transaction_id: gatewayPayment.transaction_id,
      provider_checkout_url: gatewayPayment.checkout_url
    });
  } finally {
    await db.releaseClaim(checkoutKey).catch(() => null);
  }

  const watcher_scheduled = paymentService.schedulePaymentWatcher({
    invoiceRef: invoice,
    telegramId: Number(user.id)
  });
  const qr_data_url = await QRCode.toDataURL(qrText, { width: 640, margin: 2, errorCorrectionLevel: 'M' });

  return {
    payment_method: 'qris',
    status: 'pending',
    invoice,
    invoice_display: paymentService.displayPaymentReference(invoice),
    product: product.nama,
    product_code: product.kode,
    variant: selected.variant?.name || '',
    quantity: qty,
    unit_price: unitPrice,
    subtotal,
    discount,
    discount_label: discountLabelForCheckout(checkout),
    after_discount: afterDiscount,
    fee,
    total,
    expires_at: expiresAt,
    qr_data_url,
    qr_download_token: qrTokenSecret() ? issueQrDownloadToken(invoice, Number(user.id), expiresAt) : '',
    checkout_url: gatewayPayment.checkout_url || '',
    payment_provider: gatewayPayment.provider,
    watcher_scheduled,
    delivery_mode: deliveryMode
  };
}

async function createWalletPayment({ user, productCode, variantKey, quantity, voucherCode }) {
  const settings = await db.getShopSettings();
  if (String(settings.wallet_payment_enabled ?? 'true').toLowerCase() === 'false') {
    throw httpError('Pembayaran dengan saldo sedang dinonaktifkan.', 409, 'WALLET_PAYMENT_DISABLED');
  }

  await db.upsertUser(user);
  const checkout = await prepareCheckout({ user, productCode, variantKey, quantity, voucherCode });
  const {
    product, selected, qty, draftOrder, unitPrice, costUnit, costTotal,
    subtotal, discount, afterDiscount, appliedCode, deliveryMode
  } = checkout;
  const walletBefore = await db.getWalletSummary(Number(user.id), 1);
  if (!walletBefore) throw httpError('Data saldo belum tersedia. Jalankan SQL v65 lalu buka bot kembali.', 503, 'WALLET_NOT_READY');
  if (Number(walletBefore.balance_total || 0) < afterDiscount) {
    throw httpError(
      `Saldo tidak mencukupi. Kekurangan ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(afterDiscount - Number(walletBefore.balance_total || 0))}.`,
      409,
      'INSUFFICIENT_WALLET_BALANCE',
      { required: afterDiscount, available: Number(walletBefore.balance_total || 0) }
    );
  }

  const checkoutKey = `checkout_rate:${Number(user.id)}`;
  const checkoutClaimed = await db.claimOnce(checkoutKey, 30, { telegram_id: Number(user.id), method: 'wallet' }, { failClosed: true });
  if (!checkoutClaimed) {
    throw httpError('Permintaan checkout sedang diproses. Tunggu beberapa detik lalu coba lagi.', 429, 'CHECKOUT_BUSY');
  }

  const invoice = `WALLET-${randomRef()}`;
  let savedOrder = null;
  try {
    savedOrder = await db.upsertPendingOrder({
      ...draftOrder,
      cost_unit: costUnit,
      cost_total: costTotal,
      cost_source: costUnit > 0 ? 'snapshot' : 'unset',
      voucher_code: appliedCode,
      invoice_ref: invoice,
      amount: afterDiscount,
      fee: 0,
      status: 'processing',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      qr_payload: '',
      payment_method: 'wallet',
      payment_provider: 'wallet',
      provider_transaction_id: '',
      provider_checkout_url: ''
    });
    const result = await paymentService.fulfillPaidOrder({ order: savedOrder, buyer: user, source: 'wallet-marketplace' });
    const walletAfter = await db.getWalletSummary(Number(user.id), 1).catch(() => null);
    const transaction = result.transaction || {};
    return {
      payment_method: 'wallet',
      status: result.po_waiting ? 'awaiting_delivery' : 'completed',
      delivery_mode: result.po_waiting ? 'po' : deliveryMode,
      invoice,
      invoice_display: paymentService.displayPaymentReference(invoice),
      product: transaction.product_name || product.nama,
      product_code: transaction.product_code || product.kode,
      variant: transaction.variant_name || selected.variant?.name || '',
      quantity: Number(transaction.quantity || qty),
      unit_price: unitPrice,
      subtotal,
      discount,
      discount_label: discountLabelForCheckout(checkout),
      after_discount: afterDiscount,
      fee: 0,
      total: Number(transaction.total_price || afterDiscount),
      wallet_main_used: Number(transaction.wallet_main_used || result.wallet?.main_used || 0),
      wallet_referral_used: Number(transaction.wallet_referral_used || result.wallet?.referral_used || 0),
      wallet: walletAfter ? {
        balance_main: Number(walletAfter.balance_main || 0),
        balance_referral: Number(walletAfter.balance_referral || 0),
        balance_total: Number(walletAfter.balance_total || 0)
      } : null,
      completed_at: transaction.created_at || new Date().toISOString()
    };
  } catch (error) {
    if (savedOrder) await db.deletePendingOrder(Number(user.id), invoice).catch(() => null);
    throw error;
  } finally {
    await db.releaseClaim(checkoutKey).catch(() => null);
  }
}

async function createQrDownloadToken(user, invoice) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const ref = String(invoice || '').trim();
  if (!ref) throw httpError('Invoice wajib diisi.', 400, 'INVOICE_REQUIRED');
  const order = await db.getPendingOrderByInvoice(ref);
  if (!order) throw httpError('Invoice QRIS tidak ditemukan atau sudah selesai.', 404, 'QR_NOT_FOUND');
  if (Number(order.telegram_id) !== Number(user.id)) throw httpError('Invoice bukan milik akun ini.', 403, 'FORBIDDEN');
  return issueQrDownloadToken(ref, Number(user.id), order.expires_at);
}

async function getQrDownloadByToken(token) {
  const auth = verifyQrDownloadToken(token);
  if (!auth) throw httpError('Token unduhan QRIS tidak valid atau sudah kedaluwarsa.', 401, 'QR_TOKEN_INVALID');
  const order = await db.getPendingOrderByInvoice(auth.invoice);
  if (!order) throw httpError('Invoice QRIS tidak ditemukan atau sudah selesai.', 404, 'QR_NOT_FOUND');
  if (Number(order.telegram_id) !== Number(auth.telegramId)) throw httpError('Token bukan milik invoice ini.', 403, 'FORBIDDEN');
  if (!String(order.qr_payload || '').trim()) throw httpError('Data QRIS belum tersedia.', 409, 'QR_PAYLOAD_MISSING');
  const buffer = await QRCode.toBuffer(String(order.qr_payload), { type: 'png', width: 900, margin: 2, errorCorrectionLevel: 'M' });
  const displayRef = paymentService.displayPaymentReference(auth.invoice);
  return { buffer, filename: `QRIS-${displayRef.replace(/[^A-Z0-9_-]/gi, '-')}.png` };
}

async function getQrDownload(user, invoice) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const ref = String(invoice || '').trim();
  if (!ref) throw httpError('Invoice wajib diisi.', 400, 'INVOICE_REQUIRED');
  const order = await db.getPendingOrderByInvoice(ref);
  if (!order) throw httpError('Invoice QRIS tidak ditemukan atau sudah selesai.', 404, 'QR_NOT_FOUND');
  if (Number(order.telegram_id) !== Number(user.id)) throw httpError('Invoice bukan milik akun ini.', 403, 'FORBIDDEN');
  if (!String(order.qr_payload || '').trim()) throw httpError('Data QRIS belum tersedia. Buat invoice baru setelah update v52.', 409, 'QR_PAYLOAD_MISSING');
  const buffer = await QRCode.toBuffer(String(order.qr_payload), { type: 'png', width: 900, margin: 2, errorCorrectionLevel: 'M' });
  const displayRef = paymentService.displayPaymentReference(ref);
  return { buffer, filename: `QRIS-${displayRef.replace(/[^A-Z0-9_-]/gi, '-')}.png` };
}

async function getOrderStatus(user, invoice) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const ref = String(invoice || '').trim();
  if (!ref) throw httpError('Invoice wajib diisi.', 400, 'INVOICE_REQUIRED');

  const transaction = await db.getTransactionByOrderRef(ref);
  if (transaction) {
    if (Number(transaction.telegram_id) !== Number(user.id)) throw httpError('Invoice bukan milik akun ini.', 403, 'FORBIDDEN');
    const waitingDelivery = String(transaction.delivery_mode || 'auto') === 'po' && String(transaction.delivery_status || '') !== 'delivered';
    return {
      status: waitingDelivery ? 'awaiting_delivery' : 'completed',
      delivery_mode: String(transaction.delivery_mode || 'auto'),
      delivery_status: String(transaction.delivery_status || 'delivered'),
      invoice: ref,
      invoice_display: paymentService.displayPaymentReference(ref),
      product: transaction.product_name,
      variant: transaction.variant_name || '',
      quantity: Number(transaction.quantity || 1),
      total: Number(transaction.total_price || 0),
      completed_at: transaction.created_at,
      delivered_at: transaction.delivered_at || null
    };
  }

  const order = await db.getPendingOrderByInvoice(ref);
  if (!order) return { status: 'not_found', invoice: ref, invoice_display: paymentService.displayPaymentReference(ref) };
  if (Number(order.telegram_id) !== Number(user.id)) throw httpError('Invoice bukan milik akun ini.', 403, 'FORBIDDEN');
  const expired = order.expires_at && Date.now() > new Date(order.expires_at).getTime();
  if (!expired && String(order.status || '').toLowerCase() === 'awaiting_payment') {
    try {
      const verified = await paymentService.verifyPaymentTransaction(order);
      if (verified.status === 'completed') {
        const result = await paymentService.fulfillPaidOrder({ order, buyer: user, source: 'marketplace-status-check' });
        const completed = result.transaction || await db.getTransactionByOrderRef(ref).catch(() => null);
        const waitingDelivery = String(completed?.delivery_mode || '') === 'po' && String(completed?.delivery_status || '') !== 'delivered';
        return {
          status: waitingDelivery ? 'awaiting_delivery' : 'completed',
          delivery_mode: completed?.delivery_mode || (result.po_waiting ? 'po' : 'auto'),
          delivery_status: completed?.delivery_status || (result.po_waiting ? 'waiting_delivery' : 'delivered'),
          invoice: ref,
          invoice_display: paymentService.displayPaymentReference(ref),
          product: completed?.product_name || order.product_code,
          variant: completed?.variant_name || order.variant_name || '',
          quantity: Number(completed?.quantity || order.quantity || 1),
          total: Number(completed?.total_price || order.amount || 0),
          completed_at: completed?.created_at || new Date().toISOString()
        };
      }
      if (['expired', 'cancelled', 'failed'].includes(verified.status)) {
        return { status: verified.status, invoice: ref, invoice_display: paymentService.displayPaymentReference(ref), amount: Number(order.amount || 0), expires_at: order.expires_at || null };
      }
    } catch (error) {
      console.warn(`Pengecekan payment gateway ${ref} gagal:`, error.message || error);
    }
  }
  return {
    status: expired ? 'expired' : String(order.status || 'pending'),
    invoice: ref,
    invoice_display: paymentService.displayPaymentReference(ref),
    amount: Number(order.amount || 0),
    expires_at: order.expires_at || null
  };
}

async function cancelOrder(user, invoice) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const ref = String(invoice || '').trim();
  const transaction = ref ? await db.getTransactionByOrderRef(ref) : null;
  if (transaction) throw httpError('Pesanan sudah dibayar dan tidak dapat dibatalkan.', 409, 'ORDER_COMPLETED');
  const order = ref ? await db.getPendingOrderByInvoice(ref) : await db.getPendingOrder(Number(user.id));
  if (!order) return { cancelled: false, status: 'not_found' };
  if (Number(order.telegram_id) !== Number(user.id)) throw httpError('Pesanan bukan milik akun ini.', 403, 'FORBIDDEN');
  await paymentService.cancelPaymentTransaction(order).catch((error) => {
    console.warn('Gagal membatalkan transaksi di payment gateway:', error.message || error);
  });
  await db.deletePendingOrder(Number(user.id), order.invoice_ref);
  return { cancelled: true, invoice: order.invoice_ref || ref, invoice_display: paymentService.displayPaymentReference(order.invoice_ref || ref) };
}

async function getHistory(user, limit = 20) {
  if (!user?.id) throw httpError('Sesi Telegram tidak ditemukan.', 401, 'TELEGRAM_REQUIRED');
  const rows = await db.listTransactionsByUser(Number(user.id), Math.max(1, Math.min(50, Number(limit || 20))));
  return rows.map((row) => ({
    invoice: row.order_ref,
    invoice_display: paymentService.displayPaymentReference(row.order_ref),
    product: row.product_name,
    variant: row.variant_name || '',
    quantity: Number(row.quantity || 1),
    total: Number(row.total_price || 0),
    created_at: row.created_at,
    status: String(row.status || 'completed').toLowerCase() === 'canceled' ? 'canceled' : 'completed',
    delivery_mode: String(row.delivery_mode || 'auto'),
    delivery_status: String(row.delivery_status || 'delivered')
  }));
}

module.exports = {
  normalizePublicImageUrl,
  parseBannerUrls,
  parseBannerItems,
  parseFlashSaleProductCodes,
  parseFlashSalePromoCodes,
  sanitizeProduct,
  getCatalog,
  previewCheckout,
  createPayment,
  createWalletPayment,
  createQrDownloadToken,
  getQrDownloadByToken,
  getQrDownload,
  getOrderStatus,
  cancelOrder,
  getHistory,
  httpError,
  issueQrDownloadToken,
  verifyQrDownloadToken
};
