# UPDATE v84.8.0 — Privasi Notifikasi, Stok Marketplace, dan Tombol Nokos

## Notifikasi Transaksi Channel

- Username pembeli pada notifikasi transaksi berhasil dan transaksi PRE-ORDER yang menunggu pengiriman sekarang disamarkan sebagian.
- Contoh: `@usernamepanjang` tampil sebagai `@use***ng`.
- Nama depan atau ID tetap digunakan sebagai fallback bila pembeli tidak mempunyai username Telegram.

## Marketplace

- Label `Otomatis` pada informasi ketersediaan produk workflow diganti menjadi `Stok [jumlah]`.
- Jumlah stok tampil pada kartu produk, badge detail, keterangan jumlah, dan pilihan varian.
- Informasi bahwa pengiriman diproses otomatis tetap dipertahankan pada penjelasan checkout.

## Menu Awal Bot Telegram

- Pengaturan baru **URL / Username Bot Nokos** tersedia di Dashboard Manager → Pengaturan Toko.
- Format yang didukung: `@BotNokos`, `BotNokos`, `t.me/BotNokos`, `telegram.me/BotNokos`, `tg://...`, atau URL HTTP(S) penuh.
- Tombol **Nokos** tampil di sebelah **Daftar Produk**. Jika menu diatur Marketplace saja, tombol Nokos tetap tampil pada baris tersendiri.
- Kosongkan pengaturan untuk menyembunyikan tombol Nokos.
- Label **Saldo, Top Up & Referral** diubah menjadi **Saldo & Referral**. Fitur Top Up tetap tersedia di halaman saldo.
- Tombol **Cara Order** menggunakan style `primary` resmi Telegram sehingga tampil biru pada klien Telegram yang mendukung style tombol.

## Database

Tidak ada migration SQL baru. Pengaturan `nokos_link` memakai tabel key-value `shop_settings` yang sudah tersedia.
