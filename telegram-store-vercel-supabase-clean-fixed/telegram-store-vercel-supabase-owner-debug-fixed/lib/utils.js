function formatRupiah(nominal) {
  const value = Number(nominal || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatWIB(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function randomFee() {
  return Math.floor(Math.random() * 30);
}

function randomRef() {
  return require('crypto').randomBytes(6).toString('hex').toUpperCase();
}

function splitStock(text) {
  return String(text || '')
    .split(/[\n\r]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { formatRupiah, formatWIB, randomFee, randomRef, splitStock, safeNumber, escapeHtml };
