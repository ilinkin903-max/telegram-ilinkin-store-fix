# iLink.in Store v67 — Saldo & Pembayaran Marketplace

v67 menggunakan v66 sebagai dasar. Fitur referral, dua jenis saldo, top up QRIS, notifikasi channel, AutoGoPay, promo, Flash Sale, broadcast, dan dashboard reseller tetap dipertahankan.

## Perubahan utama

### Saldo di Marketplace

- Saldo pengguna tampil di kanan atas dan segaris dengan logo toko.
- Saldo yang ditampilkan adalah total `Saldo Utama + Saldo Referral`.
- Pada desktop, rincian kedua saldo dapat dilihat melalui tooltip.
- Pada HP, kartu saldo dibuat lebih ringkas agar header tetap rapi.
- Saldo hanya tampil jika Marketplace dibuka dari Telegram dan identitas pengguna berhasil diverifikasi.

### Pilihan pembayaran

Pada konfirmasi checkout, pembeli dapat memilih:

- `QRIS`
- `Saldo Bot`

Pembayaran saldo:

- memakai Saldo Utama terlebih dahulu;
- dilanjutkan Saldo Referral jika Saldo Utama belum cukup;
- memvalidasi ulang harga, promo, voucher, dan stok di server;
- memotong saldo, stok, mencatat transaksi, dan ledger secara atomik melalui fungsi SQL v65;
- langsung mengirim produk ke chat Telegram tanpa membuat QRIS.

QRIS tetap menjadi pilihan awal agar saldo tidak terpotong karena salah klik.

## 1. Prasyarat database

Pastikan SQL berikut sudah berhasil dijalankan secara berurutan:

```text
supabase/update-v62-security-reliability.sql
supabase/update-v63-ui-order-status.sql
supabase/update-v64-percentage-discount.sql
supabase/update-v65-referral-wallet-topup.sql
supabase/update-v66-referral-notifications-fix.sql
```

v67 tidak membutuhkan SQL baru.

Jika muncul error:

```text
relation "public.bot_users" does not exist
```

jalankan:

```text
supabase/repair-bot-users-before-v65-v66.sql
```

lalu jalankan ulang SQL v65 dan v66.

## 2. Periksa pengaturan pembayaran saldo

Buka:

```text
Reseller Dashboard
→ Pengaturan
→ Saldo, Referral & Top Up
```

Pastikan:

```text
Pembayaran produk dengan saldo: Aktif
```

Jika dinonaktifkan, pilihan Saldo Bot pada Marketplace otomatis tidak dapat digunakan.

## 3. Deploy

1. Upload seluruh isi folder proyek ke root repository GitHub.
2. Ganti file lama dan commit.
3. Redeploy Vercel tanpa build cache.
4. Tunggu deployment berstatus `Ready`.
5. Buka endpoint:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Pastikan versi menampilkan:

```json
{
  "version": "v67-marketplace-wallet-payment"
}
```

## 4. Pengujian saldo Marketplace

1. Pastikan user memiliki Saldo Utama atau Saldo Referral.
2. Buka Marketplace melalui tombol Mini App di bot Telegram.
3. Periksa saldo di kanan atas header.
4. Pilih produk dan tekan `Beli Sekarang`.
5. Pilih `Saldo Bot`.
6. Tekan `Bayar Sekarang dengan Saldo`.
7. Pastikan:
   - produk terkirim ke chat Telegram;
   - saldo di header berkurang;
   - transaksi tercatat di dashboard;
   - ledger saldo tercatat di database.

Jika saldo tidak cukup, pilihan Saldo Bot akan dinonaktifkan atau server menolak checkout dengan informasi kekurangan saldo.

## Catatan penting

- Marketplace yang dibuka langsung melalui browser biasa tidak memiliki identitas Telegram. Saldo disembunyikan dan checkout tidak dapat dilakukan.
- Perubahan saldo di bot akan terlihat setelah Marketplace dimuat ulang atau checkout saldo berhasil.
- Tidak ada Environment Variable baru khusus v67.

## Status pengujian

- Pemeriksaan sintaks JavaScript: berhasil.
- Pengujian lokal: **104/104 berhasil**.
- SQL belum dijalankan pada Supabase produksi.
- Pembayaran saldo nyata tetap perlu diuji pada akun Telegram dan Supabase Anda.
