require('dotenv').config();

const required = (name, fallback = '') => process.env[name] || fallback;

const config = {
  botToken: required('BOT_TOKEN'),
  botName: required('BOT_NAME', 'Telegram Store'),
  botUsername: required('BOT_USERNAME'),
  ownerId: Number(required('OWNER_ID', '0')),
  channelStore: required('CHANNEL_STORE', ''),
  customerService: required('CUSTOMER_SERVICE', ''),
  channelLog: required('CHANNEL_LOG', ''),
  walletChannel: required('WALLET_CHANNEL', required('CHANNEL_LOG', '')),
  paymentProvider: required('PAYMENT_PROVIDER', process.env.AUTOGOPAY_API_KEY ? 'autogopay' : 'pakasir').toLowerCase(),
  autogopayApiKey: required('AUTOGOPAY_API_KEY', '').trim(),
  autogopayBaseUrl: required('AUTOGOPAY_BASE_URL', 'https://v1-gateway.autogopay.site').replace(/\/$/, ''),
  autogopayRedirectUrl: required('AUTOGOPAY_REDIRECT_URL', ''),
  pakasirSlug: required('PAKASIR_SLUG', ''),
  pakasirApiKey: required('PAKASIR_API_KEY', ''),
  pakasirWebhookSecret: required('PAKASIR_WEBHOOK_SECRET', ''),
  pakasirWebhookRequireSecret: process.env.PAKASIR_WEBHOOK_REQUIRE_SECRET === 'true',
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  publicUrl: required('PUBLIC_URL'),
  miniAppUrl: required('MINIAPP_URL'),
  storeUrl: required('STORE_URL', ''),
  webhookSecret: required('WEBHOOK_SECRET', ''),
  cronSecret: required('CRON_SECRET', ''),
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

function getMiniAppUrl(req) {
  if (config.miniAppUrl) return config.miniAppUrl;
  const base = getPublicBaseUrl(req);
  return base ? `${base}/reseller` : '';
}

function getStorefrontUrl(req) {
  if (config.storeUrl) return config.storeUrl;
  const base = getPublicBaseUrl(req);
  return base || '';
}

module.exports = { config, requireEnv, getPublicBaseUrl, getMiniAppUrl, getStorefrontUrl };
