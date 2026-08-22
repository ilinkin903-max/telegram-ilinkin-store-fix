const axios = require('axios');
const { config } = require('./config');
const db = require('./db');
const tg = require('./telegram');
const walletNotifications = require('./walletNotifications');
const prodseller = require('./prodsellerService');
const workflowUserbot = require('./userbotWorkflowService');
const workflowRetry = require('./workflowRetryScheduler');
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

function paymentProviderLabel() {
  return 'QRIS';
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
  if (transaction.amount > 0 && Number(transaction.amount) !== Number(order.amount || 0)) {
    throw new Error('Nominal transaksi AutoGoPay tidak cocok dengan invoice lokal.');
  }
  return {
    ...transaction,
    transaction_id: transaction.transaction_id || transactionId,
    order_id: order.invoice_ref || transaction.order_id,
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
  const quantity = Math.max(1, Number(transaction?.quantity || order?.quantity || 1));
  const total = Number(transaction?.total_price || order?.amount || 0);
  const fee = Math.max(0, Number(transaction?.payment_fee ?? order?.fee ?? 0));
  const unitPrice = Math.max(0, Number(transaction?.unit_price || order?.unit_price || ((Math.max(0, total - fee)) / quantity) || 0));
  const subtotal = Math.max(0, total - fee);
  return {
    invoice: displayPaymentReference(transaction?.order_ref || order?.invoice_ref || order?.order_ref || '-'),
    productName: transaction?.product_name || product?.nama || order?.product_code || '-',
    productCode: transaction?.product_code || product?.kode || order?.product_code || '',
    variantName: transaction?.variant_name || order?.variant_name || '',
    variantKey: transaction?.variant_key || order?.variant_key || '',
    quantity,
    unitPrice,
    total,
    fee,
    subtotal,
    paymentMethod: String(transaction?.payment_method || order?.payment_method || 'gateway').toLowerCase(),
    paymentProvider: String(order?.payment_provider || '').trim().toLowerCase(),
    walletMainUsed: Number(transaction?.wallet_main_used || 0),
    walletReferralUsed: Number(transaction?.wallet_referral_used || 0),
    paidAt: transaction?.created_at || transaction?.status_updated_at || order?.paid_at || order?.updated_at || new Date().toISOString(),
    delivered: Array.isArray(delivered) ? delivered : deliveredFromTransaction(transaction)
  };
}

function receiptMethodLabel(ctx, order = {}) {
  if (ctx.paymentMethod === 'wallet') return 'Saldo Bot';
  const provider = String(ctx.paymentProvider || '').trim().toLowerCase() || paymentProviderForOrder(order);
  return provider === 'autogopay' ? 'AutoGoPay' : 'QRIS';
}

function termsBulletHtml(value) {
  const rows = String(value || '-')
    .replace(/\\([.!()+#=\-])/g, '$1')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•*\-–—]+\s*/, '').trim())
    .filter(Boolean);
  if (!rows.length) return '• -';
  return rows.map((line) => `• ${escapeHtml(line)}`).join('\n');
}

function splitReceiptProduct(value, maxChars) {
  const text = String(value || '').trim();
  if (!text) return ['-'];
  const limit = Math.max(300, Number(maxChars || 2600));
  if (text.length <= limit) return [text];
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (line.length <= limit) {
      current = line;
      continue;
    }
    for (let i = 0; i < line.length; i += limit) chunks.push(line.slice(i, i + limit));
    current = '';
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function buildReceiptHeader(ctx, title, terms, order = {}) {
  return `✅ <b>PEMBAYARAN BERHASIL</b>\n` +
    `=======================\n` +
    `Invoice: <b>${escapeHtml(ctx.invoice)}</b>\n` +
    `Produk: <b>${escapeHtml(title)}</b>\n` +
    `Harga: <b>${escapeHtml(formatRupiah(ctx.unitPrice))}</b>\n` +
    `Jumlah Beli: <b>${escapeHtml(ctx.quantity)}</b>\n` +
    `Metode: <b>${escapeHtml(receiptMethodLabel(ctx, order))}</b>\n` +
    (ctx.walletMainUsed > 0 ? `Saldo Utama: <b>-${escapeHtml(formatRupiah(ctx.walletMainUsed))}</b>\n` : '') +
    (ctx.walletReferralUsed > 0 ? `Saldo Referral: <b>-${escapeHtml(formatRupiah(ctx.walletReferralUsed))}</b>\n` : '') +
    `Fee: <b>${escapeHtml(formatRupiah(ctx.fee))}</b>\n` +
    `Total Dibayar: <b>${escapeHtml(formatRupiah(ctx.total))}</b>\n` +
    `Tanggal: <b>${escapeHtml(formatWIB(ctx.paidAt))}</b>\n` +
    `=======================\n\n` +
    `<b>SYARAT &amp; KETENTUAN</b>\n${termsBulletHtml(terms)}\n\n` +
    `<b>PRODUK YANG DIDAPAT</b>\n\n`;
}

async function sendCompletedReceipt(userId, order, product, transaction, delivered, termsOverride = '') {
  const ctx = receiptContext(order, product, transaction, delivered);
  const variant = product ? selectedVariant(product, { variant_key: ctx.variantKey }) : null;
  const terms = String(termsOverride || variantTerms(product || {}, variant) || '-').trim() || '-';
  const title = `${ctx.productName}${ctx.variantName ? ' - ' + ctx.variantName : ''}`;
  const rawProduct = ctx.delivered.join('\n').trim() || '-';
  const header = buildReceiptHeader(ctx, title, terms, order);
  const firstLimit = Math.max(500, 3650 - header.length);
  const chunks = splitReceiptProduct(rawProduct, firstLimit);
  const responses = [];
  const first = `${header}<pre>${escapeHtml(chunks[0] || '-')}</pre>\n\n` +
    (chunks.length === 1
      ? `Pembayaran terdeteksi otomatis dan produk sudah dikirim.`
      : `Produk dilanjutkan pada pesan berikutnya.`);
  responses.push(await tg.sendMessage(Number(userId), first, { parse_mode: 'HTML' }));
  for (let i = 1; i < chunks.length; i += 1) {
    const last = i === chunks.length - 1;
    const text = `<b>LANJUTAN PRODUK YANG DIDAPAT</b>\n` +
      `Invoice: <b>${escapeHtml(ctx.invoice)}</b>\n\n` +
      `<pre>${escapeHtml(chunks[i])}</pre>` +
      (last ? `\n\nPembayaran terdeteksi otomatis dan produk sudah dikirim.` : '');
    responses.push(await tg.sendMessage(Number(userId), text, { parse_mode: 'HTML' }));
  }
  return responses[responses.length - 1] || null;
}

async function sendOrderReceipt(userId, order, product, transaction, delivered) {
  return sendCompletedReceipt(userId, order, product, transaction, delivered);
}

async function sendPoPaidNotice(userId, order, product, transaction) {
  const ctx = receiptContext(order, product, transaction, []);
  const title = `${ctx.productName}${ctx.variantName ? ' - ' + ctx.variantName : ''}`;
  const text = `✅ <b>PEMBAYARAN BERHASIL</b>\n` +
    `=======================\n` +
    `Invoice: <b>${escapeHtml(ctx.invoice)}</b>\n` +
    `Produk: <b>${escapeHtml(title)}</b>\n` +
    `Harga: <b>${escapeHtml(formatRupiah(ctx.unitPrice))}</b>\n` +
    `Jumlah Beli: <b>${escapeHtml(ctx.quantity)}</b>\n` +
    `Metode: <b>${escapeHtml(receiptMethodLabel(ctx, order))}</b>\n` +
    `Fee: <b>${escapeHtml(formatRupiah(ctx.fee))}</b>\n` +
    `Total Dibayar: <b>${escapeHtml(formatRupiah(ctx.total))}</b>\n` +
    `Tanggal: <b>${escapeHtml(formatWIB(ctx.paidAt))}</b>\n` +
    `=======================`;
  return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
}

async function sendSupplierPendingNotice(userId) {
  const text = `⏳ <b>PRODUK SEDANG DIPROSES OTOMATIS</b>\n` +
    `Pembayaran sudah diterima. Sistem sedang menyiapkan produk Anda secara otomatis. Produk akan dikirim ke chat ini segera setelah proses selesai.`;
  return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
}

async function sendWorkflowFailureNotice(userId, invoice) {
  const ref = displayPaymentReference(invoice || '-');
  const claimKey = `workflow_failure_notice:${String(invoice || '').trim()}`;
  const claimed = await db.claimOnce(claimKey, 30 * 24 * 60 * 60, { invoice: String(invoice || '').trim(), telegram_id: Number(userId || 0) }, { failClosed: true }).catch(() => false);
  if (!claimed) return false;
  try {
    const text = `⚠️ <b>PROSES PRODUK MENGALAMI KENDALA</b>\n\n` +
      `Pesanan Anda sudah tercatat, tetapi proses pengiriman produk mengalami kendala. Sistem <b>menghentikan workflow pada langkah yang gagal</b> agar pesanan tidak salah atau terkirim ganda.\n\n` +
      `Silakan tunggu beberapa saat. Jika produk belum diterima, hubungi admin dan sertakan referensi <b>${escapeHtml(ref)}</b>.\n\n` +
      `Terima kasih atas pengertiannya.`;
    await tg.sendMessage(Number(userId), text, { parse_mode: 'HTML' });
    await db.markClaimDone(claimKey, { invoice: String(invoice || '').trim(), state: 'sent' }).catch(() => null);
    return true;
  } catch (error) {
    await db.releaseClaim(claimKey).catch(() => null);
    console.error('Gagal mengirim notifikasi workflow gagal:', error.message || error);
    return false;
  }
}

async function sendPoDeliveryReceipt(userId, poOrder, deliveryText, product = null) {
  const raw = String(deliveryText || '').trim();
  if (!raw) throw new Error('Data produk PO kosong.');
  const invoice = String(poOrder?.order_ref || '').trim();
  const transaction = invoice ? await db.getTransactionByOrderRef(invoice).catch(() => null) : null;
  const variant = product ? selectedVariant(product, { variant_key: transaction?.variant_key || poOrder?.variant_key || '' }) : null;
  const terms = String(poOrder?.terms_snapshot || variantTerms(product || {}, variant) || '-').trim() || '-';
  const orderLike = {
    invoice_ref: invoice || transaction?.order_ref || '-',
    telegram_id: Number(userId || transaction?.telegram_id || 0),
    product_code: transaction?.product_code || product?.kode || '',
    variant_key: transaction?.variant_key || poOrder?.variant_key || '',
    variant_name: transaction?.variant_name || poOrder?.variant_name || '',
    unit_price: Number(transaction?.unit_price || poOrder?.unit_price || 0),
    quantity: Number(transaction?.quantity || poOrder?.quantity || 1),
    amount: Number(transaction?.total_price || poOrder?.total_price || 0),
    fee: Number(transaction?.payment_fee || 0),
    payment_method: transaction?.payment_method || 'gateway',
    payment_provider: config.paymentProvider
  };
  return sendCompletedReceipt(Number(userId), orderLike, product || { nama: transaction?.product_name || poOrder?.product_name || poOrder?.product_code || 'Produk' }, transaction, raw.split(/\r?\n/).filter(Boolean), terms);
}

async function sendChannelWithRetry(target, text, attempts = 3) {
  let lastError = null;
  for (let i = 0; i < Math.max(1, Number(attempts || 1)); i += 1) {
    try {
      return await tg.sendMessage(target, text);
    } catch (error) {
      lastError = error;
      if (i + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)));
    }
  }
  throw lastError || new Error('Gagal mengirim pesan ke channel.');
}

function notificationEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no', 'nonaktif'].includes(String(value).trim().toLowerCase());
}

async function transactionChannelTarget() {
  const settings = await db.getShopSettings().catch(() => ({}));
  if (!notificationEnabled(settings.transaction_notifications_enabled, true)) return '';
  return String(settings.transaction_channel_id || config.channelLog || '').trim();
}

async function claimTransactionNotice(kind, order, transaction) {
  const invoice = displayPaymentReference(transaction?.order_ref || order?.invoice_ref || order?.order_ref || '-');
  const key = `transaction_notice:${String(kind || 'status')}:${String(invoice)}`;
  const ok = await db.claimOnce(key, 365 * 24 * 60 * 60, { invoice, kind }, { failClosed: true });
  return { ok, key, invoice };
}

async function sendOwnerPoWaitingLog(order, product, transaction, buyer = {}) {
  const target = await transactionChannelTarget();
  if (!target) return false;
  const claim = await claimTransactionNotice('paid_waiting', order, transaction);
  if (!claim.ok) return false;
  try {
    const username = buyer?.username ? '@' + buyer.username : (buyer?.first_name || String(order?.telegram_id || '-'));
    const productName = transaction?.product_name || product?.nama || order?.product_code || '-';
    const variantName = transaction?.variant_name || order?.variant_name || '';
    await sendChannelWithRetry(target,
      `⏳ TRANSAKSI BERHASIL · MENUNGGU PENGIRIMAN\n` +
      `=======================\n` +
      `User: ${username}\n` +
      `Trx ID: ${displayPaymentReference(transaction?.order_ref || order?.invoice_ref || '-')}\n` +
      `Produk: ${productName}${variantName ? ' - ' + variantName : ''}\n` +
      `Jumlah Beli: ${Number(transaction?.quantity || order?.quantity || 1)}\n` +
      `Total Harga: ${formatRupiah(transaction?.total_price || order?.amount || 0)}\n` +
      `Status: MENUNGGU SELLER MENGIRIM PRODUK\n` +
      `Tanggal: ${formatWIB(new Date())}`
    );
    await db.markClaimDone(claim.key, { invoice: claim.invoice, state: 'sent' }).catch(() => null);
    return true;
  } catch (error) {
    await db.releaseClaim(claim.key).catch(() => null);
    console.error('Gagal kirim log PO:', error.message || error);
    return false;
  }
}

async function sendOwnerLog(order, product, transaction, buyer = {}) {
  const target = await transactionChannelTarget();
  if (!target) return false;
  const claim = await claimTransactionNotice('completed', order, transaction);
  if (!claim.ok) return false;
  try {
    const fee = Number(order?.fee || 0);
    const total = Number(transaction?.total_price || order?.amount || 0);
    const subtotal = Math.max(0, total - fee);
    const username = buyer?.username
      ? '@' + buyer.username
      : (buyer?.first_name || String(order?.telegram_id || '-'));
    const productName = transaction?.product_name || product?.nama || order?.product_code || '-';
    const variantName = transaction?.variant_name || order?.variant_name || '';
    await sendChannelWithRetry(target,
      `✅ TRANSAKSI BERHASIL\n` +
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
    await db.markClaimDone(claim.key, { invoice: claim.invoice, state: 'sent' }).catch(() => null);
    return true;
  } catch (error) {
    await db.releaseClaim(claim.key).catch(() => null);
    console.error('Gagal kirim log pembayaran:', error.message || error);
    return false;
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


function prodSellerSelection(product = {}, order = {}) {
  const variant = selectedVariant(product, order);
  const variantSource = String(variant?.supplier_source || '').trim().toLowerCase();
  const variantProductId = String(variant?.supplier_product_id || '').trim();
  if (variantSource === 'prodseller' && variantProductId) return { productId: variantProductId, variant };
  const source = String(product?.supplier_source || '').trim().toLowerCase();
  const productId = String(product?.supplier_product_id || '').trim();
  if (source === 'prodseller' && productId) return { productId, variant: null };
  return null;
}

function isProdSellerProduct(product = {}, order = {}) {
  return Boolean(prodSellerSelection(product, order));
}


function workflowSelection(product = {}, order = {}) {
  const variant = selectedVariant(product, order);
  const variantSource = String(variant?.supplier_source || '').trim().toLowerCase();
  const variantWorkflowId = String(variant?.supplier_product_id || '').trim();
  if (variantSource === 'telegram_workflow' && variantWorkflowId) return { workflowId: variantWorkflowId, variant };
  const source = String(product?.supplier_source || '').trim().toLowerCase();
  const workflowId = String(product?.supplier_product_id || '').trim();
  if (source === 'telegram_workflow' && workflowId) return { workflowId, variant: null };
  return null;
}

function isWorkflowProduct(product = {}, order = {}) {
  return Boolean(workflowSelection(product, order));
}

async function workflowManualSupplierInfo(workflow, quantity = 1) {
  if (!workflow?.supplier_id) return { supplier: null, unitCost: Math.max(0, Number(workflow?.unit_cost_idr || 0)), totalCost: 0, estimatedStock: 0 };
  const supplier = await db.getResellerSupplier(workflow.supplier_id).catch(() => null);
  const unitCost = Math.max(0, Number(workflow?.unit_cost_idr || 0));
  const qty = Math.max(1, Number(quantity || 1));
  return { supplier, unitCost, totalCost: unitCost * qty, estimatedStock: supplier ? db.workflowEstimatedStock(workflow, supplier) : 0 };
}

async function settleWorkflowSupplierCost(workflow, run, invoice, quantity = 1) {
  if (!run || run.supplier_balance_debited_at) return run;
  const supplierId = String(run.supplier_id || workflow?.supplier_id || '').trim();
  const totalCost = Math.max(0, Number(run.supplier_cost_total_idr || 0));
  if (!supplierId || !(totalCost > 0)) return run;
  await db.debitResellerSupplierBalance(supplierId, invoice, totalCost, `Workflow ${workflow?.name || workflow?.id || ''} · ${Math.max(1, Number(quantity || run.quantity || 1))} item`);
  return await db.patchResellerWorkflowRun(invoice, { supplier_balance_debited_at: new Date().toISOString() }).catch(() => run);
}

async function notifyOwnerWorkflowIssue(order, product, error, workflow = null, run = null) {
  const target = await transactionChannelTarget().catch(() => String(config.channelLog || '').trim());
  if (!target) return;
  try {
    const ref = displayPaymentReference(order?.invoice_ref || order?.order_ref || '-');
    const text = `⚠️ ORDER RESELLER BOT PERLU DIPERIKSA\n` +
      `=======================\n` +
      `Invoice: ${ref}\n` +
      `Produk: ${product?.nama || product?.kode || '-'}\n` +
      `Supplier Bot: ${workflow?.target_username || '-'}\n` +
      `Workflow: ${workflow?.name || workflow?.id || '-'}\n` +
      `Step: ${Number(run?.current_step || 0) + 1}\n` +
      `Status: ${run?.status || 'attention'}\n` +
      `Keterangan: ${String(error?.message || error || 'Workflow supplier belum selesai')}\n\n` +
      `Buka Dashboard → Workflow Reseller untuk melihat langkah dan retry secara manual.`;
    await sendChannelWithRetry(target, text, 3);
  } catch (notifyError) {
    console.error('Gagal kirim log workflow reseller:', notifyError.message || notifyError);
  }
}

async function processWorkflowDelivery({ order, product, transaction, buyer = {}, source = 'workflow-auto', forceRestart = false }) {
  const invoice = String(order?.invoice_ref || transaction?.order_ref || '').trim();
  if (!invoice) throw new Error('Invoice workflow reseller tidak ditemukan.');
  const link = workflowSelection(product, transaction || order);
  if (!link) return { handled: false };

  const workflow = await db.getResellerWorkflow(link.workflowId);
  if (!workflow || workflow.active !== true) {
    const error = new Error('Workflow reseller belum aktif atau sudah dihapus.');
    error.code = 'WORKFLOW_NOT_ACTIVE';
    await db.upsertSupplierOrder({
      order_ref: invoice, supplier: 'telegram_workflow', supplier_product_id: link.workflowId,
      quantity: Math.max(1, Number(order?.quantity || transaction?.quantity || 1)), status: 'error',
      error_code: error.code, error_message: error.message, raw_response: {}
    }).catch(() => null);
    const buyerNotified = await sendWorkflowFailureNotice(order?.telegram_id || transaction?.telegram_id, invoice);
    return { handled: true, pending: true, error, transaction, workflow_failure_notified: buyerNotified };
  }

  const orderQuantity = Math.max(1, Number(order?.quantity || transaction?.quantity || 1));
  const steps = await db.listResellerWorkflowSteps(workflow.id);
  if (!steps.length || !steps.some((step) => step.capture_result === true)) {
    const error = new Error('Workflow reseller belum lengkap. Rekam langkah dan tandai satu balasan sebagai Hasil Produk.');
    error.code = 'WORKFLOW_INCOMPLETE';
    await notifyOwnerWorkflowIssue({ ...order, invoice_ref: invoice }, product, error, workflow, null);
    const buyerNotified = await sendWorkflowFailureNotice(order?.telegram_id || transaction?.telegram_id, invoice);
    return { handled: true, pending: true, error, transaction, workflow_failure_notified: buyerNotified };
  }

  const existingPo = await db.getPoOrder(invoice).catch(() => null);
  let run = await db.getResellerWorkflowRun(invoice).catch(() => null);
  if (existingPo?.status === 'delivered' && String(existingPo.delivery_text || '').trim()) {
    const delivered = String(existingPo.delivery_text).split(/\r?\n/).filter(Boolean);
    if (run?.supplier_cost_total_idr > 0 && !run?.supplier_balance_debited_at) {
      run = await settleWorkflowSupplierCost(workflow, run, invoice, orderQuantity).catch((error) => { console.error('Debit saldo supplier workflow tertunda:', error.message || error); return run; });
    }
    await sendSupplierDeliveryOnce({ invoice, userId: Number(order?.telegram_id || transaction?.telegram_id), poOrder: existingPo, deliveryText: existingPo.delivery_text, product }).catch(() => null);
    await sendOwnerLog({ ...order, invoice_ref: invoice }, product, transaction, buyer).catch(() => null);
    return { handled: true, delivered, po_order: existingPo, transaction, workflow_run: run };
  }

  if (run?.status === 'delivered' && String(run.result_text || '').trim()) {
    if (run?.supplier_cost_total_idr > 0 && !run?.supplier_balance_debited_at) {
      run = await settleWorkflowSupplierCost(workflow, run, invoice, orderQuantity).catch((error) => { console.error('Debit saldo supplier workflow tertunda:', error.message || error); return run; });
    }
    const marked = await db.markPoDelivered(invoice, run.result_text, config.ownerId || null);
    const poOrder = marked?.po_order || await db.getPoOrder(invoice);
    const finalTransaction = marked?.transaction || transaction;
    await sendSupplierDeliveryOnce({ invoice, userId: Number(order?.telegram_id || transaction?.telegram_id), poOrder: poOrder || { ...order, order_ref: invoice }, deliveryText: run.result_text, product });
    await sendOwnerLog({ ...order, invoice_ref: invoice }, product, finalTransaction, buyer);
    return { handled: true, delivered: run.result_text.split(/\r?\n/).filter(Boolean), po_order: poOrder, transaction: finalTransaction, workflow_run: run };
  }

  if (run && !forceRestart && String(run.status || '').toLowerCase() === 'attention') {
    const error = new Error(run.error_message || 'Workflow dihentikan untuk keamanan karena step sebelumnya mungkin sudah terkirim ke supplier. Periksa chat supplier sebelum melakukan mulai ulang.');
    error.code = run.error_code || 'WORKFLOW_ATTENTION';
    return { handled: true, pending: true, error, transaction, workflow_run: run };
  }
  if (run && !forceRestart && String(run.status || '').toLowerCase() === 'running') {
    const updatedAt = new Date(run.updated_at || run.started_at || 0).getTime();
    const ageMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : 0;
    if (ageMs < 180000) {
      const error = new Error('Workflow supplier masih sedang diproses. Sistem tidak akan mengulang step yang sama.');
      error.code = 'WORKFLOW_STILL_RUNNING';
      return { handled: true, pending: true, error, transaction, workflow_run: run };
    }
    run = await db.patchResellerWorkflowRun(invoice, {
      status: 'attention',
      error_code: 'WORKFLOW_STALE_IN_FLIGHT',
      error_message: 'Proses sebelumnya terputus ketika sebuah step mungkin sedang dikirim ke supplier. Periksa chat supplier sebelum mulai ulang agar tidak terjadi double order.'
    }).catch(() => run);
    const error = new Error(run?.error_message || 'Workflow terhenti pada step yang belum pasti.');
    error.code = 'WORKFLOW_STALE_IN_FLIGHT';
    return { handled: true, pending: true, error, transaction, workflow_run: run };
  }

  if (run && !forceRestart && String(run.status || '').toLowerCase() === 'queued' && run.started_at) {
    run = await db.patchResellerWorkflowRun(invoice, {
      status: 'attention',
      error_code: 'WORKFLOW_REPLAY_BLOCKED',
      error_message: 'Workflow ini pernah mulai berjalan. Replay otomatis dari awal diblokir untuk mencegah pembelian supplier terulang.'
    }).catch(() => run);
    const error = new Error(run?.error_message || 'Replay workflow diblokir.');
    error.code = 'WORKFLOW_REPLAY_BLOCKED';
    return { handled: true, pending: true, error, transaction, workflow_run: run };
  }

  const manualSupplier = await workflowManualSupplierInfo(workflow, orderQuantity);
  if (workflow.supplier_id) {
    let supplierError = null;
    if (!manualSupplier.supplier || manualSupplier.supplier.active === false) {
      supplierError = new Error('Supplier workflow sedang tidak tersedia/nonaktif.');
      supplierError.code = 'WORKFLOW_SUPPLIER_INACTIVE';
    } else if (!(manualSupplier.unitCost > 0)) {
      supplierError = new Error('Modal produk workflow belum diisi. Isi modal agar stok dapat dihitung dari saldo supplier.');
      supplierError.code = 'WORKFLOW_COST_NOT_SET';
    } else if (manualSupplier.estimatedStock < orderQuantity) {
      supplierError = new Error(`Saldo manual supplier tidak mencukupi. Stok perkiraan: ${manualSupplier.estimatedStock}.`);
      supplierError.code = 'WORKFLOW_MANUAL_BALANCE';
    }
    if (supplierError) {
      if (!run) {
        run = await db.upsertResellerWorkflowRun({
          order_ref: invoice, workflow_id: workflow.id, telegram_id: Number(order?.telegram_id || transaction?.telegram_id || 0),
          product_code: transaction?.product_code || order?.product_code || product?.kode || '', variant_key: transaction?.variant_key || order?.variant_key || '',
          quantity: orderQuantity, supplier_id: workflow.supplier_id, supplier_unit_cost_idr: manualSupplier.unitCost, supplier_cost_total_idr: manualSupplier.totalCost,
          status: 'attention', current_step: 0, error_code: supplierError.code, error_message: supplierError.message
        });
      } else {
        run = await db.patchResellerWorkflowRun(invoice, { status: 'attention', error_code: supplierError.code, error_message: supplierError.message }).catch(() => run);
      }
      const buyerNotified = await sendWorkflowFailureNotice(order?.telegram_id || transaction?.telegram_id, invoice);
      return { handled: true, pending: true, error: supplierError, transaction, workflow_run: run, workflow_failure_notified: buyerNotified };
    }
  }

  if (forceRestart) {
    // Hanya aksi manual owner yang boleh menghapus guard. Retry otomatis tidak pernah masuk sini.
    await db.resetResellerWorkflowRunStepGuards(invoice);
  }

  if (!run || forceRestart) {
    run = await db.upsertResellerWorkflowRun({
      order_ref: invoice,
      workflow_id: workflow.id,
      telegram_id: Number(order?.telegram_id || transaction?.telegram_id || 0),
      product_code: transaction?.product_code || order?.product_code || product?.kode || '',
      variant_key: transaction?.variant_key || order?.variant_key || '',
      quantity: orderQuantity,
      supplier_id: manualSupplier.supplier?.id || workflow.supplier_id || null,
      supplier_unit_cost_idr: manualSupplier.unitCost,
      supplier_cost_total_idr: manualSupplier.totalCost,
      supplier_balance_debited_at: run?.supplier_balance_debited_at || null,
      status: 'queued', current_step: 0, result_text: '', last_message_id: null, last_message_snapshot: {},
      error_code: '', error_message: '', started_at: null, finished_at: null
    });
  }

  if (run && workflow.supplier_id && !(Number(run.supplier_cost_total_idr || 0) > 0)) {
    run = await db.patchResellerWorkflowRun(invoice, {
      supplier_id: manualSupplier.supplier?.id || workflow.supplier_id || null,
      supplier_unit_cost_idr: manualSupplier.unitCost,
      supplier_cost_total_idr: manualSupplier.totalCost
    }).catch(() => run);
  }

  const targetLock = `workflow_supplier:${String(workflow.target_username || '').toLowerCase()}`;
  const locked = await db.claimOnce(targetLock, 600, { invoice, workflow_id: workflow.id }, { failClosed: true });
  if (!locked) {
    const error = new Error('Bot supplier sedang memproses order lain. Pesanan masuk antrean dan akan dicoba otomatis.');
    error.code = 'WORKFLOW_BUSY';
    run = await db.patchResellerWorkflowRun(invoice, { status: 'queued', error_code: error.code, error_message: error.message });
    const retryScheduled = workflowRetry.scheduleWorkflowRetry(invoice, 0);
    return { handled: true, pending: true, error, transaction, workflow_run: run, retry_scheduled: retryScheduled };
  }

  try {
    run = await db.patchResellerWorkflowRun(invoice, {
      status: 'running', error_code: '', error_message: '', started_at: run.started_at || new Date().toISOString()
    });
    const context = {
      quantity: orderQuantity,
      invoice,
      telegram_id: Number(order?.telegram_id || transaction?.telegram_id || 0),
      username: buyer?.username || buyer?.first_name || '',
      custom_input: ''
    };
    const runtime = await workflowUserbot.runWorkflowSteps({
      workflow,
      steps,
      start_index: forceRestart ? 0 : Math.max(0, Number(run?.current_step || 0)),
      last_response: forceRestart ? null : (run?.last_message_snapshot || null),
      context,
      on_before_step: async ({ index, step, last_response }) => {
        // Guard persisten per invoice + step. Satu step hanya boleh DIKIRIM SEKALI ke supplier.
        // Jika serverless/retry masuk lagi pada step yang sama, proses berhenti sebelum klik/kirim ulang.
        const guard = await db.claimResellerWorkflowRunStep(invoice, workflow.id, index + 1, step);
        if (!guard?.claimed) {
          const error = new Error(`Step ${index + 1} sudah pernah mulai dikirim ke supplier. Sistem menghentikan replay untuk mencegah order ganda.`);
          error.code = guard?.row?.status === 'completed' ? 'WORKFLOW_STEP_ALREADY_COMPLETED' : 'WORKFLOW_STEP_ALREADY_SENT';
          error.step_index = index;
          error.last_response = last_response || run?.last_message_snapshot || null;
          throw error;
        }
        run = await db.patchResellerWorkflowRun(invoice, {
          status: 'running',
          current_step: index,
          last_message_id: last_response?.id || run?.last_message_id || null,
          last_message_snapshot: last_response || run?.last_message_snapshot || {},
          error_code: 'STEP_IN_FLIGHT',
          error_message: `Menjalankan step ${index + 1}: ${step.action_type === 'button' ? 'klik tombol ' : 'kirim teks '}${step.action_value}`
        });
      },
      on_step: async ({ index, response }) => {
        // Tandai guard step selesai SEBELUM memajukan current_step.
        // Jika update run gagal setelah supplier sudah merespons, retry tetap tidak akan mengirim step lagi.
        await db.completeResellerWorkflowRunStep(invoice, index + 1, response || null);
        run = await db.patchResellerWorkflowRun(invoice, {
          status: 'running',
          current_step: index + 1,
          last_message_id: response?.id || null,
          last_message_snapshot: response || {},
          error_code: '', error_message: ''
        });
      }
    });

    if (!runtime.completed || !String(runtime.result_text || '').trim()) {
      const error = new Error('Workflow selesai tanpa step Hasil Produk.');
      error.code = 'WORKFLOW_NO_RESULT';
      throw error;
    }

    const resultText = String(runtime.result_text || '').trim();
    run = await db.patchResellerWorkflowRun(invoice, {
      status: 'delivered', current_step: runtime.current_step, result_text: resultText,
      last_message_id: runtime.last_response?.id || null, last_message_snapshot: runtime.last_response || {},
      error_code: '', error_message: '', finished_at: new Date().toISOString()
    });
    if (run?.supplier_cost_total_idr > 0 && !run?.supplier_balance_debited_at) {
      run = await settleWorkflowSupplierCost(workflow, run, invoice, orderQuantity).catch((error) => {
        console.error('Produk supplier sudah didapat tetapi debit saldo manual gagal:', error.message || error);
        return run;
      });
    }
    await db.upsertSupplierOrder({
      order_ref: invoice, supplier: 'telegram_workflow', supplier_order_id: workflow.id,
      supplier_product_id: workflow.id, quantity: context.quantity, amount_usdt: 0,
      status: 'delivered', delivered_text: resultText, error_code: '', error_message: '',
      raw_response: { workflow_id: workflow.id, workflow_name: workflow.name, target_username: workflow.target_username, run_id: run?.id || null }
    });
    const marked = await db.markPoDelivered(invoice, resultText, config.ownerId || null);
    const poOrder = marked?.po_order || await db.getPoOrder(invoice);
    const finalTransaction = marked?.transaction || transaction;
    await sendSupplierDeliveryOnce({
      invoice,
      userId: Number(order?.telegram_id || transaction?.telegram_id),
      poOrder: poOrder || { ...order, order_ref: invoice },
      deliveryText: resultText,
      product
    });
    await sendOwnerLog({ ...order, invoice_ref: invoice }, product, finalTransaction, buyer);
    return { handled: true, delivered: resultText.split(/\r?\n/).filter(Boolean), po_order: poOrder, transaction: finalTransaction, workflow_run: run };
  } catch (error) {
    // Jika hasil supplier SUDAH didapat dan disimpan, jangan pernah menurunkan status menjadi
    // ATTENTION/QUEUED. Retry berikutnya cukup mengirim ulang receipt ke user, bukan order supplier.
    if (String(run?.status || '').toLowerCase() === 'delivered' && String(run?.result_text || '').trim()) {
      await notifyOwnerWorkflowIssue({ ...order, invoice_ref: invoice }, product, error, workflow, run);
      return {
        handled: true,
        pending: true,
        error,
        delivered: String(run.result_text).split(/\r?\n/).filter(Boolean),
        transaction,
        workflow_run: run,
        supplier_completed: true
      };
    }
    const status = error?.code === 'WORKFLOW_BUSY' ? 'queued' : 'attention';
    run = await db.patchResellerWorkflowRun(invoice, {
      status,
      error_code: String(error?.code || 'WORKFLOW_ERROR'),
      error_message: String(error?.message || error || 'Workflow reseller error'),
      last_message_id: error?.last_response?.id || run?.last_message_id || null,
      last_message_snapshot: error?.last_response || run?.last_message_snapshot || {}
    }).catch(() => run);
    await db.upsertSupplierOrder({
      order_ref: invoice, supplier: 'telegram_workflow', supplier_order_id: workflow.id,
      supplier_product_id: workflow.id, quantity: Math.max(1, Number(order?.quantity || transaction?.quantity || 1)),
      amount_usdt: 0, status, delivered_text: run?.result_text || '',
      error_code: String(error?.code || 'WORKFLOW_ERROR'), error_message: String(error?.message || error || ''),
      raw_response: { workflow_id: workflow.id, target_username: workflow.target_username, current_step: Number(run?.current_step || 0) }
    }).catch(() => null);
    await notifyOwnerWorkflowIssue({ ...order, invoice_ref: invoice }, product, error, workflow, run);
    const buyerNotified = await sendWorkflowFailureNotice(order?.telegram_id || transaction?.telegram_id, invoice);
    return { handled: true, pending: true, error, transaction, workflow_run: run, workflow_failure_notified: buyerNotified };
  } finally {
    await db.releaseClaim(targetLock).catch(() => null);
  }
}

async function retryWorkflowOrder(orderRef, actor = {}, options = {}) {
  const invoice = String(orderRef || '').trim();
  if (!invoice) throw new Error('Invoice workflow wajib diisi.');
  const transaction = await db.getTransactionByOrderRef(invoice);
  if (!transaction) throw new Error('Transaksi pelanggan tidak ditemukan.');
  const product = await db.getProductByCode(transaction.product_code);
  if (!isWorkflowProduct(product, transaction)) throw new Error('Produk/varian pada invoice ini bukan Workflow Reseller.');
  const buyer = Object.keys(actor || {}).length ? actor : (await db.getUserByTelegramId(transaction.telegram_id).catch(() => null)) || {};
  const result = await processWorkflowDelivery({
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
    source: 'workflow-manual-retry',
    forceRestart: options.forceRestart === true
  });
  if (result.pending) throw result.error || new Error('Workflow reseller belum selesai.');
  return result;
}

async function notifyOwnerSupplierIssue(order, product, error, supplierRow = null) {
  if (!config.channelLog) return;
  try {
    const ref = displayPaymentReference(order?.invoice_ref || order?.order_ref || '-');
    const text = `⚠️ ORDER SUPPLIER BELUM TERKIRIM\n` +
      `=======================\n` +
      `Invoice: ${ref}\n` +
      `Produk: ${product?.nama || product?.kode || '-'}\n` +
      `Supplier: ProdSeller\n` +
      `Product ID: ${prodSellerSelection(product, order)?.productId || '-'}\n` +
      `Jumlah: ${Number(order?.quantity || 1)}\n` +
      `Status: ${supplierRow?.status || 'error'}\n` +
      `Keterangan: ${String(error?.message || error || 'Belum terkirim')}\n\n` +
      `Buka Reseller Dashboard → Supplier / Reseller untuk cek saldo lalu Retry Supplier.`;
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
      await sendOwnerLog({ ...order, invoice_ref: invoice }, product, transaction, buyer);
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

async function retrySupplierOrder(orderRef, actor = {}) {
  const invoice = String(orderRef || '').trim();
  if (!invoice) throw new Error('Invoice supplier wajib diisi.');
  const transaction = await db.getTransactionByOrderRef(invoice);
  if (!transaction) throw new Error('Transaksi pelanggan tidak ditemukan.');
  const product = await db.getProductByCode(transaction.product_code);
  if (!isProdSellerProduct(product, transaction)) throw new Error('Produk/varian pada invoice ini bukan produk ProdSeller.');
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
    let workflowResult = null;
    if (poWaiting && isWorkflowProduct(product, result.transaction || order)) {
      // Jalankan workflow lebih dulu. Jika selesai cepat, pembeli langsung menerima produk
      // tanpa pesan "sedang diproses" yang tidak perlu. Jika masih antre/error, blok
      // po_paid_notice di bawah mengirim satu notifikasi pending secara idempotent.
      workflowResult = await processWorkflowDelivery({ order, product, transaction: result.transaction, buyer: currentBuyer, source });
      if (workflowResult && !workflowResult.pending && workflowResult.delivered?.length) {
        poWaiting = false;
        result.transaction = workflowResult.transaction || result.transaction;
        result.delivered = workflowResult.delivered;
      }
    } else if (poWaiting && isProdSellerProduct(product, result.transaction || order)) {
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
      supplierResult = await processProdSellerDelivery({ order, product, transaction: result.transaction, buyer: currentBuyer, source });
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
          if (!(workflowResult && workflowResult.workflow_failure_notified)) {
            if (isProdSellerProduct(product, result.transaction || order) || isWorkflowProduct(product, result.transaction || order)) await sendSupplierPendingNotice(order.telegram_id);
            else await sendPoPaidNotice(order.telegram_id, order, product, result.transaction);
          }
          await db.markClaimDone(noticeKey, { invoice, state: workflowResult?.workflow_failure_notified ? 'workflow_failed' : 'notified' }).catch(() => null);
        } catch (noticeError) {
          await db.releaseClaim(noticeKey).catch(() => null);
          throw noticeError;
        }
      }
      await sendOwnerPoWaitingLog(order, product, result.transaction, currentBuyer);
    } else {
      // Catat transaksi ke channel lebih dulu dan jangan bergantung pada sukses/gagalnya
      // pengiriman receipt ke chat pembeli. Ini mencegah notifikasi channel hilang ketika
      // Telegram user sedang error / memblokir bot.
      await sendOwnerLog(order, product, result.transaction, currentBuyer);
      if (!(supplierResult && supplierResult.delivered && supplierResult.delivered.length) && !(workflowResult && workflowResult.delivered && workflowResult.delivered.length)) {
        await sendOrderReceipt(order.telegram_id, order, product, result.transaction, result.delivered);
      }
    }
    await db.deletePendingOrder(order.telegram_id, order.invoice_ref);
    await notifyFirstPurchaseReferral(order.telegram_id);
    await db.markClaimDone(processKey, { invoice, source, state: poWaiting ? 'awaiting_delivery' : 'completed' });

    return {
      ok: true,
      state: result.already_completed ? 'already_completed' : (poWaiting ? ((supplierResult?.pending || workflowResult?.pending) ? 'supplier_waiting' : 'awaiting_delivery') : 'completed'),
      po_waiting: poWaiting,
      transaction: result.transaction,
      delivered: result.delivered
    };
  } catch (error) {
    await db.releaseClaim(processKey).catch(() => null);
    throw error;
  }
}


async function recoverTransactionNotifications(limit = 30) {
  const rows = await db.listTransactions(Math.max(1, Math.min(100, Number(limit || 30)))).catch(() => []);
  const results = [];
  for (const transaction of rows) {
    const invoice = String(transaction?.order_ref || '').trim();
    if (!invoice) continue;
    const [product, buyer] = await Promise.all([
      db.getProductByCode(transaction.product_code).catch(() => null),
      db.getUserByTelegramId(transaction.telegram_id).catch(() => null)
    ]);
    const order = {
      invoice_ref: invoice,
      telegram_id: Number(transaction.telegram_id || 0),
      product_code: transaction.product_code || '',
      quantity: Number(transaction.quantity || 1),
      amount: Number(transaction.total_price || 0),
      fee: Number(transaction.fee || 0),
      variant_key: transaction.variant_key || '',
      variant_name: transaction.variant_name || ''
    };
    const sent = await sendOwnerLog(order, product, transaction, buyer || {}).catch(() => false);
    results.push({ invoice: displayPaymentReference(invoice), sent: Boolean(sent) });
  }
  return results;
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
  retryWorkflowOrder,
  processWorkflowDelivery,
  isWorkflowProduct,
  workflowSelection,
  sendOrderReceipt,
  sendPoPaidNotice,
  sendPoDeliveryReceipt,
  sendOwnerPoWaitingLog,
  sendOwnerLog,
  recoverTransactionNotifications,
  watchPendingPayment,
  schedulePaymentWatcher
};
