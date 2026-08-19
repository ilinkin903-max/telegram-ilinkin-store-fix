# v78 — ProdSeller as Existing Product Variants

## Perubahan

- Produk ProdSeller sekarang dapat dire­seller dengan dua mode: **Produk baru / produk mandiri** atau **Varian produk yang sudah ada**.
- Saat memilih mode varian, dashboard meminta **Produk Induk iLink**, **Nama Varian**, dan **Harga Jual**.
- Setiap varian supplier menyimpan `supplier_product_id` ProdSeller sendiri. Checkout dan fulfillment menggunakan Product ID milik varian yang benar, bukan Product ID produk induk.
- Stok setiap varian supplier tetap live berdasarkan `min(kemampuan saldo USDT, stok aktual ProdSeller)` dan ditampilkan sebagai stok varian di Marketplace.
- Satu produk iLink dapat berisi campuran varian stok lokal, PRE-ORDER manual, dan varian ProdSeller otomatis.
- Varian ProdSeller tidak masuk ke Pesanan PO manual dan stoknya tidak dapat diedit melalui Kelola Stok.
- Jika produk induk sebelumnya belum memiliki varian, produk lama otomatis dipertahankan sebagai varian **Utama** agar data/harga/stok lama tidak hilang, lalu varian supplier ditambahkan di bawah produk yang sama.
- Edit nama, harga, deskripsi, S&K, atau status aktif varian supplier tetap mempertahankan tautan supplier.
- Daftar katalog Supplier / Reseller menampilkan lokasi produk yang sudah terhubung, termasuk nama produk induk dan nama variannya.

## Database

Tidak ada SQL baru untuk v78. Metadata supplier varian disimpan pada JSON varian yang sudah ada. Jika migration v76 sudah dijalankan, cukup deploy source v78.

## Verifikasi

- Syntax check JavaScript `api/`, `lib/`, `public/`, dan `scripts/`: PASS.
- Inline JavaScript Reseller Dashboard: PASS.
- Regression + feature tests v73–v78: 29 passed, 0 failed.
