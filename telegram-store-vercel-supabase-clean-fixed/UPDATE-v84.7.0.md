# UPDATE v84.7.0 — Chat Pembeli & Respons Bot Lebih Cepat

## Dashboard Manager

- Tombol **Chat Pembeli** ditambahkan pada kartu penjualan, detail transaksi, pesanan PRE-ORDER, konfirmasi pengiriman PRE-ORDER, daftar user, editor saldo user, dan statistik top user.
- Kolom **Chat Pembeli Langsung** menerima ID Telegram, nama, `@username`, atau username tanpa `@`.
- Username membuka percakapan Telegram secara langsung.
- ID Telegram terlebih dahulu dicocokkan ke data akun terbaru; jika username tersedia, dashboard memakainya. Jika tidak, dashboard memakai deep link ID Telegram sebagai fallback.
- Nama dicocokkan ke akun pada data user, transaksi, dan pesanan PRE-ORDER. Jika ada beberapa nama yang sama, dashboard menampilkan pilihan akun agar tidak salah chat.
- Endpoint owner-only `buyer-lookup` ditambahkan agar pencarian tidak terbatas pada daftar user yang sedang tampil di browser.

## Performa Bot Telegram

- Cache baca singkat ditambahkan untuk setting toko, statistik, daftar produk, saldo tampilan, riwayat transaksi, status wajib join, saldo supplier, dan detail stok supplier.
- Request yang datang bersamaan untuk data yang sama digabungkan agar tidak menembak database atau supplier berulang kali.
- Update profil user pada menu utama dibatasi dengan cache singkat agar klik berulang tidak selalu melakukan upsert.
- Callback menu navigasi diakui lebih awal sehingga indikator loading tombol Telegram lebih cepat berhenti.
- Pengecekan wajib join menggunakan cache singkat, tetapi tombol **Cek Lagi** tetap memaksa pemeriksaan terbaru.
- Cache saldo dan riwayat user dibersihkan setelah top up atau pembayaran berhasil.

## Keamanan Transaksi Tetap Dijaga

- Saldo untuk pembayaran tetap dibaca langsung saat checkout.
- Stok supplier tetap diverifikasi secara live dengan `force: true` sebelum transaksi dibuat.
- Cache hanya dipakai untuk tampilan/menu dan menggunakan TTL singkat.

Tidak ada migration SQL baru untuk v84.7.0.
