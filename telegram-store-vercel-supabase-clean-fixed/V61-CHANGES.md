# v61 — Ringkasan Perubahan

## Dashboard utama

- Kartu **Profit Bulan Ini** dan **Total Profit** dihapus.
- Ringkasan utama sekarang hanya menampilkan Omset Hari Ini, Profit Hari Ini, jumlah Order, dan Stok.

## Tampilan produk

- Keterangan modal default dan margin tidak lagi tampil pada kartu produk.
- Harga grosir seperti `5+ Rp6.600` tidak lagi memenuhi kartu produk.
- Ringkasan varian tetap menampilkan nama, harga jual, stok, dan status ON/OFF tanpa menampilkan modal supplier.
- Kolom modal di halaman Tambah/Edit Produk tetap tersedia untuk perhitungan internal.

## Penjualan

- Kartu Penjualan dan Detail Penjualan tidak lagi menampilkan omzet bersih, modal supplier, atau profit.
- Tombol **Atur Modal** tetap tersedia.
- Pada dialog Atur Modal, istilah **Profit Kotor** diubah menjadi **Profit Bersih**.

## Pengaturan

- Pengaturan Toko, Banner Promosi, Media `/start`, Lisensi, Statistik Lengkap, Backup, dan Maintenance kini berada dalam satu submenu Pengaturan.
- Submenu dibuat vertikal satu kolom agar rapi dan mudah digunakan pada desktop maupun ponsel.
- Blok submenu tambahan **Alat Toko** dihapus.

## Database

Tidak ada SQL baru. Jika fitur modal/profit belum pernah dipasang, tetap jalankan `supabase/update-v60-profit-modal.sql`.
