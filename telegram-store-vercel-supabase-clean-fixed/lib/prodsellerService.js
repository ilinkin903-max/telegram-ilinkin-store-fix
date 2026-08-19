const axios = require('axios');
const { config } = require('./config');

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

async function getBalance() {
  return request('GET', '/balance');
}

async function listProducts() {
  const data = await request('GET', '/products');
  return Array.isArray(data.products) ? data.products : [];
}

async function getProduct(productId) {
  return request('GET', `/products/${encodeURIComponent(String(productId || '').trim())}`);
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
  createOrder,
  getOrder,
  deliveredItems,
  apiError
};
