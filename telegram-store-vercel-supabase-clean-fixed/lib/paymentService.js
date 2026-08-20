const axios = require('axios');
const { config } = require('./config');
const db = require('./db');
const tg = require('./telegram');
const walletNotifications = require('./walletNotifications');
const prodseller = require('./prodsellerService');
const telegramSupplier = require('./telegramSupplierService');
function telegramOnDemand() { return require('./telegramOnDemandService'); }
const { formatRupiah, formatWIB } = require('./utils');

function getVercelWaitUntil() {
  const symbol = Symbol.for('@vercel/request-context');
  const context = globalThis?.[symbol]?.get?.() || {};
  return typeof context.waitUntil === 'function' ? context.waitUntil.bind(context) : null;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizedText(value) {
  return String(value == null ? '' : value).trim();
}

function displayPaymentReference(value) {
  const original = normalizedText(value);
  const cleaned = original.replace(/^AUTOGOPAY(?:[-_: ]+)?/i, '');
  return cleaned || original || '-';
}

function sameProject(left, right) {
  return normalizedText(left).toLowerCase() === normalizedText(right).toLowerCase();
}

function normalizePaymentStatus(value) {
  const status = normalizedText(value).toLowerCase();
  if (['settlement', 'completed', 'complete', 'paid', 'success', 'successful'].includes(status)) return 'completed';
  if (['expire', 'expired'].includes(status)) return 'expired';
  if (['cancel', 'cancelled', 'canceled'].includes(status)) return 'cancelled';
  if (['failed', 'failure', 'deny', 'denied'].includes(status)) return 'failed';
  return status || 'pending';
}

function paymentProviderForOrder(order = {}) {
  const value = normalizedText(order.payment_provider || config.paymentProvider || 'pakasir').toLowerCase();
  return value === 'autogopay' ? 'autogopay' : 'pakasir';
}

function paymentProviderLabel(order = {}) {
  return paymentProviderForOrder(order) === 'autogopay' ? 'AutoGoPay' : 'Pakasir';
}

function paymentConfigured(provider = config.paymentProvider) {
  const selected = normalizedText(provider).toLowerCase();
  if (selected === 'autogopay') return Boolean(config.autogopayApiKey);
  return Boolean(config.pakasirSlug && config.pakasirApiKey);
}

function variantKey(variant, index = 0) {
  return String(variant?.sku || variant?.kode || variant?.key || variant?.name || variant?.nama || `VAR${index + 1}`)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

function selectedVariant(product, order = {}) {
  const key = String(order.variant_key || '').trim().toUpperCase();
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!key) return null;
  return variants.find((variant, index) => variantKey(variant, index) === key) || null;
}

function variantTerms(product, variant) {
  return String(variant?.snk || variant?.terms || product?.snk || '-');
}

function normalizePakasirTransaction(payload = {}) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const data = root?.data && typeof root.data === 'object' ? root.data : null;
  const trx = root?.transaction || root?.payment || data?.transaction || data?.payment || data || root || {};
  return {
    amount: Number(trx.amount || trx.total || trx.nominal || 0),
    order_id: normalizedText(trx.order_id || trx.orderId || trx.invoice || trx.reference),
    project: normalizedText(trx.project || trx.project_slug || trx.slug),
    status: normalizePaymentStatus(trx.status || trx.payment_status || trx.state),
    payment_method: normalizedText(trx.payment_method || trx.method || trx.channel),
    completed_at: trx.completed_at || trx.paid_at || null
  };
}

function normalizeAutoGopayTransaction(payload = {}) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const data = root?.data && typeof root.data === 'object' ? root.data : null;
  const trx = root?.transaction || data?.transaction || data || root || {};
  const rawStatus = trx.transaction_status || trx.status || trx.payment_status || trx.state || root.status;
  return {
    provider: 'autogopay',
    transaction_id: normalizedText(trx.transaction_id || trx.transactionId || trx.id || root.transaction_id),
    order_id: normalizedText(trx.order_id || trx.orderId || trx.invoice || trx.reference || root.order_id),
    amount: Number(trx.amount || trx.total || trx.nominal || root.amount || 0),
    status: normalizePaymentStatus(rawStatus),
    raw_status: normalizedText(rawStatus).toLowerCase(),
    payment_method: normalizedText(trx.payment_type || trx.payment_method || trx.method || 'qris'),
    issuer: normalizedText(trx.issuer || ''),
    completed_at: trx.completed_at || trx.paid_at || trx.time || null,
    qr_string: normalizedText(trx.qr_string || ''),
    qr_url: normalizedText(trx.qr_url || ''),
    checkout_url: normalizedText(trx.checkout_url || ''),
    expiry_time: trx.expiry_time || trx.expires_at || null
  };
}

function validateWebhookPayload(payload = {}, expectedProject = config.pakasirSlug) {
  const trx = normalizePakasirTransaction(payload);
  if (!trx.order_id) return { ok: false, reason: 'order_id kosong', transaction: trx };
  if (!Number.isFinite(trx.amount) || trx.amount <= 0) return { ok: false, reason: 'amount tidak valid', transaction: trx };
  if (expectedProject && !sameProject(trx.project, expectedProject)) {
    return { ok: false, reason: 'project tidak cocok', transaction: trx };
  }
  return { ok: true, transaction: trx };
}

function validateAutoGopayWebhookPayload(payload = {}) {
  const event = normalizedText(payload?.event || payload?.type).toLowerCase();
  const trx = normalizeAutoGopayTransaction(payload);
  if (event && event !== 'transaction.received') {
    return { ok: false, reason: 'event tidak didukung', transaction: trx };
  }
  if (!trx.transaction_id) return { ok: false, reason: 'transaction_id kosong', transaction: trx };
  if (!Number.isFinite(trx.amount) || trx.amount <= 0) return { ok: false, reason: 'amount tidak valid', transaction: trx };
  return { ok: true, transaction: trx };
}

function paymentMatchesOrder(transaction, order) {
  return Boolean(
    transaction &&
    order &&
    normalizedText(transaction.order_id) === normalizedText(order.invoice_ref) &&
    Number(transaction.amount) === Number(order.amount || 0) &&
    (!config.pakasirSlug || sameProject(transaction.project, config.pakasirSlug))
  );
}

function parseWibDate(value, fallbackMinutes = 15) {
  const text = normalizedText(value);
  if (!text) return new Date(Date.now() + fallbackMinutes * 60 * 1000).toISOString();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) {
    const parsed = new Date(text.replace(' ', 'T') + '+07:00');
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(Date.now() + fallbackMinutes * 60 * 1000).toISOString();
}

function autogopayHeaders() {
  return {
    Authorization: `Bearer ${config.autogopayApiKey}`,
    'Content-Type': 'application/json'
  };
}

