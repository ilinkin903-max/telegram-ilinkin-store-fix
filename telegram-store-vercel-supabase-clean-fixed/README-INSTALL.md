# v56 — AutoGoPay Callback Verification Fix

Versi ini memperbaiki error callback AutoGoPay yang mengharapkan HTTP 200 ketika melakukan verifikasi URL. Tidak ada SQL baru.

Baca juga: `AUTOGOPAY-CALLBACK-FIX.md`.

# iLink.in Store v55 — AutoGoPay QRIS Integration

Versi ini melanjutkan seluruh fitur Marketplace v54 dan mengganti/menambahkan payment gateway **AutoGoPay** untuk QRIS otomatis.

## Perubahan v55

- Mendukung `PAYMENT_PROVIDER=autogopay` tanpa menghapus dukungan Pakasir.
- QRIS dibuat melalui `POST /qris/generate` AutoGoPay.
- Menyimpan `transaction_id`, `order_id`, QR string, checkout URL, dan waktu kedaluwarsa.
- Pembayaran otomatis diproses dari webhook AutoGoPay yang diverifikasi dengan HMAC-SHA256.
- Pengecekan manual dan polling Marketplace menggunakan endpoint status AutoGoPay.
- Produk dikirim otomatis setelah status `settlement`.
- Tombol **Buka Halaman Pembayaran** muncul bila AutoGoPay mengirim `checkout_url`.
- Tombol unduh QRIS tetap menggunakan file PNG dari server bot.
- Pembatalan invoice akan mencoba membatalkan QRIS AutoGoPay.
- Notifikasi admin **✅ PESANAN SELESAI** tetap dipertahankan.
- Endpoint baru `/api/setup-autogopay` untuk memasang callback URL secara otomatis.

## 1. Persiapan AutoGoPay

1. Login ke `https://autogopay.site/settings`.
2. Pastikan akun AutoGoPay aktif dan GoPay Merchant/Business sudah terhubung.
3. Salin API Key dari halaman Settings.
4. Jangan menaruh API Key di frontend, GitHub publik, atau mengirimkannya melalui chat.

## 2. Jalankan SQL wajib

Buka:

`Supabase → SQL Editor → New query`

Jalankan file:

`supabase/update-v55-autogopay.sql`

SQL ini menambah kolom:

- `payment_provider`
- `provider_transaction_id`
- `provider_checkout_url`

## 3. Environment Variables Vercel

Buka:

`Vercel → Project → Settings → Environment Variables`

Tambahkan:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller
WEBHOOK_SECRET=RAHASIA_RANDOM_TANPA_SPASI
```

Nilai pada kolom Vercel diisi **hanya nilainya**, tidak perlu menulis `NAMA_VARIABEL=` pada kolom Value.

Variabel Pakasir lama boleh dibiarkan. Sistem akan memakai AutoGoPay karena `PAYMENT_PROVIDER=autogopay`.

## 4. Upload dan deploy

1. Upload seluruh isi folder v55 ke repository GitHub.
2. Commit perubahan.
3. Redeploy Vercel tanpa cache.
4. Tunggu status deployment menjadi `Ready`.

## 5. Pasang webhook Telegram

Buka di browser dan ganti `ISI_WEBHOOK_SECRET` dengan nilai `WEBHOOK_SECRET` di Vercel:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=ISI_WEBHOOK_SECRET
```

## 6. Pasang callback AutoGoPay

Setelah deployment `Ready`, buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/setup-autogopay?secret=ISI_WEBHOOK_SECRET
```

Jika berhasil, respons menampilkan:

```json
{
  "ok": true,
  "callback_url": "https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook",
  "redirect_url": "https://telegram-ilinkin-store-fix.vercel.app"
}
```

Endpoint tersebut mengirim callback URL ke AutoGoPay menggunakan API Key yang tersimpan aman di Vercel.

## 7. Pemeriksaan endpoint

Buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Pastikan respons berisi:

```json
{
  "ok": true,
  "active_provider": "autogopay"
}
```

## 8. Uji transaksi

1. Buat transaksi baru dari bot atau Marketplace.
2. Pastikan QRIS dan tombol **Buka Halaman Pembayaran** muncul.
3. Bayar sesuai nominal tepat.
4. Tunggu webhook atau polling mendeteksi `settlement`.
5. Produk harus terkirim ke Telegram dan log **PESANAN SELESAI** masuk ke channel admin.

Gunakan invoice baru setelah v55. Invoice Pakasir lama tidak memiliki `provider_transaction_id` AutoGoPay.

## Keamanan

- Webhook AutoGoPay wajib memiliki header signature HMAC-SHA256.
- Signature diverifikasi menggunakan `AUTOGOPAY_API_KEY`.
- `transaction_id` dan nominal harus cocok dengan pending order.
- Proses fulfillment bersifat idempotent agar webhook ganda tidak memotong stok dua kali.
- API Key hanya berada di Environment Variables server.

## Troubleshooting

### `AUTOGOPAY_API_KEY belum diisi`

Pastikan variabel dibuat untuk **Production**, lalu redeploy.

### `Secret setup salah`

Nilai setelah `?secret=` harus sama persis dengan `WEBHOOK_SECRET`, tanpa tanda kutip dan tanpa spasi.

### `ID transaksi AutoGoPay tidak ditemukan`

Jalankan SQL v55 dan buat invoice baru.

### Webhook tidak mengirim produk

- Buka `/api/payment-webhook` dan pastikan provider aktif `autogopay`.
- Jalankan kembali `/api/setup-autogopay?secret=...`.
- Periksa Runtime Logs Vercel untuk pesan `Signature AutoGoPay tidak valid` atau `Nominal pembayaran tidak cocok`.
- Pastikan AutoGoPay masih aktif dan GoPay Merchant tetap terhubung.
