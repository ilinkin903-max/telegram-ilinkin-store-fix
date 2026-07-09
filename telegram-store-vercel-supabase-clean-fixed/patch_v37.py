from pathlib import Path
p=Path('/mnt/data/v37work/lib/botHandlers.js')
s=p.read_text()
insert_after = "async function sendHistory(chatId, userId, query = null) {\n"
if 'async function sendHelp' not in s:
    idx=s.index(insert_after)
    # find end of sendHistory by locating next function confirmationText
    end=s.index('\nfunction confirmationText', idx)
    helper = r'''
async function sendHelp(chatId, from) {
  const ownerLine = isOwner(from.id)
    ? '\n\n*Owner/Admin:*\n/ownermenu - Buka menu owner\n/reseller - Buka Admin Dashboard\n/debugowner - Cek konfigurasi owner\n/rekap - Rekap penjualan bulanan'
    : '';
  const text = `❓ *BANTUAN BOT*\n` +
    `=======================\n` +
    `*Command User:*\n` +
    `/start - Buka menu utama\n` +
    `/produk - Lihat daftar produk\n` +
    `/cekorder - Cek pesanan/riwayat transaksi\n` +
    `/help - Tampilkan bantuan\n\n` +
    `*Cara Order:*\n` +
    `1. Ketik /start atau /produk\n` +
    `2. Pilih produk/varian\n` +
    `3. Atur jumlah pesanan\n` +
    `4. Klik Konfirmasi\n` +
    `5. Scan QRIS\n` +
    `6. Setelah bayar, klik Saya Sudah Bayar\n` +
    `7. Produk dikirim otomatis` + ownerLine;
  return tg.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

function pendingStatusText(status) {
  const map = {
    draft: 'Belum dibayar / masih pilih pesanan',
    ready_to_pay: 'Siap dibayar',
    waiting_voucher: 'Menunggu kode voucher',
    awaiting_payment: 'Menunggu pembayaran QRIS'
  };
  return map[String(status || '').toLowerCase()] || String(status || '-');
}

async function sendCheckOrder(chatId, userId, query = null) {
  const pending = await db.getPendingOrder(userId).catch(() => null);
  let text = `🔎 *CEK ORDER*\n=======================\n`;

  if (pending) {
    const product = await db.getProductByCode(pending.product_code).catch(() => null);
    text += `*Pesanan Aktif:*\n` +
      `Produk: *${escapeMarkdownText(product?.nama || pending.product_code || '-')}*${pending.variant_name ? ' - *' + escapeMarkdownText(pending.variant_name) + '*' : ''}\n` +
      `Jumlah: *${Number(pending.quantity || 1)}*\n` +
      `Status: *${escapeMarkdownText(pendingStatusText(pending.status))}*\n`;
    if (pending.invoice_ref) text += `Invoice: \`${escapeMarkdownText(pending.invoice_ref)}\`\n`;
    if (Number(pending.amount || 0) > 0) text += `Total Bayar: *${formatRupiah(pending.amount)}*\n`;
    if (pending.expires_at) text += `Expired: *${formatWIB(pending.expires_at)}*\n`;
    text += `-----------------------\n`;
  }

  const rows = await db.listTransactionsByUser(userId, 5).catch(() => []);
  if (!rows.length) {
    text += pending ? `Belum ada transaksi selesai.\n` : `Belum ada pesanan aktif atau transaksi selesai.\n`;
  } else {
    text += `*Riwayat Transaksi Terakhir:*\n` + rows.map((item, idx) => (
      `${idx + 1}. *${escapeMarkdownText(item.product_name || '-')}*${item.variant_name ? ' - ' + escapeMarkdownText(item.variant_name) : ''}\n` +
      `   Invoice: \`${escapeMarkdownText(item.order_ref || '-')}\`\n` +
      `   Jumlah: *${Number(item.quantity || 0)}*\n` +
      `   Total: *${formatRupiah(item.total_price || 0)}*\n` +
      `   Tanggal: *${formatWIB(item.created_at)}*`
    )).join('\n\n');
  }

  const options = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'kembaliawal' }]] } };
  if (query?.message?.message_id) return editMessage(query, text, options);
  return tg.sendMessage(chatId, text, options);
}

'''
    s=s[:end]+helper+s[end:]
# add handlers after getid line
old = "  if (lower.startsWith('/getid')) return tg.sendMessage(chatId, `ID Telegram kamu: ${from.id}`);\n"
new = old + "  if (lower.startsWith('/help') || lower.startsWith('/bantuan')) return sendHelp(chatId, from);\n  if (lower.startsWith('/cekorder') || lower.startsWith('/cekpesanan') || lower.startsWith('/riwayat')) return sendCheckOrder(chatId, from.id);\n"
if new not in s:
    s=s.replace(old,new)
# owner guard debugowner
old_dbg = "  if (lower.startsWith('/debugowner')) {\n    const miniAppUrl = getMiniAppUrl(req) || '-';\n    return tg.sendMessage(chatId, `DEBUG OWNER\\nUser ID: ${from.id}\\nOWNER_ID env: ${config.ownerId}\\nIs owner: ${isOwner(from.id) ? 'YA' : 'TIDAK'}\\nMINIAPP_URL: ${miniAppUrl}`);\n  }"
new_dbg = "  if (lower.startsWith('/debugowner')) {\n    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());\n    const miniAppUrl = getMiniAppUrl(req) || '-';\n    return tg.sendMessage(chatId, `DEBUG OWNER\\nUser ID: ${from.id}\\nOWNER_ID env: ${config.ownerId}\\nIs owner: ${isOwner(from.id) ? 'YA' : 'TIDAK'}\\nMINIAPP_URL: ${miniAppUrl}`);\n  }"
if old_dbg in s:
    s=s.replace(old_dbg,new_dbg)
else:
    print('debug block not found')
# update callback caraorder maybe use same help? leave
p.write_text(s)