async function createPaymentTransaction({ amount, invoiceRef } = {}) {
  const total = Number(amount || 0);
  if (!Number.isFinite(total) || total < 1 || total > 10000000) {
    throw new Error('Nominal pembayaran harus antara Rp1 sampai Rp10.000.000.');
  }

  if (normalizedText(config.paymentProvider).toLowerCase() === 'autogopay') {
    if (!config.autogopayApiKey) throw new Error('AUTOGOPAY_API_KEY belum diatur.');
    const response = await axios.post(
      `${config.autogopayBaseUrl}/qris/generate`,
      { amount: total },
      { headers: autogopayHeaders(), timeout: 20000 }
    );
    if (response.data?.success === false) throw new Error(response.data?.message || 'AutoGoPay gagal membuat QRIS.');
    const transaction = normalizeAutoGopayTransaction(response.data || {});
    if (!transaction.transaction_id || !transaction.order_id || !transaction.qr_string) {
      throw new Error('Response AutoGoPay tidak lengkap: transaction_id, order_id, atau qr_string tidak tersedia.');
    }
    return {
      provider: 'autogopay',
      transaction_id: transaction.transaction_id,
      order_id: transaction.order_id,
      amount: transaction.amount || total,
      status: transaction.status,
      qr_string: transaction.qr_string,
      qr_url: transaction.qr_url,
      checkout_url: transaction.checkout_url,
      expires_at: parseWibDate(transaction.expiry_time, 15)
    };
  }

  if (!config.pakasirSlug || !config.pakasirApiKey) throw new Error('Konfigurasi Pakasir belum lengkap.');
  const orderId = normalizedText(invoiceRef);
  if (!orderId) throw new Error('Invoice Pakasir belum dibuat.');
  const response = await axios.post('https://app.pakasir.com/api/transactioncreate/qris', {
    project: config.pakasirSlug,
    order_id: orderId,
    amount: total,
    api_key: config.pakasirApiKey
  }, { timeout: 20000 });
  const qrText = response.data?.payment?.payment_number || response.data?.payment_number || response.data?.qr_string;
  if (!qrText) throw new Error('Pakasir tidak mengirim QR pembayaran.');
  return {
    provider: 'pakasir',
    transaction_id: '',
    order_id: orderId,
    amount: total,
    status: 'pending',
    qr_string: qrText,
    qr_url: '',
    checkout_url: '',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };
}

async function verifyPakasirTransaction(order) {
  if (!order?.invoice_ref) throw new Error('Invoice pembayaran tidak ditemukan.');
  if (!config.pakasirSlug || !config.pakasirApiKey) throw new Error('Konfigurasi Pakasir belum lengkap.');

  const detail = await axios.get('https://app.pakasir.com/api/transactiondetail', {
    timeout: 15000,
    params: {
      project: config.pakasirSlug,
      amount: Number(order.amount || 0),
      order_id: order.invoice_ref,
      api_key: config.pakasirApiKey
    }
  });
  const transaction = normalizePakasirTransaction(detail.data || {});
  if (!paymentMatchesOrder(transaction, order)) {
    throw new Error('Detail transaksi Pakasir tidak cocok dengan invoice lokal.');
  }
  return transaction;
}

async function verifyAutoGopayTransaction(order) {
  const transactionId = normalizedText(order?.provider_transaction_id);
  if (!transactionId) throw new Error('ID transaksi AutoGoPay tidak ditemukan pada pesanan. Jalankan SQL update v55 dan buat invoice baru.');
  if (!config.autogopayApiKey) throw new Error('AUTOGOPAY_API_KEY belum diatur.');

  const response = await axios.post(
    `${config.autogopayBaseUrl}/qris/status`,
    { transaction_id: transactionId },
    { headers: autogopayHeaders(), timeout: 15000 }
  );
  if (response.data?.success === false) throw new Error(response.data?.message || 'Gagal memeriksa transaksi AutoGoPay.');
  const transaction = normalizeAutoGopayTransaction(response.data || {});
  if (transaction.transaction_id && transaction.transaction_id !== transactionId) {
    throw new Error('ID transaksi AutoGoPay tidak cocok dengan invoice lokal.');
  }
  if (transaction.order_id && order.invoice_ref && transaction.order_id !== order.invoice_ref) {
    throw new Error('Order ID AutoGoPay tidak cocok dengan invoice lokal.');
  }
  if (transaction.amount > 0 && Number(transaction.amount) !== Number(order.amount || 0)) {
    throw new Error('Nominal transaksi AutoGoPay tidak cocok dengan invoice lokal.');
  }
  return {
    ...transaction,
    transaction_id: transaction.transaction_id || transactionId,
    order_id: transaction.order_id || order.invoice_ref,
    amount: transaction.amount || Number(order.amount || 0)
  };
}

async function verifyPaymentTransaction(order) {
  return paymentProviderForOrder(order) === 'autogopay'
    ? verifyAutoGopayTransaction(order)
    : verifyPakasirTransaction(order);
}

async function cancelPaymentTransaction(order) {
  if (!order) return { ok: false, state: 'not_found' };
  if (paymentProviderForOrder(order) !== 'autogopay') return { ok: true, state: 'local_cancel_only' };
  const transactionId = normalizedText(order.provider_transaction_id);
  if (!transactionId || !config.autogopayApiKey) return { ok: true, state: 'local_cancel_only' };
  try {
    const response = await axios.post(
      `${config.autogopayBaseUrl}/qris/cancel`,
      { transaction_id: transactionId },
      { headers: autogopayHeaders(), timeout: 15000 }
    );
    return { ok: response.data?.success !== false, state: 'cancelled', data: response.data };
  } catch (error) {
    const status = Number(error.response?.status || 0);
    if (status === 404 || status === 409) return { ok: true, state: 'already_closed' };
    throw error;
  }
}

function deliveredFromTransaction(transaction) {
  if (Array.isArray(transaction?.delivered_items)) return transaction.delivered_items.map(String);
  return String(transaction?.delivered_text || '').split('\n').map((x) => x.trim()).filter(Boolean);
}

function receiptContext(order, product, transaction, delivered) {
  const quantity = Number(transaction?.quantity || order?.quantity || 1);
  const total = Number(transaction?.total_price || order?.amount || 0);
  const fee = Number(order?.fee || 0);
  const subtotal = Math.max(0, total - fee);
  return {
    invoice: displayPaymentReference(transaction?.order_ref || order?.invoice_ref || '-'),
    productName: transaction?.product_name || product?.nama || order?.product_code || '-',
    productCode: transaction?.product_code || product?.kode || order?.product_code || '',
    variantName: transaction?.variant_name || order?.variant_name || '',
    variantKey: transaction?.variant_key || order?.variant_key || '',
    quantity,
    total,
    fee,
    subtotal,
    paymentMethod: String(transaction?.payment_method || order?.payment_method || 'gateway').toLowerCase(),
    walletMainUsed: Number(transaction?.wallet_main_used || 0),
    walletReferralUsed: Number(transaction?.wallet_referral_used || 0),
    delivered: Array.isArray(delivered) ? delivered : deliveredFromTransaction(transaction)
  };
}

