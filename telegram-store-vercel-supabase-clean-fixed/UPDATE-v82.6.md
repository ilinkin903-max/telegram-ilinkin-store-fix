# Update ke v82.6.0

1. Deploy seluruh source v82.6 ke Vercel.
2. Buka Supabase SQL Editor.
3. Jalankan `supabase/update-v82.6-step-timeout-maintenance.sql` satu kali.
4. Buka Dashboard → Pengaturan → Workflow Reseller → Edit Step untuk mengatur **Waktu Tunggu Step Ini**. Kosongkan jika ingin mengikuti default workflow.
5. Buka Dashboard → Pengaturan → Pengaturan Toko untuk mengatur **Bot ON/OFF** dan **Pesan Saat Bot OFF**.

Contoh pesan maintenance:

```text
🛠️ Bot sedang maintenance sementara.

Layanan sedang dinonaktifkan selama ±15 menit untuk proses pemeliharaan. Silakan coba kembali setelah maintenance selesai.

Terima kasih atas pengertiannya.
```
