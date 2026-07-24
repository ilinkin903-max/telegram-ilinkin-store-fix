# AutoGoPay Callback Fix — v60

AutoGoPay memverifikasi callback ketika URL disimpan. v60 mendaftarkan URL:

```text
https://DOMAIN-ANDA/api/payment-webhook?provider=autogopay&verify=1
```

Request verifikasi tanpa signature dibalas HTTP 200 dan tidak memproses order. Webhook transaksi asli tetap wajib memakai `X-Signature` HMAC-SHA256 yang valid.

## Langkah

1. Deploy v60 dan tunggu Ready.
2. Buka `/api/payment-webhook`; pastikan versi `v60-profit-cost-autogopay-fix`.
3. Buka `/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA`.
4. Pastikan respons `ok: true`.
5. Uji menggunakan invoice baru.

Jika masih 502, lihat `callback_preflight`, `attempts`, dan Vercel Function Logs pada respons setup.
