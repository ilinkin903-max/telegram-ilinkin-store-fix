# UPDATE v84.6.1 — Per-Varian Sumber Stok Fix

Memperbaiki masalah sumber stok varian yang sebelumnya tampil di UI tetapi pilihan `shared/separate` untuk varian baru belum ikut tersimpan.

Sekarang:
- Tambah Produk → setiap varian menyimpan **STOK BERSAMA** / **STOK TERPISAH**.
- Jika ada varian Shared, form menampilkan **Stok Produk Bersama** dan menyimpan stoknya ke `products.stock`.
- Edit Produk → perubahan sumber stok varian tersimpan.
- Edit Produk → jika ada Shared, **Stok Produk Bersama** bisa diatur dari form yang sama.
- Jika semua varian Separate, stok produk utama tidak disentuh oleh edit varian.
- Existing variants tetap aman.

Tidak perlu migration SQL baru; `stock_mode` sudah berada di JSONB varian.
