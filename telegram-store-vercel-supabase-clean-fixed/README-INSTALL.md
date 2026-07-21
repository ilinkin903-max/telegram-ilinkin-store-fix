# iLink.in Store v54 — Flash Sale Promo Integration

Versi ini merupakan lanjutan v53. Tidak memerlukan SQL tambahan apabila database v52/v53 sudah terpasang.

## Perubahan v54

- Tema Flash Sale Marketplace diubah menjadi biru agar konsisten dengan tema marketplace.
- Jumlah `TERJUAL` pada Flash Sale dihitung hanya dari transaksi sejak waktu mulai Flash Sale sampai waktu sekarang/berakhir.
- Promo varian yang dimasukkan ke Flash Sale menampilkan nama varian tepat di bawah nama produk.
- Pengaturan Flash Sale dipindahkan dari menu Pengaturan ke menu **Promo**.
- Saat membuat/edit **Promo Otomatis** tersedia pilihan **Masukkan target promo ini ke Flash Sale Marketplace**.
- Voucher manual tidak bisa dimasukkan ke Flash Sale.
- Kartu produk Marketplace tidak lagi menampilkan blok daftar varian promo.
- Harga kartu produk tidak lagi memakai range. Tanpa promo, yang ditampilkan adalah harga termurah. Bila promo aktif menjadi penawaran utama, harga asli dicoret dan harga promo ditampilkan.
- Flash Sale hanya menampilkan harga promo milik produk/varian yang memang ditandai masuk Flash Sale.

## Cara update

1. Upload seluruh isi folder ini ke repository GitHub project Vercel Anda dan timpa file versi sebelumnya.
2. Pastikan Environment Variables lama tetap tersedia.
3. Deploy/redeploy di Vercel.
4. Setelah status `Ready`, buka Reseller Dashboard.
5. Masuk ke **Promo**.
6. Atur periode pada panel **Flash Sale Marketplace**.
7. Buat atau edit **Promo Otomatis** dan aktifkan pilihan **Masukkan target promo ini ke Flash Sale Marketplace** pada promo yang ingin ditampilkan.

## Cara kerja Flash Sale

Flash Sale mempunyai waktu global `Mulai` dan `Berakhir`. Produk yang tampil berasal dari Promo Otomatis yang ditandai masuk Flash Sale.

Jika target promo:

- Produk utama / semua varian → Flash Sale menampilkan produk dan harga promo yang sesuai.
- Varian tertentu → nama varian tampil tepat di bawah nama produk dan harga Flash Sale mengikuti varian tersebut.

Jumlah `TERJUAL` dihitung dari tabel transaksi pada rentang waktu Flash Sale. Untuk promo varian, jumlah yang dihitung hanya transaksi varian tersebut.

## Database

Tidak ada SQL baru untuk v54. Pengaturan tambahan disimpan sebagai key baru pada `shop_settings`.

## Pengujian

Paket v54 telah melewati pemeriksaan sintaks dan 39 pengujian otomatis melalui `npm test`.
