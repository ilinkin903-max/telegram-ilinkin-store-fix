# v82

- Telegram supplier tidak lagi membutuhkan VPS worker untuk mode utama.
- Tambah MTProto on-demand di Vercel memakai `TG_API_ID`, `TG_API_HASH`, `TG_STRING_SESSION`.
- Tambah manual supplier balance dan pengurangan balance once-only setelah order sukses.
- Tambah `stock_flow`, `stock_regex`, cache stok, dan tombol cek stok dari dashboard.
- Marketplace refresh stok Telegram supplier saat produk/varian dibuka dan checkout memverifikasi ulang.
- Bot checkout memverifikasi stok Telegram supplier secara live.
- Tambah lock connector di Supabase untuk mencegah percakapan bot supplier tercampur.
- Hasil delivery disimpan sebelum final delivery ke pelanggan untuk mencegah double purchase saat retry.
- Status `manual_review` dipertahankan bila koneksi putus setelah langkah `commit:true`.
- ProdSeller dan supplier lokal tetap dipertahankan.
