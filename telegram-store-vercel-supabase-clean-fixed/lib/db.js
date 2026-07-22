const { getSupabase } = require('./supabase');
const { splitStock } = require('./utils');
const { boolValue, normalizeDateTime, discountAmount, targetProducts, promoState, promoEligible } = require('./promoUtils');

function sb() {
  return getSupabase();
}

function isMissingTableError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

async function claimOnce(rawKey, ttlSeconds = 3600, meta = {}) {
  const key = String(rawKey || '').trim().slice(0, 220);
  if (!key) return true;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Number(ttlSeconds || 3600) * 1000).toISOString();
  const payload = {
    key,
    value: {
      status: 'processing',
      claimed_at: now.toISOString(),
      expires_at: expiresAt,
      ...meta
    },
    updated_at: now.toISOString()
  };

  async function tryInsert() {
    return sb().from('shop_settings').insert(payload).select('key').single();
  }

  let { error } = await tryInsert();
  if (!error) return true;
  if (isMissingTableError(error)) return true;

  const isDuplicate = String(error.code || '') === '23505' || /duplicate key/i.test(String(error.message || ''));
  if (!isDuplicate) {
    console.error('claimOnce gagal:', error.message || error);
    // Jangan matikan fitur utama hanya karena lock gagal.
    return true;
  }

  const { data: existing, error: readError } = await sb().from('shop_settings').select('value,updated_at').eq('key', key).maybeSingle();
  if (readError) {
    if (isMissingTableError(readError)) return true;
    console.error('claimOnce read gagal:', readError.message || readError);
    return false;
  }

  const existingExpires = existing?.value?.expires_at || null;
  const expired = existingExpires ? new Date(existingExpires).getTime() < Date.now() : (existing?.updated_at ? new Date(existing.updated_at).getTime() < Date.now() - Number(ttlSeconds || 3600) * 1000 : false);
  if (!expired) return false;

  await sb().from('shop_settings').delete().eq('key', key);
  ({ error } = await tryInsert());
  if (!error) return true;
  if (isMissingTableError(error)) return true;
  return false;
}

async function markClaimDone(rawKey, meta = {}) {
  const key = String(rawKey || '').trim().slice(0, 220);
  if (!key) return null;
  const { data, error } = await sb().from('shop_settings').update({
    value: {
      status: 'done',
      done_at: new Date().toISOString(),
      ...meta
    },
    updated_at: new Date().toISOString()
  }).eq('key', key).select('key').maybeSingle();
  if (error && !isMissingTableError(error)) console.error('markClaimDone gagal:', error.message || error);
  return data;
}

async function releaseClaim(rawKey) {
  const key = String(rawKey || '').trim().slice(0, 220);
  if (!key) return;
  const { error } = await sb().from('shop_settings').delete().eq('key', key);
  if (error && !isMissingTableError(error)) console.error('releaseClaim gagal:', error.message || error);
}


const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function wibDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  // Use Intl with Asia/Jakarta explicitly. This is safer than relying on server timezone
  // and prevents today's Indonesian orders from falling into yesterday's graph.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysKey(key, days) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + Number(days || 0), 12, 0, 0)).toISOString().slice(0, 10);
}

function wibKeyStartUtc(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - WIB_OFFSET_MS);
}

function wibKeyLabel(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' });
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
    description: String(item?.description || item?.deskripsi || '').trim(),
    snk: String(item?.snk || item?.terms || item?.syarat || '').trim(),
    active: item?.active === false || String(item?.active || '').toLowerCase() === 'false' || String(item?.status || '').toLowerCase() === 'off' ? false : true,
    stock: Array.isArray(stockValue) ? stockValue.map((x) => String(x).trim()).filter(Boolean) : splitStock(String(stockValue || '').replace(/,/g, '\n')),
    bulk_prices: normalizeBulkPrices(item?.bulk_prices || item?.bulkPrices || item?.grosir || [])
  };
}

