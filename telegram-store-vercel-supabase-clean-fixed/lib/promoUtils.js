const WIB_OFFSET = '+07:00';
const TARGET_SEPARATOR = '::';
const DEFAULT_VARIANT_KEY = 'DEFAULT';

function boolValue(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (value === true || value === false) return value;
  const raw = String(value).trim().toLowerCase();
  if (['false', '0', 'off', 'nonaktif', 'inactive', 'mati'].includes(raw)) return false;
  if (['true', '1', 'on', 'aktif', 'active', 'hidup'].includes(raw)) return true;
  return defaultValue;
}

function normalizeDateTime(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

  const raw = String(value).trim();
  if (!raw) return null;

  let candidate = raw;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(raw);

  // datetime-local dari browser tidak membawa zona waktu. Panel dipakai dalam WIB,
  // jadi tambahkan +07:00 agar jadwal tidak bergeser tujuh jam di server Vercel (UTC).
  if (dateOnly) candidate = `${raw}T00:00:00${WIB_OFFSET}`;
  else if (localDateTime && !hasTimezone) candidate = `${raw}${WIB_OFFSET}`;

  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function timestamp(value) {
  const normalized = normalizeDateTime(value);
  if (!normalized) return null;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? null : time;
}

function hasStarted(startAt, now = Date.now()) {
  const start = timestamp(startAt);
  return start === null || start <= Number(now);
}

function isExpired(endAt, now = Date.now()) {
  const end = timestamp(endAt);
  return end !== null && end <= Number(now);
}

function discountAmount(item, subtotal) {
  const base = Math.max(0, Number(subtotal || 0));
  const value = Math.max(0, Number(item?.discount_value ?? item?.discount ?? 0));
  if (String(item?.discount_type || 'amount').toLowerCase() === 'percent') {
    return Math.min(base, Math.floor(base * Math.min(value, 100) / 100));
  }
  return Math.min(base, value);
}

function normalizeTargetPart(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

function normalizeTargetToken(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parts = raw.split(TARGET_SEPARATOR);
  const productCode = normalizeTargetPart(parts.shift());
  if (!productCode) return '';
  const variantKey = normalizeTargetPart(parts.join(TARGET_SEPARATOR));
  return variantKey ? `${productCode}${TARGET_SEPARATOR}${variantKey}` : productCode;
}

function targetProducts(value) {
  const rows = Array.isArray(value)
    ? value
    : String(value || '').split(/[|,\n]+/);

  const targets = rows
    .map(normalizeTargetToken)
    .filter(Boolean)
    .filter((item) => !['ALL', 'SEMUA', '-'].includes(item));

  return [...new Set(targets)];
}

function splitTargetToken(value) {
  const token = normalizeTargetToken(value);
  if (!token) return { token: '', productCode: '', variantKey: '' };
  const [productCode, ...rest] = token.split(TARGET_SEPARATOR);
  return {
    token,
    productCode,
    variantKey: rest.join(TARGET_SEPARATOR)
  };
}

function promoTargetMatches(item, productCodeValue, variantKeyValue = '') {
  const targets = targetProducts(item?.products);
  if (!targets.length) return true;

  const productCode = normalizeTargetPart(productCodeValue);
  const variantKey = normalizeTargetPart(variantKeyValue || DEFAULT_VARIANT_KEY);
  if (!productCode) return false;

  return targets.some((target) => {
    const parsed = splitTargetToken(target);
    if (parsed.productCode !== productCode) return false;
    // Token produk saja berlaku untuk produk tersebut beserta seluruh variannya.
    if (!parsed.variantKey) return true;
    return parsed.variantKey === variantKey;
  });
}

function promoState(item = {}, options = {}) {
  const now = options.now === undefined ? Date.now() : Number(options.now);
  const endAt = item.end_at || item.expires_at || null;
  const configuredActive = boolValue(item.active, true);
  const expired = isExpired(endAt, now);
  const scheduled = !hasStarted(item.start_at, now);
  const usageLimit = Math.max(0, Number(item.usage_limit || 0));
  const usedCount = Math.max(0, Number(options.usedCount ?? item.used_count ?? (Array.isArray(item.used_by) ? item.used_by.length : 0)));
  const limitReached = usageLimit > 0 && usedCount >= usageLimit;
  const effectiveActive = configuredActive && !expired && !scheduled && !limitReached;
  return {
    configured_active: configuredActive,
    effective_active: effectiveActive,
    is_expired: expired,
    is_scheduled: scheduled,
    limit_reached: limitReached,
    status: expired ? 'expired' : (scheduled ? 'scheduled' : (limitReached ? 'limit_reached' : (configuredActive ? 'active' : 'off')))
  };
}

function promoEligible(item, input = {}) {
  const state = promoState(item, { now: input.now, usedCount: input.usedCount });
  if (!state.effective_active || discountAmount(item, input.subtotal) <= 0) return false;

  if (!promoTargetMatches(item, input.productCode, input.variantKey)) return false;
  if (Math.max(1, Number(input.quantity || 1)) < Math.max(1, Number(item.min_qty || 1))) return false;
  if (Math.max(0, Number(input.subtotal || 0)) < Math.max(0, Number(item.min_spend || 0))) return false;
  return true;
}

module.exports = {
  WIB_OFFSET,
  TARGET_SEPARATOR,
  DEFAULT_VARIANT_KEY,
  boolValue,
  normalizeDateTime,
  timestamp,
  hasStarted,
  isExpired,
  discountAmount,
  normalizeTargetPart,
  normalizeTargetToken,
  targetProducts,
  splitTargetToken,
  promoTargetMatches,
  promoState,
  promoEligible
};