async function sendOrderReceipt(userId, order, product, transaction, delivered) {
  const ctx = receiptContext(order, product, transaction, delivered);
  const variant = product ? selectedVariant(product, { variant_key: ctx.variantKey }) : null;
  const terms = variantTerms(product || {}, variant);
  const title = `${ctx.productName}${ctx.variantName ? ' - ' + ctx.variantName : ''}`;
  const rawProduct = ctx.delivered.join('\n').trim();
  const productForMessage = rawProduct.length > 2800
    ? rawProduct.slice(0, 2800) + '\n...\n(Data produk terlalu panjang. Hubungi admin jika data belum lengkap.)'
    : rawProduct;

  const text = `✅ <b>PEMBAYARAN BERHASIL</b>\n` +
    `=======================\n` +
    `Invoice: <b>${escapeHtml(ctx.invoice)}</b>\n` +
    `Produk: <b>${escapeHtml(title)}</b>\n` +
    `Harga: <b>${escapeHtml(formatRupiah(ctx.subtotal))}</b>\n` +
    `Jumlah Beli: <b>${escapeHtml(ctx.quantity)}</b>\n` +
    `Metode: <b>${ctx.paymentMethod === 'wallet' ? 'Saldo Bot' : escapeHtml(paymentProviderLabel(order))}</b>\n` +
    (ctx.walletMainUsed > 0 ? `Saldo Utama: <b>-${escapeHtml(formatRupiah(ctx.walletMainUsed))}</b>\n` : '') +
    (ctx.walletReferralUsed > 0 ? `Saldo Referral: <b>-${escapeHtml(formatRupiah(ctx.walletReferralUsed))}</b>\n` : '') +
    (ctx.fee > 0 ? `Fee: <b>${escapeHtml(formatRupiah(ctx.fee))}</b>\n` : '') +
    `Total Dibayar: <b>${escapeHtml(formatRupiah(ctx.total))}</b>\n` +
    `Tanggal: <b>${escapeHtml(formatWIB(new Date()))}</b>\n` +
    `=======================\n\n` +
    `<b>SYARAT & KETENTUAN</b>\n${escapeHtml(terms)}\n\n` +
    `<b>PRODUK YANG DIDAPAT</b>\n<pre>${escapeHtml(productForMessage || '-')}</pre>\n` +
    `Pembayaran terdeteksi otomatis dan produk sudah dikirim.`;

  return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
}


async function sendPoPaidNotice(userId, order, product, transaction) {
  const ctx = receiptContext(order, product, transaction, []);
  const title = `${ctx.productName}${ctx.variantName ? ' - ' + ctx.variantName : ''}`;
  const text = `✅ <b>PEMBAYARAN BERHASIL</b>
` +
    `=======================
` +
    `Invoice: <b>${escapeHtml(ctx.invoice)}</b>
` +
    `Produk: <b>${escapeHtml(title)}</b>
` +
    `Jumlah Beli: <b>${escapeHtml(ctx.quantity)}</b>
` +
    `Total Dibayar: <b>${escapeHtml(formatRupiah(ctx.total))}</b>
` +
    `Tanggal: <b>${escapeHtml(formatWIB(new Date()))}</b>
` +
    `=======================`;
  return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
}

async function sendSupplierPendingNotice(userId) {
  const text = `⏳ <b>PRODUK SEDANG DIPROSES OTOMATIS</b>
` +
    `Pembayaran sudah diterima. Sistem sedang mengambil produk dari supplier. Produk akan dikirim ke chat ini setelah supplier berhasil mengirimkannya.`;
  return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
}

async function sendPoDeliveryReceipt(userId, poOrder, deliveryText, product = null) {
  const raw = String(deliveryText || '').trim();
  if (!raw) throw new Error('Data produk PO kosong.');
  const variant = product ? selectedVariant(product, { variant_key: poOrder?.variant_key || '' }) : null;
  const terms = String(poOrder?.terms_snapshot || variantTerms(product || {}, variant) || '-').trim() || '-';
  const termsBlock = `<b>SYARAT &amp; KETENTUAN</b>
${escapeHtml(terms)}

`;

  // Pesan pengiriman sengaja tidak mengulang header PO, invoice, produk, atau jumlah.
  // Pembeli menerima bagian penting saja: S&K dan data produk/akun.
  const inlineLimit = Math.max(500, 3900 - termsBlock.length);
  if (raw.length <= inlineLimit) {
    return tg.sendMessage(Number(userId),
      termsBlock + `<b>PRODUK / AKUN</b>
<pre>${escapeHtml(raw)}</pre>
Tekan lama/blok data produk di atas untuk menyalin. Simpan data dengan baik.`,
      { parse_mode: 'HTML' }
    );
  }

  const safeRef = String(displayPaymentReference(poOrder?.order_ref || 'ORDER')).replace(/[^a-z0-9_-]/gi, '-').slice(0, 50) || 'ORDER';
  const textFile = `SYARAT & KETENTUAN
${terms}

PRODUK / AKUN
${raw}
`;
  const captionTerms = terms.length > 520 ? `${terms.slice(0, 517)}...` : terms;
  const caption = `<b>SYARAT &amp; KETENTUAN</b>
${escapeHtml(captionTerms)}

Data produk panjang dikirim sebagai TXT agar utuh dan mudah disalin.`;
  return tg.sendDocument(Number(userId), `PRODUK-${safeRef}.txt`, textFile, {
    caption,
    parse_mode: 'HTML'
  });
}


async function sendOwnerPoWaitingLog(order, product, transaction, buyer = {}) {
  if (!config.channelLog) return;
  try {
    const username = buyer?.username ? '@' + buyer.username : (buyer?.first_name || String(order?.telegram_id || '-'));
    const productName = transaction?.product_name || product?.nama || order?.product_code || '-';
    const variantName = transaction?.variant_name || order?.variant_name || '';
    await tg.sendMessage(config.channelLog,
      `⏳ PO MENUNGGU PENGIRIMAN\n` +
      `=======================\n` +
      `User: ${username}\n` +
      `Trx ID: ${displayPaymentReference(transaction?.order_ref || order?.invoice_ref || '-')}\n` +
      `Produk: ${productName}${variantName ? ' - ' + variantName : ''}\n` +
      `Jumlah Beli: ${Number(transaction?.quantity || order?.quantity || 1)}\n` +
      `Total Harga: ${formatRupiah(transaction?.total_price || order?.amount || 0)}\n` +
      `Status: MENUNGGU SELLER MENGIRIM PRODUK\n` +
      `Tanggal: ${formatWIB(new Date())}`
    );
  } catch (error) {
    console.error('Gagal kirim log PO:', error.message || error);
  }
}

async function sendOwnerLog(order, product, transaction, buyer = {}) {
  if (!config.channelLog) return;
  try {
    const fee = Number(order?.fee || 0);
    const total = Number(transaction?.total_price || order?.amount || 0);
    const subtotal = Math.max(0, total - fee);
    const username = buyer?.username
      ? '@' + buyer.username
      : (buyer?.first_name || String(order?.telegram_id || '-'));
    const productName = transaction?.product_name || product?.nama || order?.product_code || '-';
    const variantName = transaction?.variant_name || order?.variant_name || '';
    await tg.sendMessage(config.channelLog,
      `✅ PESANAN SELESAI\n` +
      `=======================\n` +
      `User: ${username}\n` +
      `Trx ID: ${displayPaymentReference(transaction?.order_ref || order?.invoice_ref || '-')}\n` +
      `Produk: ${productName}${variantName ? ' - ' + variantName : ''}\n` +
      `Harga: ${formatRupiah(subtotal)}\n` +
      `Jumlah Beli: ${Number(transaction?.quantity || order?.quantity || 1)}\n` +
      `Fee: ${formatRupiah(fee)}\n` +
      `Total Harga: ${formatRupiah(total)}\n` +
      `Tanggal: ${formatWIB(new Date())}`
    );
  } catch (error) {
    console.error('Gagal kirim log pembayaran:', error.message);
  }
}