function normalizeVariants(value) {
  const rows = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();
  rows.map(normalizeVariant).forEach((item, index) => {
    if (!item.name || Number(item.price || 0) <= 0) return;
    // Guard against old broken variant data generated from multiline description/SnK.
    // Lines such as '- Garansi 7 hari' must not be treated as separate variants.
    if (/^[-•*]+\s+/.test(item.name) && /^VAR\d+$/i.test(item.sku || '')) return;
    const key = String(item.sku || `${item.name}:${item.price}:${index}`).trim().toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
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
    active: row.active !== false,
    display_scope: String(row.display_scope || 'both').toLowerCase() === 'marketplace' ? 'marketplace' : 'both',
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

const HISTORICAL_STATS_KEY = 'historical_stats';

function normalizeHistoricalStats(value = {}) {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (_) { raw = {}; }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  return {
    orders_total: Math.max(0, Number(raw.orders_total || raw.orders || raw.total_transactions || 0)),
    revenue_total: Math.max(0, Number(raw.revenue_total || raw.omzet_total || raw.total_revenue || 0)),
    quantity_sold: Math.max(0, Number(raw.quantity_sold || raw.total_quantity || raw.items_sold || 0)),
    updated_at: raw.updated_at || null
  };
}

function mergeHistoricalStats(saved = {}, current = {}) {
  const a = normalizeHistoricalStats(saved);
  const b = normalizeHistoricalStats(current);
  return {
    orders_total: Math.max(a.orders_total, b.orders_total),
    revenue_total: Math.max(a.revenue_total, b.revenue_total),
    quantity_sold: Math.max(a.quantity_sold, b.quantity_sold),
    updated_at: new Date().toISOString()
  };
}

async function readHistoricalStats() {
  try {
    const { data, error } = await sb().from('shop_settings').select('value').eq('key', HISTORICAL_STATS_KEY).maybeSingle();
    if (error) {
      if (String(error.code || '') === '42P01' || /shop_settings/i.test(String(error.message || ''))) return normalizeHistoricalStats();
      throw error;
    }
    return normalizeHistoricalStats(data?.value);
  } catch (error) {
    console.error('readHistoricalStats:', error.message);
    return normalizeHistoricalStats();
  }
}

async function saveHistoricalStats(stats = {}) {
  const payload = mergeHistoricalStats(stats, {});
  try {
    await sb().from('shop_settings').upsert({
      key: HISTORICAL_STATS_KEY,
      value: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (error) {
    console.error('saveHistoricalStats:', error.message);
  }
  return payload;
}

async function summarizeAllTransactions() {
  const { data, count, error } = await sb().from('transactions').select('total_price,quantity', { count: 'exact' });
  if (error) throw error;
  const rows = data || [];
  return {
    orders_total: Number(count || rows.length || 0),
    revenue_total: rows.reduce((sum, item) => sum + Number(item.total_price || 0), 0),
    quantity_sold: rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    updated_at: new Date().toISOString()
  };
}

async function ensureHistoricalStatsFromCurrentTransactions(currentSummary = null) {
  const current = currentSummary || await summarizeAllTransactions();
  const saved = await readHistoricalStats();
  const merged = mergeHistoricalStats(saved, current);
  if (merged.orders_total !== saved.orders_total || merged.revenue_total !== saved.revenue_total || merged.quantity_sold !== saved.quantity_sold) {
    return saveHistoricalStats(merged);
  }
  return merged;
}

async function incrementHistoricalStats(delta = {}) {
  const saved = await readHistoricalStats();
  const next = {
    orders_total: Number(saved.orders_total || 0) + Number(delta.orders_total || delta.orders || 0),
    revenue_total: Number(saved.revenue_total || 0) + Number(delta.revenue_total || delta.revenue || 0),
    quantity_sold: Number(saved.quantity_sold || 0) + Number(delta.quantity_sold || delta.quantity || 0),
    updated_at: new Date().toISOString()
  };
  return saveHistoricalStats(next);
}

async function getStats() {
  const [{ count: usersCount }, { data: products }, { data: transactions, count: ordersCount }] = await Promise.all([
    sb().from('bot_users').select('telegram_id', { count: 'exact', head: true }),
    sb().from('products').select('stock,sold,price,variants'),
    sb().from('transactions').select('total_price,quantity', { count: 'exact' })
  ]);

  const stokTersedia = (products || []).reduce((sum, row) => sum + productAvailableStock(normalizeProduct(row)), 0);
  const stokTerjual = (products || []).reduce((sum, item) => sum + Number(item.sold || 0), 0);
  const liveSummary = {
    orders_total: Number(ordersCount || 0),
    revenue_total: (transactions || []).reduce((sum, item) => sum + Number(item.total_price || 0), 0),
    quantity_sold: (transactions || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  };
  const historical = await ensureHistoricalStatsFromCurrentTransactions(liveSummary).catch(() => liveSummary);

  return {
    users: usersCount || 0,
    products: (products || []).length,
    orders: Math.max(liveSummary.orders_total, Number(historical.orders_total || 0)),
    liveOrders: liveSummary.orders_total,
    stokTersedia,
    stokTerjual: Math.max(stokTerjual, Number(historical.quantity_sold || 0)),
    omzet: Math.max(liveSummary.revenue_total, Number(historical.revenue_total || 0)),
    liveOmzet: liveSummary.revenue_total
  };
}

async function listProducts(options = {}) {
  let query = sb().from('products').select('*').order('name', { ascending: true });
  if (options.activeOnly) query = query.neq('active', false);
  const { data, error } = await query;
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
    display_scope: String(input.display_scope || input.displayScope || 'both').toLowerCase() === 'marketplace' ? 'marketplace' : 'both',
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
  if (updates.display_scope !== undefined || updates.displayScope !== undefined) payload.display_scope = String((updates.display_scope ?? updates.displayScope) || 'both').toLowerCase() === 'marketplace' ? 'marketplace' : 'both';
  if (updates.active !== undefined) payload.active = updates.active === true || String(updates.active).toLowerCase() === 'true' || String(updates.active) === '1' || String(updates.active).toLowerCase() === 'on';
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
  return targetProducts(value);
}

function normalizeVoucher(row) {
  if (!row) return null;
  const usedBy = Array.isArray(row.used_by) ? row.used_by.map(Number).filter(Number.isFinite) : [];
  const normalized = {
    ...row,
    products: parseVoucherProducts(row.products),
    used_by: usedBy,
    active: boolValue(row.active, true),
    discount_type: String(row.discount_type || 'amount').toLowerCase() === 'percent' ? 'percent' : 'amount',
    discount_value: Number(row.discount_value ?? row.discount ?? 0),
    min_qty: Math.max(1, Number(row.min_qty || 1)),
    min_spend: Math.max(0, Number(row.min_spend || 0)),
    usage_limit: Math.max(0, Number(row.usage_limit || 0)),
    start_at: normalizeDateTime(row.start_at),
    expires_at: normalizeDateTime(row.expires_at)
  };
  return { ...normalized, ...promoState(normalized, { usedCount: usedBy.length }) };
}

async function getVoucher(code) {
  if (!code) return null;
  const { data, error } = await sb().from('vouchers').select('*').ilike('code', String(code).trim()).limit(1).maybeSingle();
  if (error) throw error;
  return normalizeVoucher(data);
}

async function addVoucher(input) {
  const code = String(input.kode || input.code || '').trim().toUpperCase();
  const existing = code ? await getVoucher(code).catch(() => null) : null;
  const discountType = String(input.discount_type || input.tipe_diskon || existing?.discount_type || 'amount').toLowerCase() === 'percent' ? 'percent' : 'amount';
  let discountValue = Number(input.discount_value ?? input.potongan ?? input.discount ?? existing?.discount_value ?? existing?.discount ?? 0);
  if (discountType === 'percent') discountValue = Math.min(100, Math.max(0, discountValue));
  const payload = {
    code,
    products: parseVoucherProducts(input.produk ?? input.products),
    discount: discountValue,
    discount_type: discountType,
    discount_value: discountValue,
    min_qty: Math.max(1, Number(input.min_qty || existing?.min_qty || 1)),
    min_spend: Math.max(0, Number(input.min_spend || existing?.min_spend || 0)),
    usage_limit: Math.max(0, Number(input.limit ?? input.usage_limit ?? existing?.usage_limit ?? 0)),
    used_by: Array.isArray(input.used_by) ? input.used_by.map(Number) : (Array.isArray(existing?.used_by) ? existing.used_by : []),
    description: String(input.description || input.deskripsi || existing?.description || ''),
    active: input.active === undefined ? boolValue(existing?.active, true) : boolValue(input.active, true),
    start_at: normalizeDateTime(input.start_at ?? input.mulai ?? existing?.start_at),
    expires_at: normalizeDateTime(input.expires_at ?? input.end_at ?? input.expired_at ?? existing?.expires_at),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('vouchers').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  return normalizeVoucher(data);
}

async function updateVoucher(code, updates = {}) {
  const currentCode = String(code || '').trim().toUpperCase();
  if (!currentCode) return null;
  const current = await getVoucher(currentCode);
  if (!current) return null;
  const nextCode = String(updates.kode || updates.code || currentCode).trim().toUpperCase();
  const discountType = updates.discount_type !== undefined || updates.tipe_diskon !== undefined ? (String(updates.discount_type || updates.tipe_diskon).toLowerCase() === 'percent' ? 'percent' : 'amount') : (current.discount_type || 'amount');
  let discountValue = updates.discount_value !== undefined || updates.potongan !== undefined || updates.discount !== undefined ? Number(updates.discount_value ?? updates.potongan ?? updates.discount) : Number(current.discount_value ?? current.discount ?? 0);
  if (discountType === 'percent') discountValue = Math.min(100, Math.max(0, discountValue));
  const payload = {
    code: nextCode,
    products: updates.produk !== undefined || updates.products !== undefined ? parseVoucherProducts(updates.produk ?? updates.products) : (Array.isArray(current.products) ? current.products : []),
    discount: discountValue,
    discount_type: discountType,
    discount_value: discountValue,
    min_qty: updates.min_qty !== undefined ? Math.max(1, Number(updates.min_qty || 1)) : Math.max(1, Number(current.min_qty || 1)),
    min_spend: updates.min_spend !== undefined ? Math.max(0, Number(updates.min_spend || 0)) : Math.max(0, Number(current.min_spend || 0)),
    usage_limit: updates.limit !== undefined || updates.usage_limit !== undefined ? Math.max(0, Number(updates.limit ?? updates.usage_limit ?? 0)) : Number(current.usage_limit || 0),
    used_by: Array.isArray(current.used_by) ? current.used_by : [],
    description: updates.description !== undefined || updates.deskripsi !== undefined ? String(updates.description ?? updates.deskripsi) : String(current.description || ''),
    active: updates.active === undefined ? boolValue(current.active, true) : boolValue(updates.active, true),
    start_at: updates.start_at !== undefined || updates.mulai !== undefined ? normalizeDateTime(updates.start_at ?? updates.mulai) : normalizeDateTime(current.start_at),
    expires_at: updates.expires_at !== undefined || updates.end_at !== undefined || updates.expired_at !== undefined ? normalizeDateTime(updates.expires_at ?? updates.end_at ?? updates.expired_at) : normalizeDateTime(current.expires_at),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('vouchers').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  if (nextCode !== currentCode) await deleteVoucher(currentCode);
  return normalizeVoucher(data);
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
  return (data || []).map(normalizeVoucher);
}

async function getMonthlyRekap(month, year) {
  const todayKey = wibDateKey(new Date());
  const [currentY, currentM] = todayKey.split('-').map(Number);
  const m = Number(month || currentM);
  const y = Number(year || currentY);
  const startKey = `${y}-${String(m).padStart(2, '0')}-01`;
  const endKey = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const start = wibKeyStartUtc(startKey);
  const end = wibKeyStartUtc(endKey);

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
    const current = byProduct.get(key) || {
      code: row.product_code || '-',
      name: row.product_name || '-',
      variant: row.variant_name || '',
      quantity: 0,
      total_price: 0
    };
    current.quantity += Number(row.quantity || 0);
    current.total_price += Number(row.total_price || 0);
    byProduct.set(key, current);
  });

  return {
    month: m,
    year: y,
    orders: rows.length,
    quantity,
    total_price,
    by_product: Array.from(byProduct.values()).sort((a, b) => b.total_price - a.total_price),
    rows
  };
}



async function getAnalytics() {
  // Analytics are grouped by Asia/Jakarta calendar days, not UTC days.
  const todayKey = wibDateKey(new Date());
  const firstKey = addDaysKey(todayKey, -6);
  const start = wibKeyStartUtc(firstKey);
  const end = wibKeyStartUtc(addDaysKey(todayKey, 1));
  const { data, error } = await sb()
    .from('transactions')
    .select('*')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = data || [];
  const daily = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(firstKey, i);
    return { date: key, label: wibKeyLabel(key), orders: 0, revenue: 0, quantity: 0 };
  });
  const dailyMap = new Map(daily.map((item) => [item.date, item]));
  const topMap = new Map();
  rows.forEach((row) => {
    const keyDate = wibDateKey(row.created_at);
    const bucket = dailyMap.get(keyDate);
    if (bucket) {
      bucket.orders += 1;
      bucket.revenue += Number(row.total_price || 0);
      bucket.quantity += Number(row.quantity || 0);
    }
    const key = `${row.product_code || row.product_name || '-'}:${row.variant_key || row.variant_name || ''}`;
    const item = topMap.get(key) || {
      code: row.product_code || '',
      name: row.product_name || '-',
      variant: row.variant_name || '',
      orders: 0,
      quantity: 0,
      revenue: 0
    };
    item.orders += 1;
    item.quantity += Number(row.quantity || 0);
    item.revenue += Number(row.total_price || 0);
    topMap.set(key, item);
  });
  return {
    period: '7d-wib',
    timezone: 'Asia/Jakarta',
    today: todayKey,
    today_revenue: daily[daily.length - 1]?.revenue || 0,
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
    product_code: String(input.product_code || '').toUpperCase(),
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
    qr_payload: String(input.qr_payload || ''),
    payment_provider: String(input.payment_provider || 'pakasir').trim().toLowerCase(),
    provider_transaction_id: String(input.provider_transaction_id || '').trim(),
    provider_checkout_url: String(input.provider_checkout_url || '').trim(),
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

async function getPendingOrderByInvoice(invoiceRef) {
  const ref = String(invoiceRef || '').trim();
  if (!ref) return null;
  const { data, error } = await sb().from('pending_orders').select('*').eq('invoice_ref', ref).maybeSingle();
  if (error) throw error;
  return data;
}

async function getPendingOrderByProviderTransactionId(transactionId) {
  const ref = String(transactionId || '').trim();
  if (!ref) return null;
  const { data, error } = await sb().from('pending_orders').select('*').eq('provider_transaction_id', ref).maybeSingle();
  if (error) throw error;
  return data;
}

async function deletePendingOrder(telegramId) {
  const { error } = await sb().from('pending_orders').delete().eq('telegram_id', Number(telegramId));
  if (error) throw error;
}


async function getShopSettings() {
  const defaults = {
    store_name: '',
    store_description: '',
    logo_url: '',
    banner_url: '',
    banner_urls: '',
    banner_items: '',
    banner_interval_seconds: '5',
    flash_sale_enabled: 'false',
    flash_sale_title: 'FLASH SALE',
    flash_sale_start_at: '',
    flash_sale_end_at: '',
    flash_sale_products: '',
    flash_sale_promo_codes: '',
    start_media_type: 'none',
    start_media_value: '',
    start_media_caption: '',
    customer_service_link: '',
    group_link: ''
  };
  const { data, error } = await sb().from('shop_settings').select('key,value');
  if (error) {
    // If the table has not been created yet, keep the bot and Mini App alive.
    if (String(error.code || '') === '42P01' || /shop_settings/i.test(String(error.message || ''))) return defaults;
    throw error;
  }
  const out = { ...defaults };
  (data || []).forEach((row) => {
    let value = row.value;
    // Supabase jsonb may return strings, objects, or null depending on the client/version.
    if (value && typeof value === 'object' && !Array.isArray(value)) value = value.value ?? value.text ?? value.url ?? value;
    out[row.key] = value == null ? '' : value;
  });
  return out;
}

async function saveShopSettings(input = {}) {
  const allowed = [
    'store_name',
    'store_description',
    'logo_url',
    'banner_url',
    'banner_urls',
    'banner_items',
    'banner_interval_seconds',
    'flash_sale_enabled',
    'flash_sale_title',
    'flash_sale_start_at',
    'flash_sale_end_at',
    'flash_sale_products',
    'flash_sale_promo_codes',
    'start_media_type',
    'start_media_value',
    'start_media_caption',
    'customer_service_link',
    'group_link'
  ];
  const rows = allowed
    .filter((key) => input[key] !== undefined)
    .map((key) => ({ key, value: String(input[key] || ''), updated_at: new Date().toISOString() }));
  if (!rows.length) return getShopSettings();
  const { error } = await sb().from('shop_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  return getShopSettings();
}

function voucherDiscountAmount(voucher, subtotal) {
  return discountAmount(voucher, subtotal);
}

function voucherIsValid(voucher, productCode, telegramId, quantity = 1, subtotal = 0, variantKeyValue = '') {
  const normalized = normalizeVoucher(voucher);
  if (!normalized) return false;
  const usedBy = Array.isArray(normalized.used_by) ? normalized.used_by.map(Number) : [];
  const usageLimit = Math.max(0, Number(normalized.usage_limit || 0));
  // Voucher manual wajib memiliki limit > 0 dan tidak boleh melewati jumlah pemakaian.
  if (usageLimit <= 0 || usedBy.length >= usageLimit) return false;
  if (usedBy.includes(Number(telegramId))) return false;
  return promoEligible(normalized, { productCode, variantKey: variantKeyValue, quantity, subtotal, usedCount: usedBy.length });
}

async function applyVoucherUsage(code, telegramId) {
  const voucher = await getVoucher(code);
  if (!voucher) return null;
  const userId = Number(telegramId);
  const usedBy = Array.isArray(voucher.used_by) ? voucher.used_by.map(Number).filter(Number.isFinite) : [];
  if (userId && !usedBy.includes(userId)) usedBy.push(userId);
  const { data, error } = await sb().from('vouchers')
    .update({ used_by: usedBy, updated_at: new Date().toISOString() })
    .ilike('code', String(voucher.code || code).trim())
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return normalizeVoucher(data);
}

async function listTransactions(limit = 50) {
  const { data, error } = await sb().from('transactions').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function listTransactionsInRange(startAt, endAt = null, maxRows = 10000) {
  const startIso = normalizeDateTime(startAt);
  if (!startIso) return [];
  const endIso = normalizeDateTime(endAt) || new Date().toISOString();
  const pageSize = 1000;
  const cap = Math.max(1, Math.min(50000, Number(maxRows || 10000)));
  const out = [];
  for (let from = 0; from < cap; from += pageSize) {
    const to = Math.min(cap - 1, from + pageSize - 1);
    let query = sb().from('transactions')
      .select('product_code,variant_key,variant_name,quantity,created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, to);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

async function listTransactionsByUser(telegramId, limit = 8) {
  const { data, error } = await sb().from('transactions').select('*').eq('telegram_id', Number(telegramId)).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function getTransactionByOrderRef(orderRef) {
  const ref = String(orderRef || '').trim();
  if (!ref) return null;
  const { data, error } = await sb().from('transactions').select('*').eq('order_ref', ref).maybeSingle();
  if (error) throw error;
  return data;
}

async function getUserByTelegramId(telegramId) {
  const { data, error } = await sb().from('bot_users').select('*').eq('telegram_id', Number(telegramId)).maybeSingle();
  if (error) throw error;
  return data;
}

async function completeOrder(order, product, totalPrice, buyer = {}) {
  // Webhook payment gateway dapat dikirim lebih dari sekali. Cek transaksi lebih dulu agar
  // stok, statistik, dan voucher tidak diproses ulang untuk invoice yang sama.
  const existingTransaction = await getTransactionByOrderRef(order.invoice_ref);
  if (existingTransaction) {
    return {
      delivered: Array.isArray(existingTransaction.delivered_items)
        ? existingTransaction.delivered_items
        : String(existingTransaction.delivered_text || '').split('\n').filter(Boolean),
      transaction: existingTransaction,
      already_completed: true
    };
  }
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

  // Simpan angka riwayat sebelum transaksi baru masuk.
  // Dengan begini, kalau tabel transactions dibersihkan nanti, total transaksi dashboard tidak turun.
  await ensureHistoricalStatsFromCurrentTransactions().catch(() => null);

  const nowIso = new Date().toISOString();
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
    delivered_items: delivered,
    delivered_text: delivered.join('\n'),
    created_at: nowIso
  };

  const { error: trxError } = await sb().from('transactions').insert(transaction);
  const isDuplicateTrx = trxError && String(trxError.message || '').toLowerCase().includes('duplicate');
  if (trxError && !isDuplicateTrx) throw trxError;
  if (!trxError) {
    await incrementHistoricalStats({ orders_total: 1, revenue_total: Number(totalPrice), quantity_sold: quantity }).catch(() => null);
  }

  const { data: user } = await sb().from('bot_users').select('*').eq('telegram_id', Number(order.telegram_id)).maybeSingle();
  await sb().from('bot_users').upsert({
    telegram_id: Number(order.telegram_id),
    first_name: buyer.first_name || user?.first_name || null,
    username: buyer.username || user?.username || null,
    transaction_count: Number(user?.transaction_count || 0) + 1,
    spending: Number(user?.spending || 0) + Number(totalPrice),
    updated_at: new Date().toISOString()
  }, { onConflict: 'telegram_id' });

  if (order.voucher_code) {
    const promoMatch = String(order.voucher_code || '').match(/^AUTO_PROMO:(.+)$/);
    if (promoMatch) await applyAutoPromoUsage(promoMatch[1]).catch(() => null);
    else await applyVoucherUsage(order.voucher_code, order.telegram_id).catch(() => null);
  }
  // Pending order baru dihapus oleh paymentService setelah pesan produk berhasil
  // dikirim. Bila Telegram sedang gangguan, webhook/manual check dapat mencoba
  // mengirim ulang tanpa memotong stok lagi karena order_ref sudah tercatat.
  return { delivered, transaction, already_completed: false };
}


function normalizePollOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (typeof item === 'string') return { text: String(item), index, voter_count: 0 };
    return {
      text: String(item?.text || item?.label || item?.option || `Opsi ${index + 1}`),
      index,
      voter_count: Number(item?.voter_count || item?.votes || 0)
    };
  }).filter((item) => item.text.trim());
}

async function createBroadcastPoll(input = {}) {
  const payload = {
    question: String(input.question || '').trim(),
    options: normalizePollOptions(input.options || []).map((x) => ({ text: x.text, index: x.index })),
    is_anonymous: input.is_anonymous === undefined ? true : Boolean(input.is_anonymous),
    poll_type: String(input.type || input.poll_type || 'regular'),
    allows_multiple_answers: Boolean(input.allows_multiple_answers),
    status: String(input.status || 'draft'),
    created_by: input.created_by ? Number(input.created_by) : null,
    source_chat_id: input.source_chat_id || input.sourceChatId ? Number(input.source_chat_id || input.sourceChatId) : null,
    source_message_id: input.source_message_id || input.sourceMessageId ? Number(input.source_message_id || input.sourceMessageId) : null,
    source_poll_id: input.source_poll_id || input.sourcePollId ? String(input.source_poll_id || input.sourcePollId) : null,
    broadcast_mode: String(input.broadcast_mode || input.broadcastMode || (input.source_chat_id || input.source_message_id ? 'forward' : 'sendpoll')),
    total_sent: Number(input.total_sent || 0),
    total_failed: Number(input.total_failed || 0),
    updated_at: new Date().toISOString()
  };
  if (!payload.question || !payload.options.length) throw new Error('Data polling tidak lengkap.');
  const { data, error } = await sb().from('broadcast_polls').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function getBroadcastPoll(id) {
  const { data, error } = await sb().from('broadcast_polls').select('*').eq('id', String(id)).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateBroadcastPoll(id, updates = {}) {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await sb().from('broadcast_polls').update(payload).eq('id', String(id)).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

async function addBroadcastPollMessage(input = {}) {
  const payload = {
    broadcast_id: String(input.broadcast_id),
    poll_id: String(input.poll_id || ''),
    telegram_id: Number(input.telegram_id || 0),
    message_id: Number(input.message_id || 0),
    options_state: normalizePollOptions(input.options_state || input.options || []),
    total_voter_count: Number(input.total_voter_count || 0),
    updated_at: new Date().toISOString()
  };
  if (!payload.broadcast_id || !payload.poll_id) return null;
  const { data, error } = await sb().from('broadcast_poll_messages').upsert(payload, { onConflict: 'poll_id' }).select('*').single();
  if (error) throw error;
  return data;
}

async function recordPollUpdate(poll = {}) {
  const pollId = String(poll.id || poll.poll_id || '');
  if (!pollId) return null;
  const options_state = normalizePollOptions(poll.options || []);
  const total_voter_count = Number(poll.total_voter_count || options_state.reduce((s, x) => s + Number(x.voter_count || 0), 0));
  const { data: row, error: findError } = await sb().from('broadcast_poll_messages').select('*').eq('poll_id', pollId).maybeSingle();
  if (findError) throw findError;
  if (!row) return null;
  const { data, error } = await sb().from('broadcast_poll_messages')
    .update({ options_state, total_voter_count, updated_at: new Date().toISOString() })
    .eq('poll_id', pollId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function recordPollAnswer(answer = {}) {
  const pollId = String(answer.poll_id || '');
  const user = answer.user || {};
  const telegramId = Number(user.id || answer.telegram_id || 0);
  if (!pollId || !telegramId) return null;
  const { data: messageRow, error: findError } = await sb().from('broadcast_poll_messages').select('*').eq('poll_id', pollId).maybeSingle();
  if (findError) throw findError;
  if (!messageRow) return null;
  const payload = {
    broadcast_id: messageRow.broadcast_id,
    poll_id: pollId,
    telegram_id: telegramId,
    username: user.username || null,
    first_name: user.first_name || null,
    option_ids: Array.isArray(answer.option_ids) ? answer.option_ids.map(Number) : [],
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('broadcast_poll_answers')
    .upsert(payload, { onConflict: 'broadcast_id,telegram_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function listBroadcastPolls(limit = 50) {
  try {
    const { data, error } = await sb().from('broadcast_polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit) || 50);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('listBroadcastPolls:', error.message);
    return [];
  }
}

async function getBroadcastPollResult(id) {
  try {
  const poll = await getBroadcastPoll(id);
  if (!poll) return null;
  const [{ data: answers, error: answerError }, { data: messages, error: messageError }] = await Promise.all([
    sb().from('broadcast_poll_answers').select('*').eq('broadcast_id', String(id)),
    sb().from('broadcast_poll_messages').select('*').eq('broadcast_id', String(id))
  ]);
  if (answerError) throw answerError;
  if (messageError) throw messageError;
  const options = normalizePollOptions(poll.options || []);
  const answerRows = answers || [];
  const messageRows = messages || [];

  const countsFromAnswers = options.map(() => 0);
  answerRows.forEach((row) => {
    const optionIds = Array.isArray(row.option_ids) ? row.option_ids : [];
    optionIds.forEach((idx) => { if (countsFromAnswers[idx] !== undefined) countsFromAnswers[idx] += 1; });
  });

  // Untuk polling global dari bot, sumber paling akurat biasanya update.poll yang menyimpan voter_count.
  // Jangan jumlahkan semua forwarded message karena poll_id yang sama bisa tersimpan berkali-kali/tertindih.
  // Ambil state dengan total voter terbesar, lalu fallback ke poll_answer jika update.poll belum masuk.
  let bestMessage = null;
  let bestTotal = -1;
  messageRows.forEach((row) => {
    const total = Number(row.total_voter_count || 0);
    if (total > bestTotal) { bestTotal = total; bestMessage = row; }
  });
  const countsFromPollState = options.map(() => 0);
  if (bestMessage) {
    const state = normalizePollOptions(bestMessage.options_state || []);
    state.forEach((opt, idx) => { if (countsFromPollState[idx] !== undefined) countsFromPollState[idx] += Number(opt.voter_count || 0); });
  }

  const stateVotes = countsFromPollState.reduce((a, b) => a + b, 0);
  const answerVotes = countsFromAnswers.reduce((a, b) => a + b, 0);
  const counts = stateVotes >= answerVotes ? countsFromPollState : countsFromAnswers;
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const totalVoters = Math.max(Number(bestMessage?.total_voter_count || 0), answerRows.length);
  return {
    ...poll,
    options_result: options.map((opt, idx) => ({
      text: opt.text,
      index: idx,
      votes: counts[idx] || 0,
      percent: totalVotes ? Math.round(((counts[idx] || 0) / totalVotes) * 1000) / 10 : 0
    })),
    total_votes: totalVotes,
    total_voters: totalVoters,
    answer_count: answerRows.length,
    message_count: (messages || []).length
  };
  } catch (error) {
    console.error('getBroadcastPollResult:', error.message);
    return null;
  }
}

async function deleteBroadcastPoll(id) {
  const broadcastId = String(id || '');
  if (!broadcastId) return;
  await sb().from('broadcast_poll_answers').delete().eq('broadcast_id', broadcastId);
  await sb().from('broadcast_poll_messages').delete().eq('broadcast_id', broadcastId);
  const { error } = await sb().from('broadcast_polls').delete().eq('id', broadcastId);
  if (error) throw error;
}


function cutoffIso(days) {
  const safeDays = Math.max(1, Number(days || 30));
  return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
}

async function countRows(table, apply) {
  try {
    let query = sb().from(table).select('*', { count: 'exact', head: true });
    if (typeof apply === 'function') query = apply(query);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('countRows:', table, error.message);
    return 0;
  }
}

async function getMaintenanceStats() {
  const now = new Date().toISOString();
  const older7 = cutoffIso(7);
  const older30 = cutoffIso(30);
  const older90 = cutoffIso(90);
  const [
    pendingOrders,
    pendingOld,
    pendingExpired,
    transactions,
    transactionsOld90,
    deliveredOld90,
    polls,
    pollsOld30,
    pollAnswers,
    users,
    usersEmptyOld30,
    inactiveExpiredVouchers
  ] = await Promise.all([
    countRows('pending_orders'),
    countRows('pending_orders', (q) => q.lt('updated_at', older7)),
    countRows('pending_orders', (q) => q.not('expires_at', 'is', null).lt('expires_at', now)),
    countRows('transactions'),
    countRows('transactions', (q) => q.lt('created_at', older90)),
    countRows('transactions', (q) => q.lt('created_at', older90).neq('delivered_text', '')),
    countRows('broadcast_polls'),
    countRows('broadcast_polls', (q) => q.lt('created_at', older30)),
    countRows('broadcast_poll_answers'),
    countRows('bot_users'),
    countRows('bot_users', (q) => q.eq('transaction_count', 0).lt('updated_at', older30)),
    countRows('vouchers', (q) => q.or(`active.eq.false,expires_at.lt.${now}`))
  ]);
  return {
    pending_orders: pendingOrders,
    pending_orders_old_7d: pendingOld,
    pending_orders_expired: pendingExpired,
    transactions,
    transactions_old_90d: transactionsOld90,
    delivered_items_old_90d: deliveredOld90,
    broadcast_polls: polls,
    broadcast_polls_old_30d: pollsOld30,
    broadcast_poll_answers: pollAnswers,
    bot_users: users,
    bot_users_empty_old_30d: usersEmptyOld30,
    vouchers_inactive_or_expired: inactiveExpiredVouchers,
    generated_at: new Date().toISOString()
  };
}

async function deleteByIds(table, column, ids) {
  if (!ids.length) return 0;
  const { error } = await sb().from(table).delete().in(column, ids);
  if (error) throw error;
  return ids.length;
}

async function cleanupDatabase(input = {}) {
  const target = String(input.target || '').trim();
  const days = Math.max(1, Number(input.days || 30));
  const cutoff = cutoffIso(days);
  const now = new Date().toISOString();

  if (target === 'pending-old') {
    const before = await countRows('pending_orders', (q) => q.lt('updated_at', cutoff));
    const { error } = await sb().from('pending_orders').delete().lt('updated_at', cutoff);
    if (error) throw error;
    return { target, days, affected: before, message: `Pending order lebih dari ${days} hari dihapus.` };
  }

  if (target === 'pending-expired') {
    const before = await countRows('pending_orders', (q) => q.not('expires_at', 'is', null).lt('expires_at', now));
    const { error } = await sb().from('pending_orders').delete().not('expires_at', 'is', null).lt('expires_at', now);
    if (error) throw error;
    return { target, affected: before, message: 'Pending order expired dihapus.' };
  }

  if (target === 'polls-old') {
    const { data, error: selectError } = await sb().from('broadcast_polls').select('id').lt('created_at', cutoff);
    if (selectError) throw selectError;
    const ids = (data || []).map((x) => x.id).filter(Boolean);
    await deleteByIds('broadcast_poll_answers', 'broadcast_id', ids);
    await deleteByIds('broadcast_poll_messages', 'broadcast_id', ids);
    const deleted = await deleteByIds('broadcast_polls', 'id', ids);
    return { target, days, affected: deleted, message: `Polling lebih dari ${days} hari dihapus.` };
  }

  if (target === 'poll-answers-old') {
    const before = await countRows('broadcast_poll_answers', (q) => q.lt('updated_at', cutoff));
    const { error } = await sb().from('broadcast_poll_answers').delete().lt('updated_at', cutoff);
    if (error) throw error;
    return { target, days, affected: before, message: `Detail jawaban polling lebih dari ${days} hari dihapus.` };
  }

  if (target === 'delivered-old') {
    const before = await countRows('transactions', (q) => q.lt('created_at', cutoff).neq('delivered_text', ''));
    const { error } = await sb().from('transactions').update({ delivered_items: [], delivered_text: '' }).lt('created_at', cutoff).neq('delivered_text', '');
    if (error) throw error;
    return { target, days, affected: before, message: `Data produk terkirim lebih dari ${days} hari dikosongkan. Transaksi tetap tersimpan.` };
  }

  if (target === 'transactions-old') {
    await ensureHistoricalStatsFromCurrentTransactions().catch(() => null);
    const before = await countRows('transactions', (q) => q.lt('created_at', cutoff));
    const { error } = await sb().from('transactions').delete().lt('created_at', cutoff);
    if (error) throw error;
    return { target, days, affected: before, message: `Transaksi lebih dari ${days} hari dihapus permanen. Total transaksi dashboard tetap tersimpan.` };
  }

  if (target === 'users-empty-old') {
    const before = await countRows('bot_users', (q) => q.eq('transaction_count', 0).lt('updated_at', cutoff));
    const { error } = await sb().from('bot_users').delete().eq('transaction_count', 0).lt('updated_at', cutoff);
    if (error) throw error;
    return { target, days, affected: before, message: `User tanpa transaksi lebih dari ${days} hari dihapus.` };
  }

  if (target === 'vouchers-inactive-expired') {
    const before = await countRows('vouchers', (q) => q.or(`active.eq.false,expires_at.lt.${now}`));
    const { error } = await sb().from('vouchers').delete().or(`active.eq.false,expires_at.lt.${now}`);
    if (error) throw error;
    return { target, affected: before, message: 'Voucher nonaktif atau expired dihapus.' };
  }

  throw new Error('Target maintenance tidak dikenal.');
}


const BACKUP_TABLES = ['bot_users','products','transactions','pending_orders','vouchers','shop_settings','broadcast_polls','broadcast_poll_messages','broadcast_poll_answers','auto_promos','backup_logs'];

async function safeSelectAll(table) {
  try {
    const { data, error } = await sb().from(table).select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
}

async function exportBackupData() {
  const tables = {};
  for (const table of BACKUP_TABLES) tables[table] = await safeSelectAll(table);
  return {
    app: 'telegram-store-vercel-supabase',
    version: 'v26-backup-promo-stats',
    generated_at: new Date().toISOString(),
    tables
  };
}

async function addBackupLog(input = {}) {
  const payload = {
    type: String(input.type || 'manual'),
    status: String(input.status || 'success'),
    filename: String(input.filename || ''),
    size_bytes: Number(input.size_bytes || 0),
    note: String(input.note || ''),
    created_at: new Date().toISOString()
  };
  try {
    const { data, error } = await sb().from('backup_logs').insert(payload).select('*').single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Gagal simpan backup log:', error.message);
    return payload;
  }
}

async function listBackupLogs(limit = 30) {
  try {
    const { data, error } = await sb().from('backup_logs').select('*').order('created_at', { ascending: false }).limit(Number(limit) || 30);
    if (error) throw error;
    return data || [];
  } catch (error) { return []; }
}

async function upsertRows(table, rows = [], conflict = '') {
  const clean = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!clean.length) return 0;
  // Supabase payload limit guard: import in small chunks.
  let count = 0;
  for (let i = 0; i < clean.length; i += 200) {
    const part = clean.slice(i, i + 200);
    const query = sb().from(table);
    const { error } = conflict ? await query.upsert(part, { onConflict: conflict }) : await query.insert(part);
    if (error) {
      // If an old backup contains duplicates, continue with best effort where possible.
      console.error(`Import ${table} gagal:`, error.message);
      throw error;
    }
    count += part.length;
  }
  return count;
}

async function importBackupData(backup = {}, options = {}) {
  const tables = backup.tables || backup || {};
  const result = {};
  if (tables.bot_users) result.bot_users = await upsertRows('bot_users', tables.bot_users, 'telegram_id');
  if (tables.products) result.products = await upsertRows('products', tables.products, 'code');
  if (tables.vouchers) result.vouchers = await upsertRows('vouchers', tables.vouchers, 'code');
  if (tables.shop_settings) result.shop_settings = await upsertRows('shop_settings', tables.shop_settings, 'key');
  if (tables.pending_orders) result.pending_orders = await upsertRows('pending_orders', tables.pending_orders, 'telegram_id');
  if (tables.auto_promos) result.auto_promos = await upsertRows('auto_promos', tables.auto_promos, 'code');

  // Transactions are imported only when explicitly requested, to prevent double totals.
  if (options.include_transactions && tables.transactions) {
    const rows = (tables.transactions || []).filter((x) => x.order_ref || x.id);
    result.transactions = await upsertRows('transactions', rows, rows.some((x) => x.order_ref) ? 'order_ref' : 'id');
    await ensureHistoricalStatsFromCurrentTransactions().catch(() => null);
  }
  await addBackupLog({ type: 'import', status: 'success', note: `Import selesai: ${Object.keys(result).map(k => `${k}=${result[k]}`).join(', ')}` });
  return result;
}

function parsePromoProducts(value) {
  return targetProducts(value);
}

function normalizePromo(row) {
  if (!row) return null;
  const normalized = {
    ...row,
    products: parsePromoProducts(row.products),
    active: boolValue(row.active, true),
    discount_type: String(row.discount_type || 'amount').toLowerCase() === 'percent' ? 'percent' : 'amount',
    min_qty: Math.max(1, Number(row.min_qty || 1)),
    min_spend: Math.max(0, Number(row.min_spend || 0)),
    discount_value: Math.max(0, Number(row.discount_value || 0)),
    usage_limit: Math.max(0, Number(row.usage_limit || 0)),
    used_count: Math.max(0, Number(row.used_count || 0)),
    start_at: normalizeDateTime(row.start_at),
    end_at: normalizeDateTime(row.end_at)
  };
  return { ...normalized, ...promoState(normalized, { usedCount: normalized.used_count }) };
}

async function listAutoPromos(limit = 100) {
  try {
    const { data, error } = await sb().from('auto_promos').select('*').order('updated_at', { ascending: false }).limit(Number(limit) || 100);
    if (error) throw error;
    return (data || []).map(normalizePromo);
  } catch (error) {
    console.error('listAutoPromos:', error.message);
    return [];
  }
}

async function saveAutoPromo(input = {}) {
  const currentCode = String(input.current_code || input.kode_lama || '').trim().toUpperCase();
  const code = String(input.code || input.kode || currentCode).trim().toUpperCase() || `PROMO-${Date.now()}`;
  const current = currentCode
    ? (await listAutoPromos(200)).find((x) => String(x.code).toUpperCase() === currentCode)
    : (await listAutoPromos(200)).find((x) => String(x.code).toUpperCase() === code);
  const rawDiscount = input.discount_value ?? input.discount ?? input.potongan ?? current?.discount_value ?? 0;
  const discountType = String(input.discount_type ?? input.tipe ?? current?.discount_type ?? 'amount').toLowerCase() === 'percent' ? 'percent' : 'amount';
  const payload = {
    code,
    name: String(input.name ?? input.nama ?? current?.name ?? code).trim(),
    description: String(input.description ?? input.deskripsi ?? current?.description ?? ''),
    products: parsePromoProducts(input.products ?? input.produk ?? current?.products),
    discount_type: discountType,
    discount_value: Math.max(0, Number(rawDiscount || 0)),
    min_qty: Math.max(1, Number(input.min_qty ?? input.min_jumlah ?? current?.min_qty ?? 1)),
    min_spend: Math.max(0, Number(input.min_spend ?? input.min_belanja ?? current?.min_spend ?? 0)),
    usage_limit: Math.max(0, Number(input.usage_limit ?? input.limit ?? current?.usage_limit ?? 0)),
    used_count: Math.max(0, Number(current?.used_count || 0)),
    active: input.active === undefined ? boolValue(current?.active, true) : boolValue(input.active, true),
    start_at: input.start_at !== undefined || input.mulai !== undefined ? normalizeDateTime(input.start_at ?? input.mulai) : normalizeDateTime(current?.start_at),
    end_at: input.end_at !== undefined || input.berakhir !== undefined || input.expires_at !== undefined ? normalizeDateTime(input.end_at ?? input.berakhir ?? input.expires_at) : normalizeDateTime(current?.end_at),
    updated_at: new Date().toISOString()
  };
  if (!payload.name) payload.name = code;
  if (payload.discount_type === 'percent') payload.discount_value = Math.min(100, payload.discount_value);
  const { data, error } = await sb().from('auto_promos').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  if (currentCode && currentCode !== code) await deleteAutoPromo(currentCode);
  return normalizePromo(data);
}

async function deleteAutoPromo(code) {
  const { error } = await sb().from('auto_promos').delete().ilike('code', String(code || '').trim());
  if (error) throw error;
}

function promoIsActive(row, productCode, quantity, subtotal, variantKeyValue = '') {
  const promo = normalizePromo(row);
  return Boolean(promo && promoEligible(promo, {
    productCode,
    variantKey: variantKeyValue,
    quantity,
    subtotal,
    usedCount: promo.used_count
  }));
}

function promoDiscountAmount(promo, subtotal) {
  return discountAmount(promo, subtotal);
}

async function getBestAutoPromo(productCode, telegramId, quantity, subtotal, variantKeyValue = '') {
  const promos = await listAutoPromos(200);
  const candidates = promos.filter((p) => promoIsActive(p, productCode, quantity, subtotal, variantKeyValue)).map((p) => ({ ...p, discount_amount: promoDiscountAmount(p, subtotal) })).filter((p) => p.discount_amount > 0);
  candidates.sort((a, b) => b.discount_amount - a.discount_amount || String(a.code).localeCompare(String(b.code)));
  return candidates[0] || null;
}

async function applyAutoPromoUsage(code) {
  if (!code) return;
  const current = (await listAutoPromos(200)).find((x) => String(x.code).toUpperCase() === String(code).toUpperCase());
  if (!current) return;
  await sb().from('auto_promos').update({ used_count: Number(current.used_count || 0) + 1, updated_at: new Date().toISOString() }).eq('code', current.code);
}

async function getDeepStats() {
  const [products, users, transactions, pendingOrders, promos] = await Promise.all([
    listProducts(), listUsers(1000), listTransactions(1000), safeSelectAll('pending_orders'), listAutoPromos(100)
  ]);
  const now = new Date();
  const todayKey = wibDateKey(now);
  const monthKey = todayKey.slice(0, 7);
  const liveRevenue = transactions.reduce((s, x) => s + Number(x.total_price || 0), 0);
  const todayRevenue = transactions.filter((x) => wibDateKey(x.created_at) === todayKey).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const monthRevenue = transactions.filter((x) => wibDateKey(x.created_at).slice(0, 7) === monthKey).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const liveQtySold = transactions.reduce((s, x) => s + Number(x.quantity || 0), 0);
  const historical = await ensureHistoricalStatsFromCurrentTransactions({
    orders_total: transactions.length,
    revenue_total: liveRevenue,
    quantity_sold: liveQtySold
  }).catch(() => ({ orders_total: transactions.length, revenue_total: liveRevenue, quantity_sold: liveQtySold }));
  const revenue = Math.max(liveRevenue, Number(historical.revenue_total || 0));
  const qtySold = Math.max(liveQtySold, Number(historical.quantity_sold || 0));
  const ordersTotal = Math.max(transactions.length, Number(historical.orders_total || 0));
  const lowStock = products.map((p) => ({ name: p.nama, code: p.kode, stock: productAvailableStock(p), active: p.active })).filter((p) => p.active !== false && p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 20);
  const topUsers = users.slice().sort((a, b) => Number(b.spending || 0) - Number(a.spending || 0)).slice(0, 10);
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, revenue: 0 }));
  transactions.forEach((trx) => {
    const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date(trx.created_at || Date.now())));
    if (byHour[h]) { byHour[h].orders += 1; byHour[h].revenue += Number(trx.total_price || 0); }
  });
  const conversion = pendingOrders.length ? Math.round((ordersTotal / (ordersTotal + pendingOrders.length)) * 1000) / 10 : 100;
  return {
    generated_at: new Date().toISOString(),
    revenue_total: revenue,
    revenue_today: todayRevenue,
    revenue_month: monthRevenue,
    orders_total: ordersTotal,
    live_orders_total: transactions.length,
    quantity_sold: qtySold,
    average_order_value: ordersTotal ? Math.round(revenue / ordersTotal) : 0,
    users_total: users.length,
    products_total: products.length,
    active_promos: promos.filter((p) => p.effective_active).length,
    low_stock: lowStock,
    top_users: topUsers,
    hourly: byHour,
    conversion_rate: conversion,
    pending_orders: pendingOrders.length
  };
}

module.exports = {
  claimOnce,
  markClaimDone,
  releaseClaim,
  upsertUser,
  getStats,
  ensureHistoricalStatsFromCurrentTransactions,
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
  getPendingOrderByInvoice,
  getPendingOrderByProviderTransactionId,
  deletePendingOrder,
  getVoucher,
  voucherIsValid,
  voucherDiscountAmount,
  applyVoucherUsage,
  listTransactions,
  listTransactionsInRange,
  listTransactionsByUser,
  getTransactionByOrderRef,
  getUserByTelegramId,
  completeOrder,
  normalizeBulkPrices,
  normalizeVariants,
  variantKey,
  findVariant,
  productAvailableStock,
  orderUnitPrice,
  createBroadcastPoll,
  getBroadcastPoll,
  updateBroadcastPoll,
  addBroadcastPollMessage,
  recordPollUpdate,
  recordPollAnswer,
  listBroadcastPolls,
  getBroadcastPollResult,
  deleteBroadcastPoll,
  getMaintenanceStats,
  cleanupDatabase,
  exportBackupData,
  importBackupData,
  addBackupLog,
  listBackupLogs,
  getDeepStats,
  listAutoPromos,
  saveAutoPromo,
  deleteAutoPromo,
  getBestAutoPromo,
  applyAutoPromoUsage,
  normalizeVoucher,
  normalizePromo,
  promoIsActive,
  promoDiscountAmount
};
