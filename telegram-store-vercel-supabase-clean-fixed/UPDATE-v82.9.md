# Link Auto Order v82.9

## Perubahan

- Tombol jumlah item pada workflow kini dinamis mengikuti `quantity` order.
- Contoh menu supplier `• 1 / • 2 / • 3 / • 4 / • 5`: saat customer membeli 3, runner menekan `• 3`; saat membeli 1, runner menekan `• 1`.
- Sistem otomatis mendeteksi menu tombol angka umum saat merekam; workflow lama juga mendapat fallback auto-detect sehingga tidak wajib direkam ulang.
- Pada dashboard recorder, tombol yang sudah direkam/diklik diberi highlight hijau. Jika merupakan tombol jumlah dinamis, ditandai sebagai jumlah otomatis.
- Pada Edit Step tersedia daftar tombol yang tersimpan dari pesan bot. Tombol dapat dipilih kembali tanpa mengetik manual.
- Workflow yang disalin mempertahankan snapshot tombol setiap pesan sehingga pilihan tombol tetap dapat diedit pada salinan.
- Ditambahkan `button_role` pada `reseller_workflow_steps`.
- Tidak mengubah atau menghapus produk, workflow, order, saldo, stok, maupun data lama.

## SQL

Jalankan sekali:

`supabase/update-v82.9-quantity-button-edit.sql`

Workflow lama tetap aman karena runtime melakukan auto-detect pada menu angka; kolom baru hanya menyimpan pengaturan eksplisit agar hasil salinan/edit lebih presisi.
