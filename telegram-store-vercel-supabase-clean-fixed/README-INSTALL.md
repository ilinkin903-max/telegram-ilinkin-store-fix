# iLink.in Store v63 — Marketplace & Dashboard Polish

v63 merupakan pembaruan dari v62. Perbaikan keamanan, stok atomik, recovery pembayaran, AutoGoPay, promo Flash Sale, QRIS, dan dashboard reseller tetap dipertahankan.

## Ringkasan perubahan

- Posisi harga dan jumlah terjual pada seluruh kartu Flash Sale dibuat sejajar.
- Dropdown pengurutan lebih pendek di HP dan label “Urutkan” dihapus.
- Keunggulan toko dipindahkan ke footer setelah deskripsi Marketplace.
- Grup/channel Telegram tampil sebagai blok biru dengan logo Telegram.
- Dashboard reseller dibersihkan dari teks bantuan yang berulang.
- Status transaksi tampil di kanan atas kartu Penjualan.
- Transaksi `COMPLETED` dapat diubah menjadi `CANCELED` melalui konfirmasi.
- Tampilan Users lebih ringkas.
- Pengaturan Toko, Banner Promosi, dan Media `/start` menjadi halaman submenu terpisah.
- Nama toko pada `/start` tidak lagi menampilkan backslash sebelum titik.

## 1. Jalankan SQL v62 bila belum pernah

Apabila database belum pernah diperbarui ke v62, jalankan terlebih dahulu:

```text
supabase/update-v62-security-reliability.sql
```

SQL tersebut diperlukan untuk stok atomik, lock, statistik, dan payment recovery.

## 2. Jalankan SQL v63 — wajib untuk upgrade dari v62

Buka:

```text
Supabase → SQL Editor → New query
```

Jalankan seluruh isi file:

```text
supabase/update-v63-ui-order-status.sql
```

Pastikan editor SQL hanya berisi perintah dari file. Jangan ikut menempelkan waktu chat, judul pesan, atau pembungkus Markdown seperti `````sql``.

SQL v63 menambahkan status administratif transaksi. Tanpa migration ini, tombol perubahan `COMPLETED` / `CANCELED` tidak dapat digunakan.

Untuk instalasi baru dari nol, cukup jalankan:

```text
supabase/schema.sql
```

## 3. Environment Variables

Gunakan variabel Production yang sudah dipakai pada v62, termasuk:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app

PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller

WEBHOOK_SECRET=RAHASIA_SETUP_ANDA
CRON_SECRET=RAHASIA_CRON_ANDA
QR_DOWNLOAD_SECRET=RAHASIA_UNDUH_QRIS_ANDA
MINIAPP_DEV_MODE=false
```

Gunakan nilai secret yang berbeda dan jangan menyimpannya di GitHub.

## 4. Upload dan deployment

1. Ekstrak ZIP v63.
2. Unggah seluruh isi folder proyek ke root repository GitHub.
3. Ganti file lama dan commit.
4. Buka **Vercel → Deployments → Redeploy**.
5. Redeploy tanpa build cache.
6. Tunggu deployment berstatus **Ready**.

## 5. Pastikan versi aktif

Buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Respons harus memuat:

```json
{
  "ok": true,
  "version": "v63-marketplace-dashboard-polish",
  "active_provider": "autogopay"
}
```

## 6. Daftarkan ulang callback bila deployment/provider berubah

```text
https://telegram-ilinkin-store-fix.vercel.app/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA
```

Webhook Telegram dapat dipasang ulang melalui:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=WEBHOOK_SECRET_ANDA
```

## 7. Cara menggunakan status CANCELED

Buka:

```text
Dashboard Reseller → Penjualan
```

Tekan badge `COMPLETED` di kanan atas kartu, lalu konfirmasi perubahan ke `CANCELED`.

Penting:

- Status ini untuk pencatatan administratif.
- Produk, akun, voucher, atau stok yang sudah dikirim tidak dikembalikan otomatis.
- Saldo/refund gateway juga tidak dilakukan otomatis.
- Jika pembatalan memerlukan refund atau pengembalian stok, lakukan proses tersebut secara manual dan pastikan data produk masih aman digunakan kembali.

Status dapat dikembalikan ke `COMPLETED` dengan menekan badge merah `CANCELED`.

## 8. Pengujian setelah deployment

1. Buka Marketplace pada HP dan desktop.
2. Pastikan Flash Sale sejajar walaupun sebagian promo tidak mempunyai nama varian.
3. Pastikan dropdown pengurutan sejajar dengan judul katalog di HP.
4. Periksa footer, blok Telegram, dan link grup/channel.
5. Buka dashboard reseller dan periksa seluruh submenu Pengaturan.
6. Ubah satu transaksi uji dari `COMPLETED` ke `CANCELED`, kemudian kembalikan lagi.
7. Buka bot dan kirim `/start`; nama harus tampil `iLink.in Store` tanpa backslash.
8. Lakukan satu transaksi uji lengkap untuk memastikan fitur pembayaran v62 tetap berjalan.

## Troubleshooting

### Tombol status mengembalikan error kolom tidak ditemukan

Jalankan:

```text
supabase/update-v63-ui-order-status.sql
```

Tunggu beberapa saat sampai schema cache Supabase diperbarui, lalu muat ulang dashboard.

### Versi API masih v62

Pastikan commit terbaru menjadi Production deployment dan lakukan Redeploy tanpa cache.

### Nama toko masih menampilkan backslash

Pastikan bot menggunakan deployment v63 dan webhook Telegram mengarah ke deployment/domain yang benar.

## Status pengujian

- Pemeriksaan sintaks JavaScript: berhasil.
- Unit/static tests: **79/79 berhasil**.
- Pemeriksaan ID HTML duplikat: tidak ditemukan pada Marketplace dan dashboard reseller.
- Pengujian lokal memakai stub dependency di luar paket karena container tidak mempunyai akses internet.
- SQL ditinjau secara statis, tetapi belum dijalankan pada Supabase produksi.
- Transaksi AutoGoPay, Telegram, Supabase, dan deployment Vercel nyata tetap perlu diuji dengan kredensial aktif.
