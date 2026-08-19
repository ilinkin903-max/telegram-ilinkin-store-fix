# v79

- Daftar Produk Telegram dipaginasi 10 produk per halaman.
- Tombol Sebelumnya/Selanjutnya mempertahankan halaman daftar.
- Label AUTO SUPPLIER di bot dihapus; produk/varian supplier tampil sebagai stok ready.
- Stok supplier dihitung dari saldo ProdSeller dan stok aktual supplier dengan cache singkat.
- Perbaikan validasi varian supplier agar tidak membaca stok lokal kosong.
- Inline keyboard utama, produk, navigasi, konfirmasi, pembayaran, dan batal memakai style warna Telegram.
- Cache singkat statistik, settings, dan produk bot untuk mengurangi query berulang.
- /start tidak mengulang upsert user setelah RPC registrasi referral berhasil.
