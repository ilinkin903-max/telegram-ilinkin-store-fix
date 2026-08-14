const axios = require('axios');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { config, getMiniAppUrl, getStorefrontUrl } = require('./config');
const tg = require('./telegram');
const db = require('./db');
const paymentService = require('./paymentService');
const walletNotifications = require('./walletNotifications');
const license = require('./license');
const { formatRupiah, formatWIB, randomFee, randomRef, splitStock } = require('./utils');

function isOwner(userId) {
  return Number(userId) === Number(config.ownerId);
}

function ownerOnlyMessage() {
  return '⚠️ Hanya bisa diakses oleh owner!';
}

function shortHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

async function claimBroadcastOrTell(chatId, keySource, label = 'broadcast', options = {}) {
  const claimKey = `broadcast_job:${shortHash(keySource)}`;
  const ok = await db.claimOnce(claimKey, 6 * 60 * 60, { label }).catch((e) => {
    console.error('Gagal membuat broadcast lock:', e.message);
    return true;
  });
  if (!ok) {
    // Telegram dapat mengirim ulang update webhook yang sama saat proses broadcast lama.
    // Duplikat update yang sama cukup diabaikan. Owner tetap bisa mengirim ulang media
    // dengan command/message baru karena message_id-nya berbeda.
    if (!options.silentDuplicate) {
      await tg.sendMessage(chatId, `⏳ ${label} yang sama sedang diproses. Untuk kirim ulang, kirim command baru.`).catch(() => null);
    }
    return null;
  }
  return claimKey;
}

async function markBroadcastDone(claimKey, result = {}) {
  if (!claimKey) return;
  await db.markClaimDone(claimKey, result).catch((e) => console.error('Gagal menandai broadcast selesai:', e.message));
}

async function getRentalLicense(force = false) {
  return license.checkLicense({ force }).catch((error) => ({
    enabled: true,
    active: false,
    status: 'check_error',
    reason: error.message || 'Gagal cek lisensi.'
  }));
}

async function sendLicenseStatus(chatId, force = true) {
  const info = await getRentalLicense(force);
  return tg.sendMessage(chatId, license.licenseText(info));
}

