# Update Link Auto Order v82.1 → v82.2.0

1. Buka Supabase → SQL Editor.
2. Jalankan `supabase/update-v82.2-workflow-guard-receipt.sql`.
3. Upload seluruh isi patch v82.2 ke root repository dan timpa file lama.
4. Redeploy Vercel.
5. Uji satu order Workflow Reseller dengan quantity 1 menggunakan produk murah.
6. Pastikan chat supplier hanya menjalankan rangkaian workflow satu kali.
7. Pastikan pesan final customer memakai format `PEMBAYARAN BERHASIL` dan tidak mempunyai tombol `Salin Produk`.

## Penting
Migration v82.2 wajib dijalankan sebelum order workflow baru. Jika tabel guard belum tersedia, worker akan berhenti sebelum mengirim aksi ke supplier dan memberi error bahwa migration v82.2 belum dijalankan.

Retry otomatis hanya dipakai ketika bot supplier sedang dipakai order lain dan workflow ini belum mulai. Begitu sebuah invoice sudah mulai mengirim step ke supplier, sistem tidak melakukan replay otomatis dari awal.
