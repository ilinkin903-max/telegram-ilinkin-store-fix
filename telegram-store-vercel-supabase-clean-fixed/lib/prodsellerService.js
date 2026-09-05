const axios = require('axios');
const { config } = require('./config');

const cache = {
  balance: { at: 0, value: null },
  products: new Map()
};
const inFlight = {
  balance: null,
  products: new Map()
};
const CACHE_MS = 30000;

function requestTimeout(options = {}, fallback = 20000) {
  const value = Number(options?.timeout);
  if (!Number.isFinite(value) || value < 250) return fallback;
  return Math.min(30000, Math.floor(value));
}

function cacheFresh(at) {
  return Number(at || 0) > 0 && (Date.now() - Number(at || 0)) < CACHE_MS;
}

function configured() {
  return Boolean(String(config.prodsellerApiKey || '').trim());
}

function headers(extra = {}) {
  if (!configured()) {
    const error = new Error('PRODSELLER_API_KEY belum diatur di Environment Variables Vercel.');
    error.code = 'PRODSELLER_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }
  return {
    'X-API-Key': String(config.prodsellerApiKey).trim(),
    'Content-Type': 'application/json',
    ...extra
  };
}

function apiError(error, fallback = 'ProdSeller API gagal diproses.') {
  const status = Number(error?.response?.status || error?.statusCode || 0);
  const remote = String(error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback).trim();
  let message = remote || fallback;
  let code = 'PRODSELLER_ERROR';
  if (status === 401) { code = 'PRODSELLER_AUTH'; message = 'API key ProdSeller tidak valid, nonaktif, atau belum diatur.'; }
  else if (status === 402) { code = 'PRODSELLER_BALANCE'; message = 'Saldo ProdSeller tidak mencukupi. Silakan top up saldo reseller terlebih dahulu.'; }
  else if (status === 404) { code = 'PRODSELLER_NOT_FOUND'; message = 'Produk/order ProdSeller tidak ditemukan.'; }
  else if (status === 409) { code = 'PRODSELLER_STOCK'; message = 'Stok produk di ProdSeller sedang tidak tersedia.'; }
  else if (status === 429) { code = 'PRODSELLER_RATE_LIMIT'; message = 'Batas request ProdSeller tercapai. Coba kembali beberapa saat lagi.'; }
  else if (status >= 500) { code = 'PRODSELLER_UPSTREAM'; message = 'Server ProdSeller sedang bermasalah. Pesanan dapat dicoba ulang dengan aman.'; }
  const out = new Error(message);
  out.statusCode = status || 502;
  out.code = code;
  out.remoteMessage = remote;
  return out;
}

async function request(method, path, { data, params, idempotencyKey, timeout = 20000 } = {}) {
  try {
    const response = await axios({
      method,
      url: `${String(config.prodsellerBaseUrl || 'https://prodseller.com/v1').replace(/\/$/, '')}${path}`,
      headers: headers(idempotencyKey ? { 'Idempotency-Key': String(idempotencyKey).slice(0, 100) } : {}),
      data,
      params,
      timeout
    });
    return response.data || {};
  } catch (error) {
    throw apiError(error);
  }
}

async function getBalance(options = {}) {
  const force = options && options.force === true;
  if (!force && cacheFresh(cache.balance.at) && cache.balance.value) return cache.balance.value;
  if (!force && inFlight.balance) return inFlight.balance;

  let activePromise;
  activePromise = request('GET', '/balance', { timeout: requestTimeout(options) })
    .then((value) => {
      cache.balance = { at: Date.now(), value };
      return value;
    })
    .catch((error) => {
      if (!force && cache.balance.value) return cache.balance.value;
      throw error;
    })
    .finally(() => {
      if (inFlight.balance === activePromise) inFlight.balance = null;
    });
  if (!force) inFlight.balance = activePromise;
  return activePromise;
}

async function listProducts(options = {}) {
  const data = await request('GET', '/products', { timeout: requestTimeout(options) });
  return Array.isArray(data.products) ? data.products : [];
}

async function getProduct(productId, options = {}) {
  const id = String(productId || '').trim();
  if (!id) throw new Error('Product ID ProdSeller kosong.');
  const force = options && options.force === true;
  const cached = cache.products.get(id);
  if (!force && cached && cacheFresh(cached.at)) return cached.value;
  if (!force && inFlight.products.has(id)) return inFlight.products.get(id);

  let activePromise;
  activePromise = request('GET', `/products/${encodeURIComponent(id)}`, { timeout: requestTimeout(options) })
    .then((value) => {
      cache.products.set(id, { at: Date.now(), value });
      return value;
    })
    .catch((error) => {
      const stale = cache.products.get(id);
      if (!force && stale?.value) return stale.value;
      throw error;
    })
    .finally(() => {
      if (inFlight.products.get(id) === activePromise) inFlight.products.delete(id);
    });
  if (!force) inFlight.products.set(id, activePromise);
  return activePromise;
}

function availabilityFrom({ balanceData = {}, product = {} } = {}) {
  const balance = Math.max(0, Number(balanceData?.balance || 0));
  const unitPrice = Math.max(0, Number(product?.price || 0));
  const supplierStock = product?.stock == null ? null : Math.max(0, Math.floor(Number(product.stock || 0)));
  const balanceStock = unitPrice > 0 ? Math.max(0, Math.floor((balance + 1e-9) / unitPrice)) : 0;
  const inStock = product?.inStock !== false && (supplierStock == null || supplierStock > 0);
  const availableStock = !inStock || unitPrice <= 0
    ? 0
    : (supplierStock == null ? balanceStock : Math.max(0, Math.min(balanceStock, supplierStock)));
  return {
    balance,
    membership: String(balanceData?.membership || ''),
    unitPrice,
    publicPrice: Math.max(0, Number(product?.publicPrice || 0)),
    supplierStock,
    balanceStock,
    availableStock,
    inStock,
    product
  };
}

async function getAvailability(productId, options = {}) {
  const force = options && options.force === true;
  const timeout = requestTimeout(options);
  const [balanceData, product] = await Promise.all([
    getBalance({ force, timeout }),
    getProduct(productId, { force, timeout })
  ]);
  return availabilityFrom({ balanceData, product });
}

async function createOrder({ productId, quantity = 1, idempotencyKey }) {
  const id = String(productId || '').trim();
  if (!id) throw new Error('Product ID ProdSeller kosong.');
  const qty = Math.max(1, Math.min(100, Number(quantity || 1)));
  return request('POST', '/orders', {
    data: { productId: id, quantity: qty },
    idempotencyKey: String(idempotencyKey || `ilink-${Date.now()}`).slice(0, 100),
    timeout: 30000
  });
}

async function getOrder(orderId) {
  return request('GET', `/orders/${encodeURIComponent(String(orderId || '').trim())}`);
}

function deliveredItems(order = {}) {
  if (Array.isArray(order.deliveredKeys)) return order.deliveredKeys.map((x) => String(x || '').trim()).filter(Boolean);
  if (order.deliveredKey !== undefined && order.deliveredKey !== null && String(order.deliveredKey).trim()) return [String(order.deliveredKey).trim()];
  return [];
}

module.exports = {
  configured,
  getBalance,
  listProducts,
  getProduct,
  getAvailability,
  availabilityFrom,
  createOrder,
  getOrder,
  deliveredItems,
  apiError
};
