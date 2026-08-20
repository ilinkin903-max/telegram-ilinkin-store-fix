const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'api', 'setup-userbot.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'setup-userbot.html'), 'utf8');
const config = fs.readFileSync(path.join(root, 'lib', 'config.js'), 'utf8');
const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
const reseller = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');

test('browser setup endpoint sends Telegram code and returns session', () => {
  assert.match(api, /client\.sendCode/);
  assert.match(api, /Api\.auth\.SignIn/);
  assert.match(api, /signInWithPassword/);
  assert.match(api, /client\.session\.save\(\)/);
});

test('login setup state is protected and expires', () => {
  assert.match(api, /aes-256-gcm/);
  assert.match(api, /expires_at/);
  assert.match(api, /timingSafeEqual/);
});

test('setup page provides simple OTP and 2FA flow', () => {
  assert.match(html, /Kirim kode Telegram/);
  assert.match(html, /Login & Buat Session/);
  assert.match(html, /Two-Step Verification/);
  assert.match(html, /Copy Session/);
  assert.match(html, /TG_STRING_SESSION/);
});

test('setup key environment and Vercel function are configured', () => {
  assert.match(config, /USERBOT_SETUP_KEY/);
  assert.match(env, /USERBOT_SETUP_KEY=/);
  assert.match(vercel, /api\/setup-userbot\.js/);
});

test('dashboard links directly to browser session setup', () => {
  assert.match(reseller, /href=\"\/setup-userbot\.html\"/);
  assert.match(reseller, /Buat TG_STRING_SESSION/);
});
