# AIVerseHub Reseller Integration

Integrasi ini menambahkan **AIVerseHub** sebagai supplier API otomatis tanpa menghapus integrasi ProdSeller yang sudah ada.

## Cara kerja

1. Owner melakukan top up saldo pada akun/bot AIVerseHub.
2. Bot iLink membaca saldo melalui `GET /api/v1/me` dan katalog/stok melalui `GET /api/v1/products`.
3. Owner memilih service AIVerseHub yang ingin dijual dari dashboard **Supplier / Reseller** dan menetapkan harga jual Rupiah.
4. Ketika pelanggan checkout, iLink memeriksa stok provider dan kapasitas saldo sebelum menerima pembelian.
5. Setelah pembayaran pelanggan lunas, iLink membuat pembelian otomatis melalui `POST /api/v1/order`.
6. Kode/produk yang dikembalikan oleh AIVerseHub dikirim otomatis ke pelanggan dan transaksi supplier dicatat.

## Environment Variables

Tambahkan pada Vercel / environment server:

```env
AIVERSEHUB_API_KEY=AK_isi_api_key_aiversehub
AIVERSEHUB_BASE_URL=https://aiversehub.store/api/v1
```

`AIVERSEHUB_API_KEY` adalah rahasia server. Jangan ditaruh di frontend atau dikirim ke pelanggan.

## Pengaturan dashboard

Buka **Supplier / Reseller -> AIVerseHub API**.

- **Kurs 1 unit ke IDR**: konversi angka `price` dan `wallet_balance` dari AIVerseHub ke Rupiah. Default `1`.
- **Markup default**: dipakai untuk saran harga jual saat import service.
- **Kategori default**: kategori untuk produk baru yang diimport.

Dokumentasi AIVerseHub tidak menyebutkan mata uang angka `price`/`wallet_balance`, sehingga kurs dibuat configurable. Jika nilai API memang sudah Rupiah, gunakan kurs `1`.

## Retry order

Dokumentasi AIVerseHub tidak mendokumentasikan idempotency key untuk `POST /order`. Karena itu:

- Jika provider mengembalikan Order ID tetapi produk belum tersedia, **Retry Supplier** akan mengecek order yang sama melalui `GET /api/v1/order/{id}`.
- Jika terjadi timeout/network error sebelum Order ID diterima, bot menandai transaksi sebagai **status tidak pasti** dan tidak langsung membuat pembelian kedua.
- Periksa riwayat AIVerseHub terlebih dahulu. Hanya jika dipastikan belum terbeli, gunakan tombol **Paksa Retry AIVerseHub**.

## Database

Tidak ada tabel baru yang diperlukan. Integrasi memakai metadata supplier dan tabel `supplier_orders` yang sudah ada pada paket ini. Kolom legacy bernama `supplier_price_usdt` dan `amount_usdt` dipakai sebagai kolom angka harga supplier generik; konversi ke IDR ditentukan oleh setting per provider.
