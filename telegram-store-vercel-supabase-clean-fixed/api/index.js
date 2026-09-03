const { getAppVersion } = require('../lib/version');

module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: 'Link Auto Order · v84.7.0',
    version: getAppVersion(),
    endpoints: ['/', '/shop', '/reseller', '/api/store-data', '/api/telegram', '/api/payment-webhook', '/api/payment-poll', '/api/payment-cron', '/api/set-webhook'],
    message: 'Bot dan marketplace aktif. Pembayaran QRIS mengikuti alur Link Auto Order: QR tampil langsung, cek manual, dan polling AutoGoPay tanpa callback wajib.'
  });
};
