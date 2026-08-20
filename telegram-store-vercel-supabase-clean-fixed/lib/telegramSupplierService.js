function database() { return require('./db'); }
function onDemand() { return require('./telegramOnDemandService'); }

const SOURCE = 'telegram_userbot';

function normalizeSource(value) {
  return String(value || '').trim().toLowerCase();
}

function isTelegramSource(value) {
  return normalizeSource(value) === SOURCE;
}

function selection(product = {}, variant = null) {
  const source = normalizeSource(variant?.supplier_source || (!variant ? product?.supplier_source : ''));
  const productId = String(variant?.supplier_product_id || (!variant ? product?.supplier_product_id : '') || '').trim();
  if (!isTelegramSource(source) || !productId) return null;
  return { source, productId, variant };
}

function availabilityFromRows(connector = {}, product = {}) {
  const enabled = connector?.enabled === true;
  const productActive = product?.active !== false;
  const cost = Math.max(0, Number(product?.cost_amount || 0));
  const balance = connector?.balance == null ? null : Math.max(0, Number(connector.balance || 0));
  const supplierStock = product?.stock == null ? null : Math.max(0, Math.floor(Number(product.stock || 0)));
  const stockMode = String(product?.stock_mode || 'balance').trim().toLowerCase();

  let balanceStock = 0;
  if (cost > 0 && balance != null) balanceStock = Math.max(0, Math.floor(balance / cost));
  else if (cost <= 0 && supplierStock != null) balanceStock = supplierStock;

  let availableStock = balanceStock;
  if (stockMode === 'fixed') availableStock = supplierStock == null ? 0 : supplierStock;
  else if (stockMode === 'balance_and_stock' || stockMode === 'balance') {
    if (supplierStock != null) availableStock = Math.min(balanceStock, supplierStock);
  } else if (stockMode === 'unlimited') {
    availableStock = cost > 0 ? balanceStock : 999999;
  }

  if (!enabled || !productActive || String(connector?.status || '').toLowerCase() === 'disabled') availableStock = 0;
  return {
    availableStock: Math.max(0, Math.floor(Number(availableStock || 0))),
    unitCost: cost,
    balance,
    supplierStock,
    currency: String(product?.currency || connector?.currency || 'IDR').toUpperCase(),
    connectorId: String(connector?.id || ''),
    connectorCode: String(connector?.code || ''),
    connectorName: String(connector?.name || ''),
    botUsername: String(connector?.bot_username || ''),
    productRef: String(product?.id || ''),
    productName: String(product?.name || ''),
    status: String(connector?.status || 'offline')
  };
}

async function getAvailability(productRef, options = {}) {
  if (options && options.live === true) {
    try { await onDemand().refreshStock(productRef, { force: options.force !== false, waitMs: options.waitMs || 8000 }); }
    catch (error) {
      if (options.allowCached === false) throw error;
    }
  }
  const row = await database().getTelegramSupplierProduct(productRef);
  if (!row) {
    const error = new Error('Mapping produk Telegram supplier tidak ditemukan.');
    error.code = 'TELEGRAM_SUPPLIER_PRODUCT_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  const connector = await database().getTelegramSupplierConnector(row.connector_id);
  if (!connector) {
    const error = new Error('Connector Telegram supplier tidak ditemukan.');
    error.code = 'TELEGRAM_SUPPLIER_CONNECTOR_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  return { ...availabilityFromRows(connector, row), connector, product: row };
}

async function getAvailabilityMap(refs = []) {
  const ids = [...new Set((refs || []).map((x) => String(x || '').trim()).filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await database().listTelegramSupplierProductsByIds(ids);
  const connectorIds = [...new Set(rows.map((row) => String(row.connector_id || '')).filter(Boolean))];
  const connectors = await database().listTelegramSupplierConnectorsByIds(connectorIds);
  const connectorMap = new Map(connectors.map((row) => [String(row.id), row]));
  const out = new Map();
  rows.forEach((row) => {
    const connector = connectorMap.get(String(row.connector_id));
    if (!connector) return;
    out.set(String(row.id), availabilityFromRows(connector, row));
  });
  return out;
}

module.exports = {
  SOURCE,
  isTelegramSource,
  selection,
  availabilityFromRows,
  getAvailability,
  getAvailabilityMap
};
