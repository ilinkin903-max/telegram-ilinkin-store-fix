# Link Auto Order v82.0.0 — Workflow Recorder Reseller

v82 menambahkan sistem reseller Telegram berbasis **rekaman alur bot supplier**. Admin tidak perlu menulis regex/alur khusus untuk setiap produk. Admin merekam bagaimana melakukan order sekali, lalu sistem menyimpan step dan menjalankannya kembali setelah pelanggan membayar.

## Fitur utama

- Pilih produk lokal dan varian yang akan dihubungkan ke workflow.
- Tentukan `@username` bot supplier.
- Mode rekam mendukung dua aksi per step:
  - **Kirim Teks** (misalnya `/start`, `Tidak`, kode, atau placeholder dinamis).
  - **Klik Tombol** yang benar-benar muncul pada balasan bot supplier.
- Placeholder teks:
  - `{quantity}` — jumlah order pelanggan.
  - `{invoice}` — invoice lokal.
  - `{username}` — username/nama pelanggan.
  - `{telegram_id}` — Telegram ID pelanggan.
  - `{custom_input}` — disiapkan untuk input dinamis tambahan.
- Balasan supplier setiap step disimpan agar recorder mudah diperiksa.
- Balasan terakhir dapat ditandai sebagai **Hasil Produk**.
- Workflow dapat diaktifkan/nonaktifkan/dihapus per produk/varian.
- Produk workflow tampil sebagai pengiriman otomatis, bukan PO manual.
- Setelah pembayaran berhasil, alur supplier dijalankan otomatis menggunakan akun Telegram userbot.
- Hasil supplier diteruskan menggunakan sistem delivery Link Auto Order yang sudah ada, termasuk tombol **Salin Produk**.

## Keamanan order

Percakapan dengan bot supplier bersifat stateful. v82 memakai lock per `@bot_supplier`, sehingga satu supplier bot diproses bergantian. Jika order lain datang saat supplier sedang dipakai, order masuk antrean dan worker mencoba lagi otomatis.

Sebelum sebuah step dikirim, status run dicatat sebagai `STEP_IN_FLIGHT`. Jika fungsi server terputus setelah aksi terkirim tetapi sebelum balasan terbaca, workflow masuk `ATTENTION` dan **tidak diulang otomatis**. Ini sengaja dilakukan agar tombol Beli/Konfirmasi tidak terpencet dua kali dan saldo supplier tidak terpotong ganda.

Di Dashboard → Workflow Reseller, order `ATTENTION` mempunyai tombol **Mulai Ulang (Risiko Double Order)** yang hanya boleh digunakan setelah owner mengecek chat supplier.

## Penyimpanan data

Migration menambahkan tabel:

- `reseller_workflows`
- `reseller_workflow_steps`
- `reseller_workflow_runs`

Migration bersifat additive dan tidak menghapus produk, transaksi, stok, saldo, referral, PO, atau tabel supplier lama.

Saat workflow diaktifkan, link supplier lama disimpan di `previous_link_snapshot`. Stok lokal juga tidak dihapus. Ketika workflow dinonaktifkan/dihapus, link pengiriman lama dipulihkan jika produk masih terhubung ke workflow tersebut.

## Perbaikan tambahan saat finalisasi

- Workflow Telegram tidak muncul sebagai Pesanan PO manual dan tidak bisa dikirim manual dari menu PO.
- Edit produk/varian workflow tidak menghapus stok lokal lama.
- Pesan “sedang diproses” tidak dikirim dua kali; jika workflow selesai cepat, pelanggan langsung mendapat hasil.
- Timeout recorder/dashboard diselaraskan ke default 7000 ms dan dapat dinaikkan sampai 30000 ms.
- Loader Teleproto memprioritaskan CommonJS lalu fallback ESM untuk menghindari masalah resolver `teleproto/sessions` di Node/Vercel.

## Finalisasi build

- Default timeout workflow diselaraskan ke **7000 ms** di schema, migration, recorder API, dan runtime replay.
- `teleproto@1.228.5` dipasang sebagai dependency runtime. `vercel.json` memakai `npm install --no-audit --no-fund` sehingga dependency baru ikut dipasang saat deploy.
- Pengujian regresi offline: **197/197 lulus**, termasuk replay campuran teks → tombol → teks dinamis → hasil.
