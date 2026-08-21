require('dotenv').config();

const required = (name, fallback = '') => process.env[name] || fallback;

function parseOwnerIds() {
  const raw = [process.env.OWNER_ID, process.env.OWNER_IDS, process.env.DEV_OWNER_ID]
    .filter(Boolean)
    .join(',');
  const seen = new Set();
  return raw
    .split(/[\s,;]+/)
    .map((value) => Number(String(value || '').trim()))
    .filter((value) => Number.isSafeInteger(value) && value > 0 && !seen.has(value) && seen.add(value));
}

const ownerIds = parseOwnerIds();
const primaryOwnerId = ownerIds[0] || 0;

const config = {
  botToken: required('BOT_TOKEN'),
  botName: required('BOT_NAME', 'Link Auto Order'),
  botUsername: required('BOT_USERNAME'),
  ownerId: primaryOwnerId,
  ownerIds,
  channelStore: required('CHANNEL_STORE', ''),
  customerService: required('CUSTOMER_SERVICE', ''),
  channelLog: required('CHANNEL_LOG', ''),
  walletChannel: required('WALLET_CHANNEL', required('CHANNEL_LOG', '')),
  paymentProvider: required('PAYMENT_PROVIDER', process.env.AUTOGOPAY_API_KEY ? 'autogopay' : 'pakasir').toLowerCase(),
  autogopayApiKey: required('AUTOGOPAY_API_KEY', '').trim(),
  autogopayBaseUrl: required('AUTOGOPAY_BASE_URL', 'https://v1-gateway.autogopay.site').replace(/\/$/, ''),
  autogopayRedirectUrl: required('AUTOGOPAY_REDIRECT_URL', ''),
  prodsellerApiKey: required('PRODSELLER_API_KEY', '').trim(),
  prodsellerBaseUrl: required('PRODSELLER_BASE_URL', 'https://prodseller.com/v1').replace(/\/$/, ''),
  userbotApiId: Math.max(0, Number(required('TG_API_ID', required('TELEGRAM_API_ID', '0'))) || 0),
  userbotApiHash: required('TG_API_HASH', required('TELEGRAM_API_HASH', '')).trim(),
  userbotStringSession: required('TG_STRING_SESSION', required('TELEGRAM_STRING_SESSION', '')).trim(),
  userbotStepTimeoutMs: Math.max(1500, Math.min(30000, Number(required('USERBOT_STEP_TIMEOUT_MS', '7000')) || 7000)),
  workflowRetryIntervalSeconds: Math.max(3, Math.min(60, Number(required('WORKFLOW_RETRY_INTERVAL_SECONDS', '8')) || 8)),
  workflowRetryMaxAttempts: Math.max(1, Math.min(60, Number(required('WORKFLOW_RETRY_MAX_ATTEMPTS', '18')) || 18)),
  pakasirSlug: required('PAKASIR_SLUG', ''),
  pakasirApiKey: required('PAKASIR_API_KEY', ''),
  pakasirWebhookSecret: required('PAKASIR_WEBHOOK_SECRET', ''),
  pakasirWebhookRequireSecret: process.env.PAKASIR_WEBHOOK_REQUIRE_SECRET === 'true',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', required('SUPABASE_SECRET_KEY', '')),
  publicUrl: required('PUBLIC_URL'),
  miniAppUrl: required('MINIAPP_URL', required('DASHBOARD_URL', '')),
  storeUrl: required('STORE_URL', ''),
  webhookSecret: required('WEBHOOK_SECRET', ''),
  cronSecret: required('CRON_SECRET', ''),
  jobRunnerSecret: required('JOB_RUNNER_SECRET', ''),
  paymentPollIntervalSeconds: Math.max(5, Number(required('PAYMENT_POLL_INTERVAL_SECONDS', '30')) || 30),
  paymentPollMaxAttempts: Math.max(1, Number(required('PAYMENT_POLL_MAX_ATTEMPTS', '30')) || 30),
  qrDownloadSecret: required('QR_DOWNLOAD_SECRET', required('WEBHOOK_SECRET', '')),
  licenseManagerUrl: required('LICENSE_MANAGER_URL', required('RENTAL_MANAGER_URL', '')),
  licenseApiSecret: required('LICENSE_API_SECRET', ''),
  licenseBotUsername: required('LICENSE_BOT_USERNAME', required('BOT_USERNAME', '')),
  licenseCode: required('LICENSE_CODE', ''),
  licenseCheckEnabled: required('LICENSE_CHECK_ENABLED', ''),
  licenseFailClosed: required('LICENSE_FAIL_CLOSED', 'false'),
  miniAppDevMode: process.env.MINIAPP_DEV_MODE === 'true'
};

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Env belum lengkap: ${missing.join(', ')}`);
  }
}

function getPublicBaseUrl(req) {
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, '');
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  if (!host) return '';
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`.replace(/\/$/, '');
}

function resolvePublicUrl(value, base = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  if (base && raw.startsWith('/')) return `${base}${raw}`;
  return raw;
}

function getMiniAppUrl(req) {
  const base = getPublicBaseUrl(req);
  const configured = resolvePublicUrl(config.miniAppUrl, base);
  if (configured) return configured;
  return base ? `${base}/dashboard` : '';
}

function getStorefrontUrl(req) {
  const base = getPublicBaseUrl(req);
  const configured = resolvePublicUrl(config.storeUrl, base);
  if (configured) return configured;
  return base || '';
}

module.exports = { config, requireEnv, getPublicBaseUrl, getMiniAppUrl, getStorefrontUrl };
