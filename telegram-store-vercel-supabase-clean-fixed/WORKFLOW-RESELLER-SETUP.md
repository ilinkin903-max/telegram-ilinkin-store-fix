# Setup Workflow Reseller v82

## 1. Jalankan migration Supabase

Buka Supabase → SQL Editor → New query, lalu jalankan seluruh isi:

`supabase/update-v82-workflow-recorder.sql`

Migration ini aman untuk database v81.2.1+ dan tidak menghapus data lama.

## 2. Tambahkan Environment Variables di Vercel

Tambahkan:

```env
TG_API_ID=12345678
TG_API_HASH=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TG_STRING_SESSION=ISI_STRING_SESSION_AKUN_TELEGRAM
USERBOT_STEP_TIMEOUT_MS=7000
WORKFLOW_RETRY_INTERVAL_SECONDS=8
WORKFLOW_RETRY_MAX_ATTEMPTS=18
```

Pastikan juga variabel yang sudah dipakai bot tetap ada, terutama:

```env
PUBLIC_URL=https://domain-anda.vercel.app
JOB_RUNNER_SECRET=rahasia-panjang
BOT_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`TG_STRING_SESSION` adalah kredensial login akun Telegram. Simpan hanya sebagai Vercel Environment Variable; jangan ditaruh di HTML, GitHub, chat publik, atau database yang bisa dibaca client.

Setelah env diubah, lakukan Redeploy.

## 3. Cek userbot

Buka:

Dashboard → Pengaturan → Workflow Reseller

Bagian status harus menunjukkan:

- Userbot: SIAP
- API ID: ADA
- Session: ADA
- Akun: akun Telegram yang dipakai order supplier

Jika status `GAGAL TERHUBUNG`, jangan mulai merekam sampai konfigurasi userbot benar.

## 4. Rekam alur produk

1. Pilih **Produk yang Dituju**.
2. Pilih **Varian** bila workflow hanya untuk varian tertentu.
3. Isi **Bot Supplier**, misalnya `@Vinnstore_bot`.
4. Isi nama workflow.
5. Isi jumlah contoh. Jika workflow memakai `{quantity}`, angka contoh ini yang dikirim ketika merekam.
6. Tekan **Mulai Rekam Workflow**.
7. Ketik `/start`, lalu **Kirim Teks & Rekam**.
8. Setelah balasan muncul, pilih salah satu tombol supplier yang ditampilkan, atau ketik teks sendiri.
9. Ulangi sampai proses order supplier selesai.
10. Jika supplier masih menulis “sedang diproses”, tekan **Refresh Balasan** sampai produk final benar-benar muncul.
11. Tekan **Balasan Ini = Hasil Produk**.
12. Periksa daftar step.
13. Tekan **Selesai & Aktifkan**.

Contoh workflow:

```text
1. KIRIM TEKS    /start
2. KLIK TOMBOL   Produk
3. KLIK TOMBOL   Alight Motion
4. KIRIM TEKS    {quantity}
5. KLIK TOMBOL   Beli (Saldo)
6. KIRIM TEKS    Tidak
7. KLIK TOMBOL   Konfirmasi & proses
8. HASIL PRODUK  balasan akun/data dari supplier
```

## 5. Placeholder

Teks step dapat memakai:

```text
{quantity}
{invoice}
{username}
{telegram_id}
{custom_input}
```

Contoh `Jumlah: {quantity}` akan berubah menjadi `Jumlah: 15` untuk order qty 15.

## 6. Tes order

Lakukan satu pembelian murah menggunakan akun pelanggan test:

1. Pilih produk workflow.
2. Bayar memakai QRIS atau saldo seperti biasa.
3. Setelah pembayaran terverifikasi, workflow mulai otomatis.
4. Periksa chat akun userbot dengan bot supplier.
5. Pastikan hasil yang diterima supplier sama dengan hasil yang diteruskan ke pembeli.

## 7. Status order workflow

- `QUEUED`: menunggu supplier bot kosong; retry otomatis aman.
- `RUNNING`: sedang menjalankan step.
- `DELIVERED`: hasil supplier sudah disimpan/dikirim.
- `ATTENTION`: ada aksi yang mungkin sudah terkirim tetapi balasannya tidak bisa dipastikan.

Untuk `ATTENTION`, **cek chat supplier dahulu**. Jangan menekan Mulai Ulang bila pembelian supplier ternyata sudah terjadi.

## Catatan

Workflow recorder saat ini mengambil **hasil berupa teks** dari balasan bot supplier. Jika supplier hanya mengirim file/dokumen tanpa teks/caption yang dapat dipakai sebagai hasil, alur tersebut perlu penanganan media tambahan pada versi berikutnya.
