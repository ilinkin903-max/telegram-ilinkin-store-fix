# V81 — Dashboard Owner & Button Reliability Fix

V81 tetap memakai basis v79 dan pembayaran Link Auto Order v80. Tidak ada perubahan schema Supabase.

## Perbaikan Dashboard Owner
- Tombol `⚙️ Dashboard Owner` kembali muncul pada `/start` untuk owner.
- Owner dapat dikonfigurasi dengan `OWNER_ID`, `OWNER_IDS`, atau `DEV_OWNER_ID`.
- Command baru `/dashboard`; `/reseller` tetap menjadi alias.
- Route `/dashboard` diarahkan ke Mini App dashboard yang sama dengan `/reseller`.
- `DASHBOARD_URL` didukung sebagai alias `MINIAPP_URL`.
- `SUPABASE_SECRET_KEY` didukung sebagai alias `SUPABASE_SERVICE_ROLE_KEY`.
- URL relatif seperti `/dashboard` dan `/marketplace` otomatis digabung dengan `PUBLIC_URL`.

## Perbaikan Tombol Bot
- Callback query tidak lagi dijawab dua kali.
- Tombol yang membutuhkan alert sekarang dapat menampilkan pesan alert dengan benar.
- Tombol lama/stale memberikan pesan agar user kembali ke `/start`, bukan diam/spinner terus.
- Bila handler tombol error setelah callback sudah dijawab, pesan aktif diganti dengan halaman error dan tombol `Menu Utama`.
- Tombol pembayaran QRIS memberi respons `Menyiapkan QRIS...` sebelum request payment berjalan.
- Tombol batal memberi konfirmasi dan kembali ke menu utama.

## Mini App
- Judul dashboard diubah dari `Reseller Dashboard` menjadi `Dashboard Owner`.
- Mini App owner menerima semua ID yang didaftarkan melalui `OWNER_IDS`.
- Dashboard tetap harus dibuka dari tombol Web App Telegram agar `initData` tersedia.

## Update
Tidak perlu SQL/migration baru. Upload patch V81 ke source V80, lalu redeploy Vercel.
