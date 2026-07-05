const crypto = require('crypto');
const { config } = require('./config');

function verifyTelegramWebAppData(initData) {
  if (!initData || !config.botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const calcHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(calcHash, 'hex'), Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date') || '0');
  if (authDate && Date.now() / 1000 - authDate > 60 * 60 * 24) return null;

  try {
    return JSON.parse(params.get('user') || '{}');
  } catch (_) {
    return null;
  }
}

function getMiniAppUser(req) {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData || req.query?.initData;
  if (config.miniAppDevMode) {
    return { id: config.ownerId || Number(req.headers['x-dev-owner-id'] || 0), first_name: 'Dev Owner' };
  }
  return verifyTelegramWebAppData(initData);
}

function assertOwnerMiniApp(req) {
  const user = getMiniAppUser(req);
  if (!user || Number(user.id) !== Number(config.ownerId)) {
    const err = new Error('Unauthorized Mini App user. Buka panel dari tombol /reseller owner di Telegram.');
    err.statusCode = 401;
    throw err;
  }
  return user;
}

module.exports = { verifyTelegramWebAppData, getMiniAppUser, assertOwnerMiniApp };
