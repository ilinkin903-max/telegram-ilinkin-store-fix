# iLink.in Store v62 — Security & Reliability Fix

v62 dibuat dari paket terbaru v61 dan menerapkan temuan audit yang berpengaruh pada keamanan, stok, pembayaran, statistik, serta data sensitif. Tampilan dashboard reseller v61 tetap dipertahankan.

## Perubahan terpenting

- Pemotongan stok dan pencatatan transaksi dipindahkan ke satu fungsi PostgreSQL atomik.
- Dua pembayaran bersamaan untuk produk yang sama tidak lagi membaca stok yang sama.
- Satu invoice hanya dapat diselesaikan satu kali melalui unique constraint dan advisory lock database.
- Lock pembayaran bersifat **fail-closed**; error lock tidak membiarkan dua proses pembayaran berjalan bersamaan.
- `MINIAPP_DEV_MODE` otomatis ditolak pada Vercel Production/`NODE_ENV=production`.
- Verifikasi Telegram `initData` tidak lagi melempar HTTP 500 untuk hash dengan panjang salah.
- Statistik menggunakan agregasi database dan tetap akurat setelah transaksi melebihi 1.000 baris.
- Profit negatif tetap disimpan; koreksi modal tidak lagi dipaksa menjadi nol.
- Invoice AutoGoPay tidak lagi diubah paksa menjadi huruf besar.
- Ditambahkan payment sweeper `/api/payment-cron` sebagai jalur pemulihan jika webhook dan watcher sementara gagal.
- Backup cron sekarang wajib memakai `CRON_SECRET`.
- QRIS diunduh memakai token HMAC singkat; `initData` Telegram tidak lagi dikirim pada query URL.
- Checkout memiliki lock 30 detik per pengguna untuk mengurangi spam pembuatan invoice.
- Lock pekerjaan dipindahkan dari `shop_settings` ke tabel `job_locks`.
- Data produksi pada `Database/*.json` dikosongkan dan diabaikan oleh Git.
- Versi API membaca satu sumber versi yang sama.

## 1. Jalankan SQL v62 terlebih dahulu — wajib

Untuk database yang sudah memakai v60/v61, buka:

```text
Supabase → SQL Editor → New query
```

Jalankan seluruh isi:

```text
supabase/update-v62-security-reliability.sql
```

**SQL harus dijalankan sebelum deploy kode v62.** Tanpa RPC v62, pembayaran sengaja dihentikan agar stok tidak dipotong dengan metode lama yang tidak atomik.

Untuk instalasi baru dari nol, cukup jalankan:

```text
supabase/schema.sql
```

`schema.sql` v62 sudah mencakup struktur v52, v55, v60, dan v62 untuk instalasi baru.

## 2. Periksa Environment Variables Vercel

Pastikan environment **Production** memiliki variabel utama Anda dan tambahkan:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app

PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller

WEBHOOK_SECRET=RAHASIA_SETUP_BARU
CRON_SECRET=RAHASIA_CRON_YANG_BERBEDA
QR_DOWNLOAD_SECRET=RAHASIA_TOKEN_QRIS_YANG_BERBEDA
MINIAPP_DEV_MODE=false
```

Catatan:

- Jangan memakai secret yang pernah dibagikan di percakapan atau repository.
- `QR_DOWNLOAD_SECRET` boleh dikosongkan; sistem akan memakai `WEBHOOK_SECRET`. Nilai terpisah lebih disarankan.
- Hapus `MINIAPP_DEV_MODE` dari Production atau isi `false`. Walaupun salah diisi `true`, v62 tetap menolaknya pada Production.

## 3. Upload dan deploy

1. Ekstrak ZIP v62.
2. Unggah **isi folder `store_fix_v62`** ke root repository GitHub.
3. Ganti file lama, lalu commit.
4. Di Vercel buka **Deployments → Redeploy**.
5. Redeploy tanpa build cache.
6. Tunggu status **Ready**.

## 4. Pastikan v62 aktif

Buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Respons harus memuat:

```json
{
  "ok": true,
  "version": "v62-security-reliability-fix",
  "active_provider": "autogopay"
}
```

Jika versi masih v61/v56, deployment terbaru belum menjadi Production.

## 5. Daftarkan ulang callback AutoGoPay

Ganti placeholder dengan nilai `WEBHOOK_SECRET` baru:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA
```

