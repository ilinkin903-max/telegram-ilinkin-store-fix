# Link Auto Order v81 — Setup & Update

V81 memakai source v79 sebagai dasar dan mempertahankan sistem pembayaran Link Auto Order: QRIS langsung di Telegram, tombol Cek Pembayaran, polling status AutoGoPay berdasarkan `transaction_id`, dan callback AutoGoPay tidak wajib.

## Update dari v80
1. Backup repository Anda.
2. Upload seluruh isi patch v81 ke root repository dan timpa file lama.
3. Tidak perlu menjalankan SQL/migration baru.
4. Periksa Environment Variables di Vercel.
5. Redeploy tanpa build cache.
6. Kirim `/start` dari akun owner.

## Environment Variables penting

```env
BOT_TOKEN=TOKEN_BOT_ANDA
BOT_USERNAME=username_bot_tanpa_at
BOT_NAME=Link Auto Order

# Owner: cukup salah satu, atau gunakan OWNER_IDS untuk beberapa owner.
OWNER_ID=123456789
OWNER_IDS=
DEV_OWNER_ID=

PUBLIC_URL=https://domain-vercel-anda.vercel.app
STORE_URL=https://domain-vercel-anda.vercel.app

# Dashboard: MINIAPP_URL atau DASHBOARD_URL sama-sama didukung.
MINIAPP_URL=https://domain-vercel-anda.vercel.app/dashboard
DASHBOARD_URL=https://domain-vercel-anda.vercel.app/dashboard

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
# Alternatif Supabase key baru:
SUPABASE_SECRET_KEY=

PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site

WEBHOOK_SECRET=secret_webhook
JOB_RUNNER_SECRET=secret_worker
CRON_SECRET=secret_cron
PAYMENT_POLL_INTERVAL_SECONDS=30
PAYMENT_POLL_MAX_ATTEMPTS=30
```

## Dashboard Owner
Setelah redeploy, `/start` dari akun owner harus menampilkan tombol:

`⚙️ Dashboard Owner`

Anda juga dapat mengirim:

`/dashboard`

`/reseller` tetap tersedia sebagai alias.

Jika tombol tidak muncul:
1. Kirim `/getid` ke bot.
2. Cocokkan ID Telegram dengan `OWNER_ID` atau salah satu nilai pada `OWNER_IDS`.
3. Pastikan `PUBLIC_URL` benar.
4. Pastikan `MINIAPP_URL`/`DASHBOARD_URL` mengarah ke `/dashboard` atau biarkan kosong agar bot memakai `PUBLIC_URL/dashboard`.
5. Redeploy Vercel setelah mengubah Environment Variables.

Dashboard harus dibuka melalui tombol Web App Telegram agar `initData` tersedia.

## Pembayaran
Alur pembayaran tetap:
- gambar QRIS tampil langsung di bot;
- tombol `Cek Pembayaran` dan `Batal`;
- invoice lokal bot tidak diganti order ID AutoGoPay;
- `transaction_id` disimpan terpisah;
- status pembayaran diperiksa otomatis sesuai interval polling;
- callback AutoGoPay tidak perlu didaftarkan.

## Database
V81 tidak mengubah schema database. Tidak ada SQL baru yang perlu dijalankan.

Lihat `V81-CHANGES.md` untuk daftar perbaikan teknis.

---

## v82.0.0 — Workflow Recorder Reseller

Untuk menggunakan reseller berbasis rekam langkah bot supplier:

1. Jalankan `supabase/update-v82-workflow-recorder.sql` di Supabase SQL Editor.
2. Tambahkan `TG_API_ID`, `TG_API_HASH`, `TG_STRING_SESSION` pada Vercel.
3. Pastikan `JOB_RUNNER_SECRET` dan `PUBLIC_URL` tetap terisi.
4. Redeploy.
5. Buka Dashboard → Pengaturan → Workflow Reseller.
6. Rekam `/start` → tombol/teks per langkah → tandai hasil → aktifkan.

Panduan lengkap: `WORKFLOW-RESELLER-SETUP.md`.
