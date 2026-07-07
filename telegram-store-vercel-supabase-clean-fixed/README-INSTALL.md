# Telegram Store Vercel Supabase - Admin UI v22

## Update v22

- Hasil polling broadcast bisa dilihat oleh admin.
- Data polling bisa dihapus dari Mini App atau command `/polling` agar database tidak penuh.
- Broadcast polling tidak langsung terkirim. Admin kirim/forward polling ke bot, lalu klik tombol konfirmasi.
- Parser varian aman untuk karakter `-`, `|`, `:`, `;` dan teks multi-baris di deskripsi/SnK.
- Omset hari ini dan grafik memakai timezone WIB / Asia Jakarta.

## SQL wajib dijalankan

Jalankan `supabase/update-owner-tools.sql` di Supabase SQL Editor.

## Deploy

1. Upload isi ZIP ke GitHub.
2. Redeploy Vercel.
3. Setelah Ready, buka ulang webhook:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123
```

Sesuaikan `abc123` dengan `WEBHOOK_SECRET` kamu.

## Cara pakai polling

1. Admin kirim/forward polling ke bot.
2. Bot menampilkan preview.
3. Klik **Broadcast Polling**.
4. Lihat hasil di Mini App tab **Polling** atau kirim command:

```text
/polling
```

Di hasil polling tersedia tombol hapus untuk membersihkan database.
