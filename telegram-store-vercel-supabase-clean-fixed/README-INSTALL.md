# Telegram Store Vercel Supabase - Admin UI v10

Upload isi folder ini ke root repository GitHub, lalu Redeploy di Vercel.

## Setelah deploy
Buka ulang webhook:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123
```

Sesuaikan `abc123` dengan `WEBHOOK_SECRET` kamu.

## Catatan v10
- Edit Produk sekarang bisa menambah varian baru.
- Deskripsi/SnK produk dan varian bisa multi-baris.
- Stok varian tetap dikelola dari tombol Stok/Kelola.
- Di bot Telegram, pilih varian langsung menuju pengaturan jumlah, tidak lewat halaman tambahan.
- Tombol kembali di daftar produk, varian, stok, riwayat, dan konfirmasi memakai edit pesan supaya chat tidak penuh.


## Update v12
- Saat pesanan dibatalkan, pesan QRIS/gambar QR dihapus lalu bot mengirim ulang halaman awal seperti /start.
- Gambar yang diisi pada menu Toko untuk media /start akan muncul samar sebagai background Admin Dashboard.
