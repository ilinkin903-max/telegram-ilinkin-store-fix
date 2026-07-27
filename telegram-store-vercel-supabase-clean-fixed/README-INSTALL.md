# iLink.in Store v64 — Promo Persen, Menu Bot & Broadcast Order

v64 merupakan pembaruan dari v63. Seluruh perbaikan keamanan v62, stok atomik, payment recovery, AutoGoPay, Flash Sale, QRIS, dan status penjualan v63 tetap dipertahankan.

## Ringkasan perubahan

- Badge `COMPLETED`/`CANCELED` pada Penjualan dibuat segaris dengan nama produk atau varian.
- Kalimat konfirmasi perubahan status dibuat lebih jelas dan tombolnya dirapikan.
- Kartu Users dibuat lebih padat; transaksi dan spending tidak menumpuk pada HP maupun tablet.
- Tombol Hapus Users diperkecil pada layar kecil.
- Tampilan ukuran sedang mengikuti tata letak ringkas seperti HP.
- Daftar promo dan voucher dibuat lebih ringkas dan mudah dipindai.
- Submenu Promo disederhanakan menjadi **Daftar**, **Buat**, dan **Flash Sale**.
- Diskon nominal dan diskon persen sekarang dinormalisasi serta dihitung dengan benar untuk promo otomatis maupun voucher.
- Pengaturan Toko memiliki opsi tombol bot: Marketplace, Daftar Produk, atau keduanya.
- Broadcast dapat diberi tombol opsional **🛒 Order Sekarang** menuju Marketplace atau daftar produk bot.

## 1. Urutan SQL

Untuk database yang sudah memakai v63:

```text
Supabase → SQL Editor → New query
```

Jalankan seluruh isi:

```text
supabase/update-v64-percentage-discount.sql
```

SQL v64:

- menormalisasi tipe `percent`, `percentage`, `persen`, dan `%` menjadi `percent`;
- memperbaiki data voucher lama yang masih memakai kolom `discount`;
- membatasi diskon persen maksimal 100%;
- menambahkan validasi database agar nilai diskon berikutnya tetap konsisten.

SQL tersebut aman dijalankan berulang kali.

Jika belum pernah memakai v62/v63, jalankan berurutan:

```text
supabase/update-v62-security-reliability.sql
supabase/update-v63-ui-order-status.sql
supabase/update-v64-percentage-discount.sql
```

Untuk instalasi baru dari nol, jalankan `supabase/schema.sql`, kemudian jalankan SQL v64 agar data diskon dan constraint menggunakan format terbaru.

## 2. Environment Variables

Tidak ada Environment Variable wajib baru pada v64. Pertahankan seluruh variabel Production yang sudah digunakan, misalnya:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app

PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller

