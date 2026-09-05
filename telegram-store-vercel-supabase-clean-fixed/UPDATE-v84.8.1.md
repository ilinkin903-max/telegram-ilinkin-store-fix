# Panduan Update Link Auto Order v84.8.1

## 1. Deploy Kode

Deploy seluruh isi paket v84.8.1 ke project Vercel yang sama. Environment Variable lama tetap digunakan; rilis ini tidak menambahkan Environment Variable wajib baru.

## 2. Jalankan Migrasi Supabase

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan seluruh isi file berikut:

`supabase/update-v84.8.1-shared-stock-speed.sql`

Migrasi harus dijalankan agar pembayaran QRIS/gateway dan saldo benar-benar mengurangi pool Stok Bersama yang sama. Deploy kode tanpa migrasi hanya memperbaiki panel dan tampilan, tetapi belum mengganti logika fulfillment pada database lama.

Migrasi dirancang untuk database Link Auto Order yang sudah memakai schema v65 atau lebih baru. File aman dijalankan ulang dan tidak menghapus stok lokal varian.

## 3. Verifikasi Stok Bersama

Gunakan produk uji dengan langkah berikut:

1. Buat dua varian dan pilih **STOK BERSAMA** pada keduanya.
2. Isi **Stok Produk Bersama** dengan dua item.
3. Simpan, buka kembali produk, lalu pastikan pilihan Shared tetap tersimpan.
4. Buka produk melalui bot dan marketplace. Kedua varian harus menampilkan stok `2`, sedangkan total produk hanya menghitung pool menjadi `2`, bukan `4`.
5. Lakukan satu transaksi uji. Setelah transaksi selesai, kedua varian Shared harus menampilkan stok `1`.
6. Ulangi pengujian pada pembayaran saldo dan QRIS/gateway sesuai metode yang aktif di toko.

## 4. Perilaku Cache

- Perubahan produk di dashboard dapat memerlukan paling lama sekitar 5–12 detik untuk terlihat pada daftar yang sudah terbuka.
- Checkout terakhir tetap membaca stok langsung, sehingga cache tampilan tidak dapat menyebabkan stok lama dipakai untuk fulfillment.
- Setelah pembayaran selesai, cache katalog dan saldo pengguna dibersihkan.

## 5. Pemeriksaan Setelah Deploy

- Pastikan endpoint utama menampilkan versi `v84.8.1`.
- Pastikan tidak ada error migrasi di SQL Editor.
- Pastikan bot dapat membuka menu produk, memilih varian, dan menampilkan konfirmasi.
- Pastikan marketplace dapat memuat katalog dan saldo tanpa jeda panjang.
- Pastikan jumlah stok Shared turun pada produk utama, bukan pada array stok lokal varian.
