const axios = require('axios');
const { config } = require('./config');
const db = require('./db');
const tg = require('./telegram');
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

function sameProject(left, right) {
  return normalizedText(left).toLowerCase() === normalizedText(right).toLowerCase();
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
    order_id: normalizedText(trx.order_id || trx.orderId || trx.invoice || trx.reference),
    project: normalizedText(trx.project || trx.project_slug || trx.slug),
    amount: Number(trx.amount || trx.total || trx.nominal || 0),
    status: normalizedText(trx.status || trx.payment_status || trx.state).toLowerCase(),
    payment_method: normalizedText(trx.payment_method || trx.method || trx.channel),
    completed_at: trx.completed_at || trx.paid_at || null
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

function paymentMatchesOrder(transaction, order) {
  return Boolean(
    transaction &&
    order &&
    normalizedText(transaction.order_id) === normalizedText(order.invoice_ref) &&
    Number(transaction.amount) === Number(order.amount || 0) &&
    (!config.pakasirSlug || sameProject(transaction.project, config.pakasirSlug))
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

  // Telegram sudah menyediakan tombol salin bawaan pada blok <pre> produk.
  // Karena itu tombol inline "Salin Produk" dihapus agar tidak tampil dobel.
  return tg.sendMessage(userId, text, { parse_mode: 'HTML' });
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
      `Trx ID: ${transaction?.order_ref || order?.invoice_ref || '-'}\n` +
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
    // Hapus pesanan segera setelah produk berhasil dikirim. Webhook/watcher duplikat
    // berikutnya akan menemukan transaksi selesai dan tidak memotong stok ulang.
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

  // Beri waktu Pakasir membuat transaksi sebelum pengecekan pertama.
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
      const transaction = await verifyPakasirTransaction(order);
      if (transaction.status === 'completed') {
        const result = await fulfillPaidOrder({ order, source: 'background-watcher' });
        await db.markClaimDone(watchKey, { invoice, state: result.state || 'completed' }).catch(() => null);
        return result;
      }
      if (['cancelled', 'canceled', 'expired', 'failed'].includes(transaction.status)) {
        await db.markClaimDone(watchKey, { invoice, state: transaction.status }).catch(() => null);
        return { ok: true, state: transaction.status };
      }
    } catch (error) {
      lastError = error;
      // Gangguan API sesaat tidak menghentikan watcher; coba lagi sampai batas waktu.
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
  normalizePakasirTransaction,
  validateWebhookPayload,
  paymentMatchesOrder,
  verifyPakasirTransaction,
  fulfillPaidOrder,
  sendOrderReceipt,
  sendOwnerLog,
  watchPendingPayment,
  schedulePaymentWatcher
};
