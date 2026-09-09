# Setup AutoGoPay - GoPay dan ShopeePay

Versi v85.2.0 mendukung dua sumber QRIS AutoGoPay untuk checkout baru: GoPay dan ShopeePay. Pilih metode dari Dashboard Owner > Pengaturan > Metode Pembayaran.

## Environment Variables Vercel

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_ANDA
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site

PUBLIC_URL=https://domain-project.vercel.app
WEBHOOK_SECRET=rahasia_webhook
JOB_RUNNER_SECRET=rahasia_worker_lain
CRON_SECRET=rahasia_cron_lain

PAYMENT_POLL_INTERVAL_SECONDS=30
PAYMENT_POLL_MAX_ATTEMPTS=30
```

Tidak ada environment variable terpisah untuk memilih GoPay/ShopeePay. Pilihan disimpan di shop_settings dan dapat diganti kapan saja dari dashboard.

## GoPay

1. Generate QRIS: POST /qris/generate.
2. Sistem menyimpan transaction_id ke pending order/top up.
3. Cek status: POST /qris/status dengan transaction_id.
4. Cancel pending: POST /qris/cancel.

## ShopeePay

1. Pastikan akun ShopeePay di AutoGoPay sudah connected dan token valid.
2. Generate QRIS: POST /shopeepay/qris/create.
3. Sistem menyimpan order_sn sebagai provider_transaction_id.
4. Cek status: GET /shopeepay/qris/status?order_sn=... .
5. Pembayaran dianggap berhasil jika paid=true / order_status=1.
6. Dokumentasi AutoGoPay saat ini tidak mencantumkan endpoint cancel ShopeePay, jadi pembatalan dilakukan lokal dan QR dibiarkan expired.

Dashboard menyediakan tombol Cek Koneksi. Untuk ShopeePay tombol tersebut memanggil GET /shopeepay/status untuk memeriksa connected dan token_valid.

## Pergantian metode

Pergantian GoPay/ShopeePay hanya berlaku untuk invoice baru. Invoice pending lama menyimpan payment_provider-nya sendiri, sehingga tetap diperiksa memakai endpoint metode yang digunakan saat invoice dibuat. Ini mencegah invoice lama rusak ketika owner mengganti metode pembayaran.

## Webhook

Webhook AutoGoPay tetap diverifikasi dengan HMAC-SHA256 menggunakan AUTOGOPAY_API_KEY. Sistem membedakan channel dari payment_method:

- QRIS = GoPay
- QRIS_SHOPEEPAY = ShopeePay

Polling lokal tetap tersedia sebagai recovery bila webhook terlambat.
