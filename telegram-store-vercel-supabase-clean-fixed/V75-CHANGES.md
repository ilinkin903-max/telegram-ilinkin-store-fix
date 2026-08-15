# v75 — Cara Order Telegram diperbaiki

- Tombol **Cara Order** di Bot Telegram dipertahankan dan selalu tampil.
- Nama tombol dikembalikan dari **Cara Order Bot** menjadi **Cara Order**.
- Jika Marketplace aktif, panduan dimulai dari **Buka Marketplace → pilih produk → pilih varian/jumlah → konfirmasi → pembayaran → produk dikirim ke Telegram**.
- Jika mode hanya Daftar Produk, panduan otomatis memakai alur Daftar Produk.
- Jika Marketplace + Daftar Produk aktif, Marketplace menjadi alur utama dan Daftar Produk ditampilkan sebagai alternatif.
- Tidak ada perubahan SQL/Supabase.
