# iLink.in Store v60 — AutoGoPay Callback, Modal Checkout, dan Profit

Versi ini melanjutkan v58/v56 tanpa membawa fitur rekomendasi grosir v57.

## Perubahan utama

- Setup callback AutoGoPay memakai URL verifikasi khusus:
  `/api/payment-webhook?provider=autogopay&verify=1`.
- Sebelum mendaftarkan callback, sistem menguji endpoint milik sendiri dan memastikan respons HTTP 200.
- Probe verifikasi tanpa signature hanya di-ACK dan tidak menyentuh transaksi.
- Webhook pembayaran asli tetap wajib memiliki signature HMAC-SHA256 yang valid.
- Submenu **Alat Toko** (Lisensi, Statistik, Backup, Maintenance) berada di dalam **Pengaturan → Pengaturan Toko**.
- Produk dan setiap varian memiliki **Modal Supplier** default.
- Modal default disalin sebagai snapshot ketika pembeli checkout, sehingga perubahan modal berikutnya tidak mengubah transaksi lama.
- Pada setiap penjualan tersedia tombol **Atur Modal** untuk memasukkan total modal supplier yang benar-benar dibayar pada checkout tersebut.
- Dashboard menampilkan profit hari ini, bulan ini, total profit, modal, omzet bersih, dan profit per transaksi.
- Prefix `AUTOGOPAY` tetap disembunyikan pada Invoice/Trx ID yang dilihat pembeli dan owner.

## Rumus profit

```text
Omzet bersih = Total dibayar pembeli - fee pembayaran
Profit kotor = Omzet bersih - total modal supplier transaksi
```

Profit dapat bernilai negatif apabila modal lebih besar daripada omzet bersih. Angka ini belum mengurangi biaya operasional lain seperti iklan, server, atau gaji.

## 1. Jalankan SQL v60 (wajib)

Buka:

```text
Supabase → SQL Editor → New query
```

Jalankan isi file:

```text
supabase/update-v60-profit-modal.sql
```

SQL menambahkan kolom modal produk, snapshot modal pending order, modal transaksi, sumber modal, waktu koreksi, fee pembayaran, dan profit.

Untuk instalasi baru dari nol, jalankan `supabase/schema.sql`. Jika database lama belum pernah menjalankan pembaruan AutoGoPay v55, jalankan juga `supabase/update-v55-autogopay.sql` sebelum v60.

## 2. Environment Variables Vercel

Pastikan environment **Production** memiliki:

```env
PAYMENT_PROVIDER=autogopay
AUTOGOPAY_API_KEY=API_KEY_DARI_AUTOGOPAY
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_REDIRECT_URL=https://telegram-ilinkin-store-fix.vercel.app
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller
WEBHOOK_SECRET=RAHASIA_RANDOM_BARU_TANPA_SPASI
```

Masukkan hanya nilainya pada kolom Value. Jangan menambahkan tanda kutip atau spasi di awal/akhir.

## 3. Upload dan deploy

1. Ekstrak ZIP v60.
2. Unggah seluruh isi folder `store_fix_v60` ke root repository GitHub.
3. Commit perubahan.
4. Di Vercel pilih **Redeploy** tanpa build cache.
5. Tunggu status menjadi **Ready**.

## 4. Pastikan v60 aktif

Buka:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/payment-webhook
```

Respons harus memuat:

```json
{
  "ok": true,
  "version": "v60-profit-cost-autogopay-fix",
  "active_provider": "autogopay"
}
```

## 5. Daftarkan ulang callback AutoGoPay

Ganti `WEBHOOK_SECRET_ANDA` dengan nilai `WEBHOOK_SECRET` baru yang tersimpan di Vercel:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/setup-autogopay?secret=WEBHOOK_SECRET_ANDA
```

Respons berhasil akan menampilkan `ok: true` dan callback URL yang berisi:

```text
/api/payment-webhook?provider=autogopay&verify=1
```

Query `verify=1` hanya membantu proses verifikasi callback. Webhook pembayaran asli dengan signature valid tetap diproses normal.

## 6. Pasang ulang webhook Telegram bila diperlukan

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=WEBHOOK_SECRET_ANDA
```

## 7. Cara mengatur modal agar persis per konsumen

### Modal default untuk transaksi berikutnya

```text
Dashboard Reseller → Produk → Edit Produk
```

- Produk tanpa varian: isi **Modal Supplier / Item**.
- Produk dengan varian: isi **Modal Supplier** pada masing-masing varian.

Saat pembeli checkout, sistem menyimpan modal saat itu sebagai snapshot.

### Koreksi modal checkout tertentu

```text
Dashboard Reseller → Penjualan → pilih transaksi → Atur Modal
```

Masukkan **total modal supplier untuk seluruh jumlah item pada invoice tersebut**. Contoh:

```text
Pembeli membeli 3 item
Total yang dibayar ke supplier = Rp28.500
Isi Modal Total Aktual = 28500
```

Sistem langsung menghitung ulang modal per item dan profit transaksi. Perubahan ini hanya berlaku untuk invoice tersebut.

## Troubleshooting AutoGoPay 502

- Pastikan endpoint `/api/payment-webhook` sudah menampilkan versi v60.
- Pastikan `PAYMENT_PROVIDER=autogopay` dan API key berada pada Production.
- Setelah mengubah Environment Variables, selalu redeploy.
- Jalankan kembali endpoint `/api/setup-autogopay?secret=...` setelah deployment Ready.
- Periksa **Vercel → Logs** bila respons masih gagal; respons v60 menyertakan status preflight dan riwayat percobaan upstream.
- Buat invoice baru untuk pengujian.

## Keamanan

- Jangan menaruh API key atau secret di GitHub.
- Karena secret setup pernah ditulis di percakapan, ganti `WEBHOOK_SECRET` dengan nilai baru lalu redeploy.
- ID internal AutoGoPay tetap disimpan untuk verifikasi, tetapi prefix tidak ditampilkan ke pembeli.
