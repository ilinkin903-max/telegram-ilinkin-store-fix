const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const ai = fs.readFileSync(path.join(root, 'lib', 'aiFlowService.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'reseller-data.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'api', 'reseller.js'), 'utf8');

test('v82.8 discovers models from Google instead of assuming one model', () => {
  assert.match(ai, /fetchAvailableModels/);
  assert.match(ai, /GEMINI_BASE_URL}\/models/);
  assert.match(ai, /chooseAvailableModel/);
  assert.match(ai, /gemini-3\.7-flash/);
});

test('v82.8 exposes model discovery endpoint and dashboard button', () => {
  assert.match(api, /supplier-ai-models/);
  assert.match(api, /listAvailableModels/);
  assert.match(ui, /Muat Model dari Google/);
  assert.match(ui, /applyGeminiModels/);
});

test('v82.8 connection test returns the models actually visible to the API key', () => {
  assert.match(ai, /models = await fetchAvailableModels\(cfg\.api_key\)/);
  assert.match(ai, /return \{ ok: .* models \}/s);
});