async function notifyFirstPurchaseReferral(inviteeId) {
  const info = await db.getReferralRewardForInvitee(inviteeId).catch(() => null);
  if (!info || info.mode !== 'first_purchase' || !info.telegram_id || info.amount <= 0) return;
  const key = `referral_notice:first_purchase:${Number(inviteeId)}`;
  const claimed = await db.claimOnce(key, 365 * 24 * 60 * 60, { invitee_id: Number(inviteeId) }, { failClosed: true }).catch(() => false);
  if (!claimed) return;
  try {
    const [wallet, referrer, invitee] = await Promise.all([
      db.getWalletSummary(info.telegram_id, 1).catch(() => null),
      db.getUserByTelegramId(info.telegram_id).catch(() => null),
      db.getUserByTelegramId(inviteeId).catch(() => null)
    ]);
    await tg.sendMessage(info.telegram_id,
      `🎁 <b>BONUS REFERRAL MASUK</b>
` +
      `=======================
` +
      `Pengguna yang kamu undang (${escapeHtml(info.invitee_name || String(inviteeId))}) telah menyelesaikan pembelian pertamanya.

` +
      `Bonus: <b>${escapeHtml(formatRupiah(info.amount))}</b>
` +
      `Saldo Referral: <b>${escapeHtml(formatRupiah(wallet?.balance_referral || 0))}</b>`,
      { parse_mode: 'HTML' }
    ).catch((error) => console.error('Gagal mengirim notifikasi referral ke user:', error.message || error));
    await walletNotifications.notifyReferralReward({
      referrer: referrer || { telegram_id: info.telegram_id },
      referrerId: info.telegram_id,
      invitee: invitee || { telegram_id: inviteeId, first_name: info.invitee_name },
      inviteeId,
      amount: info.amount,
      balanceReferral: wallet?.balance_referral || 0,
      mode: 'first_purchase'
    });
    await db.markClaimDone(key, { invitee_id: Number(inviteeId), notified: true }).catch(() => null);
  } catch (error) {
    await db.releaseClaim(key).catch(() => null);
    console.error('Gagal mengirim notifikasi referral:', error.message || error);
  }
}


function automaticSupplierSelection(product = {}, order = {}) {
  const variant = selectedVariant(product, order);
  const variantSource = String(variant?.supplier_source || '').trim().toLowerCase();
  const variantProductId = String(variant?.supplier_product_id || '').trim();
  if (['prodseller','telegram_userbot'].includes(variantSource) && variantProductId) return { source: variantSource, productId: variantProductId, variant };
  const source = String(product?.supplier_source || '').trim().toLowerCase();
  const productId = String(product?.supplier_product_id || '').trim();
  if (['prodseller','telegram_userbot'].includes(source) && productId) return { source, productId, variant: null };
  return null;
}

function prodSellerSelection(product = {}, order = {}) {
  const selected = automaticSupplierSelection(product, order);
  return selected?.source === 'prodseller' ? selected : null;
}

function isProdSellerProduct(product = {}, order = {}) {
  return Boolean(prodSellerSelection(product, order));
}

function isAutomaticSupplierProduct(product = {}, order = {}) {
  return Boolean(automaticSupplierSelection(product, order));
}

async function notifyOwnerSupplierIssue(order, product, error, supplierRow = null) {
  if (!config.channelLog) return;
  try {
    const ref = displayPaymentReference(order?.invoice_ref || order?.order_ref || '-');
    const selectedSupplier = automaticSupplierSelection(product, order);
    const supplierLabel = selectedSupplier?.source === 'telegram_userbot' ? 'Telegram Supplier' : 'ProdSeller';
    const text = `⚠️ ORDER SUPPLIER BELUM TERKIRIM\n` +
      `=======================\n` +
      `Invoice: ${ref}\n` +
      `Produk: ${product?.nama || product?.kode || '-'}\n` +
      `Supplier: ${supplierLabel}\n` +
      `Product ID: ${selectedSupplier?.productId || '-'}\n` +
      `Jumlah: ${Number(order?.quantity || 1)}\n` +
      `Status: ${supplierRow?.status || 'error'}\n` +
      `Keterangan: ${String(error?.message || error || 'Belum terkirim')}\n\n` +
      `Buka Reseller Dashboard → Supplier / Reseller untuk cek status lalu Retry Supplier jika aman.`;
    await tg.sendMessage(config.channelLog, text);
  } catch (notifyError) {
    console.error('Gagal kirim log supplier:', notifyError.message || notifyError);
  }
}


async function sendSupplierDeliveryOnce({ invoice, userId, poOrder, deliveryText, product }) {
  const noticeKey = `supplier_delivery_notice:${invoice}`;
  const claimed = await db.claimOnce(noticeKey, 365 * 24 * 60 * 60, { invoice, telegram_id: Number(userId || 0) }, { failClosed: true });
  if (!claimed) return false;
  try {
    await sendPoDeliveryReceipt(Number(userId), poOrder, deliveryText, product);
    await db.markClaimDone(noticeKey, { invoice, state: 'sent' }).catch(() => null);
    return true;
  } catch (error) {
    await db.releaseClaim(noticeKey).catch(() => null);
    throw error;
  }
}

