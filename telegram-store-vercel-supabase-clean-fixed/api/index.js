module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: 'iLink.in Auto Order Marketplace',
    version: 'v52-blue-marketplace-qris-download',
    endpoints: ['/', '/shop', '/reseller', '/api/store-data', '/api/telegram', '/api/payment-webhook', '/api/set-webhook'],
    message: 'Marketplace aktif. Buka / untuk katalog pembeli dan /reseller untuk dashboard reseller.'
  });
};
