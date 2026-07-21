# v52 — Blue Marketplace, Link Manager, Product Visibility & QRIS Download

Versi ini melanjutkan v51 dan mempertahankan bot Telegram, pembayaran Pakasir, promo/voucher, auto delivery, broadcast, serta dashboard reseller.

## Perubahan v52

### Marketplace tema biru

- Warna utama Marketplace diubah dari oranye menjadi biru.
- Header, tombol utama, indikator promo, bubble pembayaran, dan bubble Customer Service mengikuti tema biru.
- Logo toko dapat diisi dengan URL gambar publik atau link Google Drive melalui **Dashboard Reseller → Pengaturan → Logo Marketplace**.

### Banner dengan Nama + Link

Banner tidak lagi hanya berupa textarea URL. Setiap banner memiliki baris sendiri:

```text
Nama Banner | Link Gambar | Hapus
```

Gunakan tombol **+ Tambah** untuk menambah banner. Maksimal 10 banner.

- Nama banner dapat dipakai untuk membedakan setiap promosi.
- Rasio gambar yang disarankan: **2,39:1**.
- URL HTTPS publik dan link Google Drive publik didukung.
- Banner bergeser otomatis ke kiri sesuai interval yang dipilih.

### Pengaturan tampilan produk

Saat menambah atau mengedit produk, tersedia pilihan:

```text
Bot Telegram + Marketplace
Marketplace saja
```

Produk **Marketplace saja** tidak muncul pada daftar `/produk` dan daftar stok pembeli di bot Telegram, tetapi tetap dapat dibeli melalui Marketplace.

### Tampilan harga promo

Marketplace sekarang menampilkan:

```text
Rp 45.000  → dicoret
Rp 16.500  → harga promo
```

Untuk produk dengan varian, promo ditempel langsung pada varian yang menerima promo sehingga pembeli mengetahui varian mana yang sedang diskon.

### Unduh QRIS diperbaiki

QRIS tidak lagi hanya mencoba mengunduh Data URL di browser. v52 menyimpan payload QRIS sementara pada pending order dan menyediakan file PNG dari server:

```text
/api/store-data?action=qr-download&invoice=INVOICE
```

Di Telegram Mini App, tombol **Unduh QRIS** memakai `Telegram.WebApp.downloadFile` jika tersedia. Browser biasa memakai download link sebagai fallback.

## SQL WAJIB untuk upgrade dari v51 atau versi sebelumnya

Sebelum mencoba fitur baru, buka **Supabase → SQL Editor** lalu jalankan:

```text
supabase/update-v52-marketplace.sql
```

SQL tersebut menambahkan:

- `products.display_scope`
- `pending_orders.qr_payload`

File aman dijalankan ulang karena menggunakan `IF NOT EXISTS`.

Untuk instalasi database baru, cukup jalankan:

```text
supabase/schema.sql
```

karena schema utama v52 sudah mencakup kedua kolom tersebut.

## Cara pemasangan

1. Ekstrak ZIP v52.
2. Unggah **isi folder `store_fix_v52`** ke root repository GitHub yang terhubung ke Vercel.
3. Jalankan `supabase/update-v52-marketplace.sql` di Supabase SQL Editor.
4. Pastikan Environment Variables lama tetap ada.
5. Redeploy Vercel tanpa build cache.
6. Setelah deployment berstatus **Ready**, pasang ulang webhook Telegram bila diperlukan:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=ISI_WEBHOOK_SECRET
```

7. Buka `/reseller` dari Telegram owner dan atur logo/banner.
8. Buat **invoice baru** untuk menguji tombol Unduh QRIS. Invoice lama sebelum v52 tidak memiliki `qr_payload`.

## Environment Variables utama

```text
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller
BOT_USERNAME=username_bot_tanpa_tanda_at

BOT_TOKEN=token_bot
OWNER_ID=id_telegram_owner
WEBHOOK_SECRET=rahasia_set_webhook

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key

PAKASIR_SLUG=slug_proyek_pakasir
PAKASIR_API_KEY=api_key_pakasir
PAKASIR_WEBHOOK_REQUIRE_SECRET=false
```

Webhook Pakasir:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

## Google Drive

Logo, banner, dan gambar produk dapat memakai link berbagi Google Drive seperti:

```text
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

Pastikan izin file adalah **Siapa saja yang memiliki link / Anyone with the link → Viewer**.

## Pengujian

```bash
npm ci
npm test
```

v52 telah lolos **31 pengujian otomatis** yang mencakup pembayaran, promo/voucher, promo varian, keamanan isi stok, banner bernama, tema Marketplace, pengaturan kanal produk, dan mekanisme unduh QRIS.

Pengujian transaksi nyata tetap memerlukan akun Telegram, Pakasir, Supabase, dan Vercel Anda.
