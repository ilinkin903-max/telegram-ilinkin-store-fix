# Setup Referral, Saldo, dan Top Up v65

## 1. Database

Jalankan:

```text
supabase/update-v65-referral-wallet-topup.sql
```

setelah SQL v62, v63, dan v64.

## 2. Referral

Buka:

```text
Reseller Dashboard → Pengaturan → Saldo, Referral & Top Up
```

Atur:

- Referral: Aktif;
- hadiah per undangan;
- mode langsung atau pembelian pertama.

Pastikan Environment Variable berikut terisi:

```env
BOT_USERNAME=username_bot_tanpa_tanda_at
```

Link user otomatis menjadi:

```text
https://t.me/BOT_USERNAME?start=ref_KODE_USER
```

## 3. Top Up

Top up memakai provider pembayaran aktif. Tidak ada API key tambahan khusus top up.

Pastikan callback provider dan payment cron telah aktif. User dapat memakai:

```text
/topup
```

Saldo yang dibeli masuk ke **Saldo Utama**. Fee QRIS tidak masuk ke saldo.

## 4. Pembayaran produk

Saat checkout, bot menampilkan:

- Bayar dengan Saldo;
- Bayar dengan QRIS;
- Top Up Saldo.

Sistem mengurangi Saldo Utama lebih dahulu. Jika belum cukup, sisanya diambil dari Saldo Referral.

## 5. Edit saldo owner

Buka:

```text
Reseller Dashboard → Users → Atur Saldo
```

Masukkan Saldo Utama, Saldo Referral, dan catatan. Semua perubahan dicatat dalam ledger.
