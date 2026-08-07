# iLink.in Store v68 — Marketplace UI + Sistem PRE-ORDER

v68 menggunakan v67 sebagai dasar. Fitur saldo Marketplace, referral, top up, AutoGoPay, promo/voucher, Flash Sale, broadcast, dashboard reseller, dan pengiriman stok otomatis tetap dipertahankan.

## Perubahan utama v68

### Marketplace lebih ringkas

- Banner promosi sekarang **loop terus menerus**. Setelah banner terakhir, animasi berlanjut ke banner pertama tanpa memantul balik.
- Seluruh gambar produk menggunakan rasio **1:1**:
  - kartu katalog;
  - Flash Sale;
  - popup/detail produk;
  - tampilan HP/tablet/desktop.
- Deskripsi panjang hanya menampilkan maksimal sekitar 3 baris. Pembeli dapat menekan **Lihat selengkapnya** untuk membuka seluruh deskripsi.
- Keterangan promo pada varian tidak lagi menampilkan kode/nama promo dan teks `hemat Rp...`.
- Jarak nama produk, rating, terjual, varian, dan harga dipadatkan agar kartu lebih ringkas.
- Badge `PROMO` di gambar diganti menjadi nilai diskon, misalnya `-25%`.
- Harga promo ditampilkan lebih dahulu, lalu harga normal yang dicoret.

### Sistem PRE-ORDER (PO)

Produk sekarang mempunyai **Sistem Pengiriman**:

- `Otomatis dari stok` — alur lama. Setelah pembayaran berhasil, stok dipotong dan produk langsung dikirim bot.
- `PRE-ORDER` — pembayaran tetap diproses, tetapi produk **tidak diambil dari stok otomatis**. Pesanan masuk ke menu `Pesanan PO` dan menunggu seller mengirim akun/produk.

Alur PRE-ORDER:

```text
Pembeli pilih produk PO
→ Bayar dengan QRIS atau Saldo Bot
→ Sistem mencatat transaksi sudah dibayar
→ Pembeli mendapat pemberitahuan menunggu pengiriman
→ Seller buka Reseller Dashboard → Pesanan PO
→ Tempel akun/produk yang akan dikirim
→ Konfirmasi Kirim ke Pembeli
→ Bot mengirim produk ke chat pembeli
→ Status PO menjadi TERKIRIM
```

Jika isi produk sangat panjang, bot mengirimnya sebagai file TXT agar data tidak terpotong.

## 1. Database — SQL v68 WAJIB

Untuk upgrade dari v67 yang database referral/saldonya sudah sehat, cukup jalankan:

```text
supabase/update-v68-marketplace-po.sql
```

Buka:

```text
Supabase → SQL Editor → New query
```

Tempel seluruh isi SQL v68 lalu klik **Run**.

### Jika sebelumnya masih mendapat error `public.bot_users does not exist`

Gunakan file gabungan berikut agar urutannya tidak tertukar:

```text
supabase/update-v68-referral-wallet-po-all-in-one.sql
```

File itu menjalankan perbaikan `bot_users`, v65, v66, lalu v68 dalam urutan yang benar. Prasyaratnya: schema dasar serta update v62/v63/v64 sudah terpasang.

Alternatifnya, jalankan manual:

```text
1. supabase/repair-bot-users-before-v65-v66.sql
2. supabase/update-v65-referral-wallet-topup.sql
3. supabase/update-v66-referral-notifications-fix.sql
4. supabase/update-v68-marketplace-po.sql
```

Pastikan semuanya dijalankan pada project Supabase yang sama dengan `SUPABASE_URL` di Vercel.

## 2. Deploy

1. Ekstrak ZIP v68.
2. Upload **isi folder proyek** ke root repository GitHub dan ganti file versi lama.
3. Commit perubahan.
4. Buka Vercel → Deployments.
5. Lakukan **Redeploy tanpa build cache** ke Production.
6. Tunggu status `Ready`.

Setelah deploy, buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Pastikan versi yang aktif adalah:

```text
v68-marketplace-ui-po-system
```

## 3. Membuat produk PRE-ORDER

Buka:

```text
Reseller Dashboard → Produk → Tambah Produk
```

Pada **Sistem Pengiriman**, pilih:

```text
Pre-Order · saya kirim manual setelah pembayaran
```

Untuk produk lama:

```text
Produk → Edit → Sistem Pengiriman → Pre-Order · kirim manual
```

Produk PO tidak memerlukan stok akun yang disimpan di database karena produk akan Anda kirim manual sesudah pembayaran.

## 4. Mengirim pesanan PO

Setelah pembayaran berhasil:

```text
Reseller Dashboard → Pesanan PO
```

Pesanan terbaru yang belum dikirim akan berstatus **MENUNGGU PENGIRIMAN**.

1. Masukkan akun/produk pada kolom pengiriman.
2. Tekan **Kirim ke Pembeli**.
3. Sistem menampilkan konfirmasi berisi invoice, pembeli, produk, varian, jumlah, dan data yang akan dikirim.
4. Tekan **Kirim ke Pembeli** pada konfirmasi hanya setelah datanya benar.
5. Setelah Telegram menerima pesan, status menjadi **TERKIRIM**.

Pesanan yang sudah berstatus `CANCELED` diblokir dari pengiriman PO.

## 5. Perbedaan AUTO dan PRE-ORDER

| Fitur | AUTO | PRE-ORDER |
|---|---|---|
| Harus mempunyai stok tersimpan | Ya | Tidak |
| Stok dipotong otomatis | Ya | Tidak |
| QRIS | Ya | Ya |
| Pembayaran saldo | Ya | Ya |
| Produk dikirim langsung setelah bayar | Ya | Tidak |
| Seller mengisi produk setelah bayar | Tidak | Ya |
| Menu Pesanan PO | Tidak | Ya |

## 6. Pengujian yang disarankan setelah deploy

Lakukan dengan **produk dan invoice baru**:

### AUTO

- lakukan pembelian 1 produk stok otomatis;
- pastikan pembayaran memotong stok satu kali;
- pastikan produk langsung masuk ke chat pembeli.

### PRE-ORDER + QRIS

- buat produk PRE-ORDER;
- bayar QRIS;
- pastikan pembeli mendapat status pembayaran berhasil dan menunggu seller;
- pastikan pesanan muncul di `Pesanan PO`;
- kirim data dari dashboard;
- pastikan pembeli menerima data dan status berubah TERKIRIM.

### PRE-ORDER + Saldo Bot

- ulangi pengujian menggunakan Saldo Bot;
- pastikan saldo berkurang satu kali;
- pastikan tidak ada stok otomatis yang dipotong;
- kirim data dari `Pesanan PO`.

## Status pemeriksaan lokal

- Syntax JavaScript: berhasil.
- Test suite: **114/114 berhasil** pada pengujian lokal menggunakan stub dependency untuk layanan eksternal.
- Stub pengujian **tidak disertakan** dalam paket ZIP.
- SQL v68 belum dijalankan pada Supabase produksi Anda.
- Telegram, AutoGoPay, dan transaksi saldo produksi tetap harus diuji setelah deployment.
