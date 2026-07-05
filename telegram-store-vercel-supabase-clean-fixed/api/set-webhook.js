const { config, getPublicBaseUrl } = require('../lib/config');
const { setWebhook } = require('../lib/telegram');

module.exports = async function handler(req, res) {
  try {
    const secret = req.query?.secret;
    if (config.webhookSecret && secret !== config.webhookSecret) {
      return res.status(401).json({ ok: false, error: 'Secret salah.' });
    }
    const baseUrl = getPublicBaseUrl(req);
    if (!baseUrl) return res.status(400).json({ ok: false, error: 'PUBLIC_URL belum diatur.' });
    const webhookUrl = `${baseUrl}/api/telegram`;
    const result = await setWebhook(webhookUrl);
    return res.status(200).json({ ok: true, webhookUrl, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