async function ensureLicenseActive(chatId, options = {}) {
  const info = await getRentalLicense(Boolean(options.force));
  if (!info.enabled || info.active) return true;
  const text = license.blockedText(info);
  if (options.query && options.query.message && options.query.message.message_id) {
    return editMessage(options.query, text).then(() => false).catch(async () => {
      await tg.sendMessage(chatId, text);
      return false;
    });
  }
  await tg.sendMessage(chatId, text);
  return false;
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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function escapeMarkdownText(value) {
  // Telegram Markdown legacy menerima escape untuk karakter ASCII. Meloloskan
  // seluruh karakter pemformatan mencegah nama produk/user merusak pesan.
  return String(value == null ? '' : value).replace(/([\\_*\[\]()`~>#+\-=|{}.!])/g, '\\$1');
}

function formatProductInfoText(value, maxLength = 900) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text === '-') return '-';
  const clean = text.length > maxLength ? text.slice(0, maxLength).trim() + '\n...' : text;
  return escapeMarkdownText(clean);
}

async function sendProductUpdated(chatId, product, label) {
  if (!product) return tg.sendMessage(chatId, '⚠️ Produk tidak ditemukan. Cek kembali kode produk.' );
  return tg.sendMessage(chatId, `✅ ${label} berhasil.\n\nProduk: *${escapeMarkdownText(product.nama)}*\nKode: \`${escapeMarkdownText(product.kode)}\`\nHarga: *${formatRupiah(product.harga)}*\nStok: *${product.data.length}*`, { parse_mode: 'Markdown' });
}

async function broadcastToUsers(payload = {}) {
  const users = await db.listUsers(1000);
  const targets = [...new Set(users.map((u) => Number(u.telegram_id)).filter(Boolean))];
  const type = String(payload.type || 'text').toLowerCase();
  const message = String(payload.message || '').trim();
  const caption = String(payload.caption || '').trim();
  const photo = String(payload.photo || payload.image_url || '').trim();
  const sticker = String(payload.sticker || payload.sticker_file_id || '').trim();
  const fromChatId = payload.from_chat_id || payload.fromChatId;
  const messageId = payload.message_id || payload.messageId;
  let sent = 0;
  let failed = 0;
  const errors = [];

  async function sendOne(id) {
    if (type === 'copy') {
      if (!fromChatId || !messageId) throw new Error('Data source message tidak lengkap.');
      return tg.copyMessage(id, fromChatId, messageId);
    }
    if (type === 'poll') {
      if (!fromChatId || !messageId) throw new Error('Data polling/source message tidak lengkap.');
      // Forward polling, not copy, so the poll can stay visible/updated from admin's original poll.
      // If Telegram refuses forwarding for a specific poll, fall back to copyMessage.
      try { return await tg.forwardMessage(id, fromChatId, messageId); }
      catch (e) { return tg.copyMessage(id, fromChatId, messageId); }
    }
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
    results.forEach((r) => {
      if (r.status === 'fulfilled') sent += 1;
      else { failed += 1; if (errors.length < 3) errors.push(String(r.reason?.message || r.reason || 'Gagal mengirim')); }
    });
  }
  return { total: targets.length, sent, failed, type, errors };
}


function pollOptionsFromTelegram(poll = {}) {
  return (poll.options || []).map((item, index) => ({ text: String(item.text || `Opsi ${index + 1}`), index }));
}

function pollPreviewText(pollRecord = {}) {
  const opts = (pollRecord.options || []).map((o, i) => `${i + 1}. ${o.text || o}`).join('\n') || '-';
  const mode = pollRecord.source_message_id
    ? 'Mode: global/forward. User akan melihat hasil polling keseluruhan, bukan hasil pribadi 100%.'
    : 'Mode: fallback draft lama. Untuk hasil global, kirim/forward polling baru ke bot lalu broadcast dari preview.';
  return `📊 Polling diterima sebagai preview.\n\n` +
    `Judul: ${pollRecord.question}\n\n` +
    `Pilihan:\n${opts}\n\n` +
    `${mode}\n\n` +
    `Polling belum dikirim ke user. Klik tombol di bawah untuk broadcast.`;
}

async function preparePollPreview(chatId, from, source = {}) {
  const poll = source.poll || source;
  const sourceChatId = source.chat?.id || chatId;
  const sourceMessageId = source.message_id || source.messageId || null;
  const record = await db.createBroadcastPoll({
    question: poll.question || 'Polling',
    options: pollOptionsFromTelegram(poll),
    is_anonymous: poll.is_anonymous !== false,
    type: poll.type || 'regular',
    allows_multiple_answers: Boolean(poll.allows_multiple_answers),
    status: 'draft',
    created_by: from.id,
    source_chat_id: sourceChatId,
    source_message_id: sourceMessageId,
    source_poll_id: poll.id || null,
    broadcast_mode: sourceMessageId ? 'forward' : 'sendpoll'
  });
  return tg.sendMessage(chatId, pollPreviewText(record), {
    reply_markup: { inline_keyboard: [
      [{ text: '📢 Broadcast Polling', callback_data: `bcpoll_send:${record.id}` }],
      [{ text: '📈 Lihat Hasil', callback_data: `poll_result:${record.id}` }, { text: '🗑 Hapus Draft', callback_data: `poll_delete:${record.id}` }],
      [{ text: '❌ Batal', callback_data: 'bcpoll_cancel' }]
    ] }
  });
}

async function createMasterPollForBroadcast(pollRecord = {}) {
  const optionsList = (pollRecord.options || []).map((o) => String(o.text || o)).filter(Boolean);
  if (!optionsList.length) throw new Error('Opsi polling kosong.');

  const ownerChatId = Number(pollRecord.created_by || config.ownerId);
  if (!ownerChatId) throw new Error('OWNER_ID tidak valid untuk membuat polling utama.');

  // Agar hasil polling user menjadi satu hasil global dan tetap bisa terbaca bot,
  // bot membuat satu polling utama terlebih dulu di chat owner, lalu polling utama itu di-forward ke user.
  // Polling hasil forward dari polling yang dibuat bot tetap mengacu ke polling utama yang sama,
  // sehingga update poll/poll_answer dapat masuk ke webhook bot dan tersimpan ke Supabase.
  const pollType = String(pollRecord.poll_type || pollRecord.type || 'regular') === 'quiz' ? 'regular' : String(pollRecord.poll_type || pollRecord.type || 'regular');
  const master = await tg.sendPoll(ownerChatId, pollRecord.question, optionsList, {
    is_anonymous: pollRecord.is_anonymous !== false,
    type: pollType,
    allows_multiple_answers: Boolean(pollRecord.allows_multiple_answers)
  });

  const masterPollId = master?.poll?.id || pollRecord.source_poll_id || null;
  if (masterPollId) {
    await db.addBroadcastPollMessage({
      broadcast_id: pollRecord.id,
      poll_id: masterPollId,
      telegram_id: ownerChatId,
      message_id: master?.message_id || 0,
      options_state: master?.poll?.options || pollRecord.options || [],
      total_voter_count: master?.poll?.total_voter_count || 0
    }).catch((e) => console.error('Gagal simpan master poll:', e.message));
  }

  await db.updateBroadcastPoll(pollRecord.id, {
    source_chat_id: ownerChatId,
    source_message_id: master?.message_id || null,
    source_poll_id: masterPollId,
    broadcast_mode: 'bot_master_forward'
  }).catch(() => null);

  return { master, ownerChatId, masterPollId };
}

async function broadcastPollRecordToUsers(pollRecord = {}) {
  const users = await db.listUsers(1000);
  const targets = users.map((u) => Number(u.telegram_id)).filter(Boolean);
  let sent = 0;
  let failed = 0;
  let masterInfo = null;

  try {
    masterInfo = await createMasterPollForBroadcast(pollRecord);
  } catch (e) {
    console.error('Gagal membuat polling utama bot:', e.message);
    throw new Error('Gagal membuat polling utama. Cek OWNER_ID dan pastikan bot bisa mengirim pesan ke owner.');
  }

  async function sendOne(id) {
    const msg = await tg.forwardMessage(id, masterInfo.ownerChatId, masterInfo.master.message_id);
    const pollId = msg?.poll?.id || masterInfo.masterPollId;
    if (pollId) {
      await db.addBroadcastPollMessage({
        broadcast_id: pollRecord.id,
        poll_id: pollId,
        telegram_id: id,
        message_id: msg?.message_id || 0,
        options_state: msg?.poll?.options || pollRecord.options || [],
        total_voter_count: msg?.poll?.total_voter_count || 0
      }).catch((e) => console.error('Gagal simpan poll message:', e.message));
    }
    return msg;
  }

  for (let i = 0; i < targets.length; i += 10) {
    const part = targets.slice(i, i + 10);
    const results = await Promise.allSettled(part.map(sendOne));
    results.forEach((r) => { if (r.status === 'fulfilled') sent += 1; else failed += 1; });
  }

  await db.updateBroadcastPoll(pollRecord.id, {
    status: 'sent',
    total_sent: sent,
    total_failed: failed,
    broadcast_mode: 'bot_master_forward',
    source_chat_id: masterInfo.ownerChatId,
    source_message_id: masterInfo.master.message_id,
    source_poll_id: masterInfo.masterPollId
  }).catch(() => null);

  return { total: targets.length, sent, failed, type: 'poll', mode: 'bot_master_forward' };
}

function pollResultText(result = {}) {
  if (!result) return '⚠️ Polling tidak ditemukan.';
  const rows = (result.options_result || []).map((o, i) => {
    return `${i + 1}. ${o.text}\n   ${o.votes} suara (${o.percent}%)`;
  }).join('\n\n') || '-';
  return `📊 HASIL POLLING\n=======================\n` +
    `Pertanyaan: ${result.question}\n` +
    `Status: ${result.status || '-'}\n` +
    `Terkirim: ${result.total_sent || 0}\n` +
    `Total Vote: ${result.total_votes || 0}\n` +
    `Total Voter: ${result.total_voters || 0}\n\n` + rows;
}

async function sendPollingList(chatId) {
  const polls = await db.listBroadcastPolls(10);
  if (!polls.length) return tg.sendMessage(chatId, '📊 Belum ada polling tersimpan.');
  const rows = polls.map((p) => ([
    { text: `${String(p.question || 'Polling').slice(0, 28)} (${p.status || 'draft'})`, callback_data: `poll_result:${p.id}` },
    { text: '🗑 Hapus', callback_data: `poll_delete:${p.id}` }
  ]));
  return tg.sendMessage(chatId, '📊 Daftar polling terakhir.\nKlik judul untuk lihat hasil atau hapus untuk membersihkan database.', { reply_markup: { inline_keyboard: rows } });
}


function normalizeUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^t\.me\//i.test(value)) return `https://${value}`;
  if (/^@/.test(value)) return `https://t.me/${value.slice(1)}`;
  return `https://${value}`;
}

function homeKeyboard(req, userId, settings = {}) {
  const menuModeRaw = String(settings.bot_menu_mode || 'both').trim().toLowerCase();
  const menuMode = ['marketplace', 'products', 'both'].includes(menuModeRaw) ? menuModeRaw : 'both';
  const rows = [];
  const storeUrl = getStorefrontUrl(req);

  if (menuMode !== 'products' && storeUrl) {
    rows.push([{ text: '‹🛍️› Buka Marketplace', web_app: { url: storeUrl } }]);
  }
  if (menuMode !== 'marketplace') {
    rows.push([{ text: '‹📦› Daftar Produk', callback_data: 'daftarproduk' }]);
  }
  rows.push([{ text: '‹💰› Saldo, Top Up & Referral', callback_data: 'wallet' }]);
  const historyRow = [{ text: '‹📋› Riwayat Transaksi', callback_data: 'riwayattransaksi' }];
  if (menuMode !== 'marketplace') historyRow.push({ text: '‹❓› Cara Order', callback_data: 'caraorder' });
  rows.push(historyRow);
  rows.push([{ text: '‹📊› Stok', callback_data: 'stok' }]);
  const miniAppUrl = getMiniAppUrl(req);
  if (miniAppUrl && isOwner(userId)) rows.push([{ text: '‹🧩› Reseller Dashboard', web_app: { url: miniAppUrl } }]);
  const csUrl = normalizeUrl(settings.customer_service_link || config.customerService);
  const groupUrl = normalizeUrl(settings.group_link || config.channelStore);
  const contactRow = [];
  if (csUrl) contactRow.push({ text: '‹📞› Customer Service', url: csUrl });
  if (groupUrl) contactRow.push({ text: '‹👥› Grup', url: groupUrl });
  if (contactRow.length) rows.push(contactRow);
  if (config.channelStore && groupUrl !== normalizeUrl(config.channelStore)) rows.push([{ text: '‹📢› Channel', url: normalizeUrl(config.channelStore) }]);
  return { inline_keyboard: rows };
}



async function editMessage(query, text, options = {}) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  try {
    if (query.message.photo || query.message.video || query.message.animation || query.message.document) {
      return await tg.editMessageCaption(chatId, messageId, text, options);
    }
    return await tg.editMessageText(chatId, messageId, text, options);
  } catch (error) {
    await tg.deleteMessage(chatId, messageId).catch(() => null);
    return tg.sendMessage(chatId, text, options);
  }
}

async function buildHomeText(from) {
  const [stats, wallet] = await Promise.all([
    db.getStats(),
    db.getWalletSummary(from.id, 1).catch(() => null)
  ]);
  return `Halo, <b>${escapeHtml(from.first_name || 'Kak')}</b> 👋

` +
    `Selamat datang di <b>${escapeHtml(config.botName)}</b>
` +
    `- 👥 Total User: <b>${stats.users} User</b>
` +
    `- 🛍️ Total Transaksi: <b>${stats.orders} Transaksi</b>
` +
    `- 📦 Stok Tersedia: <b>${stats.stokTersedia}</b>
` +
    `- 📦 Stok Terjual: <b>${stats.stokTerjual}</b>
` +
    `- 💰 Saldo: <b>${escapeHtml(formatRupiah(wallet?.balance_total || 0))}</b>

` +
    `Silakan pilih tombol di bawah ini!`;
}

async function editHome(query, req) {
  await db.upsertUser(query.from).catch((e) => console.error('upsert user gagal:', e.message));
  let text;
  try { text = await buildHomeText(query.from); }
  catch (e) {
    console.error('build home gagal:', e.message);
    text = `Halo, <b>${escapeHtml(query.from.first_name || 'Kak')}</b> 👋\n\nSelamat datang di <b>${escapeHtml(config.botName)}</b>\n\nSilakan pilih tombol di bawah ini!`;
  }
  const settings = await db.getShopSettings().catch(() => ({}));
  return editMessage(query, text, {
    parse_mode: 'HTML',
    reply_markup: homeKeyboard(req, query.from.id, settings)
  });
}

async function sendHome(chatId, from, req) {
  await db.upsertUser(from).catch((e) => console.error('upsert user gagal:', e.message));
  let stats = { users: 0, orders: 0, stokTersedia: 0, stokTerjual: 0 };
  let wallet = null;
  try { [stats, wallet] = await Promise.all([db.getStats(), db.getWalletSummary(from.id, 1).catch(() => null)]); }
  catch (e) { console.error('getStats gagal:', e.message); }
  const text = `Halo, <b>${escapeHtml(from.first_name || 'Kak')}</b> 👋

` +
    `Selamat datang di <b>${escapeHtml(config.botName)}</b>
` +
    `- 👥 Total User: <b>${stats.users || 0} User</b>
` +
    `- 🛍️ Total Transaksi: <b>${stats.orders || 0} Transaksi</b>
` +
    `- 📦 Stok Tersedia: <b>${stats.stokTersedia || 0}</b>
` +
    `- 📦 Stok Terjual: <b>${stats.stokTerjual || 0}</b>
` +
    `- 💰 Saldo: <b>${escapeHtml(formatRupiah(wallet?.balance_total || 0))}</b>

` +
    `Silakan pilih tombol di bawah ini!`;

  const settings = await db.getShopSettings().catch(() => ({}));
  const reply_markup = homeKeyboard(req, from.id, settings);
  const mediaType = String(settings.start_media_type || 'none').toLowerCase();
  const mediaValue = String(settings.start_media_value || '').trim();
  const mediaCaption = String(settings.start_media_caption || '').trim();

  if (mediaValue && mediaType === 'photo') {
    try {
      return await tg.sendPhotoRef(chatId, mediaValue, {
        caption: mediaCaption || text,
        parse_mode: mediaCaption ? undefined : 'HTML',
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
    parse_mode: 'HTML',
    reply_markup
  });
}


function settingEnabled(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

function startReferralCode(text) {
  const body = String(text || '').trim().split(/\s+/).slice(1).join(' ').trim();
  const match = body.match(/^ref[_-]([a-z0-9]+)$/i);
  return match ? String(match[1]).toUpperCase() : '';
}

function referralUrl(code) {
  const username = String(config.botUsername || '').trim().replace(/^@/, '');
  if (!username || !code) return '';
  return `https://t.me/${username}?start=ref_${encodeURIComponent(code)}`;
}

async function sendWalletPage(chatId, from, query = null) {
  const [wallet, settings] = await Promise.all([
    db.getWalletSummary(from.id, 8),
    db.getShopSettings()
  ]);
  if (!wallet) return tg.sendMessage(chatId, '⚠️ Data saldo belum tersedia. Jalankan SQL v65 lalu buka /start kembali.');
  const link = referralUrl(wallet.referral_code);
  const reward = Math.max(0, Number(settings.referral_reward_amount || 0));
  const mode = String(settings.referral_reward_mode || 'signup') === 'first_purchase'
    ? 'setelah teman melakukan pembelian pertama'
    : 'langsung saat teman pertama kali membuka bot';
  const referralActive = settingEnabled(settings.referral_enabled, true);
  const topupActive = settingEnabled(settings.topup_enabled, true);
  const walletActive = settingEnabled(settings.wallet_payment_enabled, true);
  const history = (wallet.ledger || []).slice(0, 5).map((item) => {
    const sign = item.direction === 'credit' ? '+' : '-';
    const label = item.wallet_type === 'referral' ? 'Referral' : 'Utama';
    return `${sign}${formatRupiah(item.amount || 0)} · ${label} · ${String(item.reason || '-').slice(0, 46)}`;
  }).join('\n') || 'Belum ada mutasi saldo.';
  const text = `💰 <b>SALDO & REFERRAL</b>
` +
    `=======================
` +
    `Saldo Utama: <b>${escapeHtml(formatRupiah(wallet.balance_main || 0))}</b>
` +
    `Saldo Referral: <b>${escapeHtml(formatRupiah(wallet.balance_referral || 0))}</b>
` +
    `Total Saldo: <b>${escapeHtml(formatRupiah(wallet.balance_total || 0))}</b>

` +
    `👥 <b>REFERRAL</b>
` +
    `Berhasil mengundang: <b>${wallet.invited_total || 0}</b>
` +
    `Bonus sudah masuk: <b>${wallet.rewarded_total || 0}</b>
` +
    (referralActive
      ? `Hadiah per undangan: <b>${escapeHtml(formatRupiah(reward))}</b> (${escapeHtml(mode)})
` +
        `Link referral kamu:
<code>${escapeHtml(link || 'BOT_USERNAME belum diatur')}</code>
`
      : `Program referral sedang dinonaktifkan.
`) +
    `
📒 <b>MUTASI TERAKHIR</b>
<pre>${escapeHtml(history)}</pre>`;
  const rows = [];
  if (topupActive) rows.push([{ text: '➕ Top Up Saldo', callback_data: 'topup' }]);
  if (referralActive && link) rows.push([{ text: '🔗 Bagikan Link Referral', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Daftar melalui link saya dan belanja produk digital secara otomatis.')}` }]);
  if (walletActive) rows.push([{ text: '🛍️ Belanja dengan Saldo', callback_data: 'daftarproduk' }]);
  rows.push([{ text: '🔄 Perbarui', callback_data: 'wallet' }, { text: '🔙 Menu Utama', callback_data: 'kembaliawal' }]);
  const options = { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } };
  if (query?.message?.message_id) return editMessage(query, text, options);
  return tg.sendMessage(chatId, text, options);
}

async function beginTopup(query) {
  const settings = await db.getShopSettings();
  if (!settingEnabled(settings.topup_enabled, true)) {
    return tg.answerCallbackQuery(query.id, { text: 'Fitur top up sedang dinonaktifkan.', show_alert: true });
  }
  if (!paymentService.paymentConfigured()) {
    return tg.sendMessage(query.from.id, `⚠️ Konfigurasi pembayaran ${paymentService.paymentProviderLabel()} belum lengkap.`);
  }
  const current = await db.getPendingTopupByUser(query.from.id).catch(() => null);
  if (current?.status === 'awaiting_payment') {
    return tg.answerCallbackQuery(query.id, { text: 'Kamu masih memiliki top up yang menunggu pembayaran. Gunakan tombol cek pada invoice top up.', show_alert: true });
  }
  const ref = current?.status === 'waiting_amount' && current?.topup_ref
    ? String(current.topup_ref)
    : `TOPUP-${randomRef()}`;
  if (!current || current.status !== 'waiting_amount') {
    await db.upsertPendingTopup({ telegram_id: query.from.id, topup_ref: ref, status: 'waiting_amount' });
  }
  const min = Math.max(1000, Number(settings.topup_min_amount || 10000));
  const max = Math.max(min, Number(settings.topup_max_amount || 1000000));
  return editMessage(query,
    `➕ <b>TOP UP SALDO</b>
=======================
Kirim nominal top up dalam bentuk angka.

Minimum: <b>${escapeHtml(formatRupiah(min))}</b>
Maksimum: <b>${escapeHtml(formatRupiah(max))}</b>

Contoh: <code>50000</code>`,
    { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '❌ Batalkan Top Up', callback_data: `bataltopup:${ref}` }], [{ text: '🔙 Kembali', callback_data: 'wallet' }]] } }
  );
}

async function createTopupPayment(chatId, from, topup, amount, settings) {
  const min = Math.max(1000, Number(settings.topup_min_amount || 10000));
  const max = Math.max(min, Number(settings.topup_max_amount || 1000000));
  if (amount < min || amount > max) {
    return tg.sendMessage(chatId, `⚠️ Nominal top up harus antara ${formatRupiah(min)} sampai ${formatRupiah(max)}.`);
  }
  const fee = randomFee();
  const total = amount + fee;
  const gateway = await paymentService.createPaymentTransaction({ amount: total, invoiceRef: topup.topup_ref });
  const ref = String(gateway.order_id || topup.topup_ref).trim();
  if (ref !== String(topup.topup_ref)) {
    await db.cancelPendingTopup(from.id, topup.topup_ref).catch(() => null);
  }
  await db.upsertPendingTopup({
    ...topup,
    topup_ref: ref,
    amount,
    fee,
    total_amount: total,
    payment_provider: gateway.provider,
    provider_transaction_id: gateway.transaction_id,
    provider_checkout_url: gateway.checkout_url,
    qr_payload: gateway.qr_string,
    expires_at: gateway.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: 'awaiting_payment'
  });
  const buffer = await QRCode.toBuffer(gateway.qr_string, { type: 'png' });
  const caption = `➕ <b>TOP UP SALDO</b>
` +
    `=======================
` +
    `Referensi: <b>${escapeHtml(paymentService.displayPaymentReference(ref))}</b>
` +
    `Saldo Masuk: <b>${escapeHtml(formatRupiah(amount))}</b>
` +
    `Fee: <b>${escapeHtml(formatRupiah(fee))}</b>
` +
    `Total Bayar: <b>${escapeHtml(formatRupiah(total))}</b>
` +
    `=======================
` +
    `Bayar sesuai nominal. Saldo Utama masuk otomatis setelah pembayaran terdeteksi.`;
  const sent = await tg.sendPhoto(from.id, buffer, {
    caption,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [
      ...(gateway.checkout_url ? [[{ text: '🌐 Buka Halaman Pembayaran', url: gateway.checkout_url }]] : []),
      [{ text: '🔄 Cek Top Up', callback_data: `cektopup:${ref}` }],
      [{ text: '❌ Batalkan Top Up', callback_data: `bataltopup:${ref}` }]
    ] }
  });
  paymentService.scheduleTopupWatcher({ topupRef: ref, telegramId: from.id });
  return sent;
}

async function checkTopup(query, ref) {
  const topup = await db.getPendingTopupByRef(ref);
  if (!topup || Number(topup.telegram_id) !== Number(query.from.id)) {
    return tg.answerCallbackQuery(query.id, { text: 'Top up tidak ditemukan.', show_alert: true });
  }
  if (topup.status === 'completed') {
    return tg.answerCallbackQuery(query.id, { text: 'Top up sudah berhasil dan saldo telah masuk.', show_alert: true });
  }
  if (topup.status !== 'awaiting_payment') {
    return tg.answerCallbackQuery(query.id, { text: `Status top up: ${topup.status}.`, show_alert: true });
  }
  const incoming = await paymentService.verifyTopupTransaction(topup);
  if (incoming.status !== 'completed') {
    return tg.answerCallbackQuery(query.id, { text: 'Pembayaran top up belum masuk.', show_alert: true });
  }
  const result = await paymentService.completeTopupPayment({ topup, incoming, source: 'manual-topup-check' });
  if (result.state === 'completed' || result.state === 'already_completed') {
    await tg.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => null);
    return sendWalletPage(query.from.id, query.from);
  }
}