async function processProdSellerDelivery({ order, product, transaction, buyer = {}, source = 'supplier-auto' }) {
  const invoice = String(order?.invoice_ref || transaction?.order_ref || '').trim();
  if (!invoice) throw new Error('Invoice supplier tidak ditemukan.');
  const supplier = prodSellerSelection(product, transaction || order);
  if (!supplier) return { handled: false };
  const supplierProductId = supplier.productId;

  const existingPo = await db.getPoOrder(invoice).catch(() => null);
  if (existingPo?.status === 'delivered' && existingPo.delivery_text) {
    const delivered = String(existingPo.delivery_text).split(/\r?\n/).filter(Boolean);
    try {
      await sendSupplierDeliveryOnce({ invoice, userId: Number(order?.telegram_id || transaction?.telegram_id), poOrder: existingPo, deliveryText: existingPo.delivery_text, product });
    } catch (error) {
      await notifyOwnerSupplierIssue({ ...order, invoice_ref: invoice }, product, error, await db.getSupplierOrder(invoice).catch(() => null));
      return { handled: true, pending: true, error, delivered, po_order: existingPo, transaction };
    }
    return { handled: true, delivered, po_order: existingPo, transaction };
  }

  let supplierRow = await db.getSupplierOrder(invoice).catch(() => null);
  let remote = null;
  try {
    if (supplierRow?.supplier_order_id && !['delivered', 'failed'].includes(String(supplierRow.status || '').toLowerCase())) {
      remote = await prodseller.getOrder(supplierRow.supplier_order_id);
    }
    if (!remote || !remote.orderId) {
      remote = await prodseller.createOrder({
        productId: supplierProductId,
        quantity: Math.max(1, Number(order?.quantity || transaction?.quantity || 1)),
        idempotencyKey: `ilink-${invoice}`
      });
    }

    const delivered = prodseller.deliveredItems(remote);
    const remoteStatus = String(remote?.status || (delivered.length ? 'delivered' : 'pending')).trim().toLowerCase();
    supplierRow = await db.upsertSupplierOrder({
      order_ref: invoice,
      supplier: 'prodseller',
      supplier_order_id: remote?.orderId || supplierRow?.supplier_order_id || '',
      supplier_product_id: supplierProductId,
      quantity: Math.max(1, Number(order?.quantity || transaction?.quantity || 1)),
      amount_usdt: Number(remote?.amount || supplierRow?.amount_usdt || 0),
      status: delivered.length ? 'delivered' : remoteStatus,
      delivered_text: delivered.join('\n'),
      error_code: '',
      error_message: '',
      raw_response: remote || {}
    });

    if (!delivered.length || remoteStatus !== 'delivered') {
      const pendingError = new Error('Order ProdSeller sudah dibuat tetapi produk belum terkirim. Gunakan Retry Supplier untuk mengecek kembali.');
      pendingError.code = 'PRODSELLER_PENDING';
      pendingError.statusCode = 202;
      throw pendingError;
    }

    const marked = await db.markPoDelivered(invoice, delivered.join('\n'), config.ownerId || null);
    const poOrder = marked?.po_order || await db.getPoOrder(invoice);
    const finalTransaction = marked?.transaction || transaction;
    await sendSupplierDeliveryOnce({
      invoice,
      userId: Number(order?.telegram_id || transaction?.telegram_id),
      poOrder: poOrder || { ...order, order_ref: invoice },
      deliveryText: delivered.join('\n'),
      product
    });
    await sendOwnerLog({ ...order, invoice_ref: invoice }, product, finalTransaction, buyer);
    return { handled: true, delivered, po_order: poOrder, transaction: finalTransaction, supplier_order: supplierRow };
  } catch (error) {
    if (error?.code !== 'PRODSELLER_PENDING') {
      const supplierAlreadyDelivered = Boolean(String(supplierRow?.delivered_text || '').trim());
      supplierRow = await db.upsertSupplierOrder({
        order_ref: invoice,
        supplier: 'prodseller',
        supplier_order_id: supplierRow?.supplier_order_id || '',
        supplier_product_id: supplierProductId,
        quantity: Math.max(1, Number(order?.quantity || transaction?.quantity || 1)),
        amount_usdt: Number(supplierRow?.amount_usdt || 0),
        status: supplierAlreadyDelivered ? 'delivery_pending' : 'error',
        delivered_text: supplierRow?.delivered_text || '',
        error_code: supplierAlreadyDelivered ? 'TELEGRAM_DELIVERY' : String(error?.code || 'PRODSELLER_ERROR'),
        error_message: String(error?.message || error || 'ProdSeller error'),
        raw_response: supplierRow?.raw_response || {}
      }).catch(() => supplierRow);
    }
    await notifyOwnerSupplierIssue({ ...order, invoice_ref: invoice }, product, error, supplierRow);
    return { handled: true, pending: true, error, supplier_order: supplierRow, transaction };
  }
}


async function processTelegramSupplierDelivery({ order, product, transaction, buyer = {}, source = 'supplier-auto' }) {
  const invoice = String(order?.invoice_ref || transaction?.order_ref || '').trim();
  if (!invoice) throw new Error('Invoice supplier tidak ditemukan.');
  const supplier = automaticSupplierSelection(product, transaction || order);
  if (!supplier || supplier.source !== 'telegram_userbot') return { handled: false };

  const existing = await db.getSupplierOrder(invoice).catch(() => null);
  if (existing?.status === 'delivered' && existing.delivered_text) {
    const poOrder = await db.getPoOrder(invoice).catch(() => null);
    try {
      await sendSupplierDeliveryOnce({ invoice, userId: Number(order?.telegram_id || transaction?.telegram_id), poOrder: poOrder || { ...order, order_ref: invoice }, deliveryText: existing.delivered_text, product });
    } catch (error) {
      return { handled: true, pending: true, error, supplier_order: existing, transaction };
    }
    return { handled: true, delivered: String(existing.delivered_text).split(/\r?\n/).filter(Boolean), supplier_order: existing, transaction };
  }

  const availability = await telegramSupplier.getAvailability(supplier.productId, { live: true, force: true, allowCached: true, waitMs: 10000 });
  const qty = Math.max(1, Number(order?.quantity || transaction?.quantity || 1));
  if (availability.availableStock < qty) {
    const error = new Error(`Stok supplier Telegram tidak mencukupi. Stok tersedia: ${availability.availableStock}.`);
    error.code = 'TELEGRAM_SUPPLIER_STOCK';
    throw error;
  }

  const supplierProduct = availability.product || {};
  const connector = availability.connector || {};
  const supplierRow = await db.upsertSupplierOrder({
    order_ref: invoice,
    supplier: 'telegram_userbot',
    supplier_order_id: existing?.supplier_order_id || '',
    supplier_product_id: supplier.productId,
    supplier_connector_id: connector.id || null,
    supplier_product_ref: supplierProduct.id || null,
    quantity: qty,
    amount_usdt: 0,
    amount_currency: String(supplierProduct.currency || connector.currency || '').toUpperCase(),
    status: ['processing','delivered','delivery_pending'].includes(String(existing?.status || '').toLowerCase()) ? existing.status : 'queued',
    delivered_text: existing?.delivered_text || '',
    error_code: '',
    error_message: '',
    raw_response: {
      source,
      product_name: product?.nama || '',
      variant_name: transaction?.variant_name || order?.variant_name || '',
      telegram_id: Number(order?.telegram_id || transaction?.telegram_id || 0),
      cost_amount: Number(supplierProduct.cost_amount || 0),
      currency: String(supplierProduct.currency || connector.currency || '').toUpperCase()
    },
    flow_snapshot: {
      connector: { id: connector.id, code: connector.code, name: connector.name, bot_username: connector.bot_username, worker_profile: connector.worker_profile },
      product: { id: supplierProduct.id, name: supplierProduct.name, external_code: supplierProduct.external_code, order_flow: supplierProduct.order_flow || [], delivery_regex: supplierProduct.delivery_regex || '' }
    },
    worker_profile: 'vercel-ondemand',
    next_attempt_at: null
  });

  const runNow = async () => {
    try {
      const result = await telegramOnDemand().executeOrder(invoice, { waitMs: 25000 });
      if (!result?.deliveredText) return null;
      const costTotalIdr = String(supplierProduct.currency || connector.currency || '').toUpperCase() === 'IDR'
        ? Math.round(Number(supplierProduct.cost_amount || 0) * qty)
        : 0;
      return completeTelegramSupplierOrder(invoice, result.deliveredText, {
        worker_id: 'vercel-ondemand',
        worker_state: { trace: result.trace || [], completed_at: new Date().toISOString(), mode: 'vercel-ondemand' },
        cost_total_idr: costTotalIdr
      });
    } catch (error) {
      await notifyOwnerSupplierIssue({ ...order, invoice_ref: invoice }, product, error, await db.getSupplierOrder(invoice).catch(() => supplierRow));
      throw error;
    }
  };

  const waitUntil = getVercelWaitUntil();
  if (waitUntil) {
    waitUntil(runNow().catch((error) => console.error('Telegram supplier background error:', error.message || error)));
    return { handled: true, pending: true, queued: true, background: true, supplier_order: supplierRow, transaction };
  }

  try {
    const completed = await runNow();
    return completed ? { handled: true, pending: false, delivered: completed.delivered || [], supplier_order: completed.supplier_order, transaction: completed.transaction || transaction } : { handled: true, pending: true, queued: true, supplier_order: supplierRow, transaction };
  } catch (error) {
    return { handled: true, pending: true, queued: true, error, supplier_order: await db.getSupplierOrder(invoice).catch(() => supplierRow), transaction };
  }
}

