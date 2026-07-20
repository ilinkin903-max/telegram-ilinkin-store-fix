# v50 — Website Auto Order Marketplace + 1 Reseller Panel

Versi ini menambahkan website pembeli bergaya marketplace tanpa menghapus fitur bot Telegram dan dashboard reseller yang sudah ada.

## Fitur baru

### Website marketplace pembeli

- Halaman utama toko berada di `/`, `/shop`, atau `/marketplace`.
- Tampilan responsif seperti marketplace: pencarian, kategori, pengurutan, banner, kartu produk, detail produk, pilihan varian, jumlah beli, voucher, QRIS, countdown, dan riwayat pesanan.
- Gambar produk menggunakan URL HTTPS. Link berbagi Google Drive otomatis diubah menjadi URL gambar langsung.
- Stok asli seperti email/password tidak pernah dikirim ke browser. Website hanya menerima jumlah stok.
- Promo otomatis dan voucher manual tetap mengikuti target produk/varian dari versi sebelumnya.
- Pembayaran dibuat melalui Pakasir dan diproses oleh webhook/watcher pembayaran yang sudah ada.
- Setelah transaksi selesai, produk tetap dikirim ke chat Telegram pembeli.
- Website melakukan polling ke database lokal untuk menampilkan status berhasil; website tidak memanggil Pakasir terus-menerus.

### Satu reseller panel

- Dashboard reseller tetap berada di `/reseller`.
- Hanya `OWNER_ID` yang dapat membuka dan memakai API dashboard.
- Tersedia tombol `Lihat Marketplace` dari dashboard.
- Menu bot owner berubah menjadi `Reseller Dashboard`.

### Tombol marketplace di bot

Semua pengguna mendapatkan tombol:

```text
🛍️ Buka Marketplace
```

Tombol membuka website sebagai Telegram Web App sehingga identitas pembeli dapat diverifikasi dan produk dapat dikirim otomatis.

## Struktur URL

```text
https://DOMAIN-ANDA.vercel.app/                Marketplace pembeli
https://DOMAIN-ANDA.vercel.app/shop            Alias marketplace
https://DOMAIN-ANDA.vercel.app/reseller        Dashboard reseller/owner
https://DOMAIN-ANDA.vercel.app/api/store-data  API marketplace
https://DOMAIN-ANDA.vercel.app/api/telegram    Webhook bot Telegram
https://DOMAIN-ANDA.vercel.app/api/payment-webhook  Webhook Pakasir
```

## Environment Variables Vercel

Pastikan variabel lama tetap ada, kemudian tambahkan/periksa:

```text
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller
BOT_USERNAME=username_bot_tanpa_tanda_at
```

Variabel pembayaran yang tetap wajib:

```text
PAKASIR_SLUG=slug_proyek_pakasir
PAKASIR_API_KEY=api_key_pakasir
PAKASIR_WEBHOOK_REQUIRE_SECRET=false
```

Webhook Pakasir:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Variabel database:

```text
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

Variabel Telegram:

```text
BOT_TOKEN=token_bot
OWNER_ID=id_telegram_owner
WEBHOOK_SECRET=rahasia_set_webhook
```

## Cara pemasangan

1. Ekstrak ZIP v50.
2. Unggah semua isi folder `store_fix_v50` ke root repository GitHub yang terhubung ke Vercel.
3. Pastikan `package.json`, `vercel.json`, folder `api`, `lib`, `public`, dan `supabase` berada di root repository.
4. Simpan Environment Variables di Vercel untuk lingkungan `Production`.
5. Redeploy tanpa build cache.
6. Setelah deployment berstatus `Ready`, pasang webhook Telegram:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=ISI_WEBHOOK_SECRET
```

7. Kirim `/start` ke bot. Tombol `Buka Marketplace` akan muncul.
8. Owner dapat membuka panel melalui tombol `Reseller Dashboard` atau perintah `/reseller`.

## Database

Jika database dari v49 sudah terpasang, tidak ada SQL tambahan yang wajib dijalankan.

Untuk instalasi baru, jalankan:

```text
supabase/schema.sql
```

Catatan: sistem saat ini memakai satu `pending_order` aktif per akun Telegram. Artinya satu pembeli menyelesaikan satu invoice terlebih dahulu sebelum membuat invoice berikutnya. Ini mencegah invoice tertimpa dan stok terkirim ke pembayaran yang salah.

## Gambar Google Drive

Kolom gambar dapat diisi dengan link berbagi seperti:

```text
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

File harus diatur `Anyone with the link / Siapa saja yang memiliki link` sebagai Viewer. Website akan mengubahnya menjadi direct image URL secara otomatis.

## Pengujian

Jalankan:

```bash
npm ci
npm test
```

Paket v50 telah lolos 19 pengujian otomatis yang mencakup pembayaran, notifikasi pesanan selesai, promo, voucher, target varian, URL Google Drive, dan perlindungan isi stok.

Pengujian transaksi sungguhan tetap memerlukan akun Telegram, Pakasir, Supabase, dan Vercel milik Anda.
