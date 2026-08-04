# iLink.in Store v65 — Referral, Saldo & Top Up

v65 merupakan pembaruan dari v64. Seluruh fitur marketplace, AutoGoPay, stok atomik, promo per varian, Flash Sale, QRIS, broadcast, dan dashboard reseller tetap dipertahankan.

## Fitur baru

- Setiap user mendapat **Saldo Utama** dan **Saldo Referral** dalam rupiah.
- Link referral otomatis berbentuk `https://t.me/BOT_USERNAME?start=ref_KODE`.
- Hadiah referral dapat dipilih:
  - langsung ketika user baru pertama kali membuka bot; atau
  - setelah user baru menyelesaikan pembelian pertama.
- User dapat top up Saldo Utama melalui QRIS provider pembayaran aktif.
- Checkout dapat dibayar dengan gabungan saldo: **Saldo Utama lebih dahulu**, kemudian **Saldo Referral**.
- Owner dapat mengubah kedua saldo setiap user melalui menu **Users → Atur Saldo**.
- Semua top up, bonus referral, pembayaran saldo, dan koreksi owner dicatat di `wallet_ledger`.
- Proses saldo, stok, top up, dan transaksi menggunakan RPC database atomik untuk mencegah saldo atau stok terpotong dua kali.

## 1. Jalankan SQL v65

Untuk database yang sudah memakai v64, buka:

```text
Supabase → SQL Editor → New query
```

Jalankan seluruh isi file:

```text
supabase/update-v65-referral-wallet-topup.sql
```

SQL v65 menambahkan:

- kolom saldo dan referral pada `bot_users`;
- tabel `wallet_ledger`;
- tabel `pending_topups`;
- kolom metode pembayaran pada pending order dan transaksi;
- RPC registrasi referral;
- RPC koreksi saldo owner;
- RPC top up idempoten;
- RPC checkout saldo atomik;
- trigger bonus referral setelah pembelian pertama.

SQL aman dijalankan berulang kali. Untuk instalasi baru, `supabase/schema.sql` sudah membundel v62 dan v65. Tetap jalankan SQL v63 dan v64 setelahnya apabila fitur status penjualan dan normalisasi diskon belum ada.

Urutan lengkap untuk database lama yang belum pernah diperbarui:

```text
supabase/update-v62-security-reliability.sql
supabase/update-v63-ui-order-status.sql
supabase/update-v64-percentage-discount.sql
supabase/update-v65-referral-wallet-topup.sql
```

## 2. Environment Variables

Tidak ada secret baru khusus referral. Pertahankan konfigurasi Production yang sudah digunakan.

Referral link memerlukan:

```env
BOT_USERNAME=username_bot_tanpa_tanda_at
```

Top up otomatis memakai provider yang aktif, misalnya AutoGoPay:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app

PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller

WEBHOOK_SECRET=RAHASIA_SETUP_ANDA
CRON_SECRET=RAHASIA_CRON_ANDA
QR_DOWNLOAD_SECRET=RAHASIA_UNDUH_QRIS_ANDA
MINIAPP_DEV_MODE=false
```

Top up dapat selesai otomatis hanya jika callback pembayaran atau `payment-cron` bekerja. Tombol **Cek Top Up** tetap tersedia sebagai cadangan.

## 3. Upload dan deploy

1. Ekstrak ZIP v65.
2. Unggah seluruh isi folder proyek ke root repository GitHub.
3. Ganti file lama dan commit.
4. Buka **Vercel → Deployments → Redeploy**.
5. Pilih redeploy tanpa build cache.
6. Tunggu hingga status **Ready**.
7. Buka endpoint berikut dan pastikan versinya v65:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Hasil harus memuat:

```json
{
  "version": "v65-referral-wallet-topup"
}
```

## 4. Mengatur referral dan top up

Buka:

```text
Reseller Dashboard
→ Pengaturan
→ Saldo, Referral & Top Up
```

Tersedia pengaturan:

- Status Referral;
- hadiah rupiah per undangan;
- hadiah langsung atau setelah pembelian pertama;
- aktif/nonaktif Top Up;
- aktif/nonaktif pembayaran produk dengan saldo;
- minimum dan maksimum top up.

Mode **langsung** berarti orang yang diundang tidak perlu melakukan pembelian pertama. Hadiah masuk ketika akun Telegram tersebut pertama kali membuka bot melalui link referral.

## 5. Mengedit saldo user

Buka:

```text
Reseller Dashboard → Users → Atur Saldo
```

Owner dapat menetapkan:

- Saldo Utama;
- Saldo Referral;
- catatan penyesuaian.

Sistem menyimpan nilai saldo baru dan mencatat selisihnya ke ledger. Nilai tidak boleh negatif.

## 6. Alur user

User dapat membuka:

```text
/start
/saldo
/referral
/topup
```

Menu **Saldo, Top Up & Referral** menampilkan:

- Saldo Utama;
- Saldo Referral;
- total saldo;
- jumlah undangan;
- link referral;
- mutasi terbaru;
- tombol Top Up dan Belanja dengan Saldo.

Saat checkout, pilihan pembayaran menjadi:

```text
Bayar dengan Saldo
Bayar dengan QRIS
Top Up Saldo
```

Tombol bayar dengan saldo hanya muncul ketika total Saldo Utama + Saldo Referral mencukupi.

## 7. Aturan keamanan referral

- Satu akun Telegram hanya dapat memberikan satu bonus referral.
- User lama yang membuka link referral lain tidak mengubah pengundangnya.
- Referral diri sendiri ditolak.
- Hadiah dan nominal disimpan sebagai snapshot saat user mendaftar.
- Bonus pembelian pertama diproses di database dan tidak dapat dikreditkan dua kali.
- Top up dan checkout saldo dikunci secara atomik.

## 8. Pengujian setelah deployment

1. Atur hadiah referral, misalnya Rp500, dengan mode langsung.
2. Buka link referral menggunakan akun Telegram baru.
3. Pastikan Saldo Referral pengundang bertambah satu kali.
4. Ulangi `/start` pada akun baru dan pastikan bonus tidak bertambah lagi.
5. Ubah mode menjadi pembelian pertama dan uji akun baru berikutnya.
6. Lakukan top up kecil dan pastikan Saldo Utama bertambah setelah pembayaran selesai.
7. Beli produk menggunakan Saldo Utama saja.
8. Beli produk menggunakan gabungan Saldo Utama dan Saldo Referral.
9. Ubah saldo user dari dashboard dan periksa mutasi saldo.
10. Uji webhook dan `payment-cron` agar top up tetap terdeteksi saat user menutup bot.

## Status pengujian

- Pemeriksaan sintaks JavaScript: berhasil.
- Unit/static tests: **93/93 berhasil**.
- Pemeriksaan ID HTML dashboard: tidak ada ID ganda.
- Pengujian lokal menggunakan stub dependency sementara karena registry paket eksternal tidak tersedia di lingkungan pengujian.
- Stub tidak disertakan dalam ZIP final.
- SQL ditinjau secara statis dan dibundel ke schema, tetapi belum dijalankan pada Supabase produksi.
- Transaksi nyata Telegram, AutoGoPay, Supabase, dan Vercel tetap perlu dites menggunakan kredensial aktif Anda.