async function completeTelegramSupplierOrder(orderRef, deliveryText, worker = {}) {
  const invoice = String(orderRef || '').trim();
  const incomingDelivery = String(deliveryText || '').trim();
  if (!invoice || !incomingDelivery) throw new Error('Invoice dan hasil produk supplier wajib diisi.');
  const supplierRow = await db.getSupplierOrder(invoice);
  if (!supplierRow || String(supplierRow.supplier || '') !== 'telegram_userbot') throw new Error('Order Telegram supplier tidak ditemukan.');

  const transaction = await db.getTransactionByOrderRef(invoice);
  if (!transaction) throw new Error('Transaksi pelanggan tidak ditemukan.');
  const product = await db.getProductByCode(transaction.product_code);
  const selected = automaticSupplierSelection(product, transaction);
  if (!selected || selected.source !== 'telegram_userbot') throw new Error('Produk transaksi bukan Telegram supplier.');

  // Jika worker sudah pernah menyerahkan hasil, gunakan hasil pertama sebagai sumber kebenaran.
  // Retry berikutnya hanya mencoba finalisasi/pengiriman Telegram ke pembeli, bukan mengganti produk.
  const effectiveDelivery = String(supplierRow.delivered_text || '').trim() || incomingDelivery;
  const row = await db.upsertSupplierOrder({
    ...supplierRow,
    order_ref: invoice,
    supplier: 'telegram_userbot',
    supplier_product_id: selected.productId,
    status: 'delivered',
    delivered_text: effectiveDelivery,
    error_code: '',
    error_message: '',
    worker_id: String(worker.worker_id || supplierRow.worker_id || ''),
    locked_at: null,
    worker_state: worker.worker_state && typeof worker.worker_state === 'object' ? worker.worker_state : (supplierRow.worker_state || {}),
    completed_at: supplierRow.completed_at || new Date().toISOString(),
    next_attempt_at: null
  });

  const unitCostSupplier = Math.max(0, Number(supplierRow?.raw_response?.cost_amount || 0));
  const supplierQty = Math.max(1, Number(supplierRow?.quantity || transaction?.quantity || 1));
  const supplierCostTotal = unitCostSupplier * supplierQty;
  if (supplierCostTotal > 0) await db.deductTelegramSupplierBalanceOnce(invoice, supplierCostTotal).catch((error) => console.error('Gagal mengurangi saldo supplier manual:', error.message || error));

  const costTotalIdr = Math.max(0, Number(worker.cost_total_idr || 0));
  if (costTotalIdr > 0) await db.updateTransactionCost(invoice, costTotalIdr).catch(() => null);
  const marked = await db.markPoDelivered(invoice, effectiveDelivery, config.ownerId || null);
  const poOrder = marked?.po_order || await db.getPoOrder(invoice);
  const finalTransaction = marked?.transaction || await db.getTransactionByOrderRef(invoice);
  await sendSupplierDeliveryOnce({ invoice, userId: Number(transaction.telegram_id || 0), poOrder: poOrder || { order_ref: invoice, ...transaction }, deliveryText: effectiveDelivery, product });
  const buyer = await db.getUserByTelegramId(transaction.telegram_id).catch(() => null);
  await sendOwnerLog({ invoice_ref: invoice, telegram_id: transaction.telegram_id, quantity: transaction.quantity, variant_name: transaction.variant_name }, product, finalTransaction, buyer || {});
  return { already_delivered: String(supplierRow.status || '') === 'delivered', supplier_order: row, po_order: poOrder, transaction: finalTransaction, delivered: effectiveDelivery.split(/\r?\n/).filter(Boolean) };
}

async function retrySupplierOrder(orderRef, actor = {}) {
  const invoice = String(orderRef || '').trim();
  if (!invoice) throw new Error('Invoice supplier wajib diisi.');
  const transaction = await db.getTransactionByOrderRef(invoice);
  if (!transaction) throw new Error('Transaksi pelanggan tidak ditemukan.');
  const product = await db.getProductByCode(transaction.product_code);
  const autoSupplier = automaticSupplierSelection(product, transaction);
  if (!autoSupplier) throw new Error('Produk/varian pada invoice ini bukan produk supplier otomatis.');
  if (autoSupplier.source === 'telegram_userbot') {
    const current = await db.getSupplierOrder(invoice).catch(() => null);
    if (!current) throw new Error('Order Telegram supplier belum tersedia.');
    if (String(current.status || '').toLowerCase() === 'manual_review' && !String(current.delivered_text || '').trim()) {
      const error = new Error('Order ini memerlukan pemeriksaan manual karena koneksi terputus setelah tahap pembelian supplier. Jangan retry otomatis sebelum memastikan saldo/hasil di bot supplier.');
      error.code = 'USERBOT_REVIEW_REQUIRED';
      throw error;
    }
    await db.upsertSupplierOrder({ ...current, order_ref: invoice, status: String(current.delivered_text || '').trim() ? 'delivery_pending' : 'retry', error_code: '', error_message: '', worker_id: '', locked_at: null, next_attempt_at: new Date().toISOString() });
    const result = await telegramOnDemand().executeOrder(invoice, { waitMs: 25000 });
    if (!result?.deliveredText) throw new Error('Supplier belum mengembalikan hasil produk.');
    const supplierProduct = await db.getTelegramSupplierProduct(current.supplier_product_ref || current.supplier_product_id);
    const currency = String(supplierProduct?.currency || current.amount_currency || '').toUpperCase();
    const costTotalIdr = currency === 'IDR' ? Math.round(Number(supplierProduct?.cost_amount || current.raw_response?.cost_amount || 0) * Math.max(1, Number(current.quantity || 1))) : 0;
    return completeTelegramSupplierOrder(invoice, result.deliveredText, {
      worker_id: 'vercel-ondemand-retry',
      worker_state: { trace: result.trace || [], completed_at: new Date().toISOString(), mode: 'vercel-ondemand-retry' },
      cost_total_idr: costTotalIdr
    });
  }
  const buyer = Object.keys(actor || {}).length ? actor : (await db.getUserByTelegramId(transaction.telegram_id).catch(() => null)) || {};
  const result = await processProdSellerDelivery({
    order: {
      invoice_ref: invoice,
      telegram_id: Number(transaction.telegram_id || 0),
      product_code: transaction.product_code,
      variant_key: transaction.variant_key || '',
      variant_name: transaction.variant_name || '',
      quantity: Number(transaction.quantity || 1),
      amount: Number(transaction.total_price || 0),
      payment_method: transaction.payment_method || 'gateway'
    },
    product,
    transaction,
    buyer,
    source: 'supplier-manual-retry'
  });
  if (result.pending) throw result.error || new Error('Produk supplier belum terkirim.');
  return result;
}

