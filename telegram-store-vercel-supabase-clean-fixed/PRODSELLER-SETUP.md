# iLink.in Store v76 — Setup ProdSeller Reseller

Integrasi ini membuat iLink membeli produk ProdSeller otomatis memakai saldo USDT akun yang terhubung ke API key, setelah pembayaran pelanggan iLink berhasil.

## 1. Jalankan SQL Supabase
Buka **Supabase → SQL Editor**, lalu jalankan:

`supabase/update-v76-prodseller-reseller.sql`

SQL ini menambah metadata supplier pada produk dan tabel `supplier_orders` untuk menyimpan status pembelian supplier/retry.

## 2. Tambahkan API key di Vercel
Buka **Vercel → Project → Settings → Environment Variables** lalu tambahkan:

- `PRODSELLER_API_KEY` = API key dari ProdSeller API Manager (`psk_...`)
- `PRODSELLER_BASE_URL` = `https://prodseller.com/v1` (opsional; sudah menjadi default)

Setelah itu **Redeploy** project. API key sengaja hanya dibaca server dan tidak disimpan di browser/Supabase.

## 3. Atur Supplier / Reseller
Buka **Reseller Dashboard → Pengaturan → Supplier / Reseller**.

Atur:
- Kurs 1 USDT ke Rupiah, misalnya `16500`.
- Markup default, misalnya `25%`.
- Kategori default.

Klik **Simpan Pengaturan** lalu **Refresh Supplier**.

## 4. Pilih produk yang dijual
Katalog ProdSeller akan tampil di halaman Supplier / Reseller.

Untuk setiap produk yang ingin dijual:
1. Isi/ubah **Harga Jual iLink (Rupiah)**.
2. Pada **Masukkan Sebagai**, pilih salah satu:
   - **Produk baru / produk mandiri** untuk membuat kartu produk sendiri; atau
   - **Varian produk yang sudah ada** agar lebih ringkas di satu produk induk.
3. Jika memilih varian, pilih **Produk Induk iLink** dan isi **Nama Varian**.
4. Klik **Resellerkan Produk**.

Jika produk induk belum memiliki varian, data produk lama otomatis dipindahkan menjadi varian **Utama**, lalu varian ProdSeller ditambahkan tanpa menghapus stok/harga lama. Setiap varian ProdSeller tetap memiliki Product ID, harga modal, stok live, dan fulfillment otomatisnya sendiri.

Produk yang tidak Anda klik tidak ikut dijual.

## 5. Saldo supplier
Top up saldo dilakukan pada akun/bot ProdSeller Anda seperti biasa. Dashboard iLink hanya membaca saldo USDT yang terhubung ke API key dan menggunakan saldo itu ketika melakukan order supplier.

## 6. Alur otomatis
1. Pelanggan memilih produk AUTO SUPPLIER.
2. Sebelum pembayaran, iLink memeriksa produk/stok supplier.
3. Pelanggan membayar melalui metode iLink (QRIS atau saldo iLink).
4. Setelah pembayaran sukses, iLink memanggil `POST /orders` ProdSeller.
5. Saldo USDT ProdSeller terpotong.
6. Key/akun hasil supplier disimpan ke pesanan dan dikirim ke chat Telegram pelanggan.
7. Invoice iLink dipakai sebagai `Idempotency-Key`, sehingga retry checkout supplier yang sama tidak membeli dua kali.

## 7. Jika supplier gagal
Jika saldo supplier kurang, stok habis, API error, atau pengiriman Telegram sempat gagal:
- pembayaran pelanggan tetap tercatat;
- error supplier tersimpan di `supplier_orders`;
- owner mendapat log jika `CHANNEL_LOG` aktif;
- buka **Supplier / Reseller → Order Supplier Terbaru → Retry Supplier** setelah masalah diperbaiki.

Jika supplier sudah menghasilkan key tetapi Telegram gagal mengirim, sistem menyimpan key tersebut dan Retry hanya mencoba pengiriman lagi, bukan membeli produk baru.
