const axios = require('axios');
const { config } = require('./config');
const db = require('./db');
const tg = require('./telegram');
const { formatRupiah, formatWIB } = require('./utils');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const trx = payload?.transaction || payload?.payment || payload || {};
  return {
    order_id: String(trx.order_id || '').trim(),
    project: String(trx.project || '').trim(),
    amount: Number(trx.amount || 0),
    status: String(trx.status || '').trim().toLowerCase(),
    payment_method: String(trx.payment_method || '').trim(),
    completed_at: trx.completed_at || null
  };
}

function validateWebhookPayload(payload = {}, expectedProject = config.pakasirSlug) {
  const trx = normalizePakasirTransaction(payload);
  if (!trx.order_id) return { ok: false, reason: 'order_id kosong', transaction: trx };
  if (!Number.isFinite(trx.amount) || trx.amount <= 0) return { ok: false, reason: 'amount tidak valid', transaction: trx };
  if (expectedProject && trx.project !== String(expectedProject)) return { ok: false, reason: 'project tidak cocok', transaction: trx };
  return { ok: true, transaction: trx };
}

function paymentMatchesOrder(transaction, order) {
  return Boolean(
    transaction &&
    order &&
    String(transaction.order_id) === String(order.invoice_ref || '') &&
    Number(transaction.amount) === Number(order.amount || 0) &&
    (!config.pakasirSlug || String(transaction.project) === String(config.pakasirSlug))
  );
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
    invoice: transaction?.order_ref || order?.invoice_ref || '-',
    productName: transaction?.product_name || product?.nama || order?.product_code || '-',
    productCode: transaction?.product_code || product?.kode || order?.product_code || '',
    variantName: transaction?.variant_name || order?.variant_name || '',
    variantKey: transaction?.variant_key || order?.variant_key || '',
    quantity,
    total,
    fee,
    subtotal,
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
    (ctx.fee > 0 ? `Fee: <b>${escapeHtml(formatRupiah(ctx.fee))}</b>\n` : '') +
    `Total Dibayar: <b>${escapeHtml(formatRupiah(ctx.total))}</b>\n` +
    `Tanggal: <b>${escapeHtml(formatWIB(new Date()))}</b>\n` +
    `=======================\n\n` +
    `<b>SYARAT & KETENTUAN</b>\n${escapeHtml(terms)}\n\n` +
    `<b>PRODUK YANG DIDAPAT</b>\n<pre>${escapeHtml(productForMessage || '-')}</pre>\n` +
    `Pembayaran terdeteksi otomatis dan produk sudah dikirim.`;

  const keyboard = rawProduct.length && rawProduct.length <= 256
    ? { inline_keyboard: [[{ text: '📋 Salin Produk', copy_text: { text: rawProduct } }]] }
    : undefined;

  try {
    return await tg.sendMessage(userId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (error) {
    console.error('Gagal kirim invoice otomatis:', error.message);
    return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
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
      `✅ PEMBAYARAN OTOMATIS BERHASIL\n` +
      `=======================\n` +
      `User: ${username}\n` +
      `Trx ID: ${transaction?.order_ref || order?.invoice_ref || '-'}\n` +
      `Produk: ${productName}${variantName ? ' - ' + variantName : ''}\n` +
      `Harga: ${formatRupiah(subtotal)}\n` +
      `Jumlah: ${Number(transaction?.quantity || order?.quantity || 1)}\n` +
      `Fee: ${formatRupiah(fee)}\n` +
      `Total: ${formatRupiah(total)}\n` +
      `Sumber: webhook Pakasir / pengecekan otomatis`
    );
  } catch (error) {
    console.error('Gagal kirim log pembayaran:', error.message);
  }
}

async function fulfillPaidOrder({ order, buyer = {}, source = 'webhook' }) {
  if (!order?.invoice_ref) throw new Error('Invoice lokal tidak ditemukan.');
  const invoice = String(order.invoice_ref);
  const processKey = `payment_process:${invoice}`;
  const claimed = await db.claimOnce(processKey, 365 * 24 * 60 * 60, { invoice, source });

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

    await sendOrderReceipt(order.telegram_id, order, product, result.transaction, result.delivered);
    // Hapus pesanan segera setelah produk berhasil dikirim. Webhook duplikat berikutnya
    // akan menemukan transaksi yang sudah selesai dan tidak mengirim produk ulang.
    await db.deletePendingOrder(order.telegram_id);
    await sendOwnerLog(order, product, result.transaction, currentBuyer);
    await db.markClaimDone(processKey, { invoice, source, state: 'completed' });

    return {
      ok: true,
      state: result.already_completed ? 'already_completed' : 'completed',
      transaction: result.transaction,
      delivered: result.delivered
    };
  } catch (error) {
    await db.releaseClaim(processKey).catch(() => null);
    throw error;
  }
}

module.exports = {
  normalizePakasirTransaction,
  validateWebhookPayload,
  paymentMatchesOrder,
  verifyPakasirTransaction,
  fulfillPaidOrder,
  sendOrderReceipt
};