async function cancelTopup(query, ref) {
  const topup = await db.getPendingTopupByRef(ref).catch(() => null);
  if (topup && Number(topup.telegram_id) === Number(query.from.id) && topup.status === 'awaiting_payment') {
    await paymentService.cancelTopupTransaction(topup).catch(() => null);
  }
  await db.cancelPendingTopup(query.from.id, ref).catch(() => null);
  return sendWalletPage(query.message.chat.id, query.from, query);
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

function isVariantActive(variant) {
  return variant?.active !== false;
}

function activeVariantsWithIndex(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants
    .map((variant, index) => ({ variant, index }))
    .filter((item) => isVariantActive(item.variant));
}

function deliveryModeForVariant(product, variant = null) {
  return db.variantDeliveryMode(product, variant);
}

function isPoProduct(product, variant = null) {
  return deliveryModeForVariant(product, variant) === 'po';
}

function isPoOrder(product, order = {}) {
  return isPoProduct(product, selectedVariant(product, order));
}

function productStockTotal(product) {
  const allVariants = Array.isArray(product?.variants) ? product.variants : [];
  if (allVariants.length) {
    return activeVariantsWithIndex(product).reduce((sum, item) => {
      if (isPoProduct(product, item.variant)) return sum;
      return sum + stockOfVariant(item.variant).length;
    }, 0);
  }
  return isPoProduct(product) ? 0 : (Array.isArray(product?.data) ? product.data.length : 0);
}

function productDeliverySummary(product) {
  const variants = activeVariantsWithIndex(product).map((item) => item.variant);
  if (!variants.length) return isPoProduct(product) ? 'po' : 'auto';
  const hasPo = variants.some((variant) => isPoProduct(product, variant));
  const hasAuto = variants.some((variant) => !isPoProduct(product, variant));
  if (hasPo && hasAuto) return 'mixed';
  return hasPo ? 'po' : 'auto';
}

function isBuyableProduct(product) {
  if (String(product?.display_scope || 'both').toLowerCase() === 'marketplace') return false;
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return !variants.length || activeVariantsWithIndex(product).length > 0;
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
    const variants = activeVariantsWithIndex(p).map((item) => item.variant);
    const allVariants = Array.isArray(p.variants) ? p.variants : [];
    const prices = variants.length ? variants.map((v) => variantPrice(p, v)).filter(Boolean) : [Number(p.harga || 0)];
    const minPrice = prices.length ? Math.min(...prices) : Number(p.harga || 0);
    const suffix = variants.length ? ` | ${variants.length} varian` : '';
    const deliverySummary = productDeliverySummary(p);
    const availability = deliverySummary === 'mixed' ? 'AUTO + PO' : (deliverySummary === 'po' ? 'PRE-ORDER' : `Stok ${productStockTotal(p)}`);
    return [{
      text: `${p.nama} | mulai ${formatRupiah(minPrice)} | ${availability}${suffix}`,
      callback_data: `item:${p.kode}`
    }];
  });
  rows.push([{ text: '🔙 Kembali', callback_data: 'kembaliawal' }]);
  return { inline_keyboard: rows };
}

