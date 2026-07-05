const { getSupabase } = require('./supabase');
const { splitStock } = require('./utils');

function sb() {
  return getSupabase();
}

function normalizeBulkPrices(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((item) => ({
    min_qty: Number(item.min_qty || item.qty || item.jumlah || 0),
    price: Number(item.price || item.harga || 0)
  })).filter((item) => item.min_qty > 0 && item.price > 0).sort((a, b) => a.min_qty - b.min_qty);
}

function variantKey(variant, index = 0) {
  return String(variant?.sku || variant?.kode || variant?.key || variant?.name || variant?.nama || `VAR${index + 1}`)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

function normalizeVariant(item, index = 0) {
  const name = String(item?.name || item?.nama || `Varian ${index + 1}`).trim();
  const stockValue = item?.stock ?? item?.stok ?? item?.data ?? [];
  return {
    name,
    price: Number(item?.price || item?.harga || 0),
    sku: variantKey(item, index),
    note: String(item?.note || item?.catatan || '').trim(),
    stock: Array.isArray(stockValue) ? stockValue.map((x) => String(x).trim()).filter(Boolean) : splitStock(String(stockValue || '').replace(/,/g, '\n')),
    bulk_prices: normalizeBulkPrices(item?.bulk_prices || item?.bulkPrices || item?.grosir || [])
  };
}

function normalizeVariants(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map(normalizeVariant).filter((item) => item.name);
}

function normalizeProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    nama: row.name,
    kode: row.code,
    harga: Number(row.price || 0),
    deskripsi: row.description || '',
    snk: row.terms || '',
    image_url: row.image_url || '',
    category: row.category || '',
    bulk_prices: normalizeBulkPrices(row.bulk_prices),
    variants: normalizeVariants(row.variants),
    data: Array.isArray(row.stock) ? row.stock.map((x) => String(x).trim()).filter(Boolean) : [],
    terjual: row.sold || 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function findVariant(product, key) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const target = String(key || '').trim().toUpperCase();
  if (!target) return { variant: null, index: -1 };
  const index = variants.findIndex((v, i) => variantKey(v, i) === target || String(i) === target);
  return { variant: index >= 0 ? variants[index] : null, index };
}

function variantStockCount(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.reduce((sum, item) => sum + (Array.isArray(item.stock) ? item.stock.length : 0), 0);
}

function productAvailableStock(product, variantKeyValue = '') {
  const variantsTotal = variantStockCount(product);
  if (variantKeyValue) {
    const found = findVariant(product, variantKeyValue);
    return Array.isArray(found.variant?.stock) ? found.variant.stock.length : 0;
  }
  if (variantsTotal > 0) return variantsTotal;
  return Array.isArray(product?.data) ? product.data.length : 0;
}

function orderUnitPrice(product, order = {}) {
  const quantity = Math.max(1, Number(order.quantity || 1));
  const found = findVariant(product, order.variant_key);
  const variant = found.variant;
  const basePrice = Number(order.unit_price || variant?.price || product?.harga || 0);
  const bulkRows = normalizeBulkPrices(variant?.bulk_prices && variant.bulk_prices.length ? variant.bulk_prices : product?.bulk_prices || []);
  let unit = basePrice;
  bulkRows.forEach((row) => {
    if (quantity >= row.min_qty) unit = Number(row.price || unit);
  });
  return unit;
}

async function upsertUser(from) {
  const telegramId = Number(from.id || from.telegram_id || from);
  const payload = {
    telegram_id: telegramId,
    first_name: from.first_name || null,
    username: from.username || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb().from('bot_users').upsert(payload, { onConflict: 'telegram_id' });
  if (error) throw error;
}

async function getStats() {
  const [{ count: usersCount }, { data: products }, { data: transactions, count: ordersCount }] = await Promise.all([
    sb().from('bot_users').select('telegram_id', { count: 'exact', head: true }),
    sb().from('products').select('stock,sold,price,variants'),
    sb().from('transactions').select('total_price,quantity', { count: 'exact' })
  ]);

  const stokTersedia = (products || []).reduce((sum, row) => sum + productAvailableStock(normalizeProduct(row)), 0);
  const stokTerjual = (products || []).reduce((sum, item) => sum + Number(item.sold || 0), 0);
  const omzet = (transactions || []).reduce((sum, item) => sum + Number(item.total_price || 0), 0);

  return {
    users: usersCount || 0,
    products: (products || []).length,
    orders: ordersCount || 0,
    stokTersedia,
    stokTerjual,
    omzet
  };
}

async function listProducts() {
  const { data, error } = await sb().from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeProduct);
}

