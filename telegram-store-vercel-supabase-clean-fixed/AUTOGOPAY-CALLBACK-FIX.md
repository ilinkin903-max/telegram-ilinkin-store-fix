# AutoGoPay Callback — v62

Endpoint callback:

```text
/api/payment-webhook?provider=autogopay&verify=1
```

v62 mempertahankan perbaikan probe callback v60/v61 dan menambah fulfillment stok atomik. Verifikasi callback AutoGoPay mendapat HTTP 200, sedangkan event pembayaran asli harus memiliki signature valid, transaction ID yang cocok, invoice yang cocok, dan nominal yang cocok.

Urutan pemasangan:

1. Jalankan SQL v62.
2. Deploy v62 dan tunggu Ready.
3. Pastikan `/api/payment-webhook` menampilkan `v62-security-reliability-fix`.
4. Jalankan `/api/setup-autogopay?secret=...`.
5. Aktifkan `/api/payment-cron` melalui scheduler dengan header Bearer `CRON_SECRET`.
6. Buat invoice baru untuk test.
