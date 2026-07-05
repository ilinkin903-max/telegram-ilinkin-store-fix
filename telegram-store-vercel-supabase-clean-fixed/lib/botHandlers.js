const axios = require('axios');
const QRCode = require('qrcode');
const { config, getMiniAppUrl } = require('./config');
const tg = require('./telegram');
const db = require('./db');
const { formatRupiah, formatWIB, randomFee, randomRef, splitStock } = require('./utils');

function isOwner(userId) {
  return Number(userId) === Number(config.ownerId);
}

function ownerOnlyMessage() {
  return '⚠️ Hanya bisa diakses oleh owner!';
}

function parseCommandBody(text, command) {
  return String(text || '').replace(new RegExp(`^\\/${command}(?:@\\w+)?\\s*`, 'i'), '').trim();
}

function splitFirstPipe(raw) {
  const index = String(raw || '').indexOf('|');
  if (index === -1) return [String(raw || '').trim(), ''];
  return [String(raw).slice(0, index).trim(), String(raw).slice(index + 1).trim()];
}

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  return Number(cleaned || 0);
}

async function sendProductUpdated(chatId, product, label) {
  if (!product) return tg.sendMessage(chatId, '⚠️ Produk tidak ditemukan. Cek kembali kode produk.' );
  return tg.sendMessage(chatId, `✅ ${label} berhasil.\n\nProduk: *${product.nama}*\nKode: \`${product.kode}\`\nHarga: *${formatRupiah(product.harga)}*\nStok: *${product.data.length}*`, { parse_mode: 'Markdown' });
}

async function broadcastToUsers(payload = {}) {
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
    if (type === 'photo') return tg.sendPhotoRef(id, photo, { caption: caption || message || undefined });
    if (type === 'sticker') {
      await tg.sendSticker(id, sticker);
      if (message) await tg.sendMessage(id, message);
      return true;
    }
    return tg.sendMessage(id, message);
  }

  for (let i = 0; i < targets.length; i += 10) {
    const part = targets.slice(i, i + 10);
    const results = await Promise.allSettled(part.map(sendOne));
    results.forEach((r) => { if (r.status === 'fulfilled') sent += 1; else failed += 1; });
  }
  return { total: targets.length, sent, failed, type };
}


function homeKeyboard(req, userId) {
  const rows = [
    [{ text: '‹📦› Daftar Produk', callback_data: 'daftarproduk' }],
    [
      { text: '‹📋› Riwayat Transaksi', callback_data: 'riwayattransaksi' },
      { text: '‹❓› Cara Order', callback_data: 'caraorder' }
    ],
    [{ text: '‹📊› Stok', callback_data: 'stok' }]
  ];

  const miniAppUrl = getMiniAppUrl(req);
  if (miniAppUrl && isOwner(userId)) rows.push([{ text: '‹🧩› Reseller Panel', web_app: { url: miniAppUrl } }]);
  if (config.channelStore) rows.push([{ text: '‹📢› Channel', url: config.channelStore }]);
  if (config.customerService) rows.push([{ text: '‹📞› Customer Service', url: config.customerService }]);
  return { inline_keyboard: rows };
}

async function sendHome(chatId, from, req) {
  await db.upsertUser(from);
  const stats = await db.getStats();
  const text = `Halo, *${from.first_name || 'Kak'}* 👋\n\n` +
    `Selamat datang di *${config.botName}*\n` +
    `- 👥 Total User: *${stats.users} User*\n` +
    `- 🛍️ Total Transaksi: *${stats.orders} Transaksi*\n` +
    `- 📦 Stok Tersedia: *${stats.stokTersedia}*\n` +
    `- 📦 Stok Terjual: *${stats.stokTerjual}*\n\n` +
    `Silahkan pilih tombol dibawah ini!`;

  const reply_markup = homeKeyboard(req, from.id);
  const settings = await db.getShopSettings().catch(() => ({}));
  const mediaType = String(settings.start_media_type || 'none').toLowerCase();
  const mediaValue = String(settings.start_media_value || '').trim();
  const mediaCaption = String(settings.start_media_caption || '').trim();

  if (mediaValue && mediaType === 'photo') {
    try {
      return await tg.sendPhotoRef(chatId, mediaValue, {
        caption: mediaCaption || text,
        parse_mode: mediaCaption ? undefined : 'Markdown',
        reply_markup
      });
    } catch (error) {
      console.error('Gagal kirim media /start:', error.message);
    }
  }

  if (mediaValue && mediaType === 'sticker') {
    try {
      await tg.sendSticker(chatId, mediaValue);
    } catch (error) {
      console.error('Gagal kirim stiker /start:', error.message);
    }
  }

  return tg.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup
  });
}

