# iLink.in Store v69 — PO per Varian + Voucher Preview + UI Ringkas

v69 menggunakan **v68 sebagai dasar**. Seluruh fitur marketplace, saldo/referral, top up, AutoGoPay, promo/voucher, Flash Sale, broadcast, dashboard reseller, stok AUTO, dan sistem PRE-ORDER tetap dipertahankan.

## Perubahan utama v69

### 1. Pesan produk PRE-ORDER lebih lengkap

Saat seller mengirim akun/produk dari `Reseller Dashboard → Pesanan PO`, pembeli tetap menerima:

- invoice;
- nama produk dan varian;
- jumlah;
- **Syarat & Ketentuan**;
- data produk/akun.

Syarat & Ketentuan PO disimpan sebagai **snapshot saat checkout dibayar**, sehingga perubahan SnK produk setelah transaksi tidak mengubah ketentuan transaksi lama.

Data akun yang cukup pendek dikirim di blok `<pre>` Telegram agar formatnya tetap rapi dan mudah dipilih/disalin. Data yang terlalu panjang dikirim sebagai TXT yang berisi SnK dan seluruh data produk.

### 2. PRE-ORDER dapat diatur per varian

Produk masih memiliki `Sistem Pengiriman Default`, tetapi setiap varian dapat memilih:

- `Ikuti pengaturan produk`;
- `AUTO · kirim dari stok`;
- `PRE-ORDER · seller kirim manual`.

Contoh satu produk dapat memiliki:

```text
1 Bulan   → AUTO
1 Tahun   → PRE-ORDER
Lifetime  → PRE-ORDER
```

Mode varian yang dipilih disimpan sebagai snapshot di invoice, jadi perubahan pengaturan produk setelah pembeli checkout tidak mengubah cara pengiriman invoice tersebut.

### 3. Voucher dihitung sebelum konfirmasi pembelian

Saat pembeli memasukkan voucher lalu menekan `Beli Sekarang` atau `Pre-Order Sekarang`, Marketplace meminta server menghitung ulang:

```text
Subtotal
- Potongan voucher
= Total setelah diskon
```

Konfirmasi pembayaran langsung menampilkan nilai setelah voucher. Validasi voucher dilakukan di server, bukan hanya JavaScript browser. Pada pembayaran QRIS, fee payment gateway tetap ditambahkan saat invoice QRIS dibuat.

### 4. Flash Sale lebih padat

Kartu Flash Sale dirapikan agar jarak berikut lebih rapat:

```text
Nama Produk
Varian (jika ada)
★ Rating · Terjual
Harga promo + harga coret
Progress stok
```

### 5. Tombol Simpan Edit Produk selalu terjangkau

Pada HP dan tablet, tombol `Simpan Perubahan` menjadi **floating action bar di bagian bawah layar** selama popup Edit Produk terbuka. Jadi tidak perlu scroll sampai bagian paling bawah untuk menyimpan perubahan.

---

## 1. Database — SQL v69 WAJIB dijalankan sebelum deploy kode

### Jika database v68 sudah berhasil dipasang

Jalankan:

```text
supabase/update-v69-po-variant-voucher-ui.sql
```

Buka:

```text
Supabase → SQL Editor → New query
```

Tempel seluruh isi file, kemudian klik **Run**.

SQL v69 akan:

- menambahkan `pending_orders.delivery_mode` sebagai snapshot pengiriman;
- membackfill invoice pending lama dari pengaturan produk/varian;
- menambahkan `po_orders.terms_snapshot`;
- membuat RPC atomik `fulfill_po_paid_order_v69`;
- membuat RPC atomik `fulfill_po_wallet_order_v69`.

### Jika v65/v66/v68 sebelumnya belum berhasil atau `bot_users` pernah bermasalah

Gunakan file gabungan:

```text
supabase/update-v69-referral-wallet-po-all-in-one.sql
```