Callback yang didaftarkan adalah:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook?provider=autogopay&verify=1
```

Request probe AutoGoPay dibalas 200, sedangkan pembayaran asli tetap harus lolos signature HMAC.

## 6. Pasang ulang webhook Telegram bila diperlukan

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=WEBHOOK_SECRET_ANDA
```

## 7. Aktifkan payment sweeper

Endpoint pemulihan pembayaran:

```text
POST https://telegram-ilinkin-store-fix.vercel.app/api/payment-cron
Authorization: Bearer CRON_SECRET_ANDA
```

Jalankan setiap 1–2 menit memakai scheduler yang mendukung header Authorization. Payment sweeper akan:

- memeriksa pending order tertua;
- memverifikasi status langsung ke gateway;
- mengirim produk jika sudah dibayar;
- menghapus pending order yang expired/cancelled/failed;
- tidak mengirim dua kali karena fulfillment dijaga database.

`vercel.json` tetap menjadwalkan backup harian. Untuk payment sweeper berinterval pendek, gunakan scheduler eksternal atau paket Vercel yang mendukung cron lebih sering.

## 8. Keamanan data repository — wajib diperhatikan

Paket v62 berisi file berikut dalam keadaan kosong:

```text
Database/Produk.json
Database/Trx.json
Database/User.json
Database/Voucher.json
```

`.gitignore` juga mengabaikan `Database/*.json`. Namun, jika file produksi pernah di-commit sebelumnya:

1. Hapus file sensitif dari riwayat Git/GitHub, bukan hanya commit terbaru.
2. Ganti password akun produk yang pernah masuk repository/ZIP.
3. Ganti API key dan secret yang pernah dipublikasikan.
4. Simpan stok hanya di Supabase, bukan pada file repository.

## 9. Pengujian setelah deploy

Gunakan invoice baru dan lakukan urutan berikut:

1. Beli satu produk dengan stok uji.
2. Bayar QRIS.
3. Pastikan webhook atau payment sweeper mengirim produk.
4. Pastikan stok berkurang satu kali.
5. Panggil webhook/status lagi dan pastikan produk tidak dikirim ulang.
6. Uji dua checkout bersamaan pada produk dengan stok terbatas.
7. Uji tombol Unduh QRIS dan pastikan URL hanya berisi token singkat, bukan `initData`.
8. Uji dashboard reseller dari Telegram owner.

## Troubleshooting

### Pesan “Fungsi stok atomik v62 belum tersedia”

Jalankan ulang:

```text
supabase/update-v62-security-reliability.sql
```

Setelah itu tunggu schema cache Supabase beberapa saat dan coba invoice baru.

### `/api/payment-cron` mengembalikan 401

Pastikan header dikirim persis:

```text
Authorization: Bearer NILAI_CRON_SECRET
```

### Dashboard reseller tidak dapat dibuka saat test lokal

`MINIAPP_DEV_MODE=true` hanya berlaku saat bukan Production. Untuk Production, buka dashboard melalui tombol owner Telegram agar `initData` valid.

### AutoGoPay setup masih 502

Periksa respons `/api/setup-autogopay`, Vercel Logs, API key Production, dan pastikan `/api/payment-webhook` sudah menampilkan versi v62.

## Status pengujian paket

- Pemeriksaan sintaks JavaScript: berhasil.
- Unit/static tests: **76/76 berhasil** dengan dependency stub lokal karena container pengujian tidak memiliki akses internet.
- `npm install`, koneksi Supabase nyata, transaksi AutoGoPay nyata, dan pengiriman Telegram nyata belum dijalankan di lingkungan ini.