async function getProductByCode(code) {
  const { data, error } = await sb().from('products').select('*').ilike('code', String(code)).limit(1).maybeSingle();
  if (error) throw error;
  return normalizeProduct(data);
}

async function addProduct(input) {
  const code = String(input.kode || input.code || '').trim().toUpperCase();
  const payload = {
    name: String(input.nama || input.name || '').trim(),
    code,
    price: Number(input.harga || input.price || 0),
    description: String(input.deskripsi || input.description || ''),
    terms: String(input.snk || input.terms || ''),
    image_url: String(input.image_url || input.imageUrl || '').trim(),
    category: String(input.category || input.kategori || '').trim(),
    bulk_prices: normalizeBulkPrices(input.bulk_prices || input.bulkPrices || []),
    variants: normalizeVariants(input.variants || []),
    stock: Array.isArray(input.data || input.stock) ? (input.data || input.stock) : splitStock(input.stock_text || ''),
    sold: Number(input.terjual || input.sold || 0),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('products').insert(payload).select('*').single();
  if (error) throw error;
  return normalizeProduct(data);
}

async function deleteProduct(code) {
  const { error } = await sb().from('products').delete().ilike('code', String(code));
  if (error) throw error;
}

async function appendStock(code, text) {
  const product = await getProductByCode(code);
  if (!product) return null;
  const lines = splitStock(text);
  const stock = [...product.data, ...lines];
  const { data, error } = await sb()
    .from('products')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('code', product.kode)
    .select('*')
    .single();
  if (error) throw error;
  return { product: normalizeProduct(data), added: lines.length };
}

async function updateProductByCode(code, updates = {}) {
  const currentCode = String(code || '').trim().toUpperCase();
  if (!currentCode) return null;
  const payload = { updated_at: new Date().toISOString() };
  if (updates.nama !== undefined || updates.name !== undefined) payload.name = String(updates.nama ?? updates.name).trim();
  if (updates.kode !== undefined || updates.code !== undefined) payload.code = String(updates.kode ?? updates.code).trim().toUpperCase();
  if (updates.harga !== undefined || updates.price !== undefined) payload.price = Number(updates.harga ?? updates.price);
  if (updates.deskripsi !== undefined || updates.description !== undefined) payload.description = String(updates.deskripsi ?? updates.description);
  if (updates.snk !== undefined || updates.terms !== undefined) payload.terms = String(updates.snk ?? updates.terms);
  if (updates.image_url !== undefined || updates.imageUrl !== undefined) payload.image_url = String((updates.image_url ?? updates.imageUrl) || '').trim();
  if (updates.category !== undefined || updates.kategori !== undefined) payload.category = String((updates.category ?? updates.kategori) || '').trim();
  if (updates.bulk_prices !== undefined || updates.bulkPrices !== undefined) payload.bulk_prices = normalizeBulkPrices(updates.bulk_prices ?? updates.bulkPrices);
  if (updates.variants !== undefined) payload.variants = normalizeVariants(updates.variants);
  if (updates.data !== undefined || updates.stock !== undefined) {
    const stockValue = updates.data ?? updates.stock;
    payload.stock = Array.isArray(stockValue) ? stockValue : splitStock(String(stockValue || ''));
  }
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === null) delete payload[key];
  });
  const { data, error } = await sb()
    .from('products')
    .update(payload)
    .eq('code', currentCode)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return normalizeProduct(data);
}

async function replaceStock(code, stockText) {
  return updateProductByCode(code, { stock: splitStock(stockText) });
}

