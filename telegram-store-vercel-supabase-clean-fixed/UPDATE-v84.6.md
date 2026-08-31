# UPDATE v84.6

Sekarang setiap varian bisa memilih sumber stok:
- **STOK BERSAMA**: memakai `products.stock`.
- **STOK TERPISAH**: memakai `variants[i].stock`.

Contoh campuran dalam satu produk:
- Garansi 7 Hari → Shared
- Garansi 30 Hari → Shared
- Garansi 1 Tahun → Separate

Jika varian Shared dibeli, runtime mengambil item dari stok produk utama dan mengurangi pool utama tersebut. Stok terpisah tetap tidak terpengaruh.

Dashboard Tambah Stok/Kelola Stok menampilkan **Stok Produk Bersama** hanya sekali bila ada varian Shared, sehingga akun/item tidak diduplikasi.

Deploy source v84.6 lalu jalankan `supabase/update-v84.6-variant-stock-mode.sql`.
