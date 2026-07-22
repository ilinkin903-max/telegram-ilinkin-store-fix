# Perbaikan Callback AutoGoPay v56

## Masalah yang diperbaiki

Saat URL callback disimpan, AutoGoPay dapat mengirim request verifikasi/health-check yang belum membawa transaksi penjualan lengkap. Versi v55 langsung memvalidasi request tersebut sebagai transaksi sehingga endpoint dapat membalas HTTP 400. AutoGoPay menolak URL callback karena proses verifikasi mengharapkan HTTP 200.

v56 membedakan dua jenis request:

1. **Probe verifikasi callback** — dibalas HTTP 200 dan tidak memproses order.
2. **Webhook transaksi nyata** — tetap wajib memiliki `X-Signature` HMAC-SHA256, ID transaksi, dan nominal yang valid sebelum produk dikirim.

## Environment Variables

Pastikan nilai berikut tersedia pada environment **Production**:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app
WEBHOOK_SECRET=RAHASIA_SETUP_ANDA
```

Jangan menambahkan tanda kutip atau spasi di awal/akhir nilai.

## Setelah deployment

1. Upload seluruh isi v56 dan redeploy tanpa cache.
2. Pastikan endpoint berikut menampilkan versi v56:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Respons harus memuat:

```json
{
  "version": "v56-autogopay-callback-probe-fix",
  "active_provider": "autogopay"
}
```

3. Pasang ulang callback:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA
```

4. Gunakan invoice baru untuk pengujian pembayaran.

Tidak ada SQL baru untuk v56.
