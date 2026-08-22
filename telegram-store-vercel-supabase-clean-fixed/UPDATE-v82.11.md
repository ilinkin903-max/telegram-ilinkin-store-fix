# Link Auto Order v82.11

## Perubahan

### 1. Workflow Reseller berhenti saat gagal
Jika workflow reseller mengalami error setelah mulai berjalan, sistem tidak meneruskan step berikutnya dan tidak melakukan retry otomatis dari tengah workflow. Run menjadi `ATTENTION` agar owner dapat memeriksa supplier.

### 2. Notifikasi pembeli saat workflow gagal
Pembeli menerima satu notifikasi idempotent:

> ⚠️ PROSES PRODUK MENGALAMI KENDALA
> Pesanan sudah tercatat, tetapi proses pengiriman mengalami kendala. Sistem tidak melanjutkan langkah yang gagal agar pesanan tidak salah. Silakan tunggu beberapa saat; jika belum menerima produk, hubungi admin dan sertakan referensi transaksi.

Notifikasi tidak dikirim berulang kali untuk invoice yang sama.

### 3. Ulangi workflow dari awal tanpa membuat penjualan baru
Dashboard Workflow Reseller pada status `ATTENTION` menyediakan **↻ Ulangi Workflow dari Awal**.

Retry ini menggunakan **invoice dan transaksi marketplace yang sama**. Sistem tidak membuat transaksi/penjualan marketplace baru. Guard step di-reset hanya untuk aksi restart manual, kemudian workflow dimulai kembali dari step 1.

> Penting: restart manual tetap dapat membuat pembelian supplier ganda bila order supplier sebelumnya sebenarnya sudah berhasil. Karena itu dashboard meminta owner memeriksa chat supplier sebelum restart.

### 4. Status completed → canceled mengoreksi statistik
Saat transaksi berubah dari `completed` menjadi `canceled`, sistem mengurangi berdasarkan transaksi tersebut:
- omzet = `total_price`
- profit = `profit_amount`
- modal = `cost_total`
- jumlah item dan jumlah transaksi ikut diselaraskan agar dashboard konsisten.

Jika `canceled` dikembalikan menjadi `completed`, nilai tersebut ditambahkan kembali.

### 5. Statistik live mengecualikan transaksi canceled
RPC `stats_summary_v62()` sekarang hanya menghitung transaksi dengan status `completed`.

## Database
Jalankan satu kali:

`supabase/update-v82.11-workflow-failure-cancel-stats.sql`

Migration aman dijalankan ulang dan tidak menghapus data transaksi.
