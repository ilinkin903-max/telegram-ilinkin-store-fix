# Pengaturan Marketplace v55

## Flash Sale

Buka:

`Reseller Dashboard → Promo → Flash Sale Marketplace`

Atur:

- Status Flash Sale: ON/OFF
- Judul
- Mulai Flash Sale
- Berakhir Flash Sale

Kemudian buka **Buat Promo / Voucher**, pilih **Promo Otomatis**, tentukan target produk/varian, dan aktifkan:

`Masukkan target promo ini ke Flash Sale Marketplace`

Produk tidak dipilih lagi secara manual dari panel Flash Sale. Sumber produk Flash Sale sekarang adalah promo otomatis yang diberi tanda tersebut.

## Harga Marketplace

Pada kartu katalog:

- Tidak ada range harga.
- Produk tanpa promo menampilkan harga termurah.
- Promo ditampilkan dengan harga asli dicoret dan harga promo.
- Daftar varian promo tidak ditampilkan sebagai blok tambahan pada kartu agar tampilan lebih ringkas.

Pada Flash Sale:

- Harga selalu mengikuti promo Flash Sale yang berlaku.
- Bila promo hanya untuk varian tertentu, nama varian tampil tepat di bawah nama produk.
- Angka terjual hanya menghitung transaksi dalam periode Flash Sale.

## Pembayaran AutoGoPay v55

Marketplace menggunakan `PAYMENT_PROVIDER=autogopay` bila variabel tersebut diaktifkan. QRIS tetap muncul di modal Marketplace dan dapat diunduh. Bila AutoGoPay mengirim `checkout_url`, tersedia tombol **Buka Halaman Pembayaran**.

Pengecekan status berjalan melalui:

- webhook AutoGoPay;
- polling Marketplace;
- tombol **Cek Pembayaran**;
- watcher server sebagai cadangan.

Jalankan SQL `supabase/update-v55-autogopay.sql` dan pasang callback melalui `/api/setup-autogopay?secret=...` sebelum melakukan transaksi baru.
