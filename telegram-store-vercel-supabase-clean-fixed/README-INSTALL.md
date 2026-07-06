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

## Update v13
- Edit Produk: saat varian aktif, harga/harga grosir/deskripsi/SnK utama disembunyikan seperti Tambah Produk.
- Bot: invoice dan produk setelah pembayaran dibuat menjadi satu pesan ringkas.
- Penjualan: setiap invoice punya tombol Lihat Produk untuk melihat produk yang diterima pembeli di popup.

SQL tambahan wajib dijalankan di Supabase SQL Editor:

```sql
alter table public.transactions add column if not exists delivered_items jsonb not null default '[]'::jsonb;
alter table public.transactions add column if not exists delivered_text text not null default '';
```


## Update v15
- Perbaikan tampilan form varian: field utama non-varian benar-benar disembunyikan saat varian aktif.

## Update v16 - ON/OFF per Varian

Setiap varian produk bisa diaktifkan/nonaktifkan sendiri dari Mini App:

- Buka Produk -> Edit
- Aktifkan/Edit Varian Produk
- Pada setiap kartu varian gunakan tombol ON/OFF
- Varian OFF tidak muncul di pilihan pembelian bot Telegram
- Produk tetap terlihat di Mini App agar admin bisa mengaktifkan varian kembali

Tidak perlu SQL baru karena status varian disimpan di kolom JSON `products.variants`.


## Admin UI v17
- Teks varian di bot disederhanakan menjadi '2 varian'.
- Kode produk utama tidak ditampilkan di kartu produk Mini App.
- Kode produk/varian di Produk Terlaris tidak ditampilkan.
- /start menambahkan tombol Customer Service dan Grup dari pengaturan Mini App.