async function sendProductList(chatId, query = null) {
  const products = (await db.listProducts({ activeOnly: true })).filter(isBuyableProduct);
  if (!products.length) {
    const empty = '📭 Belum ada produk aktif.';
    if (query?.message?.message_id) return editMessage(query, empty, { reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'kembaliawal' }]] } });
    return tg.sendMessage(chatId, empty);
  }
  const text = '*DAFTAR PRODUK*\n=======================\nPilih produk. Deskripsi produk akan tampil sebelum pembayaran.';
  const options = { parse_mode: 'Markdown', reply_markup: productButtons(products) };
  if (query?.message?.message_id) return editMessage(query, text, options);
  return tg.sendMessage(chatId, text, options);
}

async function sendStock(chatId, query = null) {
  const products = (await db.listProducts({ activeOnly: true })).filter(isBuyableProduct);
  if (!products.length) {
    const empty='📭 Belum ada produk aktif.';
    if (query?.message?.message_id) return editMessage(query, empty);
    return tg.sendMessage(chatId, empty);
  }
  const text = '*STOK PRODUK*\n=======================\n' + products.map((p, i) => {
    const summary = productDeliverySummary(p);
    const variantLines = activeVariantsWithIndex(p).map(({ variant: v }) => `   - ${escapeMarkdownText(v.name)}: ${isPoProduct(p, v) ? '*PRE-ORDER*' : `*${stockOfVariant(v).length}* stok`} | ${formatRupiah(variantPrice(p, v))}`).join('\n');
    const mainState = summary === 'mixed' ? `Mode: *AUTO + PO* · Stok AUTO: *${productStockTotal(p)}*` : (summary === 'po' ? 'Status: *PRE-ORDER*' : `Total Stok: *${productStockTotal(p)}*`);
    return `${i + 1}. *${escapeMarkdownText(p.nama)}*\n   ${mainState} | Terjual: *${p.terjual}*${variantLines ? '\n' + variantLines : ''}`;
  }).join('\n\n');
  const options={ parse_mode: 'Markdown', reply_markup:{ inline_keyboard:[[ { text:'🔙 Kembali', callback_data:'kembaliawal' } ]] } };
  if (query?.message?.message_id) return editMessage(query, text, options);
  return tg.sendMessage(chatId, text, options);
}

async function sendHistory(chatId, userId, query = null) {
  const rows = await db.listTransactionsByUser(userId, 8);
  if (!rows.length) {
    const empty='📭 Kamu belum memiliki riwayat transaksi.';
    if (query?.message?.message_id) return editMessage(query, empty, { reply_markup:{ inline_keyboard:[[ { text:'🔙 Kembali', callback_data:'kembaliawal' } ]] } });
    return tg.sendMessage(chatId, empty);
  }
  const text = '*RIWAYAT TRANSAKSI*\n=======================\n' + rows.map((item, idx) => (
    `${idx + 1}. *${escapeMarkdownText(item.product_name)}*${item.variant_name ? ' - ' + escapeMarkdownText(item.variant_name) : ''}\n` +
    `   Kode: \`${escapeMarkdownText(item.product_code)}\`\n` +
    `   Jumlah: *${item.quantity}*\n` +
    `   Harga: *${formatRupiah(item.total_price)}*\n` +
    `   Status: *${String(item.status || 'completed').toLowerCase() === 'canceled' ? 'CANCELED' : (String(item.delivery_mode || '') === 'po' && String(item.delivery_status || '') !== 'delivered' ? 'MENUNGGU PENGIRIMAN' : 'COMPLETED')}*\n` +
    `   Tanggal: *${formatWIB(item.created_at)}*`
  )).join('\n\n');
  const options={ parse_mode: 'Markdown', reply_markup:{ inline_keyboard:[[ { text:'🔙 Kembali', callback_data:'kembaliawal' } ]] } };
  if (query?.message?.message_id) return editMessage(query, text, options);
  return tg.sendMessage(chatId, text, options);
}

async function sendHelp(chatId, from) {
  const ownerLine = isOwner(from.id)
    ? '\n\n*Owner/Admin:*\n/ownermenu - Buka menu owner\n/reseller - Buka Admin Dashboard\n/debugowner - Cek konfigurasi owner\n/lisensi - Cek masa aktif bot\n/rekap - Rekap penjualan bulanan'
    : '';
  const text = `❓ *BANTUAN BOT*\n` +
    `=======================\n` +
    `*Command User:*\n` +
    `/start - Buka menu utama\n` +
    `/produk - Lihat daftar produk\n` +
    `/cekorder - Cek pesanan/riwayat transaksi\n` +
    `/help - Tampilkan bantuan\n/lisensi - Cek masa aktif bot\n\n` +
    `*Cara Order:*\n` +
    `1. Ketik /start atau /produk\n` +
    `2. Pilih produk/varian\n` +
    `3. Atur jumlah pesanan\n` +
    `4. Klik Konfirmasi\n` +
    `5. Scan QRIS\n` +
    `6. Bayar sesuai nominal QRIS\n` +
    `7. Produk stok otomatis dikirim setelah pembayaran; produk PRE-ORDER dikirim seller setelah disiapkan` + ownerLine;
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
    if (pending.invoice_ref) text += `Invoice: \`${escapeMarkdownText(paymentService.displayPaymentReference(pending.invoice_ref))}\`\n`;
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
      `   Invoice: \`${escapeMarkdownText(paymentService.displayPaymentReference(item.order_ref || '-'))}\`\n` +
      `   Jumlah: *${Number(item.quantity || 0)}*\n` +
      `   Total: *${formatRupiah(item.total_price || 0)}*\n` +
      `   Status: *${String(item.status || 'completed').toLowerCase() === 'canceled' ? 'CANCELED' : (String(item.delivery_mode || '') === 'po' && String(item.delivery_status || '') !== 'delivered' ? 'MENUNGGU PENGIRIMAN' : 'COMPLETED')}*\n` +
      `   Tanggal: *${formatWIB(item.created_at)}*`
    )).join('\n\n');
  }

  const options = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'kembaliawal' }]] } };
  if (query?.message?.message_id) return editMessage(query, text, options);
  return tg.sendMessage(chatId, text, options);
}


