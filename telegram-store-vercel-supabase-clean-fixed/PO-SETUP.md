# Panduan PRE-ORDER v69 — Per Varian

## Mode pengiriman

v69 mendukung pengaturan PRE-ORDER sampai level varian.

Setiap produk mempunyai **Sistem Pengiriman Default**. Setiap varian dapat:

- mengikuti default produk;
- memaksa AUTO;
- memaksa PRE-ORDER.

Contoh:

```text
Canva
├─ 1 Bulan       AUTO
├─ 1 Tahun       PRE-ORDER
└─ Lifetime      PRE-ORDER
```

Pembeli yang memilih `1 Bulan` mendapat alur stok otomatis. Pembeli yang memilih `1 Tahun` atau `Lifetime` masuk antrean PO setelah pembayaran.

## Snapshot saat checkout

Saat checkout dibuat, mode efektif varian disimpan ke `pending_orders.delivery_mode`.

Ini penting karena seller dapat mengubah konfigurasi produk setelah invoice dibuat. Invoice lama tetap menggunakan mode pengiriman yang dipilih ketika checkout.

Untuk PO, SnK juga disimpan dalam `po_orders.terms_snapshot` setelah pembayaran berhasil. Pesan pengiriman menggunakan snapshot tersebut agar ketentuan transaksi lama tidak berubah karena seller mengedit produk kemudian.

## Alur PO

1. Pembeli memilih varian PRE-ORDER.
2. Voucher/promo dihitung server.
3. Pembeli membayar melalui QRIS atau Saldo Bot.
4. Sistem mencatat transaksi `delivery_mode=po` dan `delivery_status=waiting_delivery` tanpa memotong stok.
5. Pembeli mendapat pesan bahwa pembayaran berhasil dan sedang menunggu seller.
6. Seller membuka `Reseller Dashboard → Pesanan PO`.
7. Seller memasukkan akun/produk.
8. Seller mengonfirmasi data.
9. Bot mengirim SnK dan akun/produk ke chat pembeli.
10. Setelah Telegram berhasil mengirim, status menjadi `delivered`.

## Format pengiriman pembeli

Data pendek dikirim seperti:

```text
📦 PESANAN PO SUDAH DIKIRIM
Invoice: ...
Produk: ...
Jumlah: ...

SYARAT & KETENTUAN
...

PRODUK / AKUN
[data akun dalam blok kode]
```

Blok akun dapat dipilih/disalin dari Telegram. Bila data terlalu panjang, sistem mengirim file TXT yang tetap berisi SnK dan seluruh akun.

## Keamanan

- invoice transaksi unik;
- fulfillment PO menggunakan PostgreSQL transaction + advisory lock;
- pembayaran saldo dan QRIS menggunakan RPC v69 yang terpisah;
- PO tidak memotong stok JSON;
- pengiriman manual memiliki lock `po_send:<invoice>`;
- pesanan CANCELED tidak dapat dikirim;
- database baru ditandai `delivered` setelah pengiriman Telegram berhasil;
- klik ganda pengiriman dibatasi oleh lock;
- voucher diproses satu kali melalui alur fulfillment database.

## SQL

Upgrade dari v68:

```text
supabase/update-v69-po-variant-voucher-ui.sql
```

Jika rangkaian referral/saldo/PO lama belum sehat:

```text
supabase/update-v69-referral-wallet-po-all-in-one.sql
```
