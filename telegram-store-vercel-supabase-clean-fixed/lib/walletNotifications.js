const { config } = require('./config');
const tg = require('./telegram');
const { escapeHtml, formatRupiah, formatWIB } = require('./utils');

function channelId() {
  return String(config.walletChannel || config.channelLog || '').trim();
}

function userLabel(user = {}, fallbackId = '') {
  const username = String(user.username || '').trim().replace(/^@/, '');
  if (username) return `@${username}`;
  const firstName = String(user.first_name || user.name || '').trim();
  if (firstName) return firstName;
  return fallbackId ? String(fallbackId) : '-';
}

async function sendChannel(text) {
  const target = channelId();
  if (!target) return { ok: false, skipped: true };
  try {
    await tg.sendMessage(target, text, { parse_mode: 'HTML' });
    return { ok: true };
  } catch (error) {
    console.error('Gagal mengirim notifikasi saldo ke channel:', error.message || error);
    return { ok: false, error: error.message || String(error) };
  }
}

async function notifyReferralReward(input = {}) {
  const referrer = input.referrer || {};
  const invitee = input.invitee || {};
  const modeLabel = input.mode === 'first_purchase'
    ? 'Setelah pembelian pertama'
    : 'Langsung saat membuka bot';
  const text = `🎁 <b>SALDO REFERRAL MASUK</b>\n` +
    `=======================\n` +
    `Penerima: <b>${escapeHtml(userLabel(referrer, input.referrerId))}</b>\n` +
    `ID Penerima: <code>${escapeHtml(input.referrerId || referrer.telegram_id || '-')}</code>\n` +
    `Pengguna Diundang: <b>${escapeHtml(userLabel(invitee, input.inviteeId))}</b>\n` +
    `ID Pengguna: <code>${escapeHtml(input.inviteeId || invitee.telegram_id || '-')}</code>\n` +
    `Bonus: <b>${escapeHtml(formatRupiah(input.amount || 0))}</b>\n` +
    `Saldo Referral: <b>${escapeHtml(formatRupiah(input.balanceReferral || 0))}</b>\n` +
    `Mode: <b>${escapeHtml(modeLabel)}</b>\n` +
    `Tanggal: <b>${escapeHtml(formatWIB(new Date()))}</b>`;
  return sendChannel(text);
}

async function notifyTopupSuccess(input = {}) {
  const user = input.user || {};
  const text = `✅ <b>TOP UP SALDO BERHASIL</b>\n` +
    `=======================\n` +
    `User: <b>${escapeHtml(userLabel(user, input.telegramId))}</b>\n` +
    `ID User: <code>${escapeHtml(input.telegramId || user.telegram_id || '-')}</code>\n` +
    `Referensi: <b>${escapeHtml(input.reference || '-')}</b>\n` +
    `Saldo Masuk: <b>${escapeHtml(formatRupiah(input.amount || 0))}</b>\n` +
    (Number(input.fee || 0) > 0 ? `Fee: <b>${escapeHtml(formatRupiah(input.fee))}</b>\n` : '') +
    `Total Bayar: <b>${escapeHtml(formatRupiah(input.total || 0))}</b>\n` +
    `Saldo Utama: <b>${escapeHtml(formatRupiah(input.balanceMain || 0))}</b>\n` +
    `Saldo Referral: <b>${escapeHtml(formatRupiah(input.balanceReferral || 0))}</b>\n` +
    `Tanggal: <b>${escapeHtml(formatWIB(new Date()))}</b>`;
  return sendChannel(text);
}

module.exports = {
  notifyReferralReward,
  notifyTopupSuccess
};
