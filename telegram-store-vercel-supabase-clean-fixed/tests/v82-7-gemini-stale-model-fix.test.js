const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ai = fs.readFileSync(path.join(root, 'lib', 'aiFlowService.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');

test('v82.7 normalizes stale OpenAI models to Gemini', () => {
  assert.match(ai, /function normalizeGeminiModel/);
  assert.match(ai, /!\/\^\(gemini-\|gemma-\)\/i\.test\(model\)/);
  assert.match(ai, /return DEFAULT_GEMINI_MODEL/);
  assert.match(ai, /const DEFAULT_GEMINI_MODEL = 'gemini-3\.7-flash'/);
});

test('v82.7 locks Google Gemini base URL and chat completions backend', () => {
  assert.match(ai, /const GEMINI_BASE_URL = 'https:\/\/generativelanguage\.googleapis\.com\/v1beta\/openai'/);
  assert.match(ai, /base_url: GEMINI_BASE_URL/);
  assert.match(ai, /backend: 'chat_completions'/);
});

test('v82.7 dashboard does not render gpt model into Gemini field', () => {
  assert.match(dashboard, /\^gemini-\|\^gemma-/i);
  assert.match(dashboard, /'gemini-3\.7-flash'/);
});
