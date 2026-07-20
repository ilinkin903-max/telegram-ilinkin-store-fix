# Telegram Store Bot — v47

## Pembayaran dan pengiriman produk otomatis

Versi ini menambahkan webhook pembayaran Pakasir. Setelah pembeli berhasil membayar QRIS:

1. Pakasir mengirim notifikasi ke `/api/payment-webhook`.
2. Bot mencocokkan `project`, `order_id`, dan `amount` dengan pesanan di Supabase.
3. Bot memeriksa ulang status transaksi melalui Transaction Detail API Pakasir.
4. Jika status benar-benar `completed`, stok dipotong satu kali.
5. Produk dan invoice langsung dikirim ke Telegram pembeli tanpa harus menekan tombol.

Tombol **Cek Pembayaran Sekarang** tetap tersedia sebagai cadangan jika webhook terlambat.

### Perlindungan transaksi ganda

- Webhook dan tombol pengecekan memakai kunci proses invoice yang sama.
- Invoice yang sudah tercatat di tabel `transactions` tidak memotong stok, promo, atau voucher untuk kedua kalinya.
- Pesanan belum dihapus sebelum pesan produk berhasil dikirim.
- Jika Telegram atau Supabase sedang mengalami gangguan sementara, webhook dapat mencoba ulang tanpa mengirim stok dua kali.
- Pesan produk dan log owner mempunyai pengaman agar tidak terkirim berulang untuk invoice yang sama.

Perubahan ini **tidak memerlukan SQL atau kolom database baru**.

## Cara memasang

1. Ekstrak ZIP v47.
2. Salin seluruh isi folder ke repository bot yang digunakan di Vercel.
3. Tambahkan environment variable berikut di Vercel:

```text
PAKASIR_SLUG=slug_proyek_pakasir
PAKASIR_API_KEY=api_key_proyek_pakasir
PAKASIR_WEBHOOK_SECRET=buat_teks_acak_rahasia_tanpa_spasi
```

4. Commit dan push ke GitHub.
5. Tunggu deployment Vercel berstatus **Ready**.
6. Pasang ulang webhook Telegram:

```text
https://DOMAIN-VERCEL-ANDA/api/set-webhook?secret=WEBHOOK_SECRET
```

7. Masuk ke dashboard Pakasir → buka proyek yang dipakai → **Edit Proyek**.
8. Isi **Webhook URL** dengan:

```text
https://DOMAIN-VERCEL-ANDA/api/payment-webhook?secret=PAKASIR_WEBHOOK_SECRET
```

Contoh:

```text
https://ilinkin-store.vercel.app/api/payment-webhook?secret=rahasia-acak-123
```

Nilai setelah `secret=` harus sama persis dengan `PAKASIR_WEBHOOK_SECRET` di Vercel.

## Pemeriksaan endpoint

Buka URL berikut melalui browser:

```text
https://DOMAIN-VERCEL-ANDA/api/payment-webhook
```

Jika aktif, responsnya berisi:

```json
{
  "ok": true,
  "message": "Webhook pembayaran Pakasir aktif.",
  "version": "v47-auto-payment-webhook"
}
```

## Cara menguji

### Mode sandbox Pakasir

1. Buat pesanan melalui bot sampai QRIS tampil.
2. Salin `order_id`/invoice dan nominal transaksi.
3. Gunakan fitur simulasi pembayaran pada proyek Pakasir yang masih berada dalam mode sandbox.
4. Setelah status menjadi `completed`, bot harus langsung mengirim produk ke pembeli.

### Mode produksi

1. Gunakan produk uji dengan harga dan stok kecil.
2. Lakukan pembayaran sesuai nominal QRIS hingga berhasil.
3. Jangan menekan tombol pengecekan terlebih dahulu.
4. Produk seharusnya terkirim otomatis setelah webhook diterima dan diverifikasi.

## Catatan penting

- Jangan memakai URL `/api/telegram` sebagai webhook Pakasir. Gunakan `/api/payment-webhook`.
- Jangan membagikan `PAKASIR_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, atau `PAKASIR_WEBHOOK_SECRET`.
- Nominal pembayaran harus sama persis dengan nominal invoice, termasuk fee unik.
- Jika produk tidak terkirim, periksa **Vercel → Deployment → Functions Logs** dan pastikan Webhook URL proyek Pakasir sudah benar.
- Jika status endpoint aktif tetapi webhook belum masuk, simpan ulang konfigurasi Webhook URL pada proyek Pakasir.

## Perbaikan versi sebelumnya yang tetap tersedia

- Promo otomatis dan voucher manual untuk produk atau varian tertentu.
- Promo/voucher expired tampil OFF.
- Broadcast gambar, stiker, teks, dan polling.
- Tampilan Produk dan Users responsif pada perangkat mobile.
- Mini App telah disederhanakan agar menu tidak dobel dan lebih mudah dipahami.

## Pengujian paket

Paket telah diperiksa dengan:

- pemeriksaan sintaks seluruh file JavaScript;
- validasi handler webhook pembayaran;
- validasi kecocokan project, invoice, dan nominal;
- pengaman transaksi invoice ganda;
- 11 pengujian otomatis untuk pembayaran, promo, voucher, waktu WIB, dan target varian.

Integrasi langsung tetap perlu diuji menggunakan proyek Pakasir, Telegram, Supabase, dan Vercel milik Anda.
