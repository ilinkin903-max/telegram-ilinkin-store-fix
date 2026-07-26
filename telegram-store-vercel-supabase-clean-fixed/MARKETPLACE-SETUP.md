# Pengaturan Marketplace v62

Fitur marketplace dari v61 tetap tersedia: tema biru, logo URL, banner 2,39:1, flash sale satu baris, promo varian, konfirmasi checkout, bubble detail pembayaran, unduh QRIS, serta pilihan produk Bot + Marketplace atau Marketplace saja.

## Upgrade database

Database v61/v60 wajib menjalankan:

```text
supabase/update-v62-security-reliability.sql
```

Instalasi baru cukup menjalankan `supabase/schema.sql`.

## Pengaturan utama

```text
Dashboard Reseller → Pengaturan
```

Submenu vertikal tetap berisi Pengaturan Toko, Banner Promosi, Media `/start`, Lisensi, Statistik Lengkap, Backup, dan Maintenance.

## QRIS

Unduhan QRIS sekarang meminta token singkat dari server. URL unduhan tidak lagi membawa `initData` Telegram. Atur `QR_DOWNLOAD_SECRET` di Vercel atau biarkan sistem memakai `WEBHOOK_SECRET`.

## Pembayaran tertunda

Selain webhook dan pengecekan dari browser, v62 menyediakan `/api/payment-cron`. Jalankan endpoint ini setiap 1–2 menit memakai `Authorization: Bearer CRON_SECRET` agar pesanan yang sudah dibayar tetap diselesaikan saat pembeli menutup Marketplace.
