const axios = require('axios');
const { config } = require('./config');

const CACHE_MS = 30000;
const cache = {
  balance: { at: 0, value: null },
  products: { at: 0, value: null }
};
const inFlight = { balance: null, products: null };

function requestTimeout(options = {}, fallback = 20000) {
  const value = Number(options?.timeout);
  if (!Number.isFinite(value) || value < 250) return fallback;
  return Math.min(30000, Math.floor(value));
}

function cacheFresh(at) {
  return Number(at || 0) > 0 && (Date.now() - Number(at || 0)) < CACHE_MS;
}

function configured() {
  return Boolean(String(config.aiverseHubApiKey || '').trim());
}

function headers() {
  if (!configured()) {
    const error = new Error('AIVERSEHUB_API_KEY belum diatur di Environment Variables Vercel.');
    error.code = 'AIVERSEHUB_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }
  return {
    'X-API-Key': String(config.aiverseHubApiKey).trim(),
    'Content-Type': 'application/json'
  };
}

function apiError(error, fallback = 'AIVerseHub API gagal diproses.') {
  const status = Number(error?.response?.status || error?.statusCode || 0);
  const remote = String(error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback).trim();
  const lower = remote.toLowerCase();
  let message = remote || fallback;
  let code = 'AIVERSEHUB_ERROR';

  if (status === 401 || status === 403) {
    code = 'AIVERSEHUB_AUTH';
    message = 'API key AIVerseHub tidak valid, nonaktif, atau belum diatur.';
  } else if (/insufficient\s+balance|balance.*insufficient|saldo.*tidak cukup|saldo.*kurang/i.test(remote)) {
    code = 'AIVERSEHUB_BALANCE';
    message = 'Saldo AIVerseHub tidak mencukupi. Silakan top up saldo AIVerseHub terlebih dahulu.';
  } else if (/stock|out of stock|unavailable|stok/i.test(remote)) {
    code = 'AIVERSEHUB_STOCK';
    message = 'Stok produk di AIVerseHub sedang tidak tersedia.';
  } else if (status === 404) {
    code = 'AIVERSEHUB_NOT_FOUND';
    message = 'Produk/order AIVerseHub tidak ditemukan.';
  } else if (status === 429) {
    code = 'AIVERSEHUB_RATE_LIMIT';
    message = 'Batas request AIVerseHub tercapai. Coba kembali beberapa saat lagi.';
  } else if (String(error?.code || '').toUpperCase() === 'ECONNABORTED' || lower.includes('timeout')) {
    code = 'AIVERSEHUB_TIMEOUT';
    message = 'Request AIVerseHub timeout. Status pembelian pertama belum dapat dipastikan; cek riwayat AIVerseHub sebelum melakukan retry.';
  } else if (!error?.response && (error?.request || error?.code)) {
    code = 'AIVERSEHUB_NETWORK';
    message = 'Koneksi ke AIVerseHub terputus. Status pembelian pertama belum dapat dipastikan; cek riwayat AIVerseHub sebelum melakukan retry.';
  } else if (status >= 500) {
    code = 'AIVERSEHUB_UPSTREAM';
    message = 'Server AIVerseHub sedang bermasalah. Periksa riwayat order AIVerseHub sebelum melakukan retry.';
  }

  const out = new Error(message);
  out.statusCode = status || 502;
  out.code = code;
  out.remoteMessage = remote;
  out.retryUncertain = ['AIVERSEHUB_TIMEOUT', 'AIVERSEHUB_NETWORK', 'AIVERSEHUB_UPSTREAM'].includes(code);
  return out;
}

async function request(method, path, { data, params, timeout = 20000 } = {}) {
  try {
    const response = await axios({
      method,
      url: `${String(config.aiverseHubBaseUrl || 'https://aiversehub.store/api/v1').replace(/\/$/, '')}${path}`,
      headers: headers(),
      data,
      params,
      timeout
    });
    return response.data || {};
  } catch (error) {
    throw apiError(error);
  }
}

function normalizeBalance(data = {}) {
  return {
    balance: Math.max(0, Number(data.wallet_balance || 0)),
    wallet_balance: Math.max(0, Number(data.wallet_balance || 0)),
    chatId: data.chat_id ?? null,
    telegramId: data.chat_id ?? null,
    firstName: String(data.first_name || ''),
    username: String(data.first_name || ''),
    membership: '',
    raw: data
  };
}

function normalizeProduct(item = {}) {
  const stock = item.stock == null ? null : Math.max(0, Math.floor(Number(item.stock || 0)));
  return {
    id: String(item.service_id || item.id || '').trim(),
    service_id: String(item.service_id || item.id || '').trim(),
    name: String(item.name || item.service || '').trim(),
    description: String(item.description || '').trim(),
    price: Math.max(0, Number(item.price || 0)),
    publicPrice: Math.max(0, Number(item.public_price || item.publicPrice || 0)),
    stock,
    imageUrl: String(item.image_url || item.imageUrl || '').trim(),
    inStock: item.inStock !== false && (stock == null || stock > 0),
    raw: item
  };
}

async function getBalance(options = {}) {
  const force = options && options.force === true;
  if (!force && cacheFresh(cache.balance.at) && cache.balance.value) return cache.balance.value;
  if (!force && inFlight.balance) return inFlight.balance;

  let activePromise;
  activePromise = request('GET', '/me', { timeout: requestTimeout(options) })
    .then((data) => {
      const value = normalizeBalance(data);
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
  const force = options && options.force === true;
  if (!force && cacheFresh(cache.products.at) && Array.isArray(cache.products.value)) return cache.products.value;
  if (!force && inFlight.products) return inFlight.products;

  let activePromise;
  activePromise = request('GET', '/products', { timeout: requestTimeout(options) })
    .then((data) => {
      const rows = Array.isArray(data.services) ? data.services.map(normalizeProduct).filter((x) => x.id) : [];
      cache.products = { at: Date.now(), value: rows };
      return rows;
    })
    .catch((error) => {
      if (!force && Array.isArray(cache.products.value)) return cache.products.value;
      throw error;
    })
    .finally(() => {
      if (inFlight.products === activePromise) inFlight.products = null;
    });
  if (!force) inFlight.products = activePromise;
  return activePromise;
}

async function getProduct(serviceId, options = {}) {
  const id = String(serviceId || '').trim();
  if (!id) throw new Error('Service ID AIVerseHub kosong.');
  const products = await listProducts(options);
  const product = products.find((item) => String(item.id || '') === id);
  if (product) return product;
  const error = new Error('Produk AIVerseHub tidak ditemukan di katalog aktif.');
  error.code = 'AIVERSEHUB_NOT_FOUND';
  error.statusCode = 404;
  throw error;
}

function availabilityFrom({ balanceData = {}, product = {} } = {}) {
  const balance = Math.max(0, Number(balanceData?.balance ?? balanceData?.wallet_balance ?? 0));
  const unitPrice = Math.max(0, Number(product?.price || 0));
  const supplierStock = product?.stock == null ? null : Math.max(0, Math.floor(Number(product.stock || 0)));
  const balanceStock = unitPrice > 0 ? Math.max(0, Math.floor((balance + 1e-9) / unitPrice)) : 0;
  const inStock = product?.inStock !== false && (supplierStock == null || supplierStock > 0);
  const availableStock = !inStock || unitPrice <= 0
    ? 0
    : (supplierStock == null ? balanceStock : Math.max(0, Math.min(balanceStock, supplierStock)));
  return {
    balance,
    membership: '',
    unitPrice,
    publicPrice: Math.max(0, Number(product?.publicPrice || 0)),
    supplierStock,
    balanceStock,
    availableStock,
    inStock,
    product
  };
}

async function getAvailability(serviceId, options = {}) {
  const force = options && options.force === true;
  const timeout = requestTimeout(options);
  const [balanceData, product] = await Promise.all([
    getBalance({ force, timeout }),
    getProduct(serviceId, { force, timeout })
  ]);
  return availabilityFrom({ balanceData, product });
}

function normalizeOrder(data = {}) {
  const row = data?.order && typeof data.order === 'object' ? data.order : data;
  const delivered = Array.isArray(row.products)
    ? row.products
    : (Array.isArray(row.delivered_products) ? row.delivered_products : []);
  const success = row.success === true || data.success === true;
  return {
    orderId: String(row.order_id || data.order_id || '').trim(),
    serviceId: String(row.service_id || data.service_id || '').trim(),
    quantity: Math.max(1, Number(row.quantity || data.quantity || 1)),
    amount: Math.max(0, Number(row.total_cost ?? row.amount ?? data.total_cost ?? data.amount ?? 0)),
    status: String(row.status || (success || delivered.length ? 'delivered' : 'pending')).trim().toLowerCase(),
    deliveredKeys: delivered.map((x) => String(x || '').trim()).filter(Boolean),
    newBalance: Number(row.new_balance ?? data.new_balance ?? 0),
    raw: data
  };
}

async function createOrder({ productId, serviceId, quantity = 1 }) {
  const id = String(serviceId || productId || '').trim();
  if (!id) throw new Error('Service ID AIVerseHub kosong.');
  const qty = Math.max(1, Math.min(100, Number(quantity || 1)));
  const data = await request('POST', '/order', {
    data: { service_id: id, quantity: qty },
    timeout: 30000
  });
  return normalizeOrder(data);
}

async function getOrder(orderId) {
  const id = String(orderId || '').trim();
  if (!id) throw new Error('Order ID AIVerseHub kosong.');
  return normalizeOrder(await request('GET', `/order/${encodeURIComponent(id)}`));
}

async function listOrders(options = {}) {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.max(1, Math.min(200, Number(options.limit || 50)));
  const data = await request('GET', '/orders', { params: { page, limit }, timeout: requestTimeout(options) });
  return {
    ...data,
    orders: Array.isArray(data.orders) ? data.orders.map((row) => ({ ...row })) : []
  };
}

function deliveredItems(order = {}) {
  if (Array.isArray(order.deliveredKeys)) return order.deliveredKeys.map((x) => String(x || '').trim()).filter(Boolean);
  if (Array.isArray(order.products)) return order.products.map((x) => String(x || '').trim()).filter(Boolean);
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
  listOrders,
  deliveredItems,
  normalizeProduct,
  normalizeOrder,
  apiError
};
