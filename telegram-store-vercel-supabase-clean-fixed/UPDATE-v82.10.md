# Link Auto Order v82.10

## Perbaikan tombol supplier dinamis

- Label tombol dengan stok/dynamic count seperti `PRIVATE (6)` sekarang dicocokkan secara semantik. Saat stok berubah menjadi `PRIVATE (23)`, workflow tetap menemukan tombol yang sama.
- Status bullet pilihan seperti `• Individual` dan `○ Individual` sekarang dianggap tombol yang sama saat runtime dan saat pencocokan respons.
- Recorder menyimpan `row`, `col`, `match_key`, dan callback `data` bila tersedia pada snapshot tombol. Runtime memprioritaskan callback/posisi yang direkam, lalu fallback ke label semantik.
- Quantity button tetap memakai resolusi khusus `quantity`, sehingga `1..5` tetap mengikuti jumlah order.
- Snapshot workflow hasil salinan tetap membawa daftar tombol sehingga tombol dapat diedit/dipilih kembali.
- Tidak perlu migration Supabase baru karena metadata tambahan disimpan di `source_message_snapshot` yang sudah ada. Workflow v82.9 cukup di-deploy ulang dengan source v82.10.

## Validasi

- Test relevan v82.8 + v82.9 + dynamic-label: 14/14 lulus.
- Suite project: 210 test lulus, 5 test tidak dapat dimuat karena dependency sandbox `axios`/`dotenv` belum terpasang.
