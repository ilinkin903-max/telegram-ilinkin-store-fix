# Perubahan v58

Versi dasar: **v56 AutoGoPay Callback Fix**. Fitur rekomendasi grosir v57 tidak disertakan.

## Invoice dan Trx ID

Prefix `AUTOGOPAY`, termasuk pemisah seperti `-`, `_`, atau `:`, tidak ditampilkan pada invoice pembeli, notifikasi owner, riwayat, dashboard, bubble pembayaran, dan nama file QRIS. Nilai asli tetap digunakan secara internal untuk verifikasi payment gateway.

## Promo khusus Flash Sale

Promo Otomatis yang dicentang **Masukkan target promo ini ke Flash Sale Marketplace** hanya berlaku ketika seluruh syarat berikut terpenuhi:

1. Status Flash Sale ON.
2. Jadwal mulai dan berakhir lengkap serta valid.
3. Waktu sekarang sudah melewati waktu mulai.
4. Waktu sekarang belum mencapai waktu berakhir.
5. Syarat promo sendiri, target produk/varian, minimum pembelian, dan limit masih terpenuhi.

Di luar periode Flash Sale, promo tersebut tidak memotong harga pada bot maupun Marketplace. Promo Otomatis biasa yang tidak dicentang tetap berjalan seperti sebelumnya.

## Tampilan

- Flash Sale selalu satu baris horizontal dan dapat digeser ke samping.
- Pengaturan: Pengaturan Toko, Banner Promosi, Media /start.
- Promo: Daftar, Buat Promo & Voucher, Flash Sale.
- Kedua kelompok submenu selalu satu baris dan dapat digeser pada layar kecil.

## Instalasi

Tidak memerlukan SQL baru. Ganti file v56 dengan isi v58, lalu redeploy Vercel tanpa cache.
