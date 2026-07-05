const { handleUpdate } = require('../lib/botHandlers');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, message: 'Telegram webhook aktif.' });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    await handleUpdate(req.body, req);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ ok: false, error: error.message });
  }
};
