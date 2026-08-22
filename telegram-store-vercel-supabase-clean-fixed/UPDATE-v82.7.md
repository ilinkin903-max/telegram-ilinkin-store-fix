# Update Link Auto Order v82.7.0

1. Upload/deploy seluruh source v82.7 ke Vercel.
2. Buka Supabase → SQL Editor.
3. Jalankan `supabase/update-v82.7-continuous-workflow-recorder.sql` satu kali.
4. Redeploy Vercel bila deployment dilakukan sebelum SQL migration.
5. Buka Dashboard → Pengaturan → Workflow Reseller.

## Cara Rekam Baru

1. Buat/pilih workflow dalam MODE REKAM.
2. Kirim `/start` atau aksi pertama.
3. Setelah aksi selesai, panel akan menampilkan `LIVE RECORDER AKTIF`.
4. Biarkan recorder berjalan jika supplier menampilkan loading/proses. Tidak perlu menekan Refresh berulang kali.
5. Jika muncul pilihan tombol, klik langsung tombol yang Anda inginkan. Contoh: Paket → Durasi → 3 Item → Konfirmasi.
6. Jika tahap berikutnya membutuhkan teks, isi lalu tekan `Kirim Teks & Rekam`; pesan terakhir yang masih terlihat otomatis menjadi respons resmi step sebelumnya.
7. Untuk stok, pilih pesan yang benar lalu blok angka stok dan tekan `Bagian Terpilih = Stok`.
8. Untuk produk, pilih pesan hasil akhir lalu blok bagian produknya dan tekan `Bagian Terpilih = Produk`.
9. Tekan `Selesai & Aktifkan` setelah seluruh alur selesai.

Pesan sementara yang sempat tertangkap tetapi kemudian hilang tetap terlihat di recorder sebagai riwayat. Jika satu pesan diedit beberapa kali, buka `Riwayat perubahan pesan` pada kartu tersebut.
