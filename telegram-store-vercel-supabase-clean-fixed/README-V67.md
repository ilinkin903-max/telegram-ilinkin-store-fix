# Instalasi v67

1. Pastikan SQL v62, v63, v64, v65, dan v66 sudah berhasil dijalankan.
2. Jika tabel `public.bot_users` belum ada, jalankan `supabase/repair-bot-users-before-v65-v66.sql`, kemudian ulangi SQL v65 dan v66.
3. Upload seluruh isi folder ini ke root repository GitHub.
4. Redeploy Vercel tanpa build cache.
5. Buka marketplace melalui tombol Telegram Mini App.
6. Pastikan saldo tampil di kanan atas.
7. Pilih produk → Beli Sekarang → pilih QRIS atau Saldo Bot.

Pengaturan pembayaran saldo mengikuti:

`Reseller Dashboard → Pengaturan → Saldo, Referral & Top Up → Pembayaran produk dengan saldo`

Tidak ada Environment Variable baru untuk v67.
