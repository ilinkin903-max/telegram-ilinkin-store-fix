# v63 — Marketplace & Dashboard Polish

v63 dibuat dari paket terbaru v62. Seluruh perlindungan stok atomik, payment recovery, keamanan Mini App, AutoGoPay, promo, serta QRIS v62 tetap dipertahankan.

## Marketplace

- Kartu Flash Sale menggunakan tinggi baris yang konsisten sehingga nama produk, varian, harga, dan jumlah terjual sejajar.
- Produk tanpa nama varian tetap menyisakan ruang internal agar posisi harga tidak naik.
- Kontrol pengurutan pada HP dipendekkan dan label “Urutkan” dihapus agar sejajar dengan judul serta jumlah produk katalog.
- Empat keunggulan toko dipindahkan ke footer tepat setelah deskripsi Marketplace.
- Link grup/channel dibuat sebagai blok biru khusus dengan logo Telegram.
- Riwayat pesanan menampilkan transaksi administratif yang dibatalkan sebagai “DIBATALKAN”.

## Dashboard reseller

- Teks bantuan yang berulang pada pencarian, Promo, dan Voucher dihapus.
- Status penjualan dipindahkan ke kanan atas kartu.
- Status `COMPLETED` dapat diubah menjadi `CANCELED` melalui dialog konfirmasi, dan dapat dikembalikan lagi ke `COMPLETED`.
- Status `CANCELED` diberi warna merah.
- Perubahan status bersifat administratif; produk atau stok yang telah dikirim tidak dikembalikan otomatis.
- Tampilan Users diringkas menjadi kartu padat berisi identitas, jumlah transaksi, total belanja, dan tombol hapus.
- Pengaturan Toko, Banner Promosi, dan Media `/start` menjadi halaman/submenu terpisah seperti Lisensi, Statistik, Backup, dan Maintenance.

## Bot Telegram

- Pesan `/start` memakai HTML escaping sehingga nama `iLink.in Store` tidak lagi tampil sebagai `iLink\\.in Store`.
- Riwayat dan pengecekan pesanan mengenali status `COMPLETED` dan `CANCELED`.

## Database

Upgrade dari v62 memerlukan:

```text
supabase/update-v63-ui-order-status.sql
```

Migration menambahkan:

- `transactions.status`
- `transactions.canceled_at`
- `transactions.status_updated_at`
- constraint status `completed` / `canceled`
- index status dan tanggal transaksi

Instalasi baru cukup menggunakan `supabase/schema.sql` terbaru.
