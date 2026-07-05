require('dotenv').config();

async function main() {
  const token = process.env.BOT_TOKEN;
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (!token) throw new Error('BOT_TOKEN wajib diisi di .env');
  if (!publicUrl) throw new Error('PUBLIC_URL wajib diisi di .env, contoh https://nama-project.vercel.app');
  const webhookUrl = `${publicUrl}/api/telegram`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] })
  });
  const json = await res.json();
  console.log(JSON.stringify({ webhookUrl, result: json }, null, 2));
  if (!json.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
