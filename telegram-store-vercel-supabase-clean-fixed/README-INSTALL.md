# iLink.in Store v66 — Referral Fix & Notifikasi Channel

v66 menggunakan v65 sebagai dasar. Seluruh fitur marketplace, saldo, top up, AutoGoPay, promo, Flash Sale, broadcast, dan dashboard reseller tetap dipertahankan.

## Perbaikan utama

Saldo referral v65 dapat gagal masuk saat pengujian menggunakan akun yang sudah pernah membuka bot sebelum v65. Fungsi lama langsung menganggap akun tersebut sebagai user lama dan tidak memproses kode referral.

v66 memperbaikinya:

- user lama yang belum pernah bertransaksi dan belum memiliki pengundang dapat memakai link referral;
- bonus referral tetap hanya masuk satu kali;
- user yang sudah pernah bertransaksi tidak dapat memasang referral baru;
- user mendapat konfirmasi ketika referral berhasil;
- channel menerima notifikasi bonus referral dan top up berhasil.

## 1. Jalankan SQL v66

Buka:

```text
Supabase → SQL Editor → New query
```

Jalankan:

```text
supabase/update-v66-referral-notifications-fix.sql
```

SQL v65 harus sudah pernah dijalankan. Urutan lengkap:

```text
supabase/update-v62-security-reliability.sql
supabase/update-v63-ui-order-status.sql
supabase/update-v64-percentage-discount.sql
supabase/update-v65-referral-wallet-topup.sql
supabase/update-v66-referral-notifications-fix.sql
```

Untuk instalasi baru, `supabase/schema.sql` sudah membundel fungsi v66.

## 2. Atur channel notifikasi

Tambahkan di Vercel Production:

```env
WALLET_CHANNEL=@username_channel
```

Channel privat juga dapat menggunakan ID seperti:

```env
WALLET_CHANNEL=-1001234567890
```

Jika tidak diisi, sistem memakai `CHANNEL_LOG`. Pastikan bot menjadi admin atau memiliki izin mengirim pesan ke channel.

## 3. Periksa pengaturan referral

Buka:

```text
Reseller Dashboard → Pengaturan → Saldo, Referral & Top Up
```

Pastikan:

- Status Referral: Aktif;
- Hadiah per Undangan: lebih dari Rp0;
- Mode: langsung atau pembelian pertama;
- `BOT_USERNAME` di Vercel sudah benar tanpa tanda `@`.

## 4. Deploy

1. Unggah seluruh isi folder proyek ke root GitHub.
2. Ganti file lama dan commit.
3. Redeploy Vercel tanpa build cache.
4. Tunggu status **Ready**.
5. Buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Versi harus menampilkan:

```json
{
  "version": "v66-referral-credit-channel-notification"
}
```

## 5. Tes referral

Gunakan akun pengundang A dan akun undangan B. Akun B boleh sudah pernah membuka bot, tetapi harus belum pernah bertransaksi dan belum memiliki pengundang.

1. Salin link referral akun A.
2. Buka link pada akun B dan tekan **Start**.
3. Akun B menerima pesan **REFERRAL BERHASIL DIGUNAKAN** atau **REFERRAL BERHASIL TERHUBUNG**.
4. Saldo Referral akun A bertambah satu kali.
5. Akun A dan channel menerima notifikasi.

Menjalankan link yang sama kembali tidak menambah saldo lagi.

## 6. Tes top up

Buat invoice top up baru dan bayar sesuai nominal. Setelah pembayaran terverifikasi:

- Saldo Utama user bertambah;
- user menerima pesan **TOP UP BERHASIL**;
- channel menerima pesan **TOP UP SALDO BERHASIL**.

Top up otomatis tetap membutuhkan webhook gateway atau `payment-cron` yang berfungsi.

## Status pengujian

- Pemeriksaan sintaks JavaScript: berhasil.
- Pengujian lokal: **99/99 berhasil**.
- Pengujian memakai stub dependency lokal karena registry npm lingkungan pengujian tidak lengkap.
- Folder stub tidak disertakan dalam ZIP final.
- SQL belum dijalankan pada Supabase produksi.
