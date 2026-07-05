require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const dbDir = path.join(root, 'Database');

function readJson(filename, fallback = []) {
  const file = path.join(dbDir, filename);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function chunks(array, size = 500) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

function hash(value) {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex');
}

async function upsertChunked(supabase, table, rows, onConflict) {
  if (!rows.length) return;
  for (const part of chunks(rows, 500)) {
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di .env');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const produk = readJson('Produk.json');
  const users = readJson('User.json');
  const trx = readJson('Trx.json');
  const vouchers = readJson('Voucher.json');

  const productRows = produk.map((p) => ({
    name: String(p.nama || '').trim(),
    code: String(p.kode || '').trim().toUpperCase(),
    price: Number(p.harga || 0),
    description: String(p.deskripsi || ''),
    terms: String(p.snk || ''),
    stock: Array.isArray(p.data) ? p.data : [],
    sold: Number(p.terjual || 0),
    updated_at: new Date().toISOString()
  })).filter((p) => p.name && p.code);

  const userRows = users.map((u) => ({
    telegram_id: Number(u.id),
    transaction_count: Number(u.jumlahtransaksi || 0),
    spending: Number(u.pengeluaran || 0),
    updated_at: new Date().toISOString()
  })).filter((u) => Number.isFinite(u.telegram_id));

  const trxRows = trx.map((t, i) => ({
    telegram_id: Number(t.id),
    product_name: String(t.nama || ''),
    product_code: String(t.kode || '').toUpperCase(),
    quantity: Number(t.jumlah || 1),
    total_price: Number(t.harga || 0),
    order_ref: `legacy_${hash({ ...t, i })}`,
    created_at: t.tanggal ? new Date(t.tanggal).toISOString() : new Date().toISOString()
  })).filter((t) => Number.isFinite(t.telegram_id) && t.product_name && t.product_code);

  const voucherRows = vouchers.map((v) => ({
    code: String(v.kode || '').trim().toUpperCase(),
    products: Array.isArray(v.produk) ? v.produk.map((p) => String(p).toUpperCase()) : [],
    discount: Number(v.potongan || 0),
    usage_limit: Number(v.limit || 0),
    used_by: Array.isArray(v.user) ? v.user.map(Number) : [],
    updated_at: new Date().toISOString()
  })).filter((v) => v.code);

  console.log(`Import products: ${productRows.length}`);
  await upsertChunked(supabase, 'products', productRows, 'code');

  console.log(`Import users: ${userRows.length}`);
  await upsertChunked(supabase, 'bot_users', userRows, 'telegram_id');

  console.log(`Import transactions: ${trxRows.length}`);
  await upsertChunked(supabase, 'transactions', trxRows, 'order_ref');

  console.log(`Import vouchers: ${voucherRows.length}`);
  await upsertChunked(supabase, 'vouchers', voucherRows, 'code');

  console.log('Selesai import data JSON ke Supabase.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