function variantKey(variant, index = 0) {
  return String(variant?.sku || variant?.kode || variant?.key || variant?.name || variant?.nama || `VAR${index + 1}`)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

function stockOfVariant(variant) {
  return Array.isArray(variant?.stock) ? variant.stock : [];
}

function productStockTotal(product) {
  const variantTotal = (product.variants || []).reduce((sum, variant) => sum + stockOfVariant(variant).length, 0);
  return variantTotal > 0 ? variantTotal : (Array.isArray(product.data) ? product.data.length : 0);
}

function variantPrice(product, variant) {
  return Number(variant?.price || product?.harga || 0);
}

function variantDescription(product, variant) {
  return String(variant?.description || variant?.deskripsi || product?.deskripsi || '-');
}

function variantTerms(product, variant) {
  return String(variant?.snk || variant?.terms || product?.snk || '-');
}

function bulkRows(product, variant) {
  const rows = (variant?.bulk_prices && variant.bulk_prices.length) ? variant.bulk_prices : (product.bulk_prices || []);
  return rows
    .map((x) => ({ min_qty: Number(x.min_qty || x.qty || 0), price: Number(x.price || x.harga || 0) }))
    .filter((x) => x.min_qty > 0 && x.price > 0)
    .sort((a, b) => a.min_qty - b.min_qty);
}

function formatBulkText(product, variant) {
  const rows = bulkRows(product, variant);
  if (!rows.length) return '-';
  return rows.map((x) => `Mulai ${x.min_qty} pcs: ${formatRupiah(x.price)} / pcs`).join('\n');
}

function selectedVariant(product, order = {}) {
  const key = String(order.variant_key || '').trim().toUpperCase();
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!key) return null;
  return variants.find((variant, index) => variantKey(variant, index) === key) || null;
}

function orderUnitPrice(product, order = {}) {
  const variant = selectedVariant(product, order);
  const quantity = Math.max(1, Number(order.quantity || 1));
  let unit = Number(order.unit_price || variantPrice(product, variant));
  bulkRows(product, variant).forEach((row) => {
    if (quantity >= row.min_qty) unit = row.price;
  });
  return unit;
}

function availableStockForOrder(product, order = {}) {
  const variant = selectedVariant(product, order);
  if (variant) return stockOfVariant(variant).length;
  return Array.isArray(product.data) ? product.data.length : 0;
}

function productButtons(products) {
  const rows = products.slice(0, 80).map((p) => {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const prices = variants.length ? variants.map((v) => variantPrice(p, v)).filter(Boolean) : [Number(p.harga || 0)];
    const minPrice = prices.length ? Math.min(...prices) : Number(p.harga || 0);
    const suffix = variants.length ? ` | ${variants.length} varian` : '';
    return [{
      text: `${p.nama} | mulai ${formatRupiah(minPrice)} | Stok ${productStockTotal(p)}${suffix}`,
      callback_data: `item:${p.kode}`
    }];
  });
  rows.push([{ text: '🔙 Kembali', callback_data: 'kembaliawal' }]);
  return { inline_keyboard: rows };
}

async function sendProductList(chatId) {
  const products = await db.listProducts();
  if (!products.length) return tg.sendMessage(chatId, '📭 Belum ada produk.');
  const text = '*DAFTAR PRODUK*\n=======================\nPilih produk terlebih dahulu. Setelah itu pilih varian, lalu jumlah belinya.';
  return tg.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: productButtons(products)
  });
}

