const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }

test('owner compatibility accepts OWNER_ID, OWNER_IDS and DEV_OWNER_ID', () => {
  const config = read('lib/config.js');
  const handlers = read('lib/botHandlers.js');
  assert.match(config, /process\.env\.OWNER_IDS/);
  assert.match(config, /process\.env\.DEV_OWNER_ID/);
  assert.match(config, /ownerIds/);
  assert.match(handlers, /owners\.includes\(id\)/);
});

test('dashboard owner button and command are available', () => {
  const handlers = read('lib/botHandlers.js');
  const vercel = read('vercel.json');
  assert.match(handlers, /Dashboard Owner/);
  assert.match(handlers, /startsWith\('\/dashboard'\)/);
  assert.match(vercel, /"source": "\/dashboard"/);
  assert.match(vercel, /"destination": "\/api\/reseller"/);
});

test('legacy Link Auto Account environment aliases remain supported', () => {
  const config = read('lib/config.js');
  assert.match(config, /DASHBOARD_URL/);
  assert.match(config, /SUPABASE_SECRET_KEY/);
  assert.match(config, /`\$\{base\}\/dashboard`/);
  assert.match(config, /resolvePublicUrl/);
});

test('callback router no longer answers every callback before validation', () => {
  const handlers = read('lib/botHandlers.js');
  const start = handlers.indexOf('async function handleCallbackQuery');
  const firstChunk = handlers.slice(start, start + 220);
  assert.doesNotMatch(firstChunk, /tg\.answerCallbackQuery\(query\.id\)/);
  assert.match(handlers, /__callbackAnswered/);
  assert.match(handlers, /Tombol ini sudah tidak berlaku/);
});

test('dashboard Mini App owner authentication uses all configured owner IDs', () => {
  const auth = read('lib/miniappAuth.js');
  assert.match(auth, /config\.ownerIds/);
  assert.match(auth, /allowedOwners\.includes\(Number\(user\.id\)\)/);
});
