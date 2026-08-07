# Pengaturan Marketplace v68

Marketplace mempertahankan tema biru, saldo user di header, QRIS, Saldo Bot, Flash Sale, promo/voucher, banner promosi, dan pilihan produk Bot + Marketplace atau Marketplace saja.

## Banner promosi

Banner disarankan tetap berasio **2,39:1**. Jika terdapat lebih dari satu banner, carousel berjalan otomatis dan melakukan looping terus menerus dari banner terakhir ke banner pertama.

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
