const axios = require('axios');
const { config } = require('./config');

let cache = { at: 0, data: null };
const CACHE_MS = 60 * 1000;

function cleanUsername(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

function isEnabled() {
  if (String(config.licenseCheckEnabled || '').toLowerCase() === 'false') return false;
  return Boolean(config.licenseManagerUrl && config.licenseApiSecret);
}

function endpoint() {
  const raw = String(config.licenseManagerUrl || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (/\/api\/license-check$/i.test(raw)) return raw;
  return `${raw}/api/license-check`;
}

function daysLeftText(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return '-';
  if (n < 0) return 'Expired';
  if (n === 0) return 'Hari ini';
  return `${n} hari`;
}

function formatDateID(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch (e) {
    return String(value);
  }
}

function normalize(data = {}) {
  const status = String(data.status || (data.active ? 'active' : 'unknown')).toLowerCase();
  return {
    enabled: isEnabled(),
    active: Boolean(data.active),
    status,
    reason: data.reason || data.error || '',
    bot_username: cleanUsername(data.bot_username || config.licenseBotUsername || config.botUsername),
    license_code: data.license_code || data.code || config.licenseCode || '',
    expires_at: data.expires_at || '',
    activated_at: data.activated_at || '',
    days_left: data.days_left,
    plan_name: data.plan_name || '',
    raw: data
  };
}

async function checkLicense(options = {}) {
  if (!isEnabled()) {
    return normalize({ active: true, status: 'disabled', reason: 'Cek lisensi belum diaktifkan.' });
  }
  const force = Boolean(options.force);
  const now = Date.now();
  if (!force && cache.data && now - cache.at < CACHE_MS) return cache.data;

  try {
    const url = endpoint();
    const bot_username = cleanUsername(config.licenseBotUsername || config.botUsername);
    const response = await axios.get(url, {
      timeout: 7000,
      params: { bot_username, secret: config.licenseApiSecret },
      headers: { 'x-license-secret': config.licenseApiSecret }
    });
    const payload = response.data && response.data.data ? response.data.data : response.data;
    const data = normalize(payload || {});
    cache = { at: now, data };
    return data;
  } catch (error) {
    const failClosed = String(config.licenseFailClosed || '').toLowerCase() === 'true';
    const data = normalize({
      active: !failClosed,
      status: failClosed ? 'check_error' : 'check_error_open',
      reason: error.response?.data?.error || error.message || 'Gagal cek lisensi.'
    });
    cache = { at: now, data };
    return data;
  }
}

function statusEmoji(status, active) {
  if (active) return '✅';
  if (status === 'expired') return '⏰';
  if (status === 'revoked') return '⛔';
  if (status === 'not_found') return '❌';
  return '⚠️';
}

function licenseText(license = {}) {
  const enabled = license.enabled !== false;
  if (!enabled) {
    return '🔐 LISENSI BOT\n=======================\nCek lisensi belum diaktifkan untuk bot ini.';
  }
  const emoji = statusEmoji(license.status, license.active);
  return `${emoji} LISENSI BOT\n` +
    `=======================\n` +
    `Bot: @${license.bot_username || '-'}\n` +
    `Status: ${license.active ? 'Aktif' : String(license.status || 'Tidak aktif')}\n` +
    `Kode Aktivasi: ${license.license_code || '-'}\n` +
    `Paket: ${license.plan_name || '-'}\n` +
    `Masa Aktif Sampai: ${formatDateID(license.expires_at)}\n` +
    `Sisa Durasi: ${daysLeftText(license.days_left)}\n` +
    (license.reason ? `Catatan: ${license.reason}\n` : '');
}

function blockedText(license = {}) {
  return `⛔ BOT SEDANG TIDAK AKTIF\n` +
    `=======================\n` +
    `Status: ${String(license.status || 'Tidak aktif')}\n` +
    `Masa Aktif Sampai: ${formatDateID(license.expires_at)}\n` +
    `Sisa Durasi: ${daysLeftText(license.days_left)}\n\n` +
    `Silakan hubungi admin/penyedia bot untuk perpanjangan masa aktif.`;
}

function clearCache() {
  cache = { at: 0, data: null };
}

module.exports = { isEnabled, checkLicense, licenseText, blockedText, daysLeftText, formatDateID, clearCache };
