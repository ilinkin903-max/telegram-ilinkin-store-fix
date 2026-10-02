# Vercel deploy fix - 2 Oktober 2026

Deployment baru gagal karena project masih mengunci Node.js `20.x` di `package.json`.
Vercel menonaktifkan Node.js 20 untuk deployment baru mulai 1 Oktober 2026.

Perbaikan:
- `package.json` -> `engines.node = "24.x"`
- `package-lock.json` -> root engine disamakan ke `24.x`
- Dokumentasi deployment diperbarui ke Node.js 24

Di Vercel Project Settings, Node.js Version dapat dibiarkan mengikuti `package.json` atau dipilih `24.x`.
