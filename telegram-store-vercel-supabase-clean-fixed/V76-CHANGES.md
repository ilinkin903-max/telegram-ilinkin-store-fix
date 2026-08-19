# v76 — ProdSeller Reseller

- Integrasi ProdSeller Public API v1.
- API key aman melalui `PRODSELLER_API_KEY` di Vercel.
- Dashboard baru **Supplier / Reseller** untuk saldo USDT, membership, katalog supplier, dan order supplier.
- Produk ProdSeller dipilih satu per satu dengan tombol **Resellerkan Produk**.
- Harga jual iLink memakai Rupiah dan bisa diatur per produk; tersedia kurs USDT/IDR + markup default.
- Produk supplier memakai label **AUTO SUPPLIER**, bukan PRE-ORDER manual.
- Checkout Marketplace dan Bot memeriksa stok/detail supplier sebelum pembayaran.
- Setelah pembayaran pelanggan sukses, iLink membeli ke ProdSeller menggunakan saldo supplier.
- Hasil key/akun langsung dikirim ke Telegram pelanggan.
- `Idempotency-Key` berbasis invoice mencegah pembelian supplier ganda saat retry.
- Tabel `supplier_orders` menyimpan status, remote order ID, key hasil, dan error supplier.
- Tombol **Retry Supplier** untuk saldo kurang, stok habis, upstream error, atau gagal kirim Telegram.
- Perubahan Banner v74 dan Cara Order v75 tetap dipertahankan.
