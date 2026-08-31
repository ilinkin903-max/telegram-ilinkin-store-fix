const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('API accepts shared/separate stock mode',()=>{
 const s=read('api/reseller-data.js'); assert.match(s,/stock_mode: String\(item\.stock_mode/);
});
test('UI supports per-variant source and one shared pool editor',()=>{
 const s=read('api/reseller.js');
 for(const x of ['Sumber Stok Varian','STOK BERSAMA','STOK TERPISAH','Stok Produk Bersama','appendSharedStock','manageSharedStock']) assert.match(s,new RegExp(x));
});
test('shared stock counted once',()=>{
 const s=read('api/reseller.js');
 assert.match(s,/variants\.some\(variantUsesSharedStock\)/);
 assert.match(s,/variants\.filter\(function\(v\)\{return !variantUsesSharedStock\(v\);\}\)/);
});
test('SQL shared mode reads product stock and syncs the remaining pool back',()=>{
 const s=read('supabase/schema.sql');
 assert.match(s,/v_variant->>'stock_mode'/);
 assert.match(s,/v_stock := coalesce\(v_product\.stock/);
 assert.match(s,/set stock = v_rest, updated_at = v_now/);
 assert.match(s,/array\[v_variant_idx::text, 'stock'\], v_rest/);
});
test('migration is non-destructive',()=>{
 const s=read('supabase/update-v84.6-variant-stock-mode.sql');
 assert.doesNotMatch(s,/drop table|delete from|truncate/i);
});
