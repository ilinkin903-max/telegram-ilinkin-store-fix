const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard memiliki pengaturan wajib join channel dan sembunyikan total user', () => {
  const dashboard = read('api/reseller.js');
  const db = read('lib/db.js');
  const api = read('api/reseller-data.js');
  for (const key of ['join_channel_required', 'join_channel_id', 'join_channel_link', 'bot_show_total_users']) {
    assert.match(dashboard, new RegExp(key));
    assert.match(db, new RegExp(key));
    assert.match(api, new RegExp(key));
  }
});

test('bot memverifikasi member channel dengan getChatMember dan tombol cek join', () => {
  const bot = read('lib/botHandlers.js');
  const telegram = read('lib/telegram.js');
  assert.match(telegram, /getChatMember/);
  assert.match(bot, /ensureRequiredChannelJoin/);
  assert.match(bot, /tg\.getChatMember\(channelId, Number\(from\.id\)\)/);
  assert.match(bot, /callback_data: 'checkjoin'/);
  assert.match(bot, /Saya Sudah Join/);
  assert.match(bot, /if \(!requiredJoinEnabled\(settings\) \|\| isOwner\(from\.id\)\) return true/);
});

test('total user di menu awal dapat disembunyikan dari setting', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /bot_show_total_users/);
  assert.match(bot, /const userLine = settingEnabled\(settings\.bot_show_total_users, true\)/);
  assert.match(bot, /userLine \+/);
});

test('escape Markdown legacy tidak menambahkan slash pada titik, strip, tanda seru, dan kurung', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /replace\(\/\(\[_\*`\\\[\]\)\/g/);
  assert.doesNotMatch(bot, /\[\\\\_\*\\\[\\\]\(\)`~>\#\+\\-=\|\{\}\.\!\]/);
});

test('produk stok habis memakai style danger merah', () => {
  const bot = read('lib/botHandlers.js');
  assert.match(bot, /const soldOut = readyStock <= 0 && !hasManualPo/);
  assert.match(bot, /soldOut \? 'danger' : 'primary'/);
});

test('tombol simpan edit produk di HP tidak lagi dipaksa 108px dari bawah', () => {
  const dashboard = read('api/reseller.js');
  assert.match(dashboard, /\.editSaveDock\{bottom:6px!important\}/);
  assert.doesNotMatch(dashboard, /\.editSaveDock\{bottom:108px!important\}/);
});
