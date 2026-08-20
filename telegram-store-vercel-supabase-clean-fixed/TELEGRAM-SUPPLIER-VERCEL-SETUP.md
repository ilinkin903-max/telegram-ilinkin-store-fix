# iLink.in Store v82 — Telegram Supplier On-Demand (Vercel + Supabase)

Versi ini tidak membutuhkan VPS worker. Vercel membuka session MTProto hanya ketika perlu mengecek stok atau menjalankan order ke bot supplier Telegram, lalu disconnect.

## 1. SQL
Jalankan berurutan di Supabase SQL Editor:
1. `supabase/update-v81-telegram-userbot-suppliers.sql` (jika belum pernah)
2. `supabase/update-v82-vercel-ondemand-telegram-supplier.sql`

## 2. Environment Variables Vercel
Tambahkan:
- `TG_API_ID`
- `TG_API_HASH`
- `TG_STRING_SESSION`

`TG_API_ID` dan `TG_API_HASH` diperoleh dari https://my.telegram.org → API development tools.
`TG_STRING_SESSION` dibuat sekali menggunakan `npm run telegram:session` dengan akun Telegram khusus reseller.

Jangan taruh API Hash atau String Session di GitHub.

## 3. Supplier Telegram di Dashboard
Buka Dashboard → Pengaturan → Supplier / Reseller → Telegram Userbot Supplier.

Isi connector:
- Kode supplier, contoh `vinnstore`
- Nama supplier, contoh `Vinnstore`
- Bot supplier, contoh `@Vinnstore_bot`
- Status Aktif
- Saldo Supplier Manual
- Mata uang saldo

Saldo manual dipakai untuk menghitung kemampuan beli. Setelah order supplier berhasil, saldo otomatis berkurang sebesar `modal per item × jumlah` dan hanya dipotong sekali per invoice.

## 4. Produk Supplier
Isi:
- Supplier
- Nama produk
- Kode supplier (opsional)
- Modal per item
- Currency
- Perhitungan stok
- Flow Cek Stok (opsional)
- Stock Regex
- Cache Stok
- Flow Order
- Regex Hasil Produk (opsional)

### Contoh Flow Cek Stok
```json
[
  {"type":"start"},
  {"type":"click","text":"Produk"},
  {"type":"click","text":"Zoom"},
  {"type":"capture"}
]
```
Contoh Stock Regex:
`Stok[^0-9]*(\d+)`

### Contoh Flow Order
```json
[
  {"type":"start"},
  {"type":"click","text":"Order"},
  {"type":"click","text":"Zoom"},
  {"type":"send","text":"{{quantity}}"},
  {"type":"click","text":"Konfirmasi","commit":true},
  {"type":"wait","contains":"berhasil","capture_delivery":true,"timeout_ms":30000}
]
```

`commit:true` hanya dipasang pada langkah yang benar-benar memotong saldo / mengonfirmasi pembelian supplier. Jika koneksi gagal setelah commit dan hasil belum jelas, order menjadi `manual_review` agar tidak dibeli ulang otomatis.

## 5. Stok yang tampil
Jika saldo manual = 100000 dan modal produk = 10000, kemampuan saldo = 10.
Jika hasil cek bot supplier menunjukkan stok 4, stok iLink = 4.
Jika flow stok kosong, stok mengikuti saldo dan/atau angka stok manual sesuai `stock_mode`.

## 6. Lock dan concurrency
Supabase mengunci satu connector saat Vercel sedang berinteraksi dengan bot tersebut. Dua order ke bot supplier yang sama tidak menekan tombol bersamaan. Supplier Telegram yang berbeda tetap dapat diproses oleh invocation lain.

## 7. Marketplace dan Bot
- Daftar katalog memakai cache/stok terakhir agar cepat.
- Saat user membuka produk/varian Telegram supplier, sistem mencoba refresh stok on-demand.
- Sebelum checkout, stok diverifikasi lagi.
- Setelah pembayaran berhasil, flow order supplier dijalankan via Vercel `waitUntil` bila tersedia; fallback ke proses langsung jika tidak tersedia.

## 8. Penting
Jangan aktifkan connector sebelum `stock_flow`, `order_flow`, dan regex sudah sesuai dengan tombol asli bot supplier. Untuk supplier yang memakai captcha/OTP/verifikasi manual, jangan mencoba bypass; gunakan mode manual untuk langkah tersebut.

## Cara termudah membuat TG_STRING_SESSION (v82.1)

Setelah `TG_API_ID` dan `TG_API_HASH` diisi di Vercel dan deployment selesai:

1. Tambahkan `USERBOT_SETUP_KEY` di Vercel (password random panjang). Jika tidak diisi, halaman setup memakai `WEBHOOK_SECRET` sebagai fallback.
2. Buka `https://DOMAIN-ANDA/setup-userbot.html`.
3. Masukkan Setup Key dan nomor Telegram khusus reseller dalam format `+62...`.
4. Klik **Kirim kode Telegram**.
5. Masukkan OTP yang diterima di Telegram lalu klik **Login & Buat Session**.
6. Jika Two-Step Verification aktif, masukkan password 2FA ketika form muncul.
7. Copy nilai `TG_STRING_SESSION`.
8. Masukkan ke Vercel → Settings → Environment Variables → `TG_STRING_SESSION`, lalu Redeploy.

Halaman setup tidak menyimpan OTP/password/session ke Supabase. Session hanya dikembalikan ke browser setelah login berhasil. Jangan simpan session di GitHub atau mengirimkannya kepada orang lain.
