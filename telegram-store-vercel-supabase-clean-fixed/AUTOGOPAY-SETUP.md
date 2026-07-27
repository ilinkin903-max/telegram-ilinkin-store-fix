# Setup AutoGoPay v62

1. Untuk database yang sudah memakai v60/v61, jalankan `supabase/update-v62-security-reliability.sql`.
2. Tambahkan `PAYMENT_PROVIDER=autogopay`, `AUTOGOPAY_API_KEY`, `WEBHOOK_SECRET`, `CRON_SECRET`, dan URL publik pada Vercel Production.
3. Pastikan `MINIAPP_DEV_MODE=false` atau hapus dari Production.
4. Deploy v62 dan buka `/api/payment-webhook`.
5. Pastikan versi `v63-marketplace-dashboard-polish` dan provider `autogopay`.
6. Daftarkan callback melalui:

```text
/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA
```

Callback menggunakan:

```text
/api/payment-webhook?provider=autogopay&verify=1
```

Request probe dibalas HTTP 200 tanpa memproses order. Payload pembayaran asli tetap harus lolos signature HMAC dan diverifikasi ulang ke gateway sebelum fulfillment.

Untuk pemulihan pembayaran yang webhook-nya terlambat/gagal, panggil setiap 1–2 menit:

```text
POST /api/payment-cron
Authorization: Bearer CRON_SECRET_ANDA
```
