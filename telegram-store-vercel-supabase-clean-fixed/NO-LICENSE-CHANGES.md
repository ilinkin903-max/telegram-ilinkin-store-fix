# No-license runtime

Versi ini tidak lagi menggunakan sistem lisensi eksternal.

Perubahan utama:
- `lib/license.js` dihapus.
- Semua `LICENSE_*`/`RENTAL_MANAGER_URL` dihapus dari konfigurasi runtime dan `.env.example`.
- Gate lisensi pada command Telegram, callback, katalog, dan checkout dihapus.
- Endpoint `license-status` dan menu Lisensi pada dashboard owner dihapus.
- Field kompatibilitas marketplace `store_active` selalu `true` dan `store_status` selalu `active`.

Tidak perlu menambahkan environment variable lisensi saat deploy.
