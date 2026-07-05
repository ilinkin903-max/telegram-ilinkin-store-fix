# Telegram Store Vercel + Supabase - Owner Tools Lengkap

Versi ini berisi bot Telegram webhook untuk Vercel, database Supabase, dan Mini App reseller panel.

## Fitur baru

- Mini App Dashboard dengan grafik omzet harian dan produk terlaris.
- Mini App Products: tambah produk, list produk, hapus produk.
- Mini App Edit Produk lengkap: nama, kode, harga, deskripsi, SnK, gambar produk, dan stok.
- Mini App Edit Stok: tambah stok atau ganti semua stok.
- Mini App Voucher: tambah, edit, aktif/nonaktif, hapus voucher.
- Mini App Gambar Toko: simpan nama toko, deskripsi, logo URL, banner URL.
- Mini App Broadcast: teks, gambar URL/file_id, dan stiker file_id.
- Bot Telegram Owner Menu lengkap.
- Broadcast Telegram bisa reply foto/stiker dengan command `/bc`.

## Update database Supabase lama

Kalau project Supabase sudah pernah dibuat dari versi sebelumnya, jalankan file ini di Supabase SQL Editor:

```text
supabase/update-owner-tools.sql
```

Copy semua isi file tersebut, paste ke Supabase SQL Editor, lalu klik Run.

Kalau project Supabase masih baru, cukup jalankan:

```text
supabase/schema.sql
```

## Deploy update ke Vercel

1. Upload folder `vercel-supabase-bot` ini ke GitHub repository kamu.
2. Pastikan path tetap seperti ini:

```text
vercel-supabase-bot/api/reseller.js
vercel-supabase-bot/api/reseller-data.js
vercel-supabase-bot/lib/botHandlers.js
vercel-supabase-bot/lib/db.js
vercel-supabase-bot/supabase/update-owner-tools.sql
```

3. Vercel akan redeploy otomatis.
4. Kalau tidak otomatis, buka Vercel -> Deployments -> Redeploy.
5. Setelah redeploy, buka ulang Mini App dari Telegram dengan command:

```text
/reseller
```

## Environment Variables Vercel

Minimal harus ada:

```env
BOT_TOKEN=token_bot_kamu
OWNER_ID=id_telegram_owner
BOT_NAME=iLink.in Store
BOT_USERNAME=username_bot_tanpa_@
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key_supabase
PUBLIC_URL=https://project-kamu.vercel.app
MINIAPP_URL=https://project-kamu.vercel.app/reseller
WEBHOOK_SECRET=password_bebas
MINIAPP_DEV_MODE=false
```

Opsional:

```env
CHANNEL_STORE=https://t.me/channel_kamu
CUSTOMER_SERVICE=t.me/cs_kamu
CHANNEL_LOG=@channel_log_kamu
PAKASIR_SLUG=slug_pakasir
PAKASIR_API_KEY=api_key_pakasir
```

## Command owner Telegram

```text
/ownermenu
/addproduk Nama|Kode|Harga|Deskripsi|SnK
/delproduk Kode
/addstok Kode|stok1\nstok2
/editstok Kode|stok1\nstok2
/editnama Kode|Nama Baru
/editkode KodeLama|KodeBaru
/editharga Kode|HargaBaru
/editdeskripsi Kode|Deskripsi Baru
/editsnk Kode|SnK Baru
/listuser
/deluser ID_TELEGRAM
/addvoucher KODE|semua|POTONGAN|LIMIT
/editvoucher KODE_LAMA|KODE_BARU|semua|POTONGAN|LIMIT
/delvoucher KODE
/rekap
/rekap 7 2026
/reseller
```

## Broadcast Telegram

Broadcast teks:

```text
/bc Halo semua, stok baru sudah ready.
```

Broadcast gambar dari URL:

```text
/bcphoto https://domain.com/gambar.jpg|Caption broadcast
```

Broadcast gambar dari Telegram: reply sebuah foto lalu ketik:

```text
/bc Caption broadcast
```

Broadcast stiker dari Telegram: reply sebuah stiker lalu ketik:

```text
/bc
```

Atau reply stiker lalu ketik:

```text
/bcsticker
```

## Catatan gambar toko dan produk

Mini App menyimpan gambar memakai URL publik, bukan upload file langsung. Jadi upload gambar ke tempat yang punya URL publik, lalu paste URL-nya ke Mini App.

Contoh URL gambar:

```text
https://domain.com/logo.jpg
```

