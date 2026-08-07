# v69 — PO per Varian, Voucher Preview, PO SnK & UI Compact

## Marketplace

- Voucher divalidasi dan dihitung di server sebelum popup konfirmasi pembayaran.
- Popup konfirmasi menampilkan Subtotal, Potongan, dan Total setelah diskon.
- Pembayaran QRIS maupun Saldo menghitung ulang nominal di server saat transaksi dibuat.
- Kartu Flash Sale dipadatkan: nama, varian, rating/terjual, harga, dan progress stok berjarak lebih rapat.

## PRE-ORDER

- Mode pengiriman dapat ditentukan per varian: inherit / AUTO / PRE-ORDER.
- Mode efektif disimpan ke `pending_orders.delivery_mode` saat checkout.
- RPC PO baru v69 membaca snapshot mode dan menolak pilihan yang bukan PO.
- PO QRIS menggunakan `fulfill_po_paid_order_v69`.
- PO Saldo menggunakan `fulfill_po_wallet_order_v69`.
- PO tetap tidak mengambil/mengurangi stok otomatis.
- SnK PO disimpan sebagai `po_orders.terms_snapshot` ketika transaksi dibayar.
- Pesan pengiriman seller menyertakan SnK.
- Akun/produk pendek dikirim dalam blok `<pre>` agar format rapi dan mudah disalin.
- Data panjang dikirim sebagai TXT berisi SnK + seluruh akun.

## Reseller Dashboard

- Tambah/Edit varian mempunyai `Sistem Pengiriman Varian`.
- Varian dapat mengikuti mode produk atau override menjadi AUTO/PO.
- Tombol Simpan Edit Produk menjadi floating action bar pada HP/tablet, sehingga selalu terjangkau tanpa scroll sampai bawah.

## Database

- `pending_orders.delivery_mode` sebagai snapshot checkout.
- `po_orders.terms_snapshot` untuk SnK transaksi PO.
- Pending order lama dibackfill dari mode produk/varian ketika migrasi v69 pertama kali dijalankan.
- Schema fresh install membundel SQL v69.

## Pengujian

- `npm test`: **121/121 pass** dengan stub dependency eksternal sementara pada lingkungan lokal.
- Syntax seluruh file JavaScript pada script test lolos.
- Stub tidak dibundel ke ZIP produksi.
