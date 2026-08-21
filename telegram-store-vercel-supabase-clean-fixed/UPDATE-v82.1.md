# Update Link Auto Order v82.0 → v82.1.0

1. Jalankan `supabase/update-v82.1-multi-message-recorder.sql` di Supabase SQL Editor.
2. Upload isi patch v82.1 ke root repository dan timpa file lama.
3. Redeploy Vercel. Tidak ada Environment Variable baru.
4. Buka Dashboard → Pengaturan → Workflow Reseller.
5. Bila supplier mengirim beberapa pesan, pilih pesan yang ingin direkam sebelum melanjutkan.
6. Untuk step jumlah, pilih **Kategori Step Teks → Jumlah Pembelian**. Jangan ketik angka tetap atau `{quantity}` manual.

Migration v82.1 tidak menghapus data lama. Workflow v82 yang sudah ada tetap kompatibel; step lama dengan `{quantity}` akan dibackfill sebagai kategori `quantity`.
