# CATATAN v80

Dokumen di bawah adalah catatan legacy. Pada v80, callback AutoGoPay **tidak wajib**. Gunakan polling `transaction_id` setiap 30 detik seperti dijelaskan di `AUTOGOPAY-SETUP.md`. Jangan mengubah callback jika API key yang sama dipakai bot lain.

---

# AutoGoPay Callback — v62

Endpoint callback:

```text
/api/payment-webhook?provider=autogopay&verify=1
```

v62 mempertahankan perbaikan probe callback v60/v61 dan menambah fulfillment stok atomik. Verifikasi callback AutoGoPay mendapat HTTP 200, sedangkan event pembayaran asli harus memiliki signature valid, transaction ID yang cocok, invoice yang cocok, dan nominal yang cocok.

Urutan pemasangan:

1. Jalankan SQL v62.
2. Deploy v62 dan tunggu Ready.
3. Pastikan `/api/payment-webhook` menampilkan `v63-marketplace-dashboard-polish`.
4. Jalankan `/api/setup-autogopay?secret=...`.
5. Aktifkan `/api/payment-cron` melalui scheduler dengan header Bearer `CRON_SECRET`.
6. Buat invoice baru untuk test.
