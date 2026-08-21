# Update Link Auto Order v81.4 → v82.0.0

## 1. Backup
Sebelum update, simpan backup repository dan database Supabase. Migration v82 bersifat additive dan tidak menghapus tabel/data lama.

## 2. Jalankan migration Supabase
Buka Supabase → SQL Editor → New query lalu jalankan seluruh isi:

`supabase/update-v82-workflow-recorder.sql`

Migration menambahkan:
- `reseller_workflows`
- `reseller_workflow_steps`
- `reseller_workflow_runs`

## 3. Upload patch
Ekstrak `link-auto-order-v82-patch.zip`, lalu upload **isi folder patch** ke root repository dan timpa file lama.

## 4. Environment Variables Vercel
Tambahkan:

```env
TG_API_ID=
TG_API_HASH=
TG_STRING_SESSION=
USERBOT_STEP_TIMEOUT_MS=7000
WORKFLOW_RETRY_INTERVAL_SECONDS=8
WORKFLOW_RETRY_MAX_ATTEMPTS=18
```

Pastikan variabel lama tetap ada, terutama `PUBLIC_URL`, `JOB_RUNNER_SECRET`, `BOT_TOKEN`, `SUPABASE_URL`, dan `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`.

`TG_STRING_SESSION` adalah kredensial akun Telegram. Jangan simpan di GitHub atau halaman client.

## 5. Redeploy
Redeploy project Vercel. `vercel.json` memakai `npm install --no-audit --no-fund`, sehingga dependency `teleproto@1.228.5` ikut dipasang saat deploy.

## 6. Rekam workflow
Dashboard → Pengaturan → Workflow Reseller:
1. Pilih produk/varian.
2. Isi bot supplier, contoh `@Vinnstore_bot`.
3. Tekan **Mulai Rekam Workflow**.
4. Kirim `/start` lewat **Kirim Teks & Rekam**.
5. Setelah balasan tampil, klik salah satu tombol supplier **atau** kirim teks untuk step berikutnya.
6. Untuk jumlah dinamis gunakan `{quantity}`.
7. Ulangi sampai supplier memberikan produk.
8. Tekan **Balasan Ini = Hasil Produk**.
9. Tekan **Selesai & Aktifkan**.

## 7. Tes
Tes dengan satu order murah. Pembayaran tetap memakai sistem QRIS/saldo Link Auto Order. Setelah pembayaran sukses, workflow supplier dijalankan otomatis dan hasil diteruskan ke pembeli.

## Status keselamatan
- `QUEUED`: menunggu bot supplier kosong, aman untuk retry otomatis.
- `RUNNING`: sedang memproses step.
- `DELIVERED`: produk berhasil diambil dan dikirim.
- `ATTENTION`: aksi mungkin sudah terkirim tetapi balasan belum dapat dipastikan. Periksa chat supplier sebelum restart agar tidak terjadi double order.
