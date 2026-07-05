# Telegram Store Vercel + Supabase - Mini App Marketplace UI

Versi ini berisi bot Telegram webhook untuk Vercel, database Supabase, dan Mini App reseller panel dengan UI marketplace neo-brutal seperti contoh gambar.

## Fitur Mini App terbaru

- Tampilan dashboard lebih nyaman: hero reseller, kartu Saldo/Escrow/GMV/Produk, search, dan kartu produk.
- Menu cepat: Stats, Produk, Penjualan, Tambah, Edit, Voucher, Broadcast, Toko.
- Edit produk lengkap: nama, kode, harga dasar, kategori, URL gambar, deskripsi, SnK, stok.
- Harga bulk per produk.
- Varian produk per produk.
- Edit stok: tambah stok atau ganti semua stok.
- Voucher: tambah, edit, aktif/nonaktif, hapus.
- Gambar toko: nama toko, deskripsi, logo URL, banner URL.
- Broadcast: teks, gambar URL/file_id, dan stiker file_id.
- Bot Telegram Owner Menu tetap ada.

## SQL Supabase

Kalau Supabase baru/kosong, jalankan:

```text
supabase/schema.sql
```

Kalau Supabase sudah pernah dibuat dari versi sebelumnya, jalankan:

```text
supabase/update-owner-tools.sql
```

Script update menambah kolom baru:

```text
products.category
products.bulk_prices
products.variants
```

## Format harga bulk dan varian di Mini App

Harga bulk:

```text
5|5000
10|9000
50|40000
```

Varian:

```text
1 Bulan|10000|BULAN1
Lifetime|50000|LIFE
Premium|25000|PREM
```

Kolom ketiga pada varian adalah kode/sku opsional.

## Upload ke GitHub

Upload isi ZIP ini ke repo GitHub. Di root repo sebaiknya langsung terlihat:

```text
api/
lib/
public/
scripts/
supabase/
Database/
package.json
vercel.json
README-INSTALL.md
```

Kalau struktur seperti di atas, Vercel Root Directory dikosongkan/default.

## Environment Variables Vercel

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

## Setelah deploy

Pasang webhook:

```text
https://project-kamu.vercel.app/api/set-webhook?secret=WEBHOOK_SECRET
```

Test di Telegram:

```text
/debugowner
/ownermenu
/reseller
```

## BotFather Mini App

Set domain bot di BotFather:

```text
telegram-ilinkin-store-fix.vercel.app
```

Isi domain saja, tanpa `https://` dan tanpa `/reseller`.
