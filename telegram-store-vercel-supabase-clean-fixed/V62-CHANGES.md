# v62 — Ringkasan Perubahan Audit

## P0: perlindungan uang dan stok

### Fulfillment atomik

`completeOrder()` tidak lagi melakukan pola baca stok → potong di JavaScript → update. v62 memakai RPC `fulfill_paid_order_v62` yang menjalankan dalam satu transaksi PostgreSQL:

1. advisory lock per invoice;
2. pengecekan transaksi yang sudah selesai;
3. row lock `FOR UPDATE` pada produk;
4. klaim invoice dengan unique `order_ref`;
5. validasi dan pemotongan stok;
6. pencatatan transaksi dan item yang dikirim;
7. pembaruan user, voucher/promo, serta counter historis.

Jika salah satu tahap gagal, seluruh transaksi database dibatalkan.

### Lock pembayaran fail-closed

`payment_process:*` dan checkout menggunakan `claim_job_lock_v62`. Jika lock database gagal, pembayaran/checkout dihentikan sementara daripada membiarkan dua proses berjalan.

### Mini App development mode

`MINIAPP_DEV_MODE` hanya dapat digunakan di lingkungan non-production. Header `x-dev-owner-id` tidak dapat memberi akses owner di Vercel Production.

### Data sensitif

Semua JSON produksi pada folder `Database` dikosongkan. `.gitignore` mencegah stok, transaksi, dan user lokal ikut ter-commit kembali.

## P1: pembayaran dan data yang akurat

- `stats_summary_v62()` menghitung transaksi langsung di PostgreSQL tanpa batas 1.000 baris.
- Fallback statistik memakai pagination 1.000 baris per halaman.
- Profit negatif dan koreksi modal tetap tersimpan.
- Invoice gateway diperlakukan case-sensitive dan tidak di-uppercase.
- `/api/payment-cron` memulihkan pembayaran yang gagal diproses oleh webhook/watcher.
- Verifikasi `initData` memeriksa panjang hash sebelum `timingSafeEqual`.
- Dynamic text bot diperketat escaping Markdown untuk mengurangi `can't parse entities`.

## P2: konsistensi dan kebersihan

- Versi API membaca `VERSION.txt` melalui `lib/version.js`.
- Handler `/ownermenu` dan `/reseller` duplikat dihapus.
- Lock dipindahkan dari `shop_settings` ke `job_locks`.
- `getShopSettings()` hanya mengembalikan key pengaturan yang dikenal.
- Parser stok varian tidak lagi memecah satu stok berdasarkan koma.
- Backup cron wajib `CRON_SECRET`.
- Unduhan QRIS memakai token HMAC singkat dan tidak menaruh Telegram `initData` pada URL.
- Endpoint QRIS terautentikasi tidak lagi memakai CORS wildcard.
- Checkout dibatasi satu proses per user selama 30 detik.
- Maintenance memiliki aksi menghapus lock kedaluwarsa.

## Database baru

File wajib untuk upgrade v61/v60:

```text
supabase/update-v62-security-reliability.sql
```

Objek yang ditambahkan:

```text
job_locks
claim_job_lock_v62(...)
stats_summary_v62()
fulfill_paid_order_v62(...)
transactions_order_ref_unique_idx
```

## Hal yang belum dapat diuji di container

- eksekusi migration terhadap project Supabase produksi;
- callback dan settlement AutoGoPay asli;
- pengiriman produk melalui bot Telegram asli;
- scheduler eksternal;
- build Vercel dengan dependency yang diunduh dari internet.
