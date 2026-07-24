# v60 — Ringkasan Perubahan

## AutoGoPay

- Callback didaftarkan ke `/api/payment-webhook?provider=autogopay&verify=1`.
- Setup melakukan preflight POST dan hanya lanjut jika callback membalas HTTP 200.
- Payload verifikasi tanpa signature di-ACK tanpa memproses order.
- Payload transaksi nyata dengan signature tidak valid tetap ditolak.
- Respons setup mencantumkan hasil preflight dan setiap percobaan API AutoGoPay.

## Modal dan profit

- Modal default dapat diisi pada produk atau varian.
- Modal disalin saat checkout sebagai snapshot.
- Setiap transaksi dapat dikoreksi melalui tombol **Atur Modal**.
- Profit dihitung dari `total pembayaran - fee - modal supplier`.
- Transaksi tanpa modal ditandai **Belum diatur** agar tidak dianggap untung penuh.
- Dashboard menampilkan profit harian, bulanan, total, dan rincian per order.

## Dashboard

- Lisensi, Statistik Lengkap, Backup, dan Maintenance ditempatkan di dalam **Pengaturan Toko**.

## Database

Jalankan `supabase/update-v60-profit-modal.sql` sebelum menggunakan fitur modal dan profit.
