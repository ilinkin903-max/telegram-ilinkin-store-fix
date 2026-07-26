const { getAppVersion } = require('../lib/version');

module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: 'iLink.in Auto Order Marketplace',
    version: getAppVersion(),
    endpoints: ['/', '/shop', '/reseller', '/api/store-data', '/api/telegram', '/api/payment-webhook', '/api/payment-cron', '/api/set-webhook', '/api/setup-autogopay'],
    message: 'Marketplace aktif dengan dukungan pembayaran otomatis. Buka / untuk katalog dan /reseller untuk dashboard.'
  });
};
