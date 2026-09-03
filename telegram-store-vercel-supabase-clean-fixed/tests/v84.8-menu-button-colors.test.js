const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'botHandlers.js'), 'utf8');

test('warna tombol menu utama: Marketplace hijau dan Daftar Produk biru', () => {
  assert.match(
    source,
    /styledButton\('‹🛍️› Buka Marketplace', \{ web_app: \{ url: storeUrl \} \}, 'success'\)/
  );
  assert.match(
    source,
    /styledButton\('‹📦› Daftar Produk', \{ callback_data: 'daftarproduk' \}, 'primary'\)/
  );
});
