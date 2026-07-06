# Telegram Store Vercel Supabase - Admin UI v8

Update ini menambahkan warna pada Voucher, Broadcast, Produk Terlaris, Identitas Toko, Panduan Media, dan tombol ON/OFF produk. Produk yang OFF tidak muncul di daftar produk/stok bot Telegram.

## Pasang
1. Upload isi ZIP ke GitHub.
2. Redeploy Vercel.
3. Jalankan SQL update di Supabase.
4. Buka ulang webhook:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123
```

## SQL update wajib
Jalankan file `supabase/update-owner-tools.sql` di Supabase SQL Editor.
