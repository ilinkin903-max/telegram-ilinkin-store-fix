'use strict';

// Revisi cache proses-lokal. Database tetap menjadi sumber kebenaran; revisi ini
// hanya memastikan hasil write yang baru saja sukses tidak tertutup oleh cache
// read-through pada instance Vercel yang sama.
const revisions = new Map();

function normalizeKey(key) {
  return String(key || '').trim();
}

function getRevision(key) {
  const normalized = normalizeKey(key);
  return normalized ? Number(revisions.get(normalized) || 0) : 0;
}

function bumpRevision(key) {
  const normalized = normalizeKey(key);
  if (!normalized) return 0;
  const next = getRevision(normalized) + 1;
  revisions.set(normalized, next);
  return next;
}

function bumpMany(keys = []) {
  const result = {};
  for (const key of [...new Set((Array.isArray(keys) ? keys : [keys]).map(normalizeKey).filter(Boolean))]) {
    result[key] = bumpRevision(key);
  }
  return result;
}

function transactionCommitted(telegramId = null) {
  const keys = ['stats', 'products', 'catalog', 'dashboard'];
  const userId = Number(telegramId || 0);
  if (userId) keys.push(`wallet:${userId}`, `history:${userId}`, `user:${userId}`);
  return bumpMany(keys);
}

function productChanged() {
  return bumpMany(['stats', 'products', 'catalog', 'dashboard']);
}

function settingsChanged() {
  return bumpMany(['settings', 'catalog', 'dashboard']);
}

function walletChanged(telegramId = null) {
  const userId = Number(telegramId || 0);
  const keys = ['dashboard'];
  if (userId) keys.push(`wallet:${userId}`, `user:${userId}`);
  return bumpMany(keys);
}

module.exports = {
  getRevision,
  bumpRevision,
  bumpMany,
  transactionCommitted,
  productChanged,
  settingsChanged,
  walletChanged
};
