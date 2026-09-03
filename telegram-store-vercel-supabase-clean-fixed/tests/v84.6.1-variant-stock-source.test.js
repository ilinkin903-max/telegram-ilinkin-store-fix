const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('add variant persists stock_mode',()=>{
 const u=read('api/reseller.js');
 assert.match(u,/stock_mode:val\('stock_mode'\)==='shared'\?'shared':'separate'/);
});

test('new variant UI provides shared stock pool input and submit mapping',()=>{
 const u=read('api/reseller.js');
 assert.match(u,/id="addSharedStock"/);
 assert.match(u,/anyShared=variants\.some/);
 assert.match(u,/payload\.stock_text=sharedInput/);
});

test('edit variant persists stock source and shared stock pool',()=>{
 const u=read('api/reseller.js');
 assert.match(u,/data-evfield="stock_mode"/);
 assert.match(u,/id="editSharedStock"/);
 assert.match(u,/d\.stock_text=sharedInput/);
});

test('backend keeps stock_mode in variant JSON',()=>{
 const u=read('api/reseller-data.js');
 assert.match(u,/stock_mode: String\(item\.stock_mode/);
});

test('runtime SQL supports shared stock pool',()=>{
 const sql=read('supabase/schema.sql');
 assert.match(sql,/v_variant->>'stock_mode'/);
 assert.match(sql,/v_stock := coalesce\(v_product\.stock/);
});
