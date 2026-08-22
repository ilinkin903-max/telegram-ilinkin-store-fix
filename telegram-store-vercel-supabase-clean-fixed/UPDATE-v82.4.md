# Update v82.3 → v82.4

1. Buka **Supabase → SQL Editor**.
2. Jalankan seluruh isi `supabase/update-v82.4-partial-result-live-stock.sql`.
3. Upload isi patch v82.4 ke root repository dan timpa file lama.
4. Redeploy Vercel.
5. Buka `/dashboard → Pengaturan → Workflow Reseller`.
6. Untuk workflow yang ingin membaca stok live, jalankan recorder sampai pesan supplier yang menampilkan stok, pilih pesan tersebut, **blok hanya angka stok**, lalu tekan **📊 Angka Terpilih = Stok**.
7. Pastikan step stok berada **sebelum** tombol Buy/Konfirmasi yang benar-benar membuat order.
8. Untuk hasil produk, blok hanya bagian data/link/account yang akan diberikan kepada customer lalu tekan **📦 Bagian Terpilih = Produk**.
9. Aktifkan workflow dan tes satu order murah.

Tidak ada Environment Variable baru pada v82.4.

## Cara kerja stok
Pada produk tunggal, stok di-refresh ketika customer memilih produk. Pada produk bervarian, hanya varian yang dipilih customer yang di-refresh. Ini mencegah bot supplier menerima banyak request stok sekaligus untuk semua varian.

Stok efektif = nilai terendah antara stok yang dibaca dari supplier dan kemampuan beli berdasarkan saldo manual/modal. Jika live check gagal pada workflow yang sudah dikonfigurasi untuk membaca stok, pembelian ditahan dan user diminta mencoba lagi.
