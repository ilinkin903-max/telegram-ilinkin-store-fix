# LEGACY v81 — Tidak diperlukan pada v82 Vercel On-Demand

Untuk v82 gunakan `TELEGRAM-SUPPLIER-VERCEL-SETUP.md`. Folder ini hanya dipertahankan untuk kompatibilitas/rollback.

# iLink Telegram Userbot Worker v81

Worker ini dijalankan di VPS, bukan di Vercel. Satu akun Telegram userbot dapat melayani beberapa bot supplier. Queue diserialkan per connector sehingga dua order ke bot supplier yang sama tidak saling menabrak.

## Setup singkat
1. Buat Telegram API ID/API Hash di `my.telegram.org/apps`.
2. Salin `.env.example` menjadi `.env`, isi `TG_API_ID` dan `TG_API_HASH`.
3. Jalankan `npm install`, lalu `npm run session` untuk mendapatkan `TG_STRING_SESSION`.
4. Isi Supabase service role, bridge URL, dan `USERBOT_BRIDGE_SECRET` yang sama dengan Vercel.
5. Tes dengan `npm start`. Untuk production: `npm install -g pm2`, lalu `pm2 start ecosystem.config.cjs`, `pm2 save`, dan ikuti `pm2 startup` agar otomatis hidup setelah VPS restart.

## Flow produk
Flow disimpan sebagai array JSON pada dashboard. Step yang didukung:
- `{"type":"start"}`
- `{"type":"send","text":"/start"}`
- `{"type":"click","text":"Order"}`
- `{"type":"click","text":"Konfirmasi","commit":true}` — tandai titik saldo supplier mulai terpotong
- `{"type":"click","regex":"/Zoom/i"}`
- `{"type":"send","text":"{{quantity}}"}`
- `{"type":"wait","contains":"berhasil","timeout_ms":60000}`
- `{"type":"capture","regex":"/AKUN\\s*:\\s*([\\s\\S]+)/i"}`
- `{"type":"sleep","ms":1000}`

Gunakan `capture_delivery:true` pada step `wait` bila pesan tersebut langsung berisi akun/key.

### Pengaman double-order
Pada tombol/langkah yang benar-benar mengonfirmasi pembayaran di bot supplier, tambahkan `"commit": true`. Jika koneksi timeout setelah langkah ini tetapi hasil belum berhasil ditangkap, job masuk `manual_review` dan tidak auto-retry. Jika akun/key sudah berhasil ditangkap tetapi bridge Vercel gagal, worker menyimpan hasil lalu retry **hanya pengiriman hasil**, tanpa menjalankan flow supplier lagi.

## Keamanan
`TG_STRING_SESSION`, `TG_API_HASH`, `SUPABASE_SERVICE_ROLE_KEY`, dan `USERBOT_BRIDGE_SECRET` adalah rahasia server. Jangan taruh di GitHub dan jangan kirim ke chat.
