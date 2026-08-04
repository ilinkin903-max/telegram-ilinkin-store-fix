# Perubahan v65

## Referral

- Kode referral unik untuk setiap user.
- Link referral dari `BOT_USERNAME`.
- Pilihan hadiah langsung saat user baru membuka bot atau setelah pembelian pertama.
- Bonus masuk ke Saldo Referral.
- Satu bonus per akun Telegram, tanpa self-referral.
- Notifikasi bonus dikirim kepada pengundang.

## Wallet

- Dua saldo terpisah: Saldo Utama dan Saldo Referral.
- Pembayaran produk memakai Saldo Utama terlebih dahulu, lalu Saldo Referral.
- Checkout saldo, pengurangan stok, transaksi, promo, dan ledger dijalankan atomik.
- Riwayat mutasi untuk top up, referral, checkout, dan koreksi owner.

## Top Up

- Top up QRIS melalui provider pembayaran aktif.
- Minimum dan maksimum top up dapat diatur.
- Deteksi melalui webhook, watcher, tombol Cek Top Up, dan payment cron.
- Nominal yang masuk ke saldo tidak termasuk fee pembayaran.
- Penyelesaian top up idempoten sehingga callback ganda tidak menggandakan saldo.

## Dashboard Reseller

- Submenu baru **Saldo, Referral & Top Up**.
- Pengaturan status, nominal bonus, mode bonus, top up, pembayaran saldo, dan batas top up.
- Kartu Users menampilkan Saldo Utama, Saldo Referral, dan total saldo.
- Tombol **Atur Saldo** untuk mengubah kedua saldo beserta catatan audit.
- Layout dibuat responsif dan ringkas untuk desktop, tablet, dan HP.

## Database

- `bot_users.balance_main`
- `bot_users.balance_referral`
- `bot_users.referral_code`
- `bot_users.referred_by`
- `bot_users.referral_status`
- `wallet_ledger`
- `pending_topups`
- `pending_orders.payment_method`
- `transactions.payment_method`
- `transactions.wallet_main_used`
- `transactions.wallet_referral_used`
- RPC dan trigger v65 untuk registrasi, top up, referral, koreksi saldo, dan checkout saldo.
