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
  pakasirSlug: required('PAKASIR_SLUG', ''),
  pakasirApiKey: required('PAKASIR_API_KEY', ''),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  publicUrl: required('PUBLIC_URL'),
  miniAppUrl: required('MINIAPP_URL'),
  webhookSecret: required('WEBHOOK_SECRET', ''),
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

module.exports = { config, requireEnv, getPublicBaseUrl, getMiniAppUrl };
