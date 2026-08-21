# Setup Workflow Reseller v82.2

## 1. Jalankan migration Supabase

Buka Supabase → SQL Editor → New query, lalu jalankan seluruh isi:

`supabase/update-v82-workflow-recorder.sql`

Jika sebelumnya sudah menjalankan v82.0/v82.1, jalankan migration tambahan berurutan sesuai yang belum pernah dijalankan:

`supabase/update-v82.1-multi-message-recorder.sql`

`supabase/update-v82.2-workflow-guard-receipt.sql`

Migration v82.2 wajib untuk proteksi anti-loop/anti-double-order. Semua migration ini additive dan tidak menghapus data lama.

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

1. Pilih **Produk yang Dituju**. Produk yang mempunyai varian akan tampil langsung sebagai `Nama Produk — Nama Varian`; pilih varian yang tepat.
3. Isi **Bot Supplier**, misalnya `@Vinnstore_bot`.
4. Isi nama workflow.
5. Isi **Jumlah Contoh Saat Rekam**. Angka ini hanya dipakai saat latihan untuk step kategori Jumlah Pembelian.
6. Tekan **Mulai Rekam Workflow**.
7. Pada **Kategori Step Teks**, pilih **Teks / Perintah Lainnya**, ketik `/start`, lalu **Kirim Teks & Rekam**.
8. Jika supplier mengirim satu pesan, pesan itu otomatis dipilih. Jika supplier mengirim **2 pesan atau lebih**, semua pesan ditampilkan sebagai Pesan 1, Pesan 2, dst. Tekan **Pilih Pesan Ini** pada pesan yang benar.
9. Jika pesan yang benar mempunyai tombol, Anda boleh langsung menekan tombol tersebut; sistem otomatis menjadikan pesan itu sebagai balasan resmi step sebelumnya lalu merekam klik tombol sebagai step baru.
10. Bila supplier meminta jumlah, ubah **Kategori Step Teks → Jumlah Pembelian** lalu tekan **Kirim Jumlah Pembelian & Rekam**. Sistem otomatis menyimpan `{quantity}` dan mengirim Jumlah Contoh saat latihan.
11. Untuk jawaban seperti `Tidak`, `/start`, email, atau kode, gunakan kategori **Teks / Perintah Lainnya**.
12. Ulangi sampai proses order supplier selesai.
13. Jika hasil datang beberapa detik kemudian, tekan **Refresh Pesan Supplier**. Pilih pesan yang benar-benar berisi produk.
14. Tekan **Pesan Terpilih = Hasil Produk**.
15. Periksa daftar step. Step dengan banyak balasan harus sudah menunjukkan pesan yang dipilih.
16. Tekan **Selesai & Aktifkan**.

Contoh workflow:

```text
1. KIRIM TEKS    /start
2. KLIK TOMBOL   Produk
3. KLIK TOMBOL   Alight Motion
4. JUMLAH BELI   {quantity}
5. KLIK TOMBOL   Beli (Saldo)
6. KIRIM TEKS    Tidak
7. KLIK TOMBOL   Konfirmasi & proses
8. HASIL PRODUK  balasan akun/data dari supplier
```


## 5. Memilih balasan ketika supplier mengirim beberapa pesan

Contoh supplier membalas satu aksi dengan:

```text
Pesan 1: Saldo Anda Rp50.000
Pesan 2: Pilih Produk [Alight Motion] [Canva]
```

Recorder menampilkan keduanya. Untuk melanjutkan lewat tombol produk, pilih **Pesan 2** atau langsung klik tombol pada Pesan 2. Hanya pesan yang dipilih yang dipakai sebagai pola replay untuk step tersebut.

Jika belum memilih salah satu dari beberapa pesan, workflow tidak dapat diaktifkan. Ini mencegah replay menekan tombol dari pesan yang salah.

## 6. Kategori Step Teks

### Jumlah Pembelian
Pilih kategori ini ketika supplier meminta jumlah/order quantity. Anda tidak perlu mengetik `{quantity}`. Sistem menyimpannya otomatis.

```text
Saat rekam, Jumlah Contoh = 5 → supplier menerima 5
Saat customer order 17 → supplier menerima 17
```

### Teks / Perintah Lainnya
Gunakan untuk teks tetap atau placeholder lain, misalnya:

```text
/start
Tidak
Skip
{invoice}
{username}
{telegram_id}
{custom_input}
```

## 7. Placeholder

Teks step dapat memakai:

```text
{quantity}
{invoice}
{username}
{telegram_id}
{custom_input}
```

Contoh `Jumlah: {quantity}` akan berubah menjadi `Jumlah: 15` untuk order qty 15.

## 8. Tes order

Lakukan satu pembelian murah menggunakan akun pelanggan test:

1. Pilih produk workflow.
2. Bayar memakai QRIS atau saldo seperti biasa.
3. Setelah pembayaran terverifikasi, workflow mulai otomatis.
4. Periksa chat akun userbot dengan bot supplier.
5. Pastikan hasil yang diterima supplier sama dengan hasil yang diteruskan ke pembeli.

## 9. Status order workflow

- `QUEUED`: menunggu supplier bot kosong; retry otomatis aman.
- `RUNNING`: sedang menjalankan step.
- `DELIVERED`: hasil supplier sudah disimpan/dikirim.
- `ATTENTION`: ada aksi yang mungkin sudah terkirim tetapi balasannya tidak bisa dipastikan.

Untuk `ATTENTION`, **cek chat supplier dahulu**. Jangan menekan Mulai Ulang bila pembelian supplier ternyata sudah terjadi.

## Catatan

Workflow recorder saat ini mengambil **hasil berupa teks** dari balasan bot supplier. Jika supplier hanya mengirim file/dokumen tanpa teks/caption yang dapat dipakai sebagai hasil, alur tersebut perlu penanganan media tambahan pada versi berikutnya.


## Anti-loop / anti-double-order v82.2
Setiap invoice memiliki jurnal step persisten. Satu step hanya boleh dikirim satu kali. Quantity 1 maupun quantity lebih besar tetap menjalankan workflow **satu kali**; nilai jumlah diteruskan melalui step kategori **Jumlah Pembelian** (`{quantity}`). Jika runtime mencoba kembali ke step yang sama karena retry/serverless, proses berhenti sebelum aksi dikirim ulang.

## Target produk bervarian
Pada field **Produk yang Dituju**, produk yang memiliki varian tampil langsung sebagai `Nama Produk — Nama Varian`. Tidak ada lagi target ambigu `Produk Utama` untuk produk yang mempunyai varian.

## Format produk ke pembeli
Produk akhir dikirim dalam blok kode Telegram di bawah receipt `PEMBAYARAN BERHASIL`. Tombol `Salin Produk 1/2/3` sudah dihapus.