async function sendStock(chatId) {
  const products = await db.listProducts();
  if (!products.length) return tg.sendMessage(chatId, '📭 Belum ada produk.');
  const text = '*STOK PRODUK*\n=======================\n' + products.map((p, i) => {
    const variantLines = (p.variants || []).map((v) => `   - ${v.name}: *${stockOfVariant(v).length}* stok | ${formatRupiah(variantPrice(p, v))}`).join('\n');
    return `${i + 1}. *${p.nama}* \`${p.kode}\`\n   Total Stok: *${productStockTotal(p)}* | Terjual: *${p.terjual}*${variantLines ? '\n' + variantLines : ''}`;
  }).join('\n\n');
  return tg.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

async function sendHistory(chatId, userId) {
  const rows = await db.listTransactionsByUser(userId, 8);
  if (!rows.length) return tg.sendMessage(chatId, '📭 Kamu belum memiliki riwayat transaksi.');
  const text = '*RIWAYAT TRANSAKSI*\n=======================\n' + rows.map((item, idx) => (
    `${idx + 1}. *${item.product_name}*${item.variant_name ? ' - ' + item.variant_name : ''}\n` +
    `   Kode: \`${item.product_code}\`\n` +
    `   Jumlah: *${item.quantity}*\n` +
    `   Harga: *${formatRupiah(item.total_price)}*\n` +
    `   Tanggal: *${formatWIB(item.created_at)}*`
  )).join('\n\n');
  return tg.sendMessage(chatId, text, { parse_mode: 'Markdown' });
}

function confirmationText(product, order) {
  const variant = selectedVariant(product, order);
  const unit = orderUnitPrice(product, order);
  const quantity = Number(order.quantity || 1);
  const total = quantity * unit;
  const bulk = formatBulkText(product, variant);
  return `*KONFIRMASI PESANAN*
` +
    `=======================
` +
    `Produk: *${product.nama}*
` +
    `Varian: *${variant ? variant.name : (order.variant_name || 'Default')}*
` +
    `Harga Satuan: *${formatRupiah(unit)}*
` +
    `Harga Grosir:
${bulk}
` +
    `Stok Tersedia: *${availableStockForOrder(product, order)}*
` +
    `-----------------------
` +
    `Jumlah Pesanan: *${quantity}*
` +
    `Total Dibayar: *${formatRupiah(total)}*
` +
    `=======================
` +
    `Klik ✅ Konfirmasi untuk melakukan pembayaran`;
}

function quantityKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '-', callback_data: 'min:1' }, { text: '+', callback_data: 'plus:1' }],
      [
        { text: '+5', callback_data: 'plus:5' },
        { text: '+10', callback_data: 'plus:10' },
        { text: '+25', callback_data: 'plus:25' },
        { text: '+50', callback_data: 'plus:50' }
      ],
      [{ text: '🔄 Reset', callback_data: 'reset' }],
      [{ text: '🔙 Kembali', callback_data: 'kembaliawal' }, { text: '✅ Konfirmasi', callback_data: 'konfirmasi' }]
    ]
  };
}

async function sendOwnerMenu(chatId) {
  const text = `*⚙️ OWNER MENU*\n` +
    `=======================\n` +
    `/addproduk *( Tambah Produk )*\n` +
    `/delproduk *( Hapus Produk )*\n` +
    `/addstok *( Tambah Stok Produk )*\n` +
    `/editstok *( Edit Stok Produk )*\n` +
    `/editnama *( Edit Nama Produk )*\n` +
    `/editkode *( Edit Kode Produk )*\n` +
    `/editharga *( Edit Harga Produk )*\n` +
    `/editdeskripsi *( Edit Deskripsi Produk )*\n` +
    `/editsnk *( Edit Syarat n Ketentuan Produk )*\n` +
    `/listuser *( List User )*\n` +
    `/deluser *( Delete User )*\n` +
    `/bc *( Broadcast Teks / Reply Foto / Reply Stiker )*\n` +
    `/bcphoto *( Broadcast Gambar URL/File ID )*\n` +
    `/bcsticker *( Broadcast Stiker File ID )*\n` +
    `/addvoucher *( Tambah Voucher Bot )*\n` +
    `/editvoucher *( Edit Voucher Bot )*\n` +
    `/delvoucher *( Hapus Voucher Bot )*\n` +
    `/rekap *( Rekap Bulanan )*\n` +
    `/reseller *( Reseller Panel Mini App )*\n` +
    `=======================\n\n` +
    `*Format cepat:*\n` +
    `/addproduk Nama|Kode|Harga|Deskripsi|SnK\n` +
    `/addstok Kode|stok1\nstok2\n` +
    `/editstok Kode|stok1\nstok2\n` +
    `/editnama Kode|Nama Baru\n` +
    `/editkode KodeLama|KodeBaru\n` +
    `/editharga Kode|HargaBaru\n` +
    `/editdeskripsi Kode|Deskripsi Baru\n` +
    `/editsnk Kode|SnK Baru\n` +
    `/addvoucher KODE|PRODUK1,PRODUK2|POTONGAN|LIMIT\n` +
    `/addvoucher KODE|semua|POTONGAN|LIMIT\n` +
    `/editvoucher KODE_LAMA|KODE_BARU|semua|POTONGAN|LIMIT\n` +
    `/bc Pesan broadcast\n` +
    `/bcphoto URL_GAMBAR|Caption\n` +
    `/bcsticker FILE_ID_STIKER`;
  return tg.sendMessage(chatId, text);
}

