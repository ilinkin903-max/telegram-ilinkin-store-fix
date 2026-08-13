const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('api/reseller.js');

test('v70 memakai visual premium 3D tanpa mengubah ID fungsi utama', () => {
  assert.match(html, /v70 — Premium soft 3D reseller dashboard skin/);
  assert.match(html, /class="hero3d"/);
  assert.match(html, /class="ring3d"/);
  assert.match(html, /class="cube3d"/);
  for (const id of ['stats','navTiles','dashboard','products','orders','poOrders','users','broadcast','promos','settings']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('v70 mobile navigation menjadi floating bottom capsule', () => {
  assert.match(html, /@media\(max-width:900px\)[\s\S]*?\.navTiles\{position:fixed;left:12px;right:12px;bottom:10px/);
  assert.match(html, /background:#11131e/);
  assert.match(html, /\.tile\.active\{background:#fff;color:#161721/);
});

test('v70 menghapus tampilan brutalist melalui override border dan shadow lembut', () => {
  assert.match(html, /--line:1px solid rgba\(30,32,48,.08\)/);
  assert.match(html, /--shadow:0 16px 36px rgba\(31,33,52,.09\)/);
  assert.match(html, /border-radius:32px/);
  assert.match(html, /\.modalBox\{border:0;box-shadow:0 30px 80px/);
});
