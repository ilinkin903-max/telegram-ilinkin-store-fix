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