WEBHOOK_SECRET=RAHASIA_SETUP_ANDA
CRON_SECRET=RAHASIA_CRON_ANDA
QR_DOWNLOAD_SECRET=RAHASIA_UNDUH_QRIS_ANDA
MINIAPP_DEV_MODE=false
```

Jangan menyimpan API key atau secret di GitHub.

## 3. Upload dan deployment

1. Ekstrak ZIP v64.
2. Unggah seluruh isi folder proyek ke root repository GitHub.
3. Ganti file lama dan commit.
4. Buka **Vercel → Deployments → Redeploy**.
5. Pilih redeploy tanpa build cache.
6. Tunggu status deployment menjadi **Ready**.

## 4. Pastikan versi aktif

Buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Respons harus memuat:

```json
{
  "ok": true,
  "version": "v64-ui-promo-bot-menu-broadcast",
  "active_provider": "autogopay"
}
```

Jika masih menampilkan v63, periksa Production deployment dan redeploy tanpa cache.

## 5. Mengatur tombol menu bot

Buka:

```text
Dashboard Reseller → Pengaturan → Pengaturan Toko
```

Pada **Tombol Utama di Bot**, pilih salah satu:

- **Marketplace + Daftar Produk**
- **Marketplace saja**
- **Daftar Produk saja**

Simpan pengaturan. Pilihan diterapkan pada menu `/start`. Perintah `/produk` tetap dapat dipakai meskipun tombol Daftar Produk disembunyikan.

## 6. Menggunakan diskon persen

Buka:

```text
Dashboard Reseller → Promo → Buat
```

Pilih:

```text
Tipe Diskon: Persen
```

Lalu isi nilai antara `1` sampai `100`. Contoh:

```text
10
```

berarti potongan 10% dari subtotal yang memenuhi target, jumlah minimum, jadwal, dan syarat belanja.

Contoh subtotal Rp50.000 dengan diskon 10%:

```text
Potongan: Rp5.000
Total setelah diskon: Rp45.000
```

Aturan ini berlaku untuk promo otomatis dan voucher manual.

## 7. Menambahkan tombol Order Sekarang pada broadcast

Buka:

```text
Dashboard Reseller → Broadcast
```

Aktifkan:

```text
Tambahkan tombol “Order Sekarang”
```

Kemudian pilih tujuan:

- **Buka Marketplace** — tombol membuka website Marketplace.
- **Buka Daftar Produk Bot** — tombol menjalankan daftar produk di Telegram.

Tombol dapat dipakai bersama broadcast teks, foto, atau stiker. Jika tidak dibutuhkan, biarkan opsi tersebut nonaktif.

## 8. Perubahan status Penjualan

Pada kartu Penjualan, badge status berada segaris dengan nama produk/varian. Tekan badge untuk membuka konfirmasi:

- `COMPLETED` dapat ditandai menjadi `CANCELED`.
- `CANCELED` dapat dikembalikan menjadi `COMPLETED`.

Perubahan ini hanya untuk pencatatan administratif. Sistem tidak otomatis melakukan refund atau mengembalikan produk yang sudah terkirim.

## 9. Pengujian setelah deployment

1. Buat promo otomatis nominal dan pastikan potongan benar.
2. Buat promo otomatis persen, misalnya 10%, lalu cek harga checkout.
3. Buat voucher persen dan uji pada checkout baru.
4. Uji ketiga pilihan tombol bot melalui `/start`.
5. Kirim broadcast tanpa tombol, kemudian broadcast dengan tombol Marketplace.
6. Kirim broadcast dengan tombol Daftar Produk Bot.
7. Periksa kartu Penjualan dan Users pada HP, tablet, serta desktop.
8. Uji satu pembayaran asli sampai produk terkirim.

## Troubleshooting

### Diskon persen masih dianggap nominal

Pastikan SQL berikut sudah dijalankan:

```text
supabase/update-v64-percentage-discount.sql
```

Kemudian edit dan simpan ulang promo/voucher tersebut agar data lama dinormalisasi.

### Tombol Order Sekarang tidak muncul

Pastikan checkbox di form Broadcast aktif dan broadcast dikirim dari deployment v64. Untuk tujuan Marketplace, pastikan `STORE_URL` atau `PUBLIC_URL` berisi URL HTTPS yang benar.

### Tombol bot belum berubah

Simpan ulang **Pengaturan Toko**, lalu kirim `/start` kembali. Pesan lama tidak ikut berubah; menu baru muncul pada respons `/start` berikutnya.

## Status pengujian

- Pemeriksaan sintaks JavaScript: berhasil.
- Unit/static tests: **84/84 berhasil**.
- Pemeriksaan struktur HTML dan fitur v64: berhasil.
- Pengujian lokal menggunakan stub dependency sementara karena lingkungan pengujian tidak mengunduh paket eksternal.
- Stub pengujian tidak disertakan dalam ZIP final.
- SQL ditinjau secara statis, tetapi belum dijalankan pada Supabase produksi.
- Integrasi nyata Telegram, AutoGoPay, Supabase, dan Vercel tetap perlu diuji menggunakan kredensial aktif Anda.
