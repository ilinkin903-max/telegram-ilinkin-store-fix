# Pengaturan Marketplace v61

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

**Penting:** promo yang dicentang untuk Flash Sale hanya aktif dan memotong harga ketika status Flash Sale ON serta waktu sekarang berada di antara jadwal mulai dan berakhir. Di luar jadwal tersebut, promo tidak berlaku di bot maupun Marketplace.

Daftar Flash Sale ditampilkan dalam satu baris horizontal. Pada layar kecil, pembeli dapat menggesernya ke samping.

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

Pengecekan status pembayaran berjalan melalui:

- webhook AutoGoPay;
- polling Marketplace;
- tombol **Cek Pembayaran**;
- watcher server sebagai cadangan.

Pastikan migrasi AutoGoPay v55 sudah pernah dijalankan, lalu jalankan SQL `supabase/update-v60-profit-modal.sql`. Daftarkan callback melalui `/api/setup-autogopay?secret=...`; v60 otomatis memakai URL verifikasi `/api/payment-webhook?provider=autogopay&verify=1`.
