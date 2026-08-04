# Setup Referral, Saldo, Top Up, dan Notifikasi Channel v66

## 1. Database

Untuk pengguna v65, jalankan SQL tambahan berikut:

```text
supabase/update-v66-referral-notifications-fix.sql
```

Urutan lengkap database lama:

```text
supabase/update-v62-security-reliability.sql
supabase/update-v63-ui-order-status.sql
supabase/update-v64-percentage-discount.sql
supabase/update-v65-referral-wallet-topup.sql
supabase/update-v66-referral-notifications-fix.sql
```

## 2. Referral

Buka:

```text
Reseller Dashboard → Pengaturan → Saldo, Referral & Top Up
```

Atur:

- Referral: Aktif;
- hadiah per undangan lebih dari Rp0;
- mode `Langsung saat pengguna membuka /start` atau `Setelah pembelian pertama`.

Pastikan:

```env
BOT_USERNAME=username_bot_tanpa_tanda_at
```

Link user otomatis menjadi:

```text
https://t.me/BOT_USERNAME?start=ref_KODE_USER
```

v66 memperbaiki akun yang sudah pernah membuka bot sebelum fitur referral dipasang. Akun tersebut masih dapat memakai link referral selama belum memiliki pengundang dan belum pernah bertransaksi.

## 3. Notifikasi channel

Tambahkan pada Vercel Production:

```env
WALLET_CHANNEL=@username_channel_log
```

Alternatif untuk channel privat:

```env
WALLET_CHANNEL=-1001234567890
```

Jika variabel ini tidak diisi, sistem otomatis menggunakan `CHANNEL_LOG`.

Bot harus:

- sudah dimasukkan ke channel;
- menjadi admin atau memiliki izin mengirim pesan.

Channel akan menerima notifikasi bonus referral dan top up berhasil. Notifikasi tidak dikirim ulang ketika webhook atau pemeriksaan pembayaran yang sama masuk lebih dari sekali.

## 4. Top Up

Top up memakai provider pembayaran aktif. Pastikan callback provider atau `payment-cron` berfungsi. User dapat memakai:

```text
/topup
```

Saldo yang dibeli masuk ke **Saldo Utama**. Fee QRIS tidak masuk ke saldo.

## 5. Pengujian referral

1. Atur referral aktif, mode langsung, dan bonus lebih dari Rp0.
2. Salin link referral dari akun A.
3. Buka link menggunakan akun B yang belum pernah bertransaksi.
4. Tekan **Start** pada akun B.
5. Akun B harus menerima konfirmasi referral berhasil.
6. Saldo Referral akun A bertambah satu kali.
7. Akun A menerima pesan bonus.
8. Channel menerima notifikasi bonus.
9. Jalankan `/start` ulang pada akun B; bonus tidak boleh bertambah lagi.

Akun B yang sudah pernah membeli produk memang tidak dapat dipasangkan ke referral baru.

## 6. Pengujian top up

1. Buat top up baru.
2. Bayar QRIS sesuai total.
3. Pastikan Saldo Utama bertambah.
4. Pastikan user menerima notifikasi.
5. Pastikan channel menerima notifikasi top up.
