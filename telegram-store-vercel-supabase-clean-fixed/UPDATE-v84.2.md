# Link Auto Order v84.2

## Workflow Reseller
Jika workflow reseller mengalami kegagalan setelah mulai berjalan, workflow berubah menjadi **ATTENTION** dan berhenti pada step yang gagal. Tidak ada step berikutnya yang dijalankan dan tidak ada retry otomatis dari tengah workflow.

Pembeli menerima satu notifikasi kegagalan per invoice:
- proses dihentikan agar tidak terjadi order ganda,
- tunggu beberapa saat,
- hubungi admin jika produk belum diterima,
- sertakan referensi pesanan.

## Ulangi dari Awal
Dashboard menyediakan **↻ Ulangi Workflow dari Awal** untuk run ATTENTION.

Restart:
- menggunakan invoice/transaksi marketplace yang sama,
- tidak membuat penjualan baru,
- mengulang dari Step 1,
- mempertahankan catatan debit saldo supplier yang sudah pernah terjadi agar restart tidak mendebit saldo supplier dua kali.

Owner tetap diberi peringatan untuk mengecek supplier sebelum restart, karena restart dapat menyebabkan pembelian supplier ganda jika order supplier sebelumnya sebenarnya sudah berhasil tetapi responsnya gagal dibaca.

## Omzet & Profit
Saat transaksi berubah **COMPLETED → CANCELED**, statistik mengurangi nilai transaksi yang sama:
- omzet berkurang sebesar `total_price`,
- profit berkurang sebesar `profit_amount`,
- modal/quantity/order count live ikut mengikuti data transaksi yang berstatus completed.

Saat **CANCELED → COMPLETED**, nilai tersebut kembali dihitung.

RPC `stats_summary_v62()` sekarang hanya menghitung transaksi dengan status `completed`.

## Database
Jalankan sekali:
`supabase/update-v84.2-workflow-failure-cancel-stats.sql`