async function listUsers(limit = 100) {
  const { data, error } = await sb()
    .from('bot_users')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(Number(limit) || 100);
  if (error) throw error;
  return data || [];
}

async function deleteUser(telegramId) {
  const { error } = await sb().from('bot_users').delete().eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

function parseVoucherProducts(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  const raw = String(value || '').trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'all' || raw.toLowerCase() === 'semua') return [];
  return raw.split(/[|,\n]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
}

async function getVoucher(code) {
  if (!code) return null;
  const { data, error } = await sb().from('vouchers').select('*').ilike('code', String(code).trim()).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function addVoucher(input) {
  const code = String(input.kode || input.code || '').trim().toUpperCase();
  const existing = code ? await getVoucher(code).catch(() => null) : null;
  const payload = {
    code,
    products: parseVoucherProducts(input.produk ?? input.products),
    discount: Number(input.potongan ?? input.discount ?? 0),
    usage_limit: Number(input.limit ?? input.usage_limit ?? 0),
    used_by: Array.isArray(input.used_by) ? input.used_by.map(Number) : (Array.isArray(existing?.used_by) ? existing.used_by : []),
    description: String(input.description || input.deskripsi || existing?.description || ''),
    active: input.active === undefined ? (existing?.active ?? true) : Boolean(input.active),
    expires_at: input.expires_at || input.expired_at || existing?.expires_at || null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('vouchers').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  return data;
}

async function updateVoucher(code, updates = {}) {
  const currentCode = String(code || '').trim().toUpperCase();
  if (!currentCode) return null;
  const current = await getVoucher(currentCode);
  if (!current) return null;
  const nextCode = String(updates.kode || updates.code || currentCode).trim().toUpperCase();
  const payload = {
    code: nextCode,
    products: updates.produk !== undefined || updates.products !== undefined ? parseVoucherProducts(updates.produk ?? updates.products) : (Array.isArray(current.products) ? current.products : []),
    discount: updates.potongan !== undefined || updates.discount !== undefined ? Number(updates.potongan ?? updates.discount) : Number(current.discount || 0),
    usage_limit: updates.limit !== undefined || updates.usage_limit !== undefined ? Number(updates.limit ?? updates.usage_limit) : Number(current.usage_limit || 0),
    used_by: Array.isArray(current.used_by) ? current.used_by : [],
    description: updates.description !== undefined || updates.deskripsi !== undefined ? String(updates.description ?? updates.deskripsi) : String(current.description || ''),
    active: updates.active === undefined ? (current.active ?? true) : Boolean(updates.active),
    expires_at: updates.expires_at !== undefined || updates.expired_at !== undefined ? (updates.expires_at || updates.expired_at || null) : (current.expires_at || null),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('vouchers').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  if (nextCode !== currentCode) await deleteVoucher(currentCode);
  return data;
}

async function deleteVoucher(code) {
  const { error } = await sb().from('vouchers').delete().ilike('code', String(code || '').trim());
  if (error) throw error;
}

async function listVouchers(limit = 100) {
  const { data, error } = await sb()
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 100);
  if (error) throw error;
  return data || [];
}

async function getMonthlyRekap(month, year) {
  const now = new Date();
  const m = Number(month || (now.getMonth() + 1));
  const y = Number(year || now.getFullYear());
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const { data, error } = await sb()
    .from('transactions')
    .select('*')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const total_price = rows.reduce((sum, row) => sum + Number(row.total_price || 0), 0);
  const quantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const byProduct = new Map();
  rows.forEach((row) => {
    const key = `${row.product_code || row.product_name || '-'}:${row.variant_key || row.variant_name || ''}`;
    const current = byProduct.get(key) || { code: row.product_code || '-', name: row.product_name || '-', variant: row.variant_name || '', quantity: 0, total_price: 0 };
    current.quantity += Number(row.quantity || 0);
    current.total_price += Number(row.total_price || 0);
    byProduct.set(key, current);
  });
  return { month: m, year: y, orders: rows.length, quantity, total_price, by_product: Array.from(byProduct.values()).sort((a, b) => b.total_price - a.total_price), rows };
}

async function getShopSettings() {
  const { data, error } = await sb().from('shop_settings').select('key,value');
  if (error) throw error;
  const out = { store_name: '', store_description: '', logo_url: '', banner_url: '', start_media_type: 'none', start_media_value: '', start_media_caption: '' };
  (data || []).forEach((row) => { out[row.key] = row.value; });
  return out;
}

async function saveShopSettings(input = {}) {
  const rows = ['store_name', 'store_description', 'logo_url', 'banner_url', 'start_media_type', 'start_media_value', 'start_media_caption']
    .filter((key) => input[key] !== undefined)
    .map((key) => ({ key, value: String(input[key] || ''), updated_at: new Date().toISOString() }));
  if (!rows.length) return getShopSettings();
  const { error } = await sb().from('shop_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  return getShopSettings();
}

async function getAnalytics() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const { data, error } = await sb()
    .from('transactions')
    .select('*')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data || [];
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), orders: 0, revenue: 0, quantity: 0 };
  });
  const topMap = new Map();
  rows.forEach((row) => {
    const keyDate = new Date(row.created_at).toISOString().slice(0, 10);
    const bucket = daily.find((d) => d.date === keyDate);
    if (bucket) {
      bucket.orders += 1;
      bucket.revenue += Number(row.total_price || 0);
      bucket.quantity += Number(row.quantity || 0);
    }
    const key = `${row.product_code || row.product_name || '-'}:${row.variant_key || row.variant_name || ''}`;
    const item = topMap.get(key) || { code: row.product_code || '-', name: row.product_name || '-', variant: row.variant_name || '', orders: 0, quantity: 0, revenue: 0 };
    item.orders += 1;
    item.quantity += Number(row.quantity || 0);
    item.revenue += Number(row.total_price || 0);
    topMap.set(key, item);
  });
  return {
    period: '7d',
    daily,
    top_products: Array.from(topMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    total_orders: rows.length,
    total_revenue: rows.reduce((sum, row) => sum + Number(row.total_price || 0), 0),
    total_quantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
  };
}

