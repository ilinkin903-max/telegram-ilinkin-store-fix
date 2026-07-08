module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, message: 'Telegram webhook aktif.', version: 'v30-stable-hotfix' });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    // Require di dalam handler agar jika ada error module/runtime, Vercel tetap mengembalikan JSON
    // dan tidak menjadi "A server error has occurred" yang membuat Mini App/bot sulit dicek.
    const { handleUpdate } = require('../lib/botHandlers');
    await handleUpdate(req.body || {}, req);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('telegram handler error:', error);
    // Telegram webhook harus tetap HTTP 200 agar update berikutnya tidak tertahan.
    return res.status(200).json({ ok: false, error: error.message || 'Server error' });
  }
};
