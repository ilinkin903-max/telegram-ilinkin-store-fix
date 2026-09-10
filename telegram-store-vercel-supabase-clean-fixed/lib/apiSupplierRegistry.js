const prodseller = require('./prodsellerService');
const aiverseHub = require('./aiverseHubService');

const API_SUPPLIER_SOURCES = new Set(['prodseller', 'aiversehub']);

function normalizeSource(source) {
  return String(source || '').trim().toLowerCase();
}

function isApiSupplierSource(source) {
  return API_SUPPLIER_SOURCES.has(normalizeSource(source));
}

function serviceFor(source) {
  const normalized = normalizeSource(source);
  if (normalized === 'prodseller') return prodseller;
  if (normalized === 'aiversehub') return aiverseHub;
  return null;
}

function labelFor(source) {
  const normalized = normalizeSource(source);
  if (normalized === 'prodseller') return 'ProdSeller';
  if (normalized === 'aiversehub') return 'AIVerseHub';
  return normalized || 'Supplier';
}

function rateToIdr(source, settings = {}) {
  const normalized = normalizeSource(source);
  if (normalized === 'aiversehub') return Math.max(0.000001, Number(settings.aiversehub_unit_to_idr || 1));
  return Math.max(1, Number(settings.prodseller_usdt_to_idr || 16500));
}

function markupPercent(source, settings = {}) {
  const normalized = normalizeSource(source);
  if (normalized === 'aiversehub') return Math.max(0, Number(settings.aiversehub_markup_percent || 25));
  return Math.max(0, Number(settings.prodseller_markup_percent || 25));
}

function defaultCategory(source, settings = {}) {
  const normalized = normalizeSource(source);
  if (normalized === 'aiversehub') return String(settings.aiversehub_default_category || 'Produk Digital');
  return String(settings.prodseller_default_category || 'Produk Digital');
}

function priceToIdr(source, supplierPrice, settings = {}) {
  const raw = Math.max(0, Number(supplierPrice || 0)) * rateToIdr(source, settings) * (1 + markupPercent(source, settings) / 100);
  return Math.max(1000, Math.ceil(raw / 500) * 500);
}

function supplierKey(source, productId) {
  return `${normalizeSource(source)}:${String(productId || '').trim()}`;
}

module.exports = {
  API_SUPPLIER_SOURCES,
  normalizeSource,
  isApiSupplierSource,
  serviceFor,
  labelFor,
  rateToIdr,
  markupPercent,
  defaultCategory,
  priceToIdr,
  supplierKey
};
