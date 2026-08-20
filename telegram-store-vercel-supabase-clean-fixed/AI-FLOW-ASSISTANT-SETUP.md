# AI Flow Assistant v82.5

AI hanya menyusun draft Flow Order / Flow Cek Stok / regex. AI tidak mengeksekusi order supplier sendiri.

## Contoh xAI / Grok

Dashboard → Pengaturan → Supplier / Reseller → AI Flow Assistant

- Base URL: `https://api.x.ai/v1`
- Model: `grok-4.5`
- Backend: `Chat Completions`
- API Key: API key dari xAI Console

Klik **Simpan AI**, lalu **Tes Koneksi AI**.

API key disimpan terenkripsi pada `shop_settings`. Kunci enkripsi menggunakan `AI_CONFIG_SECRET` bila diisi; jika kosong memakai `USERBOT_SETUP_KEY`, lalu `WEBHOOK_SECRET`, lalu server secret Supabase sebagai fallback. Untuk stabilitas, disarankan isi `AI_CONFIG_SECRET` di Vercel dengan string random panjang.

## Membuat flow produk

Pada form Produk dari Bot Supplier Telegram, isi **Instruksi Alur untuk AI** dengan bahasa biasa. Contoh:

```
/start. Stok ada pada tombol ALIGHT MOTION (74), ambil angka dalam kurung.
Untuk order pilih tombol keyboard nomor 2 ALIGHT MOTION.
Jika qty > 1 klik 📝 lalu kirim jumlah.
Klik Buy(Saldo), lalu ⏭️ Skip, lalu ✅ Konfirmasi & proses.
Tombol Konfirmasi adalah titik saldo supplier dipotong.
Ambil semua teks setelah 〔 ACCOUNT DETAIL 〕 sebagai produk.
```

Klik **Susun / Perbaiki Flow dengan AI**. Periksa Flow Cek Stok, Stock Regex, Flow Order, dan Regex Hasil, kemudian klik **Simpan Produk Supplier**.

## Perbaikan stok v82.5

Tombol tes stok sekarang membaca response API yang benar. Jika bot supplier menampilkan `ALIGHT MOTION (9)`, dashboard dapat menampilkan:

`Stok supplier terdeteksi: 9 · stok efektif: 7`

Stok efektif dapat lebih kecil karena dibatasi saldo manual supplier / modal per item.

Produk supplier otomatis tidak lagi diperiksa menggunakan array stok lokal iLink saat checkout.
