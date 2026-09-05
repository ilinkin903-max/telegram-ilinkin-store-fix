# Update Link Auto Order v84.8.2

Versi ini memperbaiki **Total Order yang tidak bertambah setelah pembelian** dan memperkuat sinkronisasi statistik, dashboard, bot, marketplace, laporan, serta proses restore backup.

## Penyebab utama

Pada versi sebelumnya, Total Order menggabungkan jumlah transaksi yang masih tersimpan dengan `historical_stats` memakai nilai terbesar. Setelah transaksi lama pernah dibersihkan, pembelian baru belum terlihat karena jumlah transaksi aktif harus melewati angka historis terlebih dahulu. Selain itu, dashboard yang tetap terbuka tidak melakukan refresh statistik secara berkala dan beberapa cache proses dapat menyajikan data lama sesaat setelah transaksi selesai.

## Perbaikan

- Menambahkan counter kanonik `store_metrics_v84_8_2` yang diperbarui otomatis oleh trigger setiap transaksi `completed` dibuat atau dikoreksi.
- Menambahkan ledger order untuk mencegah invoice yang sama dihitung dua kali, termasuk setelah detail transaksi lama dibersihkan lalu dipulihkan dari backup.
- Total historis tidak turun saat owner menjalankan maintenance penghapusan detail transaksi lama.
- Order `canceled` tidak lagi masuk Total Order, omzet, profit, rekap bulanan, grafik tujuh hari, produk terlaris, dan statistik jam ramai.
- Perubahan status `completed` ↔ `canceled` menyelaraskan Total Order dan statistik transaksi per pengguna.
- Dashboard membaca statistik ringan setiap 5 detik, saat tab kembali aktif, dan saat jendela kembali fokus.
- Respons admin memakai `Cache-Control: no-store`; browser juga mengirim request tanpa cache.
- Daftar 100 order terbaru hanya dimuat ulang jika jumlah atau revision transaksi berubah, sehingga refresh tetap ringan.
- Cache bot dan marketplace memakai revision lokal. Hasil request lama yang selesai setelah sebuah write tidak dapat menghidupkan kembali cache kedaluwarsa.
- Pembelian sukses langsung membatalkan cache statistik, produk, katalog, saldo, dan riwayat pembeli pada instance yang sama.
- Restore backup memakai `order_ref` sebagai identitas stabil lintas database dan tidak memaksakan UUID backup jika invoice tersedia. Transaksi lama tanpa `order_ref` tetap memakai primary key `id`.
- Counter direkonsiliasi setelah import transaksi untuk mencegah restore order lama menaikkan Total Order dua kali.
- Duplikasi fungsi dan export `releaseClaim` dibersihkan.

## Cara memasang

1. Deploy seluruh isi ZIP v84.8.2 ke Vercel.
2. Buka **Supabase Dashboard → SQL Editor**.
3. Jalankan seluruh isi file `supabase/update-v84.8.2-order-counter-live-refresh.sql`.
4. Tunggu eksekusi SQL selesai tanpa error, lalu redeploy atau restart deployment Vercel.
5. Muat ulang dashboard admin. Setelah ada pembelian sukses, **Total Order** akan bertambah otomatis dan halaman yang tetap terbuka akan memperbarui angka paling lambat pada siklus refresh berikutnya.

> Migrasi SQL wajib dijalankan. Deploy kode tanpa migrasi masih menggunakan fallback database lama dan tidak memperoleh counter kanonik beserta revision lintas-instance.

## Keamanan data

Migrasi bersifat idempoten dan tidak menjalankan `TRUNCATE`, tidak menghapus tabel transaksi, produk, user, stok, atau saldo. Tabel baru hanya menyimpan counter dan ledger statistik. Data transaksi lama tetap berada di tabel asal kecuali owner sendiri menjalankan fitur maintenance.