async function handleTextMessage(msg, req) {
  const chatId = msg.chat.id;
  const from = msg.from || msg.chat;
  const text = String(msg.text || msg.caption || '').trim();

  if (!text) return;

  const lower = text.toLowerCase();

  if (lower.startsWith('/start') || lower.startsWith('/menu')) return sendHome(chatId, from, req);
  if (lower.startsWith('/getid')) return tg.sendMessage(chatId, `ID Telegram kamu: ${from.id}`);
  if (lower.startsWith('/debugowner')) {
    const miniAppUrl = getMiniAppUrl(req) || '-';
    return tg.sendMessage(chatId, `DEBUG OWNER\nUser ID: ${from.id}\nOWNER_ID env: ${config.ownerId}\nIs owner: ${isOwner(from.id) ? 'YA' : 'TIDAK'}\nMINIAPP_URL: ${miniAppUrl}`);
  }
  if (lower.startsWith('/produk') || lower.startsWith('/listproduk')) return sendProductList(chatId);
  if (lower.startsWith('/ownermenu')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    return sendOwnerMenu(chatId);
  }
  if (lower.startsWith('/reseller')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const miniAppUrl = getMiniAppUrl(req);
    if (!miniAppUrl) return tg.sendMessage(chatId, '⚠️ MINIAPP_URL / PUBLIC_URL belum diatur di Vercel.');
    return tg.sendMessage(chatId, `Reseller Panel Mini App\n\nBuka panel untuk mengelola dashboard, produk, stok, voucher, users, broadcast, gambar toko, dan grafik.`, {
      reply_markup: { inline_keyboard: [[{ text: 'Buka Reseller Panel', web_app: { url: miniAppUrl } }], [{ text: 'Buka Link Panel', url: miniAppUrl }]] }
    });
  }

  if (lower.startsWith('/addproduk')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const raw = text.replace(/^\/addproduk\s*/i, '');
    const [nama, kode, harga, deskripsi, snk] = raw.split('|').map((x) => x?.trim());
    if (!nama || !kode || !harga || !deskripsi || !snk) {
      return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/addproduk Nama|Kode|Harga|Deskripsi|SnK');
    }
    if (Number.isNaN(Number(harga)) || Number(harga) < 0) return tg.sendMessage(chatId, '⚠️ Harga harus berupa angka dan diatas 0!');
    await db.addProduct({ nama, kode, harga: Number(harga), deskripsi, snk, data: [] });
    return tg.sendMessage(chatId, `✅ Produk *${nama}* berhasil ditambahkan.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/delproduk')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const code = text.replace(/^\/delproduk\s*/i, '').trim();
    if (!code) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/delproduk Kode');
    await db.deleteProduct(code);
    return tg.sendMessage(chatId, `✅ Produk dengan kode *${code}* berhasil dihapus.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/addstok')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const raw = text.replace(/^\/addstok\s*/i, '');
    const [kode, ...stockParts] = raw.split('|');
    const stockText = stockParts.join('|');
    if (!kode || !stockText) {
      return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/addstok Kode|DataProduk\n\nContoh:\n/addstok GPT24J|email1:pw1\nemail2:pw2');
    }
    const result = await db.appendStock(kode.trim(), stockText);
    if (!result) return tg.sendMessage(chatId, `⚠️ Kode produk *${kode.trim()}* tidak ditemukan!`, { parse_mode: 'Markdown' });
    return tg.sendMessage(chatId, `✅ Berhasil menambah *${result.added}* stok ke *${result.product.nama}*.`, { parse_mode: 'Markdown' });
  }


  if (lower.startsWith('/editstok')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const raw = parseCommandBody(text, 'editstok');
    const [kode, stok] = splitFirstPipe(raw);
    if (!kode) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editstok Kode|stok1\nstok2');
    const product = await db.replaceStock(kode, stok || '');
    return sendProductUpdated(chatId, product, 'Edit stok');
  }

  if (lower.startsWith('/editnama')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [kode, value] = splitFirstPipe(parseCommandBody(text, 'editnama'));
    if (!kode || !value) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editnama Kode|Nama Baru');
    return sendProductUpdated(chatId, await db.updateProductByCode(kode, { nama: value }), 'Edit nama');
  }

  if (lower.startsWith('/editkode')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [kode, value] = splitFirstPipe(parseCommandBody(text, 'editkode'));
    if (!kode || !value) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editkode KodeLama|KodeBaru');
    return sendProductUpdated(chatId, await db.updateProductByCode(kode, { kode: value }), 'Edit kode');
  }

  if (lower.startsWith('/editharga')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [kode, value] = splitFirstPipe(parseCommandBody(text, 'editharga'));
    const harga = parseNumber(value);
    if (!kode || !harga) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editharga Kode|HargaBaru');
    return sendProductUpdated(chatId, await db.updateProductByCode(kode, { harga }), 'Edit harga');
  }

  if (lower.startsWith('/editdeskripsi')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [kode, value] = splitFirstPipe(parseCommandBody(text, 'editdeskripsi'));
    if (!kode || !value) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editdeskripsi Kode|Deskripsi Baru');
    return sendProductUpdated(chatId, await db.updateProductByCode(kode, { deskripsi: value }), 'Edit deskripsi');
  }

  if (lower.startsWith('/editsnk')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [kode, value] = splitFirstPipe(parseCommandBody(text, 'editsnk'));
    if (!kode || !value) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editsnk Kode|SnK Baru');
    return sendProductUpdated(chatId, await db.updateProductByCode(kode, { snk: value }), 'Edit SnK');
  }

  if (lower.startsWith('/listuser')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const users = await db.listUsers(50);
    if (!users.length) return tg.sendMessage(chatId, '📭 Belum ada user.');
    const textUsers = users.map((u, i) => `${i + 1}. ${u.username ? '@' + u.username : (u.first_name || '-') }\n   ID: \`${u.telegram_id}\` | Trx: *${u.transaction_count || 0}* | Spend: *${formatRupiah(u.spending || 0)}*`).join('\n\n');
    return tg.sendMessage(chatId, `👥 *LIST USER*\n=======================\n${textUsers}`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/deluser')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const userId = parseNumber(parseCommandBody(text, 'deluser'));
    if (!userId) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/deluser ID_TELEGRAM');
    await db.deleteUser(userId);
    return tg.sendMessage(chatId, `✅ User \`${userId}\` berhasil dihapus.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/addvoucher')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [kode, produk, potongan, limit] = parseCommandBody(text, 'addvoucher').split('|').map((x) => x?.trim());
    if (!kode || !potongan || !limit) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/addvoucher KODE|semua|POTONGAN|LIMIT');
    const voucher = await db.addVoucher({ kode, produk: produk || 'semua', potongan: parseNumber(potongan), limit: parseNumber(limit) });
    return tg.sendMessage(chatId, `✅ Voucher *${voucher.code}* berhasil disimpan.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/editvoucher')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [oldCode, newCode, produk, potongan, limit] = parseCommandBody(text, 'editvoucher').split('|').map((x) => x?.trim());
    if (!oldCode || !newCode || !potongan || !limit) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editvoucher KODE_LAMA|KODE_BARU|semua|POTONGAN|LIMIT');
    const voucher = await db.updateVoucher(oldCode, { kode: newCode, produk: produk || 'semua', potongan: parseNumber(potongan), limit: parseNumber(limit), active: true });
    if (!voucher) return tg.sendMessage(chatId, '⚠️ Voucher tidak ditemukan.');
    return tg.sendMessage(chatId, `✅ Voucher *${voucher.code}* berhasil diedit.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/delvoucher')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const code = parseCommandBody(text, 'delvoucher').trim().toUpperCase();
    if (!code) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/delvoucher KODE');
    await db.deleteVoucher(code);
    return tg.sendMessage(chatId, `✅ Voucher *${code}* berhasil dihapus.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/bcphoto')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const raw = parseCommandBody(text, 'bcphoto');
    const [photo, caption] = splitFirstPipe(raw);
    const replyPhoto = msg.reply_to_message?.photo?.slice(-1)?.[0]?.file_id;
    const finalPhoto = replyPhoto || photo;
    if (!finalPhoto) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/bcphoto URL_GAMBAR_ATAU_FILE_ID|Caption\n\nAtau reply gambar dengan /bcphoto Caption');
    const result = await broadcastToUsers({ type: 'photo', photo: finalPhoto, caption: replyPhoto ? raw : caption });
    return tg.sendMessage(chatId, `✅ Broadcast gambar selesai. Terkirim: *${result.sent}*, gagal: *${result.failed}*.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/bcsticker')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const sticker = msg.reply_to_message?.sticker?.file_id || parseCommandBody(text, 'bcsticker').trim();
    if (!sticker) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/bcsticker FILE_ID\n\nAtau reply stiker dengan /bcsticker');
    const result = await broadcastToUsers({ type: 'sticker', sticker });
    return tg.sendMessage(chatId, `✅ Broadcast stiker selesai. Terkirim: *${result.sent}*, gagal: *${result.failed}*.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/bc')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const body = parseCommandBody(text, 'bc');
    const replyPhoto = msg.reply_to_message?.photo?.slice(-1)?.[0]?.file_id;
    const replySticker = msg.reply_to_message?.sticker?.file_id;
    let result;
    if (replyPhoto) result = await broadcastToUsers({ type: 'photo', photo: replyPhoto, caption: body });
    else if (replySticker) result = await broadcastToUsers({ type: 'sticker', sticker: replySticker, message: body });
    else {
      if (!body) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/bc Pesan\n\nBisa juga reply gambar/stiker dengan /bc Caption');
      result = await broadcastToUsers({ type: 'text', message: body });
    }
    return tg.sendMessage(chatId, `✅ Broadcast selesai. Tipe: *${result.type}* | Terkirim: *${result.sent}*, gagal: *${result.failed}*.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/rekap')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [month, year] = parseCommandBody(text, 'rekap').split(/\s+/).filter(Boolean);
    const r = await db.getMonthlyRekap(month, year);
    const top = (r.by_product || []).slice(0, 8).map((p, i) => `${i + 1}. *${p.name}* \`${p.code}\`\n   Qty: *${p.quantity}* | Total: *${formatRupiah(p.total_price)}*`).join('\n\n') || '-';
    return tg.sendMessage(chatId, `📊 *REKAP PENJUALAN ${String(r.month).padStart(2, '0')}/${r.year}*\n=======================\nTotal Order: *${r.orders}*\nTotal Produk Terjual: *${r.quantity}*\nTotal Omzet: *${formatRupiah(r.total_price)}*\n\n*Top Produk:*\n${top}`, { parse_mode: 'Markdown' });
  }

  const pending = await db.getPendingOrder(from.id);
  if (pending?.status === 'waiting_voucher') {
    const voucherCode = text.toUpperCase().trim();
    const voucher = await db.getVoucher(voucherCode);
    const valid = db.voucherIsValid(voucher, pending.product_code, from.id);
    if (!valid) {
      return tg.sendMessage(chatId, '⚠️ Voucher tidak valid, sudah habis, sudah pernah kamu pakai, atau tidak cocok dengan produk ini.');
    }
    await db.upsertPendingOrder({ ...pending, voucher_code: voucher.code, status: 'ready_to_pay' });
    return tg.sendMessage(chatId, `✅ Voucher *${voucher.code}* berhasil dipasang. Potongan: *${formatRupiah(voucher.discount)}*`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '💸 Lanjut Bayar', callback_data: 'bayar' }], [{ text: '❌ Batal', callback_data: 'batalbeli' }]] }
    });
  }

  return tg.sendMessage(chatId, 'Perintah tidak dikenal. Ketik /start untuk membuka menu.');
}

