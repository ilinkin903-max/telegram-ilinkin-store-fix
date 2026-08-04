# v67 — Saldo & Pembayaran Marketplace

## Marketplace

- Saldo user tampil di kanan atas, segaris dengan logo toko.
- Saldo tetap ringkas pada layar HP.
- Saldo yang ditampilkan adalah gabungan Saldo Utama dan Saldo Referral.
- Detail Saldo Utama dan Referral tersedia melalui tooltip pada tampilan desktop.

## Checkout

- Konfirmasi pesanan menyediakan dua metode pembayaran:
  - QRIS
  - Saldo Bot
- QRIS tetap menjadi pilihan awal untuk mencegah saldo terpotong tanpa sengaja.
- Pilihan Saldo Bot otomatis dinonaktifkan bila fitur saldo dimatikan, data wallet belum siap, atau saldo tidak cukup.
- Voucher tetap divalidasi ulang oleh server sebelum saldo dipotong.
- Pembayaran saldo menggunakan RPC `fulfill_wallet_order_v65`, sehingga saldo, stok, transaksi, dan ledger diproses atomik.
- Saldo Utama digunakan lebih dahulu, kemudian Saldo Referral.
- Setelah berhasil, produk langsung dikirim ke Telegram dan nilai saldo pada header diperbarui.

## Database

Tidak ada SQL baru khusus v67. Wajib sudah menjalankan SQL v65 dan v66.

Jika muncul `relation public.bot_users does not exist`, jalankan:

`supabase/repair-bot-users-before-v65-v66.sql`

lalu jalankan ulang SQL v65 dan v66 secara berurutan.
