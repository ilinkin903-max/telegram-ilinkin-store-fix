# Update v25 - Maintenance Database

Versi ini menambahkan tab **Maintenance** di Mini App untuk membersihkan data lama agar Supabase Free tetap ringan.

Fitur maintenance:
- hapus pending order expired
- hapus pending order lama
- hapus polling lama beserta hasilnya
- hapus detail jawaban polling lama
- kosongkan produk terkirim lama tanpa menghapus invoice
- hapus user tanpa transaksi lama
- hapus voucher nonaktif/expired
- hapus transaksi lama permanen, gunakan hati-hati

Tidak perlu SQL baru. Upload isi ZIP ke GitHub, redeploy Vercel, lalu set webhook ulang.

---

# Telegram Store Vercel Supabase - Admin UI v23

Update v23:
- Broadcast polling sekarang memakai mode global/forward dari polling asli.
- User melihat hasil polling keseluruhan, bukan hasil pribadi 100%.
- Admin tetap perlu konfirmasi broadcast polling dari preview.
- Hasil polling tetap tersimpan di Supabase dan bisa dihapus dari Mini App atau command /polling.

## Cara pasang
1. Upload isi ZIP ke GitHub.
2. Jalankan SQL update di Supabase dari `supabase/update-owner-tools.sql`.
3. Redeploy Vercel.
4. Buka ulang webhook: `/api/set-webhook?secret=WEBHOOK_SECRET`.

## Cara broadcast polling global
1. Kirim atau forward polling ke bot.
2. Bot menampilkan preview.
3. Klik Broadcast Polling.
4. Polling dikirim dengan forward agar hasil vote user menjadi satu/global.

Catatan: polling lama yang dibuat sebelum v23 tidak punya source message, jadi sebaiknya buat polling baru setelah update ini.
