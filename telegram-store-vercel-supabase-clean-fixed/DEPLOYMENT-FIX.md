# Perbaikan Error npm di Vercel

> Catatan v62: panduan ini hanya membahas npm. Upgrade dari v61/v60 tetap mewajibkan `supabase/update-v62-security-reliability.sql` sebelum deploy.

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

Environment variable lama tidak perlu dihapus. Tambahkan `CRON_SECRET`, pastikan `MINIAPP_DEV_MODE=false`, dan jalankan SQL v62 yang disebutkan pada `README-INSTALL.md`.
