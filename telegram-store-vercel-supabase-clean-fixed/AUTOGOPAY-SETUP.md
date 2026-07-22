# Setup AutoGoPay untuk iLink.in Store — v56

## Environment Variables

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=salin_dari_autogopay_settings
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
WEBHOOK_SECRET=buat_rahasia_random_tanpa_spasi
```

API Key tidak perlu dan tidak boleh dimasukkan ke kode frontend.

## SQL

Jalankan:

`supabase/update-v55-autogopay.sql`

## Callback otomatis

Setelah redeploy:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA
```

Callback yang dipasang:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

## Alur pembayaran

1. Bot meminta AutoGoPay membuat QRIS.
2. AutoGoPay mengembalikan `transaction_id`, `order_id`, `qr_string`, dan `checkout_url`.
3. Pembeli membayar QRIS.
4. AutoGoPay mengirim webhook bertanda tangan HMAC-SHA256.
5. Bot mencocokkan transaction ID dan nominal.
6. Stok dipotong satu kali.
7. Produk dan notifikasi transaksi dikirim otomatis.


## Jika muncul error verifikasi callback 400

Gunakan v56, redeploy, pastikan `/api/payment-webhook` menampilkan versi `v56-autogopay-callback-probe-fix`, lalu jalankan kembali `/api/setup-autogopay?secret=...`. Probe verifikasi akan dibalas HTTP 200 tanpa memproses order, sedangkan webhook transaksi nyata tetap wajib menggunakan signature.
