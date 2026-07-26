const db = require('../lib/db');
const tg = require('../lib/telegram');
const { config } = require('../lib/config');

function bearerToken(req) {
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  return bearer || String(req.headers?.['x-cron-secret'] || '').trim();
}

module.exports = async function handler(req, res) {
  if (!config.cronSecret) {
    return res.status(503).json({ ok: false, error: 'CRON_SECRET belum diatur.' });
  }
  if (bearerToken(req) !== String(config.cronSecret)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }

  try {
    const backup = await db.exportBackupData();
    const content = JSON.stringify(backup, null, 2);
    const filename = `auto-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (!config.ownerId) throw new Error('OWNER_ID belum diatur.');
    await tg.sendDocument(config.ownerId, filename, content, { caption: '✅ Auto Backup Harian database bot.' });
    const log = await db.addBackupLog({ type: 'auto-daily', status: 'success', filename, size_bytes: content.length });
    return res.status(200).json({ ok: true, data: log });
  } catch (error) {
    await db.addBackupLog({ type: 'auto-daily', status: 'failed', note: error.message }).catch(() => null);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
