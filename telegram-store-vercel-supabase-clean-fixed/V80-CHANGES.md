# v80 — v79 Base + Pembayaran Link Auto Order

Versi ini memakai seluruh alur/UI v79 sebagai dasar. Perubahan difokuskan pada pembayaran agar sama dengan Link Auto Order.

## Yang dipertahankan dari v79
- Daftar Produk bot maksimal 10 produk per halaman + Sebelumnya/Selanjutnya.
- Stok supplier ProdSeller tampil seperti stok ready.
- Marketplace dan Mini App reseller/dashboard v79.
- Produk/varian, promo, voucher, flash sale, PO, wallet, referral, top up, broadcast, banner, dan Cara Order.
- Tombol bot berwarna dan cache singkat untuk respon bot.

## Pembayaran Link Auto Order
- QRIS muncul langsung sebagai gambar di bot.
- Tidak ada tombol `Buka Halaman Pembayaran`.
- Provider ditampilkan sebagai `QRIS`, bukan `AutoGoPay`.
- Setelah bayar, user menekan `Cek Pembayaran`.
- Status AutoGoPay juga diperiksa otomatis setiap 30 detik berdasarkan `transaction_id`.
- Callback AutoGoPay tidak wajib dan tidak perlu diubah walaupun API key yang sama dipakai bot lain.
- Invoice lokal bot dipertahankan; `transaction_id` AutoGoPay disimpan terpisah.
- Polling maksimal default 30 kali × 30 detik (±15 menit), sesuai masa aktif invoice.
- Top up saldo memakai alur QRIS yang sama.
- Marketplace juga tidak menampilkan tombol checkout eksternal.

## Environment variable baru
```env
JOB_RUNNER_SECRET=rahasia_worker_yang_panjang
PAYMENT_POLL_INTERVAL_SECONDS=30
PAYMENT_POLL_MAX_ATTEMPTS=30
```

`JOB_RUNNER_SECRET` disarankan berbeda dari `WEBHOOK_SECRET` dan `CRON_SECRET`.

## Database
Tidak ada SQL/migration baru untuk update v79 → v80.
