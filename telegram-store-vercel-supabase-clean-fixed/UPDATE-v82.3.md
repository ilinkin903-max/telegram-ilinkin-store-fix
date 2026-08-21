# Update v82.2 → v82.3

1. **Jalankan SQL lebih dahulu**: `supabase/update-v82.3-workflow-editor-supplier-balance.sql`.
2. Upload isi patch v82.3 ke root repository dan timpa file lama.
3. Redeploy Vercel.
4. Buka Dashboard → Pengaturan → Supplier / Reseller.
5. Buat/Edit Supplier, isi nama, `@BotSupplier`, dan **Saldo Bot (Manual)**.
6. Buka Workflow Reseller. Edit workflow lama atau buat baru, pilih Supplier dan isi **Modal Produk / Item**.
7. Untuk produk bervarian, pilih langsung `Nama Produk — Nama Varian`.
8. Periksa step. Gunakan tombol Edit pada step jika ingin mengubah tombol/teks/kategori jumlah.
9. Tekan `Selesai & Aktifkan` setelah workflow benar.

### Cara stok dihitung
Contoh saldo manual Supplier 1 = Rp100.000 dan modal Canva 1 Bulan = Rp5.000:
`floor(100.000 / 5.000) = 20 stok`.

Jika 2 item berhasil dibeli, saldo manual dikurangi Rp10.000 menjadi Rp90.000 dan stok Canva menjadi 18. Sistem tidak mencoba membaca saldo asli bot supplier.

### Catatan keamanan
Edit workflow atau step aktif akan mengubahnya ke DRAFT. Ini disengaja agar order baru tidak menggunakan workflow yang sedang diedit. Setelah selesai, aktifkan kembali.
