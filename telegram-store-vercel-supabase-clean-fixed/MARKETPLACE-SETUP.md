# Pengaturan Marketplace v52

## 1. Jalankan SQL upgrade

Buka Supabase SQL Editor dan jalankan:

```text
supabase/update-v52-marketplace.sql
```

Lakukan ini sebelum mengubah visibilitas produk atau mencoba unduh QRIS.

## 2. Logo Marketplace

Buka:

```text
/reseller → Pengaturan → Logo Marketplace
```

Isi **Link Logo** dengan URL HTTPS publik atau link Google Drive publik.

## 3. Banner Promosi

Pada bagian **Banner Promosi Marketplace** tekan **+ Tambah**.

Setiap baris memiliki:

```text
Nama Banner | URL Gambar | ×
```

Contoh:

```text
Promo Canva       | https://domain.com/canva.jpg
Diskon ChatGPT    | https://domain.com/chatgpt.jpg
Promo Gemini      | https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

Gunakan rasio gambar **2,39:1**. Maksimal 10 banner.

## 4. Produk Marketplace saja

Saat **Tambah Produk** atau **Edit Produk**, cari pilihan **Tampilkan Produk Di**.

- **Bot Telegram + Marketplace**: tampil di kedua kanal.
- **Marketplace saja**: tidak tampil di daftar produk pembeli pada bot Telegram.

## 5. Promo dan varian

Jika promo berlaku untuk satu varian tertentu, Marketplace akan menampilkan harga asli dicoret dan harga promo tepat pada blok varian tersebut.

Contoh:

```text
18 Bulan Invite
Rp 45.000  → dicoret
Rp 16.500
Diskon Invite · hemat Rp 28.500
```

Harga final saat checkout tetap dihitung ulang oleh server agar voucher/promo, jumlah beli, dan harga grosir tetap tervalidasi.

## 6. Unduh QRIS

Setelah v52 terpasang, buat **invoice baru**.

1. Buka Marketplace dari Telegram.
2. Pilih produk dan buat pembayaran.
3. Saat QRIS muncul, tekan **⬇ Unduh QRIS**.
4. Telegram akan menampilkan permintaan download native pada versi yang mendukung fitur tersebut.
5. Pada browser/fallback, file PNG dibuka atau diunduh langsung dari endpoint server.

Invoice yang dibuat sebelum v52 tidak memiliki payload QRIS di database, sehingga buat transaksi baru saat pengujian.