async function fulfillPaidOrder({ order, buyer = {}, source = 'webhook' }) {
  if (!order?.invoice_ref) throw new Error('Invoice lokal tidak ditemukan.');
  const invoice = String(order.invoice_ref);
  const processKey = `payment_process:${invoice}`;
  const claimed = await db.claimOnce(processKey, 10 * 60, { invoice, source }, { failClosed: true });

  if (!claimed) {
    const existing = await db.getTransactionByOrderRef(invoice).catch(() => null);
    return { ok: true, state: existing ? 'already_completed' : 'processing', transaction: existing || null };
  }

  try {
    const currentBuyer = Object.keys(buyer || {}).length
      ? buyer
      : (await db.getUserByTelegramId(order.telegram_id).catch(() => null)) || {};
    const product = await db.getProductByCode(order.product_code).catch(() => null);
    let result;

    const existing = await db.getTransactionByOrderRef(invoice);
    if (existing) {
      result = {
        transaction: existing,
        delivered: deliveredFromTransaction(existing),
        already_completed: true
      };
    } else {
      if (!product) throw new Error('Produk untuk invoice ini tidak ditemukan.');
      result = await db.completeOrder(order, product, Number(order.amount || 0), currentBuyer);
    }

    const selected = product ? selectedVariant(product, order) : null;
    const effectiveMode = String(result.transaction?.delivery_mode || order?.delivery_mode || (product ? db.variantDeliveryMode(product, selected) : 'auto')).toLowerCase();
    let poWaiting = result.po_waiting === true || (effectiveMode === 'po' && String(result.transaction?.delivery_status || '') !== 'delivered');
    let supplierResult = null;
    if (poWaiting && isAutomaticSupplierProduct(product, result.transaction || order)) {
      const paidNoticeKey = `supplier_paid_notice:${invoice}`;
      const paidNoticeClaimed = await db.claimOnce(paidNoticeKey, 30 * 24 * 60 * 60, { invoice, telegram_id: Number(order.telegram_id || 0) }, { failClosed: true });
      if (paidNoticeClaimed) {
        try {
          await sendPoPaidNotice(order.telegram_id, order, product, result.transaction);
          await db.markClaimDone(paidNoticeKey, { invoice, state: 'notified' }).catch(() => null);
        } catch (noticeError) {
          await db.releaseClaim(paidNoticeKey).catch(() => null);
          throw noticeError;
        }
      }
      supplierResult = automaticSupplierSelection(product, result.transaction || order)?.source === 'telegram_userbot'
        ? await processTelegramSupplierDelivery({ order, product, transaction: result.transaction, buyer: currentBuyer, source })
        : await processProdSellerDelivery({ order, product, transaction: result.transaction, buyer: currentBuyer, source });
      if (supplierResult && !supplierResult.pending && supplierResult.delivered?.length) {
        poWaiting = false;
        result.transaction = supplierResult.transaction || result.transaction;
        result.delivered = supplierResult.delivered;
      }
    }
    if (poWaiting) {
      // Notifikasi pembayaran PO memakai lock terpisah dari lock fulfillment.
      // Jika transaksi DB sudah sukses tetapi kirim Telegram sempat gagal, webhook/cron berikutnya masih dapat mencoba lagi.
      const noticeKey = `po_paid_notice:${invoice}`;
      const noticeClaimed = await db.claimOnce(noticeKey, 30 * 24 * 60 * 60, { invoice, telegram_id: Number(order.telegram_id || 0) }, { failClosed: true });
      if (noticeClaimed) {
        try {
          if (isAutomaticSupplierProduct(product, result.transaction || order)) await sendSupplierPendingNotice(order.telegram_id);
          else await sendPoPaidNotice(order.telegram_id, order, product, result.transaction);
          await db.markClaimDone(noticeKey, { invoice, state: 'notified' }).catch(() => null);
        } catch (noticeError) {
          await db.releaseClaim(noticeKey).catch(() => null);
          throw noticeError;
        }
      }
      if (!result.already_completed && !isAutomaticSupplierProduct(product, result.transaction || order)) await sendOwnerPoWaitingLog(order, product, result.transaction, currentBuyer);
    } else if (!(supplierResult && supplierResult.delivered && supplierResult.delivered.length)) {
      await sendOrderReceipt(order.telegram_id, order, product, result.transaction, result.delivered);
      await sendOwnerLog(order, product, result.transaction, currentBuyer);
    }
    await db.deletePendingOrder(order.telegram_id, order.invoice_ref);
    await notifyFirstPurchaseReferral(order.telegram_id);
    await db.markClaimDone(processKey, { invoice, source, state: poWaiting ? 'awaiting_delivery' : 'completed' });

    return {
      ok: true,
      state: result.already_completed ? 'already_completed' : (poWaiting ? (supplierResult?.pending ? 'supplier_waiting' : 'awaiting_delivery') : 'completed'),
      po_waiting: poWaiting,
      transaction: result.transaction,
      delivered: result.delivered
    };
  } catch (error) {
    await db.releaseClaim(processKey).catch(() => null);
    throw error;
  }
}


function topupAsPaymentOrder(topup = {}) {
  return {
    invoice_ref: String(topup.topup_ref || ''),
    amount: Number(topup.total_amount || 0),
    payment_provider: String(topup.payment_provider || ''),
    provider_transaction_id: String(topup.provider_transaction_id || '')
  };
}

async function verifyTopupTransaction(topup) {
  return verifyPaymentTransaction(topupAsPaymentOrder(topup));
}

async function cancelTopupTransaction(topup) {
  return cancelPaymentTransaction(topupAsPaymentOrder(topup));
}

async function completeTopupPayment({ topup, incoming = {}, source = 'webhook' }) {
  if (!topup?.topup_ref) throw new Error('Referensi top up tidak ditemukan.');
  const ref = String(topup.topup_ref);
  const claimKey = `topup_process:${ref}`;
  const claimed = await db.claimOnce(claimKey, 10 * 60, { ref, source }, { failClosed: true });
  if (!claimed) return { ok: true, state: 'processing' };
  try {
    const result = await db.completeTopup(topup, incoming);
    const row = result.topup || topup;
    const user = result.user || await db.getUserByTelegramId(row.telegram_id);
    if (!result.already_completed) {
      await tg.sendMessage(row.telegram_id,
        `✅ <b>TOP UP BERHASIL</b>
` +
        `=======================
` +
        `Referensi: <b>${escapeHtml(displayPaymentReference(row.topup_ref))}</b>
` +
        `Saldo Masuk: <b>${escapeHtml(formatRupiah(row.amount || 0))}</b>
` +
        (Number(row.fee || 0) > 0 ? `Fee Pembayaran: <b>${escapeHtml(formatRupiah(row.fee))}</b>
` : '') +
        `Saldo Utama Sekarang: <b>${escapeHtml(formatRupiah(user?.balance_main || 0))}</b>
` +
        `Saldo Referral: <b>${escapeHtml(formatRupiah(user?.balance_referral || 0))}</b>`,
        { parse_mode: 'HTML' }
      ).catch((error) => console.error('Gagal mengirim notifikasi top up ke user:', error.message || error));
      await walletNotifications.notifyTopupSuccess({
        user: user || { telegram_id: row.telegram_id },
        telegramId: row.telegram_id,
        reference: displayPaymentReference(row.topup_ref),
        amount: Number(row.amount || 0),
        fee: Number(row.fee || 0),
        total: Number(row.total_amount || 0),
        balanceMain: Number(user?.balance_main || 0),
        balanceReferral: Number(user?.balance_referral || 0)
      });
    }
    await db.markClaimDone(claimKey, { ref, source, state: 'completed' });
    return { ok: true, state: result.already_completed ? 'already_completed' : 'completed', ...result };
  } catch (error) {
    await db.releaseClaim(claimKey).catch(() => null);
    throw error;
  }
}

