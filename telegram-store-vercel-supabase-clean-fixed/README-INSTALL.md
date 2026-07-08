# Admin UI v26 - Backup, Import, Promo Otomatis, Statistik Lanjutan

## Cara pasang

1. Upload semua isi folder/ZIP ini ke GitHub.
2. Redeploy project di Vercel.
3. Jalankan SQL update di Supabase:

```sql
-- Buka file supabase/update-owner-tools.sql lalu jalankan semua isinya di SQL Editor.
```

4. Setelah Vercel Ready, pasang ulang webhook:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123
```

Ganti `abc123` sesuai `WEBHOOK_SECRET` kamu.

## Fitur Backup

Mini App > tab **Backup**:

- **Download Backup**: download file JSON ke perangkat admin.
- **Kirim Backup ke Telegram**: bot mengirim file backup ke OWNER_ID.
- **Import Backup**: paste isi file JSON backup lalu import.

Auto backup harian dikirim ke owner sekitar jam 00.00 WIB lewat endpoint:

```text
/api/backup-cron
```

`vercel.json` sudah ditambahkan Cron:

```json
{"path":"/api/backup-cron","schedule":"0 17 * * *"}
```

## Fitur Promo Otomatis

Mini App > tab **Promo**:

- Bisa buat promo nominal atau persen.
- Bisa target semua produk atau kode produk tertentu.
- Bisa min jumlah, min belanja, periode mulai/berakhir, dan limit pemakaian.
- Promo otomatis dipakai saat checkout jika user tidak memakai voucher manual.

## Statistik Lebih Dalam

Mini App > tab **Statistik+**:

- Omset hari ini
- Omset bulan ini
- Total omset
- Rata-rata order
- Total item terjual
- Conversion estimate
- Promo aktif
- Pending order
- Stok hampir habis
- Top user
- Jam ramai order

## Catatan

- Jalankan `supabase/update-owner-tools.sql` agar tabel `auto_promos` dan `backup_logs` tersedia.
- Jangan simpan gambar langsung di database. Gunakan URL gambar.
- Sebelum import backup, sebaiknya download backup terbaru dulu.