function confirmationText(product, order, promo) {
  const variant = selectedVariant(product, order);
  const unit = orderUnitPrice(product, order);
  const quantity = Number(order.quantity || 1);
  const subtotal = quantity * unit;
  const promoLine = promo && promo.discount_amount ? `
Promo Otomatis: *${escapeMarkdownText(promo.name || promo.code)}* (-${formatRupiah(promo.discount_amount)})` : '';
  const total = Math.max(0, subtotal - Number(promo?.discount_amount || 0));
  const bulk = formatBulkText(product, variant);
  const desc = formatProductInfoText(variantDescription(product, variant));
  return `*KONFIRMASI PESANAN*
` +
    `=======================
` +
    `Produk: *${escapeMarkdownText(product.nama)}*
` +
    `Varian: *${escapeMarkdownText(variant ? variant.name : (order.variant_name || 'Default'))}*
` +
    `-----------------------
` +
    `*DESKRIPSI PRODUK*
${desc}
` +
    `-----------------------
` +
    `Harga Satuan: *${formatRupiah(unit)}*
` +
    `Harga Grosir:
${bulk}
` +
    `-----------------------
` +
    (isPoOrder(product, order) ? `Sistem Pengiriman: *PRE-ORDER*\n` : `Stok Tersedia: *${availableStockForOrder(product, order)}*\n`) +
    `Jumlah Pesanan: *${quantity}*
` +
    `Subtotal: *${formatRupiah(subtotal)}*${promoLine}
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
      [{ text: '🔙 Kembali', callback_data: 'daftarproduk' }, { text: '✅ Konfirmasi', callback_data: 'konfirmasi' }]
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
    `/bc *( Broadcast Teks / Reply Foto / Reply Stiker / Reply Polling )*\n` +
    `/bcphoto *( Broadcast Gambar URL/File ID )*\n` +
    `/bcsticker *( Broadcast Stiker File ID )*\n` +
    `/bcpoll *( Broadcast Polling setelah preview/reply )*\n` +
    `/addvoucher *( Tambah Voucher Bot )*\n` +
    `/editvoucher *( Edit Voucher Bot )*\n` +
    `/delvoucher *( Hapus Voucher Bot )*\n` +
    `/rekap *( Rekap Bulanan )*\n` +
    `/reseller *( Reseller Panel Mini App )*\n` +
    `/lisensi *( Cek masa aktif bot )*\n` +
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
    `/bcsticker FILE_ID_STIKER\n` +
    `/bcpoll reply polling / klik tombol preview`;
  return tg.sendMessage(chatId, text);
}

async function handleTextMessage(msg, req) {
  const chatId = msg.chat.id;
  const from = msg.from || msg.chat;
  const text = String(msg.text || msg.caption || '').trim();

  // Owner can prepare a Telegram poll broadcast by forwarding/sending the poll to the bot.
  // It is NOT broadcast automatically anymore. Admin must confirm first.
  if (!text && msg.poll && isOwner(from.id)) {
    return preparePollPreview(chatId, from, msg);
  }
  if (!text && isOwner(from.id) && msg.photo?.length) {
    const fileId = msg.photo.slice(-1)[0]?.file_id || '-';
    return tg.sendMessage(chatId, `🖼 Gambar diterima.

Reply gambar ini dengan /bcphoto Caption atau /bc Caption untuk broadcast.

File ID: \`${escapeMarkdownText(fileId)}\``, { parse_mode: 'Markdown' });
  }
  if (!text && isOwner(from.id) && msg.sticker?.file_id) {
    return tg.sendMessage(chatId, `🎟 Stiker diterima.

Reply stiker ini dengan /bcsticker atau /bc untuk broadcast.

File ID: \`${escapeMarkdownText(msg.sticker.file_id)}\``, { parse_mode: 'Markdown' });
  }

  if (!text) return;

  const lower = text.toLowerCase();

  if (lower.startsWith('/getid')) return tg.sendMessage(chatId, `ID Telegram kamu: ${from.id}`);
  if (lower.startsWith('/lisensi') || lower.startsWith('/license') || lower.startsWith('/masaaktif')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    return sendLicenseStatus(chatId, true);
  }
  if (lower.startsWith('/debugowner')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const miniAppUrl = getMiniAppUrl(req) || '-';
    const resolvedUsername = await license.resolveBotUsername().catch(() => config.licenseBotUsername || config.botUsername || '-');
    const lic = await getRentalLicense(true);
    return tg.sendMessage(chatId, `DEBUG OWNER
User ID: ${from.id}
OWNER_ID env: ${config.ownerId}
Is owner: ${isOwner(from.id) ? 'YA' : 'TIDAK'}
BOT_USERNAME env: ${config.botUsername || '-'}
LICENSE_BOT_USERNAME env: ${config.licenseBotUsername || '-'}
BOT_USERNAME nyata dari Telegram: ${resolvedUsername || '-'}
MINIAPP_URL: ${miniAppUrl}
LICENSE_MANAGER_URL: ${config.licenseManagerUrl || '-'}
LICENSE_STATUS: ${lic.status || '-'}
LICENSE_ACTIVE: ${lic.active ? 'YA' : 'TIDAK'}
LICENSE_EXPIRES: ${lic.expires_at || '-'}`);
  }

  // Command owner/admin tetap harus bisa dibuka walaupun lisensi belum aktif,
  // supaya owner bisa debug, buka panel, dan memperbaiki konfigurasi.
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

  if (lower.startsWith('/start') || lower.startsWith('/menu')) {
    if (!isOwner(from.id) && !(await ensureLicenseActive(chatId))) return;
    const settings = await db.getShopSettings().catch(() => ({}));
    const refCode = lower.startsWith('/start') ? startReferralCode(text) : '';
    try {
      const registration = await db.registerUserWithReferral(from, refCode, settings);
      const reward = registration?.referral_reward;
      if (registration?.referral_state === 'pending') {
        await tg.sendMessage(chatId,
          `✅ <b>REFERRAL BERHASIL TERHUBUNG</b>
Bonus untuk pengundang akan masuk setelah kamu menyelesaikan pembelian pertama.`,
          { parse_mode: 'HTML' }
        ).catch(() => null);
      }
      if (reward?.telegram_id && Number(reward.amount || 0) > 0) {
        await tg.sendMessage(chatId,
          `✅ <b>REFERRAL BERHASIL DIGUNAKAN</b>
Pengundang langsung menerima bonus ${escapeHtml(formatRupiah(reward.amount))}.`,
          { parse_mode: 'HTML' }
        ).catch(() => null);
        const [wallet, referrer] = await Promise.all([
          db.getWalletSummary(reward.telegram_id, 1).catch(() => null),
          db.getUserByTelegramId(reward.telegram_id).catch(() => null)
        ]);
        const inviteeLabel = reward.invitee_username
          ? '@' + String(reward.invitee_username).replace(/^@/, '')
          : (reward.invitee_name || from.first_name || String(from.id));
        await tg.sendMessage(reward.telegram_id,
          `🎁 <b>BONUS REFERRAL MASUK</b>
` +
          `=======================
` +
          `Pengguna yang kamu undang (${escapeHtml(inviteeLabel)}) baru membuka bot melalui link referral kamu.

` +
          `Bonus: <b>${escapeHtml(formatRupiah(reward.amount))}</b>
` +
          `Saldo Referral: <b>${escapeHtml(formatRupiah(wallet?.balance_referral || 0))}</b>`,
          { parse_mode: 'HTML' }
        ).catch(() => null);
        await walletNotifications.notifyReferralReward({
          referrer: referrer || {
            telegram_id: reward.telegram_id,
            first_name: reward.referrer_name,
            username: reward.referrer_username
          },
          referrerId: reward.telegram_id,
          invitee: registration?.user || from,
          inviteeId: reward.invitee_id || from.id,
          amount: reward.amount,
          balanceReferral: wallet?.balance_referral || 0,
          mode: 'signup'
        });
      }
    } catch (error) {
      console.error('Registrasi referral gagal:', error.message || error);
      await db.upsertUser(from).catch(() => null);
    }
    return sendHome(chatId, from, req);
  }
  if (lower.startsWith('/help') || lower.startsWith('/bantuan')) return sendHelp(chatId, from);
  if (lower.startsWith('/cekorder') || lower.startsWith('/cekpesanan') || lower.startsWith('/riwayat')) return sendCheckOrder(chatId, from.id);

  if (!(await ensureLicenseActive(chatId))) return;

  if (lower.startsWith('/polling')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    return sendPollingList(chatId);
  }
  if (lower.startsWith('/produk') || lower.startsWith('/listproduk')) return sendProductList(chatId);
  if (lower.startsWith('/saldo') || lower.startsWith('/wallet') || lower.startsWith('/referral')) return sendWalletPage(chatId, from);
  if (lower.startsWith('/topup')) {
    return tg.sendMessage(chatId, `➕ <b>TOP UP SALDO</b>\nKlik tombol di bawah untuk memasukkan nominal top up.`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '➕ Mulai Top Up', callback_data: 'topup' }], [{ text: '💰 Lihat Saldo', callback_data: 'wallet' }]] }
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
    return tg.sendMessage(chatId, `✅ Produk *${escapeMarkdownText(nama)}* berhasil ditambahkan.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/delproduk')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const code = text.replace(/^\/delproduk\s*/i, '').trim();
    if (!code) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/delproduk Kode');
    await db.deleteProduct(code);
    return tg.sendMessage(chatId, `✅ Produk dengan kode *${escapeMarkdownText(code)}* berhasil dihapus.`, { parse_mode: 'Markdown' });
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
    if (!result) return tg.sendMessage(chatId, `⚠️ Kode produk *${escapeMarkdownText(kode.trim())}* tidak ditemukan!`, { parse_mode: 'Markdown' });
    return tg.sendMessage(chatId, `✅ Berhasil menambah *${result.added}* stok ke *${escapeMarkdownText(result.product.nama)}*.`, { parse_mode: 'Markdown' });
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
    const textUsers = users.map((u, i) => `${i + 1}. ${escapeMarkdownText(u.username ? '@' + u.username : (u.first_name || '-'))}\n   ID: \`${u.telegram_id}\` | Trx: *${u.transaction_count || 0}* | Spend: *${formatRupiah(u.spending || 0)}*`).join('\n\n');
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
    return tg.sendMessage(chatId, `✅ Voucher *${escapeMarkdownText(voucher.code)}* berhasil disimpan.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/editvoucher')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [oldCode, newCode, produk, potongan, limit] = parseCommandBody(text, 'editvoucher').split('|').map((x) => x?.trim());
    if (!oldCode || !newCode || !potongan || !limit) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/editvoucher KODE_LAMA|KODE_BARU|semua|POTONGAN|LIMIT');
    const voucher = await db.updateVoucher(oldCode, { kode: newCode, produk: produk || 'semua', potongan: parseNumber(potongan), limit: parseNumber(limit), active: true });
    if (!voucher) return tg.sendMessage(chatId, '⚠️ Voucher tidak ditemukan.');
    return tg.sendMessage(chatId, `✅ Voucher *${escapeMarkdownText(voucher.code)}* berhasil diedit.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/delvoucher')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const code = parseCommandBody(text, 'delvoucher').trim().toUpperCase();
    if (!code) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\n/delvoucher KODE');
    await db.deleteVoucher(code);
    return tg.sendMessage(chatId, `✅ Voucher *${escapeMarkdownText(code)}* berhasil dihapus.`, { parse_mode: 'Markdown' });
  }

  if (lower.startsWith('/bcpoll')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const source = msg.reply_to_message?.poll ? msg.reply_to_message : null;
    if (!source) return tg.sendMessage(chatId, '⚠️ Cara Penggunaan:\nKirim/forward polling ke bot, atau reply polling dengan /bcpoll untuk preview.');
    return preparePollPreview(chatId, from, source);
  }

  if (lower.startsWith('/bcphoto')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const raw = parseCommandBody(text, 'bcphoto');
    const [photo, caption] = splitFirstPipe(raw);
    const replyPhoto = msg.reply_to_message?.photo?.slice(-1)?.[0]?.file_id;
    const currentPhoto = msg.photo?.slice(-1)?.[0]?.file_id;
    const finalPhoto = replyPhoto || currentPhoto || photo;
    const finalCaption = (replyPhoto || currentPhoto) ? raw : caption;
    if (!finalPhoto) return tg.sendMessage(chatId, `⚠️ Cara Penggunaan:
/bcphoto URL_GAMBAR_ATAU_FILE_ID|Caption

Atau reply/kirim gambar dengan caption /bcphoto Caption`);
    const claimKey = await claimBroadcastOrTell(chatId, `bcphoto:${chatId}:${msg.message_id}:${msg.reply_to_message?.message_id || ''}:${finalPhoto}:${finalCaption}`, 'Broadcast gambar', { silentDuplicate: true });
    if (!claimKey) return;
    const result = await broadcastToUsers({ type: 'photo', photo: finalPhoto, caption: finalCaption });
    await markBroadcastDone(claimKey, result);
    const errorInfo = result.errors?.length ? `
Contoh error: ${escapeMarkdownText(result.errors[0]).slice(0, 500)}` : '';
    return tg.sendMessage(chatId, `✅ Broadcast gambar selesai. Terkirim: *${result.sent}*, gagal: *${result.failed}*.${errorInfo}`, { parse_mode: 'Markdown' });
  }


  if (lower.startsWith('/bcsticker')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const sticker = msg.reply_to_message?.sticker?.file_id || msg.sticker?.file_id || parseCommandBody(text, 'bcsticker').trim();
    if (!sticker) return tg.sendMessage(chatId, `⚠️ Cara Penggunaan:
/bcsticker FILE_ID

Atau reply/kirim stiker dengan /bcsticker`);
    const claimKey = await claimBroadcastOrTell(chatId, `bcsticker:${chatId}:${msg.message_id}:${msg.reply_to_message?.message_id || ''}:${sticker}`, 'Broadcast stiker', { silentDuplicate: true });
    if (!claimKey) return;
    const result = await broadcastToUsers({ type: 'sticker', sticker });
    await markBroadcastDone(claimKey, result);
    const errorInfo = result.errors?.length ? `
Contoh error: ${escapeMarkdownText(result.errors[0]).slice(0, 500)}` : '';
    return tg.sendMessage(chatId, `✅ Broadcast stiker selesai. Terkirim: *${result.sent}*, gagal: *${result.failed}*.${errorInfo}`, { parse_mode: 'Markdown' });
  }


  if (lower.startsWith('/bc')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const body = parseCommandBody(text, 'bc');
    const replyPhoto = msg.reply_to_message?.photo?.slice(-1)?.[0]?.file_id;
    const currentPhoto = msg.photo?.slice(-1)?.[0]?.file_id;
    const replySticker = msg.reply_to_message?.sticker?.file_id;
    const currentSticker = msg.sticker?.file_id;
    const replyPoll = msg.reply_to_message?.poll ? msg.reply_to_message : null;
    let result;
    if (replyPoll) return preparePollPreview(chatId, from, replyPoll);
    const mediaRef = replyPhoto || currentPhoto || replySticker || currentSticker || '';
    if (!body && !mediaRef) return tg.sendMessage(chatId, `⚠️ Cara Penggunaan:
/bc Pesan

Bisa juga reply/kirim gambar atau reply stiker dengan /bc Caption`);
    const claimKey = await claimBroadcastOrTell(chatId, `bc:${chatId}:${msg.message_id}:${msg.reply_to_message?.message_id || ''}:${body}:${mediaRef}`, 'Broadcast', { silentDuplicate: true });
    if (!claimKey) return;
    if (replyPhoto || currentPhoto) result = await broadcastToUsers({ type: 'photo', photo: replyPhoto || currentPhoto, caption: body });
    else if (replySticker || currentSticker) result = await broadcastToUsers({ type: 'sticker', sticker: replySticker || currentSticker, message: body });
    else result = await broadcastToUsers({ type: 'text', message: body });
    await markBroadcastDone(claimKey, result);
    const errorInfo = result.errors?.length ? `
Contoh error: ${escapeMarkdownText(result.errors[0]).slice(0, 500)}` : '';
    return tg.sendMessage(chatId, `✅ Broadcast selesai. Tipe: *${result.type}* | Terkirim: *${result.sent}*, gagal: *${result.failed}*.${errorInfo}`, { parse_mode: 'Markdown' });
  }


  if (lower.startsWith('/rekap')) {
    if (!isOwner(from.id)) return tg.sendMessage(chatId, ownerOnlyMessage());
    const [month, year] = parseCommandBody(text, 'rekap').split(/\s+/).filter(Boolean);
    const r = await db.getMonthlyRekap(month, year);
    const top = (r.by_product || []).slice(0, 8).map((p, i) => `${i + 1}. *${escapeMarkdownText(p.name)}* \`${escapeMarkdownText(p.code)}\`\n   Qty: *${p.quantity}* | Total: *${formatRupiah(p.total_price)}*`).join('\n\n') || '-';
    return tg.sendMessage(chatId, `📊 *REKAP PENJUALAN ${String(r.month).padStart(2, '0')}/${r.year}*\n=======================\nTotal Order: *${r.orders}*\nTotal Produk Terjual: *${r.quantity}*\nTotal Omzet: *${formatRupiah(r.total_price)}*\n\n*Top Produk:*\n${top}`, { parse_mode: 'Markdown' });
  }

  const pendingTopup = await db.getPendingTopupByUser(from.id).catch(() => null);
  if (pendingTopup?.status === 'waiting_amount') {
    const settings = await db.getShopSettings();
    const amount = parseNumber(text);
    if (!amount) return tg.sendMessage(chatId, '⚠️ Kirim nominal top up dalam bentuk angka. Contoh: 50000');
    try {
      return await createTopupPayment(chatId, from, pendingTopup, amount, settings);
    } catch (error) {
      return tg.sendMessage(chatId, `⚠️ Gagal membuat pembayaran top up: ${error.message || error}`);
    }
  }

  const pending = await db.getPendingOrder(from.id);
  if (pending?.status === 'waiting_voucher') {
    const voucherCode = text.toUpperCase().trim();
    const voucher = await db.getVoucher(voucherCode);
    const product = await db.getProductByCode(pending.product_code).catch(() => null);
    const qty = Number(pending.quantity || 1);
    const subtotal = product ? qty * orderUnitPrice(product, pending) : Number(pending.amount || 0);
    const valid = db.voucherIsValid(voucher, pending.product_code, from.id, qty, subtotal, pending.variant_key);
    if (!valid) {
      return tg.sendMessage(chatId, '⚠️ Voucher tidak valid, belum aktif, sudah habis, syarat minimal belum terpenuhi, sudah pernah kamu pakai, atau tidak cocok dengan produk ini.');
    }
    const discount = db.voucherDiscountAmount(voucher, subtotal);
    await db.upsertPendingOrder({ ...pending, voucher_code: voucher.code, status: 'ready_to_pay' });
    return tg.sendMessage(chatId, `✅ Voucher *${escapeMarkdownText(voucher.code)}* berhasil dipasang. Potongan: *${formatRupiah(discount)}*`, {
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
  if (product.active === false) return tg.sendMessage(userId, '⚠️ Produk sedang nonaktif. Silakan pilih produk lain.');
  if (String(product.display_scope || 'both').toLowerCase() === 'marketplace') return tg.sendMessage(userId, '🛒 Produk ini hanya tersedia melalui Marketplace.');
  const variants = activeVariantsWithIndex(product);
  if (variants.length) {
    const rows = variants.map(({ variant, index }) => ([{
      text: `${variant.name} | ${formatRupiah(variantPrice(product, variant))} | ${isPoProduct(product, variant) ? 'PRE-ORDER' : `Stok ${stockOfVariant(variant).length}`}`,
      callback_data: `variant:${product.kode}:${index}`
    }]));
    rows.push([{ text: '🔙 Kembali', callback_data: 'daftarproduk' }]);
    return editMessage(query, `📦 *${escapeMarkdownText(product.nama)}*
=======================
Pilih varian produk yang ingin dibeli. Setelah memilih varian, deskripsi produk akan tampil di halaman konfirmasi sebelum pembayaran.`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
  }
  if (Array.isArray(product.variants) && product.variants.length) {
    return tg.answerCallbackQuery(query.id, { text: 'Semua varian produk ini sedang OFF.', show_alert: true });
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
    delivery_mode: isPoProduct(product, variant) ? 'po' : 'auto',
    status: 'draft'
  });
  return showConfirmation(query, true);
}

async function handleVariantSelection(query, code, indexText) {
  const product = await db.getProductByCode(code);
  if (!product) return tg.sendMessage(query.from.id, '⚠️ Produk tidak ditemukan.');
  if (product.active === false) return tg.sendMessage(query.from.id, '⚠️ Produk sedang nonaktif. Silakan pilih produk lain.');
  if (String(product.display_scope || 'both').toLowerCase() === 'marketplace') return tg.sendMessage(query.from.id, '🛒 Produk ini hanya tersedia melalui Marketplace.');
  const index = Number(indexText);
  const variant = (product.variants || [])[index];
  if (!variant) return tg.sendMessage(query.from.id, '⚠️ Varian tidak ditemukan.');
  if (!isVariantActive(variant)) return tg.answerCallbackQuery(query.id, { text: 'Varian ini sedang OFF.', show_alert: true });
  if (!isPoProduct(product, variant) && stockOfVariant(variant).length < 1) return tg.answerCallbackQuery(query.id, { text: 'Stok varian kosong.', show_alert: true });
  return startOrderWithSelection(query, product, variant, index);
}

async function showConfirmation(query, edit = false) {
  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan, harap ulangi pilih produk!');
  if (product.active === false) return tg.sendMessage(userId, '⚠️ Produk sedang nonaktif. Silakan pilih produk lain.');
  if (String(product.display_scope || 'both').toLowerCase() === 'marketplace') return tg.sendMessage(userId, '🛒 Produk ini hanya tersedia melalui Marketplace.');
  const subtotal = Number(order.quantity || 1) * orderUnitPrice(product, order);
  const promo = await db.getBestAutoPromo(product.kode, userId, Number(order.quantity || 1), subtotal, order.variant_key).catch(() => null);
  const text = confirmationText(product, order, promo);
  const options = { parse_mode: 'Markdown', reply_markup: quantityKeyboard() };
  if (edit && query.message?.message_id) return editMessage(query, text, options);
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
  if (isPoOrder(product, order)) {
    if (quantity > 100) return tg.answerCallbackQuery(query.id, { text: 'Maksimal 100 item per pesanan PRE-ORDER.', show_alert: true });
  } else if (quantity > availableStockForOrder(product, order)) {
    return tg.answerCallbackQuery(query.id, { text: '⚠️ Stok produk/varian tidak mencukupi', show_alert: true });
  }
  await db.upsertPendingOrder({ ...order, quantity, status: order.status || 'draft' });
  return showConfirmation(query, true);
}


async function calculateCheckoutPricing(userId, order, product) {
  const unit = orderUnitPrice(product, order);
  const quantity = Math.max(1, Number(order.quantity || 1));
  const costUnit = db.orderUnitCost(product, order);
  const costTotal = costUnit * quantity;
  const subtotal = quantity * unit;
  let promoApplied = null;
  let voucherApplied = null;
  let appliedDiscount = 0;
  const manualVoucherCode = String(order.voucher_code || '').startsWith('AUTO_PROMO:')
    ? ''
    : String(order.voucher_code || '').trim();
  const voucher = manualVoucherCode ? await db.getVoucher(manualVoucherCode) : null;
  if (db.voucherIsValid(voucher, product.kode, userId, quantity, subtotal, order.variant_key)) {
    voucherApplied = voucher;
    appliedDiscount = db.voucherDiscountAmount(voucher, subtotal);
  } else {
    promoApplied = await db.getBestAutoPromo(product.kode, userId, quantity, subtotal, order.variant_key).catch(() => null);
    appliedDiscount = promoApplied ? Number(promoApplied.discount_amount || 0) : 0;
  }
  appliedDiscount = Math.min(subtotal, Math.max(0, Number(appliedDiscount || 0)));
  const finalPrice = Math.max(0, subtotal - appliedDiscount);
  const appliedCode = promoApplied ? `AUTO_PROMO:${promoApplied.code}` : (voucherApplied?.code || '');
  return { unit, quantity, costUnit, costTotal, subtotal, promoApplied, voucherApplied, appliedDiscount, finalPrice, appliedCode };
}

async function showPaymentMethods(query) {
  const userId = query.from.id;
  const [order, settings, wallet] = await Promise.all([
    db.getPendingOrder(userId),
    db.getShopSettings(),
    db.getWalletSummary(userId, 1)
  ]);
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan!');
  const price = await calculateCheckoutPricing(userId, order, product);
  const walletEnabled = settingEnabled(settings.wallet_payment_enabled, true);
  const topupEnabled = settingEnabled(settings.topup_enabled, true);
  const totalBalance = Number(wallet?.balance_total || 0);
  const shortage = Math.max(0, price.finalPrice - totalBalance);
  const text = `💳 <b>PILIH METODE PEMBAYARAN</b>\n` +
    `=======================\n` +
    `Produk: <b>${escapeHtml(product.nama)}${order.variant_name ? ' - ' + escapeHtml(order.variant_name) : ''}</b>\n` +
    `Total Produk: <b>${escapeHtml(formatRupiah(price.finalPrice))}</b>\n\n` +
    `Saldo Utama: <b>${escapeHtml(formatRupiah(wallet?.balance_main || 0))}</b>\n` +
    `Saldo Referral: <b>${escapeHtml(formatRupiah(wallet?.balance_referral || 0))}</b>\n` +
    `Total Saldo: <b>${escapeHtml(formatRupiah(totalBalance))}</b>\n` +
    (shortage > 0 ? `Kekurangan Saldo: <b>${escapeHtml(formatRupiah(shortage))}</b>\n` : '') +
    `\nSaldo Utama dipakai lebih dahulu, kemudian Saldo Referral.`;
  const rows = [];
  if (walletEnabled && totalBalance >= price.finalPrice) rows.push([{ text: '💰 Bayar dengan Saldo', callback_data: 'bayarsaldo' }]);
  if (paymentService.paymentConfigured()) rows.push([{ text: '📱 Bayar dengan QRIS', callback_data: 'bayarqris' }]);
  if (topupEnabled) rows.push([{ text: shortage > 0 ? `➕ Top Up (kurang ${formatRupiah(shortage)})` : '➕ Top Up Saldo', callback_data: 'topup' }]);
  rows.push([{ text: '🔙 Kembali', callback_data: 'konfirmasi' }, { text: '❌ Batalkan', callback_data: 'batalbeli' }]);
  return editMessage(query, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
}

async function createWalletPayment(query) {
  const userId = query.from.id;
  const [order, settings, wallet] = await Promise.all([
    db.getPendingOrder(userId),
    db.getShopSettings(),
    db.getWalletSummary(userId, 1)
  ]);
  if (!settingEnabled(settings.wallet_payment_enabled, true)) {
    return tg.answerCallbackQuery(query.id, { text: 'Pembayaran dengan saldo sedang dinonaktifkan.', show_alert: true });
  }
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product || product.active === false) return tg.sendMessage(userId, '⚠️ Produk tidak tersedia.');
  if (!isPoOrder(product, order) && availableStockForOrder(product, order) < Number(order.quantity || 1)) return tg.sendMessage(userId, '⚠️ Stok produk/varian tidak mencukupi!');
  const price = await calculateCheckoutPricing(userId, order, product);
  if (Number(wallet?.balance_total || 0) < price.finalPrice) {
    return tg.answerCallbackQuery(query.id, { text: `Saldo kurang ${formatRupiah(price.finalPrice - Number(wallet?.balance_total || 0))}.`, show_alert: true });
  }
  const invoiceRef = `WALLET-${randomRef()}`;
  const savedOrder = await db.upsertPendingOrder({
    ...order,
    quantity: price.quantity,
    cost_unit: price.costUnit,
    cost_total: price.costTotal,
    cost_source: price.costUnit > 0 ? 'snapshot' : 'unset',
    voucher_code: price.appliedCode,
    invoice_ref: invoiceRef,
    amount: price.finalPrice,
    fee: 0,
    status: 'processing',
    payment_method: 'wallet',
    payment_provider: 'wallet'
  });
  await editMessage(query, '⏳ <b>Memproses pembayaran saldo...</b>\nStok dan saldo sedang dikunci agar transaksi aman.', { parse_mode: 'HTML' });
  try {
    return await paymentService.fulfillPaidOrder({ order: savedOrder, buyer: query.from, source: 'wallet-bot' });
  } catch (error) {
    await db.deletePendingOrder(userId, invoiceRef).catch(() => null);
    return tg.sendMessage(userId, `⚠️ Pembayaran saldo gagal: ${error.message || error}`);
  }
}

async function createPayment(query) {
  if (!paymentService.paymentConfigured()) {
    return tg.sendMessage(query.from.id, `⚠️ Konfigurasi pembayaran ${paymentService.paymentProviderLabel()} belum lengkap di Vercel.`);
  }

  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order) return tg.sendMessage(userId, '⚠️ Harap ulangi pilih produk!');
  const product = await db.getProductByCode(order.product_code);
  if (!product) return tg.sendMessage(userId, '⚠️ Produk tidak ditemukan!');
  if (product.active === false) return tg.sendMessage(userId, '⚠️ Produk sedang nonaktif. Silakan pilih produk lain.');
  if (!isPoOrder(product, order) && availableStockForOrder(product, order) < Number(order.quantity || 1)) return tg.sendMessage(userId, '⚠️ Stok produk/varian tidak mencukupi!');

  const price = await calculateCheckoutPricing(userId, order, product);
  const { unit, quantity, costUnit, costTotal, subtotal, promoApplied, voucherApplied, appliedDiscount, finalPrice: harga, appliedCode } = price;

  const fee = randomFee();
  const requestedInvoice = randomRef();
  const totalAmount = harga + fee;
  const gatewayPayment = await paymentService.createPaymentTransaction({ amount: totalAmount, invoiceRef: requestedInvoice });
  const invoiceRef = gatewayPayment.order_id || requestedInvoice;
  const expiresAt = gatewayPayment.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const qrText = gatewayPayment.qr_string;
  await db.upsertPendingOrder({
    ...order,
    quantity,
    cost_unit: costUnit,
    cost_total: costTotal,
    cost_source: costUnit > 0 ? 'snapshot' : 'unset',
    voucher_code: appliedCode,
    invoice_ref: invoiceRef,
    amount: totalAmount,
    fee,
    expires_at: expiresAt,
    status: 'awaiting_payment',
    qr_payload: qrText,
    payment_provider: gatewayPayment.provider,
    provider_transaction_id: gatewayPayment.transaction_id,
    provider_checkout_url: gatewayPayment.checkout_url,
    payment_method: 'gateway'
  });

  const buffer = await QRCode.toBuffer(qrText, { type: 'png' });
  const discountLine = voucherApplied
    ? `Voucher: *${escapeMarkdownText(voucherApplied.code)}* (-${formatRupiah(appliedDiscount)})\n`
    : (promoApplied
      ? `Promo Otomatis: *${escapeMarkdownText(promoApplied.name || promoApplied.code)}* (-${formatRupiah(appliedDiscount)})\n`
      : '');
  const caption = `💸 *PEMBAYARAN OTOMATIS*\n` +
    `=======================\n` +
    `Invoice: *${escapeMarkdownText(paymentService.displayPaymentReference(invoiceRef))}*\n` +
    `Produk: *${escapeMarkdownText(product.nama)}${order.variant_name ? ' - ' + escapeMarkdownText(order.variant_name) : ''}*\n` +
    `Harga Satuan: *${formatRupiah(unit)}*\n` +
    `Jumlah Beli: *${quantity}*\n` +
    `Subtotal: *${formatRupiah(subtotal)}*\n` +
    discountLine +
    (appliedDiscount > 0 ? `Setelah Diskon: *${formatRupiah(harga)}*\n` : '') +
    `Fee: *${formatRupiah(fee)}*\n` +
    `Total Bayar: *${formatRupiah(totalAmount)}*\n` +
    `Expired: *${Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000))} menit*\n` +
    `=======================\n` +
    `Pembayaran akan terdeteksi otomatis melalui ${paymentService.paymentProviderLabel({ payment_provider: gatewayPayment.provider })}. ${isPoOrder(product, order) ? 'Pesanan PRE-ORDER masuk setelah pembayaran dan produk akan dikirim seller melalui chat setelah disiapkan.' : 'Produk langsung dikirim setelah pembayaran berhasil.'} Tombol di bawah hanya untuk pengecekan manual jika notifikasi terlambat.`;

  await tg.deleteMessage(query.message.chat.id, query.message.message_id);
  const paymentMessage = await tg.sendPhoto(userId, buffer, {
    caption,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        ...(gatewayPayment.checkout_url ? [[{ text: '🌐 Buka Halaman Pembayaran', url: gatewayPayment.checkout_url }]] : []),
        [{ text: '🔄 Cek Pembayaran Sekarang', callback_data: `cekbayar:${invoiceRef}` }],
        [{ text: '❌ Batal', callback_data: 'batalbeli' }]
      ]
    }
  });

  // Selain webhook payment gateway, jalankan watcher latar belakang selama beberapa menit.
  // Ini menjadi cadangan otomatis bila notifikasi webhook terlambat atau URL webhook
  // di dashboard payment gateway belum tersimpan dengan benar.
  const watcherScheduled = paymentService.schedulePaymentWatcher({
    invoiceRef,
    telegramId: userId
  });
  if (!watcherScheduled) {
    console.warn(`Watcher pembayaran ${invoiceRef} tidak aktif; mengandalkan webhook payment gateway.`);
  }

  return paymentMessage;
}


