# Telegram Store Bot — v46

## Perbaikan utama

### Promo otomatis dan voucher per varian
- Promo otomatis maupun voucher manual sekarang dapat ditargetkan ke:
  - semua produk;
  - satu produk beserta seluruh variannya; atau
  - satu varian tertentu saja.
- Pilihan target dibuat langsung dari daftar produk dan varian pada Mini App, sehingga tidak perlu mengetik kode secara manual.
- Target varian disimpan secara kompatibel di kolom `products` yang sudah ada. **Tidak memerlukan SQL atau kolom database baru.**
- Pengecekan target dilakukan kembali pada halaman konfirmasi, saat voucher dipasang, dan saat pembayaran dibuat.

Contoh internal target:
- `GEMINI` berarti seluruh varian produk Gemini.
- `GEMINI::18-BULAN-INVITE` berarti hanya varian 18 Bulan Invite.

### Mini App lebih rapi
- Menu **Tambah** dihapus dari navigasi utama dan dipindahkan menjadi tombol pada halaman Produk.
- Menu **Polling** digabung ke halaman Broadcast agar tidak dobel.
- Menu **Toko** diganti menjadi **Pengaturan**.
- Identitas toko dan panduan media `/start` digabung dalam satu formulir.
- Lisensi, Statistik Lengkap, Backup, dan Maintenance dikelompokkan sebagai Alat Toko.
- Ukuran border, bayangan, jarak, navigasi, formulir, dan tampilan HP dibuat lebih ringkas.
- File patch lama yang tidak dipakai saat deployment telah dibuang dari paket.

## Cara memasang

1. Ekstrak ZIP v46.
2. Salin seluruh isinya ke repository bot yang digunakan di Vercel.
3. Commit dan push ke GitHub.
4. Tunggu deployment Vercel berstatus **Ready**.
5. Buka ulang webhook menggunakan URL proyek Anda:

```text
https://DOMAIN-VERCEL-ANDA/api/set-webhook?secret=WEBHOOK_SECRET
```

6. Buka Mini App dari Telegram dan uji Promo & Voucher.

## Cara membuat promo untuk varian tertentu

1. Buka **Promo** → **Buat Promo / Voucher**.
2. Pilih Voucher Manual atau Promo Otomatis.
3. Matikan pilihan **Semua Produk**.
4. Pilih produk.
5. Pilih **Semua varian produk** atau salah satu nama varian.
6. Tekan **Tambah Target**.
7. Isi nilai diskon, jadwal, minimal pembelian, dan limit.
8. Simpan.

## Pengujian

Paket telah diperiksa dengan:
- pemeriksaan sintaks seluruh file JavaScript;
- pemeriksaan sintaks JavaScript yang tertanam di Mini App;
- pemeriksaan struktur HTML dan ID duplikat;
- 8 pengujian promo dan voucher, termasuk target varian tertentu.

Integrasi langsung dengan akun Telegram, Supabase, Pakasir, dan Vercel tetap perlu diuji menggunakan kredensial proyek Anda.
