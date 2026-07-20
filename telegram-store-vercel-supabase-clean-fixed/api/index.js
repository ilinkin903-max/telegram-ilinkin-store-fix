module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    name: 'Telegram Store Bot',
    version: 'v49-auto-payment-watcher-webhook-fix',
    endpoints: ['/api/telegram', '/api/payment-webhook', '/api/set-webhook', '/reseller'],
    message: 'Project aktif. Pasang webhook lewat /api/set-webhook?secret=WEBHOOK_SECRET.'
  });
};
