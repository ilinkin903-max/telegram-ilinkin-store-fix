# Perbaikan Error npm di Vercel

> Catatan v60: panduan ini hanya membahas npm. Fitur modal dan profit tetap mewajibkan `supabase/update-v60-profit-modal.sql`.

Error yang diperbaiki:

```text
npm error Exit handler never called!
Error: Command "npm install" exited with 1
```

## File penting yang berubah

- `package.json`
- `package-lock.json`
- `.npmrc`
- `VERSION.txt`

## Setelah mengunggah file ke GitHub

1. Buka Vercel.
2. Pilih project `telegram-ilinkin-store-fix`.
3. Buka **Settings → Build and Deployment**.
4. Pastikan **Node.js Version** adalah `20.x`. Nilai pada `package.json` juga akan mengunci deployment ke Node.js 20.
5. Buka **Deployments**.
6. Klik menu tiga titik pada deployment terakhir.
7. Pilih **Redeploy**.
8. Nonaktifkan penggunaan build cache atau pilih **Redeploy without cache**.
9. Tunggu sampai status **Ready**.

Environment variable lama tidak perlu dihapus. Untuk fitur v60, tetap jalankan SQL yang disebutkan pada `README-INSTALL.md`.
