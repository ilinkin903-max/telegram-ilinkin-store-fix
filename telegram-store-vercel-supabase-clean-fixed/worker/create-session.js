require('dotenv').config();
const readline = require('readline');
const { TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');

const apiId = Number(process.env.TG_API_ID || 0);
const apiHash = String(process.env.TG_API_HASH || '').trim();
if (!apiId || !apiHash) {
  console.error('Isi TG_API_ID dan TG_API_HASH di worker/.env terlebih dahulu.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(label) { return new Promise((resolve) => rl.question(label, (answer) => resolve(String(answer || '').trim()))); }

(async () => {
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => ask('Nomor Telegram (+62...): '),
    phoneCode: async () => ask('Kode OTP Telegram: '),
    password: async () => ask('Password 2FA (jika ada): '),
    onError: (error) => console.error('Login error:', error.message || error)
  });
  console.log('\nLOGIN BERHASIL. Simpan string berikut sebagai TG_STRING_SESSION di VPS.');
  console.log('JANGAN kirim string ini ke chat/orang lain.\n');
  console.log(client.session.save());
  await client.disconnect();
  rl.close();
})().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