async function upsertPendingOrder(input) {
  const payload = {
    telegram_id: Number(input.telegram_id),
    product_code: String(input.product_code).toUpperCase(),
    variant_key: String(input.variant_key || '').trim().toUpperCase(),
    variant_name: String(input.variant_name || '').trim(),
    unit_price: Number(input.unit_price || 0),
    quantity: Number(input.quantity || 1),
    voucher_code: input.voucher_code || '',
    invoice_ref: input.invoice_ref || null,
    amount: Number(input.amount || 0),
    fee: Number(input.fee || 0),
    status: input.status || 'draft',
    expires_at: input.expires_at || null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('pending_orders').upsert(payload, { onConflict: 'telegram_id' }).select('*').single();
  if (error) throw error;
  return data;
}

async function getPendingOrder(telegramId) {
  const { data, error } = await sb().from('pending_orders').select('*').eq('telegram_id', Number(telegramId)).maybeSingle();
  if (error) throw error;
  return data;
}

async function deletePendingOrder(telegramId) {
  const { error } = await sb().from('pending_orders').delete().eq('telegram_id', Number(telegramId));
  if (error) throw error;
}

async function applyVoucherUsage(code, telegramId) {
  const voucher = await getVoucher(code);
  if (!voucher) return null;
  const usedBy = Array.isArray(voucher.used_by) ? voucher.used_by : [];
  const { data, error } = await sb()
    .from('vouchers')
    .update({ usage_limit: Number(voucher.usage_limit || 0) - 1, used_by: [...usedBy, Number(telegramId)] })
    .eq('code', voucher.code)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

function voucherIsValid(voucher, productCode, telegramId) {
  if (!voucher) return false;
  const products = Array.isArray(voucher.products) ? voucher.products : [];
  const usedBy = Array.isArray(voucher.used_by) ? voucher.used_by : [];
  const productAllowed = products.length === 0 || products.map((p) => String(p).toUpperCase()).includes(String(productCode).toUpperCase());
  const notExpired = !voucher.expires_at || new Date(voucher.expires_at).getTime() > Date.now();
  const active = voucher.active === undefined ? true : Boolean(voucher.active);
  return active && notExpired && productAllowed && Number(voucher.usage_limit || 0) > 0 && !usedBy.map(Number).includes(Number(telegramId));
}

async function listTransactions(limit = 50) {
  const { data, error } = await sb().from('transactions').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function listTransactionsByUser(telegramId, limit = 8) {
  const { data, error } = await sb().from('transactions').select('*').eq('telegram_id', Number(telegramId)).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function completeOrder(order, product, totalPrice, buyer = {}) {
  const quantity = Number(order.quantity || 1);
  let delivered = [];
  const updatePayload = { sold: Number(product.terjual || 0) + quantity, updated_at: new Date().toISOString() };

  if (order.variant_key) {
    const variants = normalizeVariants(product.variants);
    const { variant, index } = findVariant({ variants }, order.variant_key);
    if (!variant || index < 0) throw new Error('Varian produk tidak ditemukan.');
    const currentStock = Array.isArray(variant.stock) ? variant.stock : [];
    if (currentStock.length < quantity) throw new Error('Stok varian tidak mencukupi.');
    delivered = currentStock.slice(0, quantity);
    variants[index] = { ...variant, stock: currentStock.slice(quantity), sold: Number(variant.sold || 0) + quantity };
    updatePayload.variants = variants;
  } else {
    const currentStock = Array.isArray(product.data) ? product.data : [];
    if (currentStock.length < quantity) throw new Error('Stok produk tidak mencukupi.');
    delivered = currentStock.slice(0, quantity);
    updatePayload.stock = currentStock.slice(quantity);
  }

  const { error: productError } = await sb().from('products').update(updatePayload).eq('code', product.kode);
  if (productError) throw productError;

  const transaction = {
    telegram_id: Number(order.telegram_id),
    username: buyer.username || null,
    product_name: product.nama,
    product_code: product.kode,
    variant_key: order.variant_key || '',
    variant_name: order.variant_name || '',
    unit_price: Number(order.unit_price || 0),
    quantity,
    total_price: Number(totalPrice),
    order_ref: order.invoice_ref || null,
    created_at: new Date().toISOString()
  };

  const { error: trxError } = await sb().from('transactions').insert(transaction);
  if (trxError && !String(trxError.message || '').toLowerCase().includes('duplicate')) throw trxError;

  const { data: user } = await sb().from('bot_users').select('*').eq('telegram_id', Number(order.telegram_id)).maybeSingle();
  await sb().from('bot_users').upsert({
    telegram_id: Number(order.telegram_id),
    first_name: buyer.first_name || user?.first_name || null,
    username: buyer.username || user?.username || null,
    transaction_count: Number(user?.transaction_count || 0) + 1,
    spending: Number(user?.spending || 0) + Number(totalPrice),
    updated_at: new Date().toISOString()
  }, { onConflict: 'telegram_id' });

  if (order.voucher_code) await applyVoucherUsage(order.voucher_code, order.telegram_id).catch(() => null);
  await deletePendingOrder(order.telegram_id);
  return { delivered, transaction };
}

module.exports = {
  upsertUser,
  getStats,
  listProducts,
  getProductByCode,
  addProduct,
  deleteProduct,
  appendStock,
  updateProductByCode,
  replaceStock,
  listUsers,
  deleteUser,
  addVoucher,
  deleteVoucher,
  updateVoucher,
  listVouchers,
  getMonthlyRekap,
  getShopSettings,
  saveShopSettings,
  getAnalytics,
  upsertPendingOrder,
  getPendingOrder,
  deletePendingOrder,
  getVoucher,
  voucherIsValid,
  listTransactions,
  listTransactionsByUser,
  completeOrder,
  normalizeBulkPrices,
  normalizeVariants,
  variantKey,
  findVariant,
  productAvailableStock,
  orderUnitPrice
};
