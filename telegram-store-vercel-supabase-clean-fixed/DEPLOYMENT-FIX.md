# Perbaikan Error npm di Vercel

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

Tidak ada SQL baru dan environment variable lama tidak perlu dihapus.