async function handleProductSelection(query, code) {
  const userId = query.from.id;
  const product = await db.getProductByCode(code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan, mungkin sudah dihapus!');
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length) {
    await tg.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => null);
    const rows = variants.map((variant, index) => ([{
      text: `${variant.name} | ${formatRupiah(variantPrice(product, variant))} | Stok ${stockOfVariant(variant).length}`,
      callback_data: `variant:${product.kode}:${index}`
    }]));
    rows.push([{ text: '🔙 Kembali', callback_data: 'daftarproduk' }]);
    return tg.sendMessage(userId, `📦 *${product.nama}*
=======================
Pilih varian produk yang ingin dibeli:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
  }
  return startOrderWithSelection(query, product, null, -1);
}

async function startOrderWithSelection(query, product, variant, index = -1) {
  const userId = query.from.id;
  const variantName = variant ? variant.name : 'Default';
  const unitPrice = variantPrice(product, variant);
  const vKey = variant ? variantKey(variant, index) : '';
  await db.upsertPendingOrder({
    telegram_id: userId,
    product_code: product.kode,
    variant_key: vKey,
    variant_name: variant ? variantName : '',
    unit_price: unitPrice,
    quantity: 1,
    status: 'draft'
  });
  await tg.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => null);
  return tg.sendMessage(userId, `📦 *${product.nama}*
` +
    `=======================
` +
    `Varian: *${variantName}*
` +
    `Harga Satuan: *${formatRupiah(unitPrice)}*
` +
    `Harga Grosir:
${formatBulkText(product, variant)}
` +
    `Stok Tersedia: *${variant ? stockOfVariant(variant).length : product.data.length}*
` +
    `Deskripsi: *${variantDescription(product, variant)}*
` +
    `=======================
` +
    `Klik tombol dibawah untuk melanjutkan!`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '➡️ Lanjut', callback_data: 'lanjut' }], [{ text: '🔙 Kembali', callback_data: 'daftarproduk' }]] }
    });
}

async function handleVariantSelection(query, code, indexText) {
  const product = await db.getProductByCode(code);
  if (!product) return tg.sendMessage(query.from.id, '⚠️ Produk tidak ditemukan.');
  const index = Number(indexText);
  const variant = (product.variants || [])[index];
  if (!variant) return tg.sendMessage(query.from.id, '⚠️ Varian tidak ditemukan.');
  if (stockOfVariant(variant).length < 1) return tg.answerCallbackQuery(query.id, { text: 'Stok varian kosong.', show_alert: true });
  return startOrderWithSelection(query, product, variant, index);
}

async function showConfirmation(query, edit = false) {
  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan, harap ulangi pilih produk!');
  const text = confirmationText(product, order);
  const options = { parse_mode: 'Markdown', reply_markup: quantityKeyboard() };
  if (edit && query.message?.message_id) return tg.editMessageText(query.message.chat.id, query.message.message_id, text, options);
  await tg.deleteMessage(query.message.chat.id, query.message.message_id);
  return tg.sendMessage(userId, text, options);
}

async function changeQuantity(query, delta, reset = false) {
  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan!');
  let quantity = reset ? 1 : Number(order.quantity || 1) + Number(delta || 0);
  if (quantity < 1) quantity = 1;
  if (quantity > availableStockForOrder(product, order)) {
    return tg.answerCallbackQuery(query.id, { text: '⚠️ Stok produk/varian tidak mencukupi', show_alert: true });
  }
  await db.upsertPendingOrder({ ...order, quantity, status: order.status || 'draft' });
  return showConfirmation(query, true);
}

async function createPayment(query) {
  if (!config.pakasirSlug || !config.pakasirApiKey) {
    return tg.sendMessage(query.from.id, '⚠️ PAKASIR_SLUG dan PAKASIR_API_KEY belum diatur di Vercel.');
  }

  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan!');
  if (availableStockForOrder(product, order) < Number(order.quantity || 1)) return tg.sendMessage(userId, '⚠️ Stok produk/varian tidak mencukupi!');

  const unit = orderUnitPrice(product, order);
  let harga = Number(order.quantity || 1) * unit;
  const voucher = order.voucher_code ? await db.getVoucher(order.voucher_code) : null;
  if (db.voucherIsValid(voucher, product.kode, userId)) harga -= Number(voucher.discount || 0);
  if (harga < 0) harga = 0;

  const fee = randomFee();
  const invoiceRef = randomRef();
  const totalAmount = harga + fee;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const response = await axios.post('https://app.pakasir.com/api/transactioncreate/qris', {
    project: config.pakasirSlug,
    order_id: invoiceRef,
    amount: totalAmount,
    api_key: config.pakasirApiKey
  });

  const qrText = response.data?.payment?.payment_number || response.data?.payment_number || response.data?.qr_string;
  if (!qrText) throw new Error('Pakasir tidak mengirim data QRIS.');
  await db.upsertPendingOrder({ ...order, invoice_ref: invoiceRef, amount: totalAmount, fee, expires_at: expiresAt, status: 'awaiting_payment' });

  const buffer = await QRCode.toBuffer(qrText, { type: 'png' });
  const caption = `💸 *PEMBAYARAN OTOMATIS*\n` +
    `=======================\n` +
    `Invoice: *${invoiceRef}*\n` +
    `Produk: *${product.nama}${order.variant_name ? ' - ' + order.variant_name : ''}*\n` +
    `Harga Satuan: *${formatRupiah(unit)}*\n` +
    `Jumlah Beli: *${order.quantity}*\n` +
    `Fee: *${formatRupiah(fee)}*\n` +
    `Total Bayar: *${formatRupiah(totalAmount)}*\n` +
    `Expired: *10 menit*\n` +
    `=======================\n` +
    `Setelah bayar, klik tombol *Saya Sudah Bayar*.`;

  await tg.deleteMessage(query.message.chat.id, query.message.message_id);
  return tg.sendPhoto(userId, buffer, {
    caption,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Saya Sudah Bayar', callback_data: `cekbayar:${invoiceRef}` }],
        [{ text: '❌ Batal', callback_data: 'batalbeli' }]
      ]
    }
  });
}

async function checkPayment(query, invoiceFromButton) {
  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order || order.status !== 'awaiting_payment') {
    return tg.answerCallbackQuery(query.id, { text: 'Tidak ada pembayaran aktif.', show_alert: true });
  }
  if (invoiceFromButton && order.invoice_ref && invoiceFromButton !== order.invoice_ref) {
    return tg.answerCallbackQuery(query.id, { text: 'Invoice tidak cocok.', show_alert: true });
  }
  if (order.expires_at && Date.now() > new Date(order.expires_at).getTime()) {
    await db.deletePendingOrder(userId);
    await tg.deleteMessage(query.message.chat.id, query.message.message_id);
    return tg.sendMessage(userId, 'Pesananmu telah expired, harap pesan kembali!');
  }

  const detail = await axios.get('https://app.pakasir.com/api/transactiondetail', {
    params: {
      project: config.pakasirSlug,
      amount: order.amount,
      order_id: order.invoice_ref,
      api_key: config.pakasirApiKey
    }
  });
  const status = detail.data?.transaction?.status;
  if (status !== 'completed') {
    return tg.answerCallbackQuery(query.id, { text: 'Pembayaran belum masuk. Coba klik lagi beberapa saat setelah transfer.', show_alert: true });
  }

  const product = await db.getProductByCode(order.product_code);
  const variant = selectedVariant(product, order);
  const result = await db.completeOrder(order, product, order.amount, query.from);
  const dataProduk = result.delivered.join('\n');
  const filename = `${userId}-${product.kode}${order.variant_key ? '-' + order.variant_key : ''}-${order.quantity}.txt`;
  const fileText = `<|==== SYARAT DAN KETENTUAN ====|>\n${variantTerms(product, variant)}\n\n<|==== PRODUK ====|>\n${dataProduk}\n\n//Terimakasih telah percaya kepada ${config.botName}.`;

  await tg.deleteMessage(query.message.chat.id, query.message.message_id);
  await tg.sendDocument(userId, filename, fileText, {
    caption: `✅ PESANAN SELESAI\n` +
      `=======================\n` +
      `Invoice: ${order.invoice_ref}\n` +
      `Produk: ${product.nama}${order.variant_name ? ' - ' + order.variant_name : ''}\n` +
      `Jumlah Beli: ${order.quantity}\n` +
      `Total Harga: ${formatRupiah(order.amount)}\n` +
      `Tanggal: ${formatWIB(new Date())}\n` +
      `=======================\n` +
      `Terimakasih telah membeli produk di ${config.botName}`
  });

  if (config.channelLog) {
    const fee = Number(order.fee || 0);
    const total = Number(order.amount || 0);
    const subtotal = Math.max(0, total - fee);
    const username = query.from.username ? '@' + query.from.username : (query.from.first_name || String(query.from.id));
    await tg.sendMessage(config.channelLog, `✅ PESANAN SELESAI\n` +
      `=======================\n` +
      `User: ${username}\n` +
      `Trx ID: ${order.invoice_ref}\n` +
      `Produk: ${product.nama}${order.variant_name ? ' - ' + order.variant_name : ''}\n` +
      `Harga: ${formatRupiah(subtotal)}\n` +
      `Jumlah Beli: ${order.quantity}\n` +
      `Fee: ${formatRupiah(fee)}\n` +
      `Total Harga: ${formatRupiah(total)}\n` +
      `Tanggal: ${formatWIB(new Date())}`).catch(() => null);
  }

  return sendHome(userId, query.from, null);
}

async function handleCallbackQuery(query, req) {
  const cmd = String(query.data || '');
  await tg.answerCallbackQuery(query.id).catch(() => null);

  if (cmd === 'daftarproduk') return sendProductList(query.message.chat.id);
  if (cmd === 'stok') return sendStock(query.message.chat.id);
  if (cmd === 'riwayattransaksi') return sendHistory(query.message.chat.id, query.from.id);
  if (cmd === 'caraorder') {
    return tg.sendMessage(query.message.chat.id, '❓ *CARA ORDER*\n=======================\n1. Klik Daftar Produk\n2. Pilih produk\n3. Atur jumlah pesanan\n4. Klik Konfirmasi\n5. Scan QRIS\n6. Setelah bayar klik Saya Sudah Bayar\n7. Produk dikirim otomatis', { parse_mode: 'Markdown' });
  }
  if (cmd === 'kembaliawal') {
    await db.deletePendingOrder(query.from.id).catch(() => null);
    await tg.deleteMessage(query.message.chat.id, query.message.message_id);
    return sendHome(query.message.chat.id, query.from, req);
  }
  if (cmd.startsWith('item:')) return handleProductSelection(query, cmd.slice(5));
  if (cmd.startsWith('variant:')) { const parts = cmd.split(':'); return handleVariantSelection(query, parts[1], parts[2]); }
  if (cmd === 'lanjut') return showConfirmation(query, false);
  if (cmd === 'reset') return changeQuantity(query, 0, true);
  if (cmd.startsWith('plus:')) return changeQuantity(query, Number(cmd.split(':')[1] || 1), false);
  if (cmd.startsWith('min:')) return changeQuantity(query, -Number(cmd.split(':')[1] || 1), false);
  if (cmd === 'konfirmasi') {
    await tg.deleteMessage(query.message.chat.id, query.message.message_id);
    return tg.sendMessage(query.from.id, '🎟 Jika kamu mempunyai kode voucher yang berlaku, klik Punya. Jika tidak, klik Tidak.', {
      reply_markup: { inline_keyboard: [[{ text: 'Tidak', callback_data: 'bayar' }, { text: 'Punya', callback_data: 'punya' }], [{ text: '❌ Batal', callback_data: 'batalbeli' }]] }
    });
  }
  if (cmd === 'punya') {
    const order = await db.getPendingOrder(query.from.id);
    if (!order) return tg.sendMessage(query.from.id, '⚠️ Harap ulangi pilih produk!');
    await db.upsertPendingOrder({ ...order, status: 'waiting_voucher' });
    await tg.deleteMessage(query.message.chat.id, query.message.message_id);
    return tg.sendMessage(query.from.id, 'Silahkan kirim kode voucher kamu.');
  }
  if (cmd === 'bayar') return createPayment(query);
  if (cmd.startsWith('cekbayar:')) return checkPayment(query, cmd.split(':')[1]);
  if (cmd === 'batalbeli') {
    await db.deletePendingOrder(query.from.id).catch(() => null);
    await tg.deleteMessage(query.message.chat.id, query.message.message_id);
    return tg.sendMessage(query.from.id, '✅ Pesananmu berhasil dibatalkan.');
  }
}

async function handleUpdate(update, req) {
  if (update.message) return handleTextMessage(update.message, req);
  if (update.callback_query) return handleCallbackQuery(update.callback_query, req);
}

module.exports = { handleUpdate };
