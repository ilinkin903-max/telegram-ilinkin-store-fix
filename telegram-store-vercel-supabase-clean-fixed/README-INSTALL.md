# Admin UI v37 - User Commands Fix

Perbaikan:

- /debugowner sekarang hanya bisa digunakan oleh OWNER_ID.
- /help aktif untuk user dan owner.
- /cekorder aktif untuk cek pesanan aktif dan riwayat transaksi terakhir.
- Alias tambahan: /bantuan, /cekpesanan, /riwayat.

Cara pasang:

1. Upload isi ZIP ini ke GitHub repository bot.
2. Tunggu Vercel deploy sampai Ready.
3. Buka ulang webhook:
   https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123
4. Test di Telegram:
   /help
   /cekorder
   /debugowner

Catatan:
- /debugowner akan menolak user non-owner.
- Jika ingin command muncul di menu Telegram, tambahkan command melalui @BotFather.

## v38 - Integrasi Lisensi Bot Sewa

Tambahan ENV untuk bot auto order yang ingin dikontrol oleh iLink.in Manager:

```env
LICENSE_MANAGER_URL=https://telegram-i-linkin-manager.vercel.app
LICENSE_API_SECRET=ilinkin-license-secret-2026
LICENSE_BOT_USERNAME=username_bot_auto_order_ini_tanpa_at
LICENSE_CHECK_ENABLED=true
LICENSE_FAIL_CLOSED=false
```

Catatan:
- Jika `LICENSE_MANAGER_URL` dan `LICENSE_API_SECRET` kosong, bot berjalan seperti biasa tanpa cek lisensi.
- `/lisensi`, `/license`, dan `/masaaktif` hanya bisa dipakai owner.
- Mini App admin memiliki menu baru **Lisensi** untuk melihat kode aktivasi, masa aktif, dan sisa hari.
- Jika status lisensi expired/revoked/not_found, pembeli tidak bisa lanjut order.
- `LICENSE_FAIL_CLOSED=false` membuat bot tetap jalan jika server Manager sedang error. Untuk sewa yang sangat ketat boleh ubah ke `true`.


## Catatan v39
- Bot auto order sekarang mendeteksi username asli dari Telegram getMe, jadi tidak mudah salah karena ENV LICENSE_BOT_USERNAME.
- Kosongkan LICENSE_BOT_USERNAME jika ragu.
- /debugowner menampilkan BOT_USERNAME env, LICENSE_BOT_USERNAME env, dan username asli dari Telegram.


## v41 - Menu Toko Ringkas
- Menu utama Mini App dibuat lebih ringkas.
- Lisensi, Maintenance, Backup, dan Statistik Lengkap dipindahkan ke dalam menu Toko.
- Toko sekarang memiliki submenu internal: Identitas Toko, Lisensi, Maintenance, Backup, Statistik Lengkap.
- Tidak ada perubahan SQL tambahan.

## v43 - Dashboard & Submenu Toko
- Dashboard dibuat lebih rapi di HP: blok grafik dan Produk Terlaris tidak melebar keluar layar.
- Klik submenu Toko sekarang memakai animasi scroll halus ke tujuan submenu.
- Label submenu di Promo & Voucher diubah menjadi 'Buat Promo / Voucher'.

## v44 - Produk & Users Responsif di HP
- Kartu produk dibuat lebih ringkas agar tidak memanjang ke bawah.
- Daftar varian/harga grosir dapat digeser horizontal.
- Empat tombol aksi produk disusun satu baris pada layar kecil.
- Tabel Users otomatis berubah menjadi kartu responsif di layar HP, sehingga data tidak pecah menjadi huruf/angka vertikal.
- Tidak ada perubahan SQL tambahan.