async function checkPayment(query, invoiceFromButton) {
  const userId = query.from.id;
  const order = await db.getPendingOrder(userId);
  if (!order || order.status !== 'awaiting_payment') {
    const existing = invoiceFromButton ? await db.getTransactionByOrderRef(invoiceFromButton).catch(() => null) : null;
    return tg.answerCallbackQuery(query.id, {
      text: existing ? 'Pembayaran sudah diproses dan produk telah dikirim.' : 'Tidak ada pembayaran aktif.',
      show_alert: true
    });
  }
  if (invoiceFromButton && order.invoice_ref && invoiceFromButton !== order.invoice_ref) {
    return tg.answerCallbackQuery(query.id, { text: 'Invoice tidak cocok.', show_alert: true });
  }
  if (order.expires_at && Date.now() > new Date(order.expires_at).getTime()) {
    await db.deletePendingOrder(userId, order.invoice_ref);
    await tg.deleteMessage(query.message.chat.id, query.message.message_id);
    return tg.sendMessage(userId, 'Pesananmu telah expired, harap pesan kembali!');
  }

  const transaction = await paymentService.verifyPaymentTransaction(order);
  if (transaction.status !== 'completed') {
    return tg.answerCallbackQuery(query.id, {
      text: `Pembayaran belum masuk. Sistem tetap memeriksa otomatis melalui webhook ${paymentService.paymentProviderLabel(order)}.`,
      show_alert: true
    });
  }

  const result = await paymentService.fulfillPaidOrder({ order, buyer: query.from, source: 'manual-check' });
  if (result.state === 'processing') {
    return tg.answerCallbackQuery(query.id, { text: 'Pembayaran sedang diproses otomatis. Produk akan segera dikirim.', show_alert: true });
  }

  await tg.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => null);
  return sendHome(userId, query.from, null);
}

