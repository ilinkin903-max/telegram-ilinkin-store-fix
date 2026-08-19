const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const reseller = fs.readFileSync(path.join(__dirname, '..', 'api', 'reseller.js'), 'utf8');

for (const fn of ['loadSupplier', 'renderStats', 'renderCharts', 'productMatches', 'productInitial']) {
  test(`dashboard v78 mendefinisikan ${fn}`, () => {
    assert.match(reseller, new RegExp(`(?:async\\s+)?function\\s+${fn}\\s*\\(`));
  });
}
