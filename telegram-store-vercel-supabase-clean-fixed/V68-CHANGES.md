# v68 — Marketplace UI + Sistem PRE-ORDER

## Marketplace

- Carousel banner dibuat seamless/infinite loop.
- Gambar produk, Flash Sale, dan popup detail dibuat 1:1 pada semua ukuran layar.
- Deskripsi panjang dilipat menjadi sekitar 3 baris dengan tombol Lihat selengkapnya.
- Kartu produk dipadatkan: nama, rating, terjual, varian, dan harga tidak lagi memiliki jarak berlebihan.
- Badge promo pada gambar diganti `-NN%`.
- Harga akhir/promo tampil terlebih dahulu, harga lama dicoret setelahnya.
- Chip promo varian yang menampilkan nama/kode promo dan `hemat Rp...` dihilangkan.

## PRE-ORDER

- `products.delivery_mode`: `auto` atau `po`.
- Produk PO tetap dapat dibeli walaupun tidak memiliki stok akun tersimpan.
- Pembayaran PO melalui QRIS maupun Saldo Bot didukung.
- Fulfillment pembayaran PO menggunakan RPC PostgreSQL atomik terpisah.
- Pembayaran PO mencatat transaksi `waiting_delivery` tanpa mengambil stok otomatis.
- Tabel `po_orders` menyimpan antrean PO yang sudah dibayar.
- Menu baru `Pesanan PO` di Reseller Dashboard.
- Seller mengisi akun/produk kemudian mengonfirmasi pengiriman.
- Pengiriman PO yang status penjualannya CANCELED diblokir.
- Setelah pesan berhasil dikirim ke Telegram, database ditandai `delivered`.
- Payload pengiriman panjang dikirim sebagai TXT agar tidak terpotong.

## Kompatibilitas

v68 dibangun di atas v67 dan membutuhkan fitur database v65/v66 untuk pembayaran saldo/referral. Jalankan `update-v68-marketplace-po.sql` setelah migrasi sebelumnya berhasil.
