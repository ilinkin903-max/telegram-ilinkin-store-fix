const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('v82.6 uses Google Gemini OpenAI-compatible endpoint by default', () => {
  const ai = read('lib/aiFlowService.js');
  assert.match(ai, /generativelanguage\.googleapis\.com\/v1beta\/openai/);
  assert.match(ai, /gemini-2\.5-flash/);
  assert.match(ai, /chat\/completions/);
});

test('v82.6 dashboard has Google Gemini setup and AI Studio shortcut', () => {
  const ui = read('api/reseller.js');
  assert.match(ui, /AI Flow Assistant · Google Gemini/);
  assert.match(ui, /aistudio\.google\.com\/apikey/);
  assert.match(ui, /gemini-2\.5-flash-lite/);
  assert.match(ui, /Tes Koneksi Gemini/);
});
