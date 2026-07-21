# Pengaturan Marketplace v53

## Hero / Banner 2,39:1

Banner yang disarankan tetap menggunakan rasio:

```text
2,39:1
```

Contoh ukuran:

```text
1195 × 500 px
1434 × 600 px
```

Blok biru bawaan Marketplace sekarang juga mengikuti rasio yang sama.

## Banner Promosi

Buka:

```text
/reseller → Pengaturan → Banner Promosi Marketplace
```

Setiap banner tetap memiliki **Nama Banner** dan **Link Gambar** untuk memudahkan pengelolaan di dashboard. Nama tersebut tidak ditampilkan pada Marketplace.

## Flash Sale

Buka:

```text
/reseller → Pengaturan → Flash Sale Marketplace
```

Langkah:

1. Pilih `ON`.
2. Isi judul, misalnya `FLASH SALE`.
3. Tentukan tanggal dan jam berakhir.
4. Tekan **+ Tambah Produk**.
5. Pilih produk yang ingin ditampilkan.
6. Maksimal 8 produk.
7. Tekan **Simpan Pengaturan**.

Agar tampil seperti Flash Sale marketplace, buat promo otomatis untuk produk atau varian tersebut dari menu **Promo**. Harga asli dan harga promo akan ditampilkan secara otomatis.

## Konfirmasi pembelian

Pada detail produk, tombol **Beli Sekarang** sekarang menampilkan konfirmasi terlebih dahulu. Pembayaran hanya dibuat setelah pembeli memilih:

```text
Ya, Lanjut ke Pembayaran
```

Pilihan `Kembali` menutup konfirmasi tanpa membuat invoice.

## Posisi blok keunggulan

Transaksi Aman, Proses Otomatis, Dukungan Telegram, dan Promo & Voucher sekarang berada di bagian bawah setelah katalog.

## Database

Jika sudah memakai v52, tidak ada SQL tambahan untuk v53.

Untuk upgrade dari v51 atau versi lebih lama, tetap jalankan:

```text
supabase/update-v52-marketplace.sql
```
