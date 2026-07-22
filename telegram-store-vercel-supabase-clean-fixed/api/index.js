module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: 'iLink.in Auto Order Marketplace',
    version: 'v55-autogopay-integration',
    endpoints: ['/', '/shop', '/reseller', '/api/store-data', '/api/telegram', '/api/payment-webhook', '/api/set-webhook', '/api/setup-autogopay'],
    message: 'Marketplace aktif dengan dukungan AutoGoPay QRIS. Buka / untuk katalog dan /reseller untuk dashboard.'
  });
};