async function watchPendingTopup({ topupRef, telegramId, maxWaitMs = 235000, intervalMs = 10000 } = {}) {
  const ref = normalizedText(topupRef);
  if (!ref) return { ok: false, state: 'invalid_topup_ref' };
  const watchKey = `topup_watch:${ref}`;
  const ttlSeconds = Math.ceil(Number(maxWaitMs || 235000) / 1000) + 60;
  const claimed = await db.claimOnce(watchKey, ttlSeconds, { ref, telegramId, source: 'background-topup-watcher' });
  if (!claimed) return { ok: true, state: 'watcher_exists' };
  const deadline = Date.now() + Math.max(10000, Number(maxWaitMs || 235000));
  let lastError = null;
  await sleep(4000);
  while (Date.now() < deadline) {
    const topup = await db.getPendingTopupByRef(ref).catch((error) => { lastError = error; return null; });
    if (!topup || topup.status === 'completed') {
      await db.markClaimDone(watchKey, { ref, state: topup?.status || 'topup_missing' }).catch(() => null);
      return { ok: true, state: topup?.status || 'topup_missing' };
    }
    if (telegramId && Number(topup.telegram_id) !== Number(telegramId)) return { ok: false, state: 'buyer_mismatch' };
    try {
      const transaction = await verifyTopupTransaction(topup);
      if (transaction.status === 'completed') {
        const result = await completeTopupPayment({ topup, incoming: transaction, source: 'background-topup-watcher' });
        await db.markClaimDone(watchKey, { ref, state: result.state }).catch(() => null);
        return result;
      }
      if (['cancelled', 'expired', 'failed'].includes(transaction.status)) {
        await db.cancelPendingTopup(topup.telegram_id, topup.topup_ref).catch(() => null);
        await db.markClaimDone(watchKey, { ref, state: transaction.status }).catch(() => null);
        return { ok: true, state: transaction.status };
      }
    } catch (error) { lastError = error; }
    await sleep(Math.max(5000, Number(intervalMs || 10000)));
  }
  if (lastError) console.warn(`Watcher top up ${ref} berakhir:`, lastError.message || lastError);
  await db.markClaimDone(watchKey, { ref, state: 'watch_timeout' }).catch(() => null);
  return { ok: true, state: 'watch_timeout' };
}

function scheduleTopupWatcher(options = {}) {
  try {
    const waitUntil = getVercelWaitUntil();
    if (!waitUntil) return false;
    waitUntil(watchPendingTopup(options).catch((error) => console.error('Background top up watcher error:', error.message || error)));
    return true;
  } catch (error) {
    console.warn('Top up watcher tidak dapat dijadwalkan:', error.message || error);
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function watchPendingPayment({ invoiceRef, telegramId, maxWaitMs = 235000, intervalMs = 10000 } = {}) {
  const invoice = normalizedText(invoiceRef);
  if (!invoice) return { ok: false, state: 'invalid_invoice' };

  const watchKey = `payment_watch:${invoice}`;
  const ttlSeconds = Math.ceil(Number(maxWaitMs || 235000) / 1000) + 60;
  const claimed = await db.claimOnce(watchKey, ttlSeconds, { invoice, telegramId, source: 'background-watcher' });
  if (!claimed) return { ok: true, state: 'watcher_exists' };

  const deadline = Date.now() + Math.max(10000, Number(maxWaitMs || 235000));
  let lastError = null;
  await sleep(4000);

  while (Date.now() < deadline) {
    const order = await db.getPendingOrderByInvoice(invoice).catch((error) => {
      lastError = error;
      return null;
    });

    if (!order) {
      await db.markClaimDone(watchKey, { invoice, state: 'pending_order_missing' }).catch(() => null);
      return { ok: true, state: 'pending_order_missing' };
    }
    if (telegramId && Number(order.telegram_id) !== Number(telegramId)) {
      await db.markClaimDone(watchKey, { invoice, state: 'buyer_mismatch' }).catch(() => null);
      return { ok: false, state: 'buyer_mismatch' };
    }

    try {
      const transaction = await verifyPaymentTransaction(order);
      if (transaction.status === 'completed') {
        const result = await fulfillPaidOrder({ order, source: 'background-watcher' });
        await db.markClaimDone(watchKey, { invoice, state: result.state || 'completed' }).catch(() => null);
        return result;
      }
      if (['cancelled', 'expired', 'failed'].includes(transaction.status)) {
        await db.markClaimDone(watchKey, { invoice, state: transaction.status }).catch(() => null);
        return { ok: true, state: transaction.status };
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(Math.max(5000, Number(intervalMs || 10000)));
  }

  if (lastError) console.warn(`Watcher pembayaran ${invoice} berakhir:`, lastError.message || lastError);
  await db.markClaimDone(watchKey, { invoice, state: 'watch_timeout' }).catch(() => null);
  return { ok: true, state: 'watch_timeout' };
}

function schedulePaymentWatcher(options = {}) {
  try {
    const waitUntil = getVercelWaitUntil();
    if (!waitUntil) return false;
    waitUntil(
      watchPendingPayment(options).catch((error) => {
        console.error('Background payment watcher error:', error.message || error);
      })
    );
    return true;
  } catch (error) {
    console.warn('Payment watcher tidak dapat dijadwalkan:', error.message || error);
    return false;
  }
}

module.exports = {
  normalizePaymentStatus,
  normalizePakasirTransaction,
  normalizeAutoGopayTransaction,
  validateWebhookPayload,
  validateAutoGopayWebhookPayload,
  paymentMatchesOrder,
  paymentProviderForOrder,
  paymentProviderLabel,
  paymentConfigured,
  displayPaymentReference,
  createPaymentTransaction,
  verifyPakasirTransaction,
  verifyAutoGopayTransaction,
  verifyPaymentTransaction,
  cancelPaymentTransaction,
  verifyTopupTransaction,
  cancelTopupTransaction,
  completeTopupPayment,
  watchPendingTopup,
  scheduleTopupWatcher,
  fulfillPaidOrder,
  retrySupplierOrder,
  completeTelegramSupplierOrder,
  sendOrderReceipt,
  sendPoPaidNotice,
  sendPoDeliveryReceipt,
  sendOwnerPoWaitingLog,
  sendOwnerLog,
  watchPendingPayment,
  schedulePaymentWatcher
};
