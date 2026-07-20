# Pengaturan Singkat Marketplace

Gunakan nilai berikut untuk domain Anda:

```text
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller
```

Setelah deploy:

1. Buka `https://telegram-ilinkin-store-fix.vercel.app/` untuk melihat katalog publik.
2. Kirim `/start` ke bot untuk membuka marketplace sebagai Telegram Web App.
3. Checkout hanya dapat dilakukan dari Telegram agar sistem mengetahui `telegram_id` tujuan pengiriman produk.
4. Buka `/reseller` dari tombol owner untuk mengelola produk, stok, promo, voucher, dan penjualan.
5. Isi `image_url` produk dengan URL HTTPS atau link berbagi Google Drive publik.

## Mengatur banner promosi v51

1. Buka `/reseller` melalui Telegram pemilik.
2. Pilih menu **Pengaturan**.
3. Cari bagian **Banner Promosi Marketplace**.
4. Tempel satu URL gambar per baris.
5. Gunakan rasio **2,39:1** agar gambar tidak terpotong.
6. Tentukan kecepatan 3–15 detik, lalu tekan **Simpan Pengaturan**.

Contoh:

```text
https://domain-anda.com/banner-promo-1.jpg
https://domain-anda.com/banner-promo-2.jpg
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

Untuk Google Drive, pastikan izin file adalah **Siapa saja yang memiliki link — Pelihat**.

## Menguji detail pembayaran

1. Buat transaksi baru sampai QRIS muncul.
2. Tekan **Unduh QRIS** untuk menyimpan gambar QR.
3. Tutup jendela QRIS menggunakan tombol ×.
4. Pastikan bubble **Detail Pembayaran** muncul di bawah.
5. Tekan bubble untuk menampilkan QRIS dan rincian invoice kembali.
