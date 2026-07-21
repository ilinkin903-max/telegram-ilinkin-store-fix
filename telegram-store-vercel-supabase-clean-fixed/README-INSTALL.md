# v53 — Marketplace Flash Sale, Hero 2,39:1 & Konfirmasi Checkout

Versi ini melanjutkan v52 dan mempertahankan bot Telegram, pembayaran Pakasir, pengiriman produk otomatis, promo/voucher per produk atau varian, QRIS, banner, dashboard reseller, serta pengaturan kanal produk.

## Perubahan v53

### 1. Hero dan banner sama-sama 2,39:1

Blok biru Marketplace sekarang memakai rasio **2,39:1**, sama seperti banner promosi. Jika banner tersedia, banner tetap bergeser otomatis ke kiri. Nama banner hanya dipakai di dashboard reseller untuk memudahkan pengelolaan dan **tidak ditampilkan di Marketplace**.

### 2. Flash Sale Marketplace

Buka:

```text
/reseller → Pengaturan → Flash Sale Marketplace
```

Tersedia pengaturan:

- Status Flash Sale: ON / OFF
- Judul, default `FLASH SALE`
- Waktu berakhir
- Maksimal 8 produk pilihan

Produk yang memiliki promo aktif akan menampilkan:

```text
harga asli dicoret → harga promo
persentase diskon
countdown Flash Sale
stok terbatas / jumlah terjual
```

Flash Sale otomatis hilang setelah waktu berakhir.

### 3. Blok keunggulan dipindah ke bawah

Blok berikut sekarang berada setelah katalog produk:

- Transaksi Aman
- Proses Otomatis
- Dukungan Telegram
- Promo & Voucher

### 4. Konfirmasi sebelum membuat invoice

Saat pembeli menekan **Beli Sekarang** pada detail produk, sistem tidak langsung membuat invoice. Muncul konfirmasi berisi produk, varian, jumlah, perkiraan total, dan voucher.

Pilihan:

```text
Ya, Lanjut ke Pembayaran
Kembali
```

Invoice QRIS baru dibuat setelah pembeli memilih **Ya, Lanjut ke Pembayaran**.

## Database

### Sudah menggunakan v52

**Tidak ada SQL baru.** Flash Sale disimpan di tabel `shop_settings` yang sudah bersifat key/value.

### Upgrade dari v51 atau lebih lama

Tetap jalankan:

```text
supabase/update-v52-marketplace.sql
```

karena v52 menambahkan:

- `products.display_scope`
- `pending_orders.qr_payload`

## Cara pemasangan

1. Ekstrak ZIP v53.
2. Unggah **isi folder `store_fix_v53`** ke root repository GitHub yang terhubung ke Vercel dan timpa file lama.
3. Jika sebelumnya sudah v52, tidak perlu menjalankan SQL tambahan.
4. Pastikan Environment Variables lama tetap ada.
5. Redeploy Vercel tanpa build cache.
6. Tunggu deployment berstatus **Ready**.
7. Buka `/reseller → Pengaturan` untuk mengatur Flash Sale.

Environment Variables utama tetap sama:

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

Webhook Pakasir tetap:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

## Pengujian

```bash
npm ci
npm test
```

v53 telah lolos **36 pengujian otomatis**, termasuk pembayaran, format notifikasi pesanan selesai, promo/voucher, target varian, keamanan stok, banner, QRIS download, Flash Sale, hero 2,39:1, dan konfirmasi checkout.

Pengujian transaksi nyata tetap memerlukan akun Telegram, Pakasir, Supabase, dan Vercel Anda.
