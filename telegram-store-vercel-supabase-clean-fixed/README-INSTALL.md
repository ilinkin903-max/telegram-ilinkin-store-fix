# Telegram Store Bot — v49

## Perbaikan pembayaran otomatis

Versi v49 memakai dua jalur deteksi pembayaran:

1. **Webhook Pakasir** sebagai jalur utama dan tercepat.
2. **Watcher latar belakang Vercel** sebagai cadangan selama beberapa menit setelah QRIS dibuat.

Dengan demikian, pembayaran yang berhasil dapat tetap terdeteksi walaupun notifikasi webhook terlambat atau pengaturan Webhook URL Pakasir belum tersimpan dengan benar.

Sebelum produk dikirim, sistem tetap memeriksa ulang `project`, `order_id`, dan `amount` melalui Transaction Detail API Pakasir. Invoice yang sama hanya diproses satu kali sehingga stok, promo, voucher, dan transaksi tidak terpotong ganda.

## Perubahan lain

- Notifikasi channel log kembali menggunakan format:

```text
✅ PESANAN SELESAI
=======================
User: @username
Trx ID: ABC123
Produk: Nama Produk - Varian
Harga: Rp 35.000
Jumlah Beli: 1
Fee: Rp 26
Total Harga: Rp 35.026
Tanggal: Minggu, 19 Juli 2026 pukul 19.28
```

- Tombol **Salin Produk** tidak lagi tampil dua kali. Produk tetap berada dalam blok kode Telegram yang sudah memiliki tombol salin bawaan.
- Webhook menerima body JSON, body string JSON, dan `application/x-www-form-urlencoded`.
- Nama project Pakasir dicocokkan tanpa terpengaruh huruf besar/kecil.
- Secret webhook Pakasir dibuat opsional karena transaksi tetap diverifikasi ulang melalui API Pakasir.

Perubahan ini tidak memerlukan SQL atau kolom database baru.

## Cara memasang

1. Ekstrak ZIP v49.
2. Unggah seluruh isi folder ke repository GitHub bot Anda dan timpa file lama.
3. Pastikan Environment Variables berikut tersedia di Vercel:

```text
PAKASIR_SLUG=slug_proyek_pakasir
PAKASIR_API_KEY=api_key_proyek_pakasir
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
WEBHOOK_SECRET=rahasia_webhook_telegram
```

Variabel berikut opsional:

```text
PAKASIR_WEBHOOK_SECRET=rahasia_webhook_pembayaran
PAKASIR_WEBHOOK_REQUIRE_SECRET=false
```

4. Commit dan tunggu deployment Vercel berstatus **Ready**.
5. Pasang ulang webhook Telegram:

```text
https://DOMAIN-VERCEL-ANDA/api/set-webhook?secret=WEBHOOK_SECRET
```

6. Di dashboard Pakasir, buka proyek → **Edit Proyek** → isi Webhook URL.

### Rekomendasi paling sederhana

```text
https://DOMAIN-VERCEL-ANDA/api/payment-webhook
```

Dengan nilai:

```text
PAKASIR_WEBHOOK_REQUIRE_SECRET=false
```

### Mode secret ketat

Gunakan hanya bila Anda yakin query parameter tersimpan utuh di dashboard Pakasir:

```text
https://DOMAIN-VERCEL-ANDA/api/payment-webhook?secret=RAHASIA_ANDA
```

Lalu atur:

```text
PAKASIR_WEBHOOK_SECRET=RAHASIA_ANDA
PAKASIR_WEBHOOK_REQUIRE_SECRET=true
```

Nilai secret harus sama persis dan tidak boleh memiliki spasi atau tanda kutip.

## Pemeriksaan endpoint

Buka:

```text
https://DOMAIN-VERCEL-ANDA/api/payment-webhook
```

Respons yang benar akan memuat versi v49 dan status konfigurasi tanpa menampilkan API key:

```json
{
  "ok": true,
  "message": "Webhook pembayaran Pakasir aktif.",
  "version": "v49-auto-payment-watcher-webhook-fix",
  "configuration": {
    "projectConfigured": true,
    "apiKeyConfigured": true,
    "webhookSecretConfigured": true,
    "webhookSecretRequired": false
  }
}
```

## Cara menguji

1. Buat satu produk uji dengan stok kecil.
2. Buat pesanan sampai QRIS tampil.
3. Bayar sesuai **Total Bayar**, termasuk fee unik.
4. Jangan tekan tombol **Cek Pembayaran Sekarang**.
5. Tunggu beberapa detik. Webhook atau watcher akan memeriksa status dan mengirim produk.
6. Periksa channel log. Pesan harus memakai judul **PESANAN SELESAI**.

## Jika belum terkirim

Periksa **Vercel → Project → Logs** dan cari salah satu keterangan berikut:

- `Webhook Pakasir ditolak`
- `payment webhook error`
- `Background payment watcher error`
- `Detail transaksi Pakasir tidak cocok dengan invoice lokal`
- `Konfigurasi Pakasir belum lengkap`

Pastikan juga:

- `PAKASIR_SLUG` benar-benar sama dengan slug proyek Pakasir;
- `PAKASIR_API_KEY` berasal dari proyek yang sama;
- nominal dibayar sama dengan Total Bayar;
- deployment Production menggunakan Environment Variables terbaru;
- Fluid Compute Vercel tetap aktif agar watcher latar belakang dapat berjalan;
- fungsi `api/telegram.js` memiliki Maximum Duration 300 detik dari `vercel.json`.

## Deployment

Node.js tetap dikunci ke `20.x`. Bila pernah mengalami error instalasi npm, lakukan **Redeploy without cache**.