async function handleCallbackQuery(query, req) {
  const cmd = String(query.data || '');
  await tg.answerCallbackQuery(query.id).catch(() => null);

  if (cmd === 'bcpoll_cancel') {
    if (!isOwner(query.from.id)) return tg.sendMessage(query.message.chat.id, ownerOnlyMessage());
    return editMessage(query, '❌ Broadcast polling dibatalkan. Polling tidak dikirim ke user.');
  }
  if (cmd.startsWith('bcpoll_send:')) {
    if (!isOwner(query.from.id)) return tg.sendMessage(query.message.chat.id, ownerOnlyMessage());
    const pollId = cmd.slice('bcpoll_send:'.length);
    const pollRecord = await db.getBroadcastPoll(pollId);
    if (!pollRecord) return tg.answerCallbackQuery(query.id, { text: 'Polling tidak ditemukan.', show_alert: true });
    if (String(pollRecord.status || '').toLowerCase() === 'sent') {
      return editMessage(query, `✅ Polling ini sudah pernah dibroadcast.\nTerkirim: ${pollRecord.total_sent || 0}\nGagal: ${pollRecord.total_failed || 0}\n\nBot menolak pengiriman ulang agar polling tidak terkirim berulang.`);
    }
    if (String(pollRecord.status || '').toLowerCase() === 'sending') {
      return editMessage(query, '⏳ Broadcast polling sedang diproses. Mohon tunggu, jangan klik tombol berulang.');
    }
    const claimKey = await claimBroadcastOrTell(query.message.chat.id, `bcpoll:${pollId}`, 'Broadcast polling');
    if (!claimKey) return;
    await db.updateBroadcastPoll(pollId, { status: 'sending' }).catch(() => null);
    const result = await broadcastPollRecordToUsers(pollRecord);
    await markBroadcastDone(claimKey, result);
    const modeInfo = 'Mode: polling global dari bot. User melihat hasil keseluruhan dan admin bisa melihat suara masuk.';
    return editMessage(query, `✅ Broadcast polling selesai.\nTerkirim: ${result.sent}\nGagal: ${result.failed}\n${modeInfo}\n\nKetik /polling untuk melihat hasil dan menghapus data polling.`);
  }
  if (cmd.startsWith('poll_result:')) {
    if (!isOwner(query.from.id)) return tg.sendMessage(query.message.chat.id, ownerOnlyMessage());
    const id = cmd.slice('poll_result:'.length);
    const result = await db.getBroadcastPollResult(id);
    return editMessage(query, pollResultText(result), { reply_markup: { inline_keyboard: [[{ text: '🔄 Refresh', callback_data: `poll_result:${id}` }, { text: '🗑 Hapus', callback_data: `poll_delete:${id}` }], [{ text: '📊 Daftar Polling', callback_data: 'poll_list' }]] } });
  }
  if (cmd.startsWith('poll_delete:')) {
    if (!isOwner(query.from.id)) return tg.sendMessage(query.message.chat.id, ownerOnlyMessage());
    const id = cmd.slice('poll_delete:'.length);
    await db.deleteBroadcastPoll(id);
    return editMessage(query, '✅ Data polling sudah dihapus dari database.');
  }
  if (cmd === 'poll_list') {
    if (!isOwner(query.from.id)) return tg.sendMessage(query.message.chat.id, ownerOnlyMessage());
    await tg.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => null);
    return sendPollingList(query.message.chat.id);
  }

  if (!(await ensureLicenseActive(query.message.chat.id, { query }))) return;

  if (cmd === 'wallet') return sendWalletPage(query.message.chat.id, query.from, query);
  if (cmd === 'topup') return beginTopup(query);
  if (cmd.startsWith('cektopup:')) return checkTopup(query, cmd.slice('cektopup:'.length));
  if (cmd.startsWith('bataltopup:')) return cancelTopup(query, cmd.slice('bataltopup:'.length));
  if (cmd === 'daftarproduk') return sendProductList(query.message.chat.id, query);
  if (cmd === 'stok') return sendStock(query.message.chat.id, query);
  if (cmd === 'riwayattransaksi') return sendHistory(query.message.chat.id, query.from.id, query);
  if (cmd === 'caraorder') {
    return editMessage(query, '❓ *CARA ORDER*\n=======================\n1. Klik Daftar Produk\n2. Pilih produk/varian\n3. Atur jumlah pesanan\n4. Klik Konfirmasi\n5. Scan QRIS\n6. Bayar sesuai nominal QRIS\n7. Sistem mendeteksi pembayaran dan mengirim produk otomatis', { parse_mode: 'Markdown', reply_markup:{ inline_keyboard:[[ { text:'🔙 Kembali', callback_data:'kembaliawal' } ]] } });
  }
  if (cmd === 'kembaliawal') {
    const activeOrder = await db.getPendingOrder(query.from.id).catch(() => null);
    if (activeOrder?.status === 'awaiting_payment') {
      await paymentService.cancelPaymentTransaction(activeOrder).catch(() => null);
    }
    await db.deletePendingOrder(query.from.id).catch(() => null);
    return editHome(query, req);
  }
  if (cmd.startsWith('item:')) return handleProductSelection(query, cmd.slice(5));
  if (cmd.startsWith('variant:')) { const parts = cmd.split(':'); return handleVariantSelection(query, parts[1], parts[2]); }
  if (cmd === 'lanjut') return showConfirmation(query, false);
  if (cmd === 'reset') return changeQuantity(query, 0, true);
  if (cmd.startsWith('plus:')) return changeQuantity(query, Number(cmd.split(':')[1] || 1), false);
  if (cmd.startsWith('min:')) return changeQuantity(query, -Number(cmd.split(':')[1] || 1), false);
  if (cmd === 'konfirmasi') {
    return editMessage(query, '🎟 Jika kamu mempunyai kode voucher yang berlaku, klik Punya. Jika tidak, klik Tidak.', {
      reply_markup: { inline_keyboard: [[{ text: 'Tidak', callback_data: 'bayar' }, { text: 'Punya', callback_data: 'punya' }], [{ text: '🔙 Kembali', callback_data: 'daftarproduk' }, { text: '❌ Batal', callback_data: 'batalbeli' }]] }
    });
  }
  if (cmd === 'punya') {
    const order = await db.getPendingOrder(query.from.id);
    if (!order) return tg.sendMessage(query.from.id, '⚠️ Harap ulangi pilih produk!');
    await db.upsertPendingOrder({ ...order, status: 'waiting_voucher' });
    return editMessage(query, 'Silahkan kirim kode voucher kamu.');
  }
  if (cmd === 'bayar') return showPaymentMethods(query);
  if (cmd === 'bayarqris') return createPayment(query);
  if (cmd === 'bayarsaldo') return createWalletPayment(query);
  if (cmd.startsWith('cekbayar:')) return checkPayment(query, cmd.split(':')[1]);
  if (cmd === 'batalbeli') {
    const activeOrder = await db.getPendingOrder(query.from.id).catch(() => null);
    if (activeOrder?.status === 'awaiting_payment') {
      await paymentService.cancelPaymentTransaction(activeOrder).catch((error) => {
        console.warn('Gagal membatalkan transaksi di payment gateway:', error.message || error);
      });
    }
    await db.deletePendingOrder(query.from.id).catch(() => null);
    // Saat user membatalkan pesanan, selalu hapus pesan aktif.
    // Ini penting untuk halaman QRIS karena QR dikirim sebagai pesan foto;
    // setelah dihapus, bot mengirim ulang halaman awal seperti /start.
    if (query.message?.chat?.id && query.message?.message_id) {
      await tg.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => null);
      return sendHome(query.message.chat.id, query.from, req);
    }
    return sendHome(query.from.id, query.from, req);
  }
}

async function handleUpdate(update, req) {
  if (update.poll_answer) return db.recordPollAnswer(update.poll_answer).catch((e) => console.error('Gagal simpan poll answer:', e.message));
  if (update.poll) return db.recordPollUpdate(update.poll).catch((e) => console.error('Gagal update poll:', e.message));
  if (update.message) return handleTextMessage(update.message, req);
  if (update.callback_query) return handleCallbackQuery(update.callback_query, req);
}

module.exports = { handleUpdate };
