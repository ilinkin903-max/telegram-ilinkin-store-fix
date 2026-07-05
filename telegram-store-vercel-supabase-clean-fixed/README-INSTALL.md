# Telegram Store Vercel Supabase - Admin UI v7

Update ini memperbaiki tampilan Edit Produk agar sama rapi seperti Tambah Produk.

Perubahan utama:
- Popup Edit Produk dibuat berkolom: Nama, Kode, Harga, Kategori, Link Gambar, Deskripsi, Syarat & Ketentuan, Harga Grosir.
- Untuk produk varian, Edit Produk menampilkan kartu varian seperti Tambah Produk.
- Edit varian berisi Nama Varian, Harga Varian, Kode Varian, Harga Grosir Varian, Deskripsi Varian, dan Syarat & Ketentuan Varian.
- Stok tidak ikut diedit di tombol Edit. Gunakan tombol Stok untuk tambah stok dan Kelola untuk mengganti stok.
- Basis update tetap Admin UI v6.

Cara pasang:
1. Upload isi ZIP ke GitHub.
2. Redeploy Vercel.
3. Buka ulang webhook:
   https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123

Sesuaikan secret jika WEBHOOK_SECRET kamu bukan abc123.
