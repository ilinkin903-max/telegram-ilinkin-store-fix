# Setup AutoGoPay v60

Panduan utama berada di `README-INSTALL.md`.

Ringkasnya:

1. Jalankan `supabase/update-v60-profit-modal.sql`.
2. Pastikan Vercel Production memiliki `PAYMENT_PROVIDER=autogopay`, `AUTOGOPAY_API_KEY`, `PUBLIC_URL`, dan `WEBHOOK_SECRET`.
3. Redeploy tanpa cache.
4. Buka `/api/payment-webhook` dan pastikan versi `v61-clean-reseller-dashboard`.
5. Buka `/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA`.
6. Buat invoice baru untuk pengujian.

Callback yang didaftarkan v60 menggunakan:

```text
/api/payment-webhook?provider=autogopay&verify=1
```

Webhook transaksi asli tetap wajib menggunakan signature HMAC-SHA256 yang valid.
