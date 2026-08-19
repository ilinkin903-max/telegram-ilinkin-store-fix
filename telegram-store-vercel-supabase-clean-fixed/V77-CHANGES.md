# v77 — PO Message Cleanup, Popup Layer, Supplier Live Stock

## Perubahan

- Pesan pembayaran PRE-ORDER tidak lagi menambahkan blok `PESANAN PRE-ORDER`; receipt pembayaran berhenti setelah garis pemisah.
- Pesan pengiriman PO tidak lagi mengulang header `PESANAN PO SUDAH DIKIRIM`, invoice, produk, dan jumlah. Pesan langsung menampilkan Syarat & Ketentuan dan Produk/Akun.
- Popup dashboard berada di atas navigasi bawah. Saat popup aktif, navigasi bawah disembunyikan dan background tidak dapat discroll.
- Produk ProdSeller tidak ditampilkan di menu Pesanan PO. Order supplier tetap dikelola dari Supplier / Reseller dan aman di-retry dengan idempotency yang sudah ada.
- Marketplace mengganti label `AUTO SUPPLIER` menjadi `Stok N`.
- Stok supplier dihitung sebagai `min(floor(balance USDT / harga supplier), stok aktual supplier)`. Untuk produk custom-delivery dengan stok `null`, stok mengikuti kemampuan saldo.
- Bila saldo tidak cukup membeli 1 item, stok marketplace menjadi 0. Bila stok aktual supplier lebih kecil daripada kemampuan saldo, stok marketplace mengikuti stok supplier.
- Checkout Marketplace dan Bot memverifikasi ketersediaan berdasarkan saldo + stok supplier sebelum pembayaran/order diproses.
- Cache API ProdSeller 30 detik dipakai untuk mengurangi request berulang; checkout melakukan verifikasi live.
- Produk supplier pada dashboard ditandai `SUPPLIER OTOMATIS · PRODSELLER`, bukan PRE-ORDER manual, dan tidak menampilkan tombol pengelolaan stok lokal.

## Database

Tidak ada SQL baru untuk v77. Tetap gunakan migration v76 yang sudah dijalankan.

## Verifikasi

- JavaScript syntax check seluruh `api/`, `lib/`, `public/`, dan `scripts/`: PASS.
- Inline JavaScript dashboard hasil ekstraksi: PASS.
- Test v71–v77: 29 passed, 0 failed.

## Catatan

Integrasi menggunakan endpoint resmi ProdSeller `GET /balance`, `GET /products/:id`, dan `POST /orders`. Stok marketplace adalah stok efektif yang benar-benar dapat dibeli dari saldo reseller pada saat data supplier berhasil diverifikasi.