Prasyaratnya schema dasar + update v62/v63/v64 sudah terpasang pada project Supabase yang sama dengan `SUPABASE_URL` di Vercel.

> Jangan deploy kode v69 sebelum SQL v69 berhasil. Kode v69 sengaja menggunakan RPC v69 agar mode PO per varian tidak salah diproses sebagai AUTO.

---

## 2. Deploy v69

1. Ekstrak ZIP v69.
2. Upload **isi folder proyek** ke root repository GitHub.
3. Timpa file versi lama.
4. Commit.
5. Vercel → Deployments → Redeploy.
6. Gunakan Production dan lakukan redeploy tanpa build cache.
7. Tunggu status `Ready`.

Cek:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Versi aktif harus:

```text
v69-po-variant-voucher-ui
```

---

## 3. Mengatur PO per varian

Buka:

```text
Reseller Dashboard → Produk → Edit
```

Pada produk tersedia:

```text
Sistem Pengiriman Default
```

Pada masing-masing varian tersedia:

```text
Sistem Pengiriman Varian
```

Pilihan `Ikuti pengaturan produk` cocok bila sebagian besar varian menggunakan mode yang sama. Pilih AUTO atau PRE-ORDER hanya pada varian yang perlu berbeda.

Untuk varian PO, stok akun di database tidak diperlukan untuk checkout. Untuk varian AUTO, stok tetap wajib tersedia.

---

## 4. Mengirim pesanan PO

Setelah pembayaran QRIS atau Saldo berhasil:

```text
Reseller Dashboard → Pesanan PO
```

1. Buka pesanan yang berstatus `MENUNGGU PENGIRIMAN`.
2. Tempel akun/produk yang akan dikirim.
3. Tekan `Kirim ke Pembeli`.
4. Periksa konfirmasi invoice, user, produk, varian, jumlah, dan data.
5. Konfirmasi pengiriman.
6. Bot mengirim SnK + produk/akun ke chat pembeli.
7. Setelah Telegram berhasil menerima data, status berubah menjadi `TERKIRIM`.

Pesanan `CANCELED` tetap diblokir dari pengiriman.

---

## 5. Pengujian yang disarankan setelah deploy

Gunakan produk/invoice baru.

### Varian AUTO

- pilih varian AUTO;
- bayar;
- pastikan stok berkurang satu kali;
- pastikan produk dikirim otomatis.

### Varian PRE-ORDER + QRIS

- pilih varian PO;
- bayar QRIS;
- pastikan stok tidak berkurang;
- pastikan masuk menu Pesanan PO;
- kirim data seller;
- pastikan pembeli menerima SnK + data produk yang dapat disalin.

### Varian PRE-ORDER + Saldo

- ulangi dengan pembayaran saldo;
- pastikan saldo dipotong satu kali;
- pastikan stok tidak dipotong;
- pastikan PO menunggu seller.

### Voucher Marketplace

- masukkan voucher valid;
- tekan Beli/PO;
- pastikan popup konfirmasi langsung menampilkan potongan dan `Total setelah diskon`;
- lanjutkan QRIS/Saldo dan pastikan nominal server sama.

### Edit Produk HP/Tablet

- buka Edit Produk;
- scroll pada bagian atas/tengah form;
- pastikan tombol `Simpan Perubahan` tetap terlihat di bawah layar.

---

## Status pemeriksaan lokal

- Syntax JavaScript: berhasil.
- Test suite: **121/121 berhasil**.
- Pengujian runtime lokal menggunakan stub sementara hanya untuk dependency eksternal (`axios`, Supabase client, QRCode, dotenv) karena registry dependency pada lingkungan pengujian tidak lengkap.
- Stub tersebut **tidak disertakan** dalam ZIP.
- SQL diperiksa secara statis tetapi belum dijalankan pada Supabase produksi Anda.
- Telegram, AutoGoPay, Supabase, dan transaksi saldo produksi tetap perlu diuji setelah deployment.
