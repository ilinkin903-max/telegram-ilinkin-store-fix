# Setup AutoGoPay — Mode Link Auto Order (tanpa callback wajib)

Versi v80 tidak mewajibkan callback AutoGoPay. Ini cocok bila satu API key AutoGoPay dipakai oleh lebih dari satu bot dan callback tidak dapat diganti.

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

## Cara kerja
1. Bot membuat QRIS melalui AutoGoPay.
2. QRIS dikirim sebagai gambar langsung di Telegram.
3. `transaction_id` AutoGoPay disimpan di `pending_orders` atau `wallet_topups`.
4. `/api/payment-poll` memeriksa `/qris/status` setiap 30 detik.
5. User juga dapat menekan tombol **Cek Pembayaran** kapan saja.
6. Jika status sudah dibayar, order diproses atau saldo top up dikreditkan.

## Callback
Jangan membuka `/api/setup-autogopay` bila API key yang sama digunakan bot lain. Endpoint webhook tetap ada untuk kompatibilitas, tetapi alur utama tidak bergantung padanya.

## Recovery
Endpoint `/api/payment-cron` tetap dapat dipanggil oleh scheduler eksternal dengan:

```text
Authorization: Bearer CRON_SECRET
```

Endpoint ini memeriksa ulang invoice/top up pending bila rantai polling sempat terputus.
