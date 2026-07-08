const db = require('../lib/db');
const tg = require('../lib/telegram');
const { config } = require('../lib/config');

module.exports = async function handler(req, res) {
  try {
    const secret = req.query?.secret || req.headers['x-cron-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    // Vercel Cron usually calls without custom secret. If WEBHOOK_SECRET is set and a secret is provided,
    // validate it. Manual calls should use ?secret=WEBHOOK_SECRET.
    if (secret && config.webhookSecret && secret !== config.webhookSecret) {
      return res.status(401).json({ ok: false, error: 'Secret salah.' });
    }
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
