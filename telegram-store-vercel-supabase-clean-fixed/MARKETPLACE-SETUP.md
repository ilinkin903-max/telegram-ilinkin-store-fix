# Pengaturan Marketplace v73

Marketplace mempertahankan tema biru, saldo user di header, QRIS, Saldo Bot, Flash Sale, promo/voucher, banner promosi, dan pilihan produk Bot + Marketplace atau Marketplace saja.

## Banner promosi

Semua banner tetap menggunakan rasio **2,39:1** dan carousel looping otomatis.

Di `Reseller Dashboard → Pengaturan → Banner Promosi` tersedia dua jenis:

- **Banner Gambar** — memakai URL gambar.
- **Banner Bawaan** — dirender langsung oleh Marketplace dan dapat mengatur teks, judul, deskripsi, warna, posisi teks, serta tombol.

Banner gambar dan banner bawaan dapat dicampur. Gunakan tombol **↑** dan **↓** untuk mengubah urutan. Nama internal banner hanya tampil di dashboard dan tidak tampil di Marketplace.

## Cara Order

Pengaturan mengikuti `Tombol Belanja & Cara Order` di Pengaturan Toko:

- `Marketplace saja` → Cara Order hanya tampil di Marketplace.
- `Daftar Produk saja` → Cara Order hanya tampil di bot.
- `Marketplace + Daftar Produk` → Cara Order tersedia di keduanya.

Panduan Marketplace menjelaskan pemilihan produk/varian, voucher, pembayaran Saldo Bot atau QRIS, serta pengiriman AUTO/PRE-ORDER.

## Gambar produk

Seluruh gambar produk ditampilkan dalam bingkai **1:1** pada:

- katalog Marketplace;
- Flash Sale;
- popup/detail produk;
- HP, tablet, dan desktop.

Gunakan gambar persegi untuk hasil terbaik.

## Deskripsi

Deskripsi panjang dilipat otomatis. Pembeli dapat menekan `Lihat selengkapnya` dan `Tampilkan lebih sedikit`.

## Promo

Pada kartu produk:

```text
-25%
Rp15.000   Rp20.000 (dicoret)
```

Harga setelah diskon tampil terlebih dahulu. Keterangan `hemat Rp...` dan kode/nama promo tidak ditampilkan pada pilihan varian agar UI lebih bersih.

## Sistem pengiriman produk

Setiap produk dapat diatur menjadi:

```text
AUTO       = produk diambil dari stok dan dikirim otomatis
PRE-ORDER  = produk dikirim manual oleh seller setelah pembayaran
```

Pengaturan tersedia pada Tambah/Edit Produk di Reseller Dashboard.

Untuk PRE-ORDER, lihat `PO-SETUP.md`.
