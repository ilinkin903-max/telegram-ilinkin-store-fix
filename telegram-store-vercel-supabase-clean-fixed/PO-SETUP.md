# Panduan Sistem PRE-ORDER v68

## Kapan memakai PRE-ORDER?

Gunakan PRE-ORDER jika akun/produk **baru Anda ambil dari supplier setelah pembeli membayar** atau stok supplier sering berubah sehingga tidak ingin menyimpan akun terlebih dahulu di database bot.

## Cara kerja

1. Produk diset `PRE-ORDER` dari Tambah/Edit Produk.
2. Pembeli checkout melalui Marketplace atau bot.
3. Pembeli membayar menggunakan QRIS atau Saldo Bot.
4. Pembayaran diverifikasi seperti transaksi normal.
5. Sistem membuat transaksi dengan status pengiriman `waiting_delivery` dan **tidak mengurangi stock JSON produk**.
6. Pembeli diberi pesan bahwa pembayaran berhasil dan pesanan menunggu seller.
7. Seller membuka `Reseller Dashboard → Pesanan PO`.
8. Seller menempel akun/produk yang akan dikirim.
9. Seller membaca konfirmasi lalu menekan `Kirim ke Pembeli`.
10. Bot mengirim data ke chat Telegram pembeli dan menandai PO `delivered`.

## Keamanan pengiriman

- Invoice PO memiliki unique key agar tidak dibuat dua kali.
- Proses pembayaran menggunakan advisory lock database.
- Pengiriman manual memiliki lock `po_send:<invoice>` agar klik ganda tidak langsung mengirim dua kali.
- Pesanan CANCELED tidak dapat dikirim dari menu PO.
- Status database baru diubah menjadi TERKIRIM setelah pengiriman Telegram berhasil.
- Data panjang dikirim sebagai TXT untuk menghindari batas panjang pesan Telegram.

## Catatan

PRE-ORDER bukan reservasi stok supplier. Seller tetap perlu memastikan barang tersedia sebelum atau sesudah menerima pesanan sesuai prosedur bisnisnya.
