# Perubahan v64

Versi: `v64-ui-promo-bot-menu-broadcast`

## Penjualan

- Badge status dipindahkan ke baris yang sama dengan nama produk/varian.
- Tata letak tetap stabil untuk nama yang panjang.
- Dialog konfirmasi menggunakan kalimat tindakan yang lebih jelas:
  - **Ya, Tandai Dibatalkan**
  - **Ya, Tandai Selesai**
  - **Kembali**

## Users

- Informasi identitas, jumlah transaksi, dan spending dipisahkan menjadi kolom yang jelas.
- Spending digeser ke sisi kanan pada layar yang cukup lebar.
- Pada layar sedang dan kecil, tata letak mengikuti kartu ringkas seperti HP.
- Tombol Hapus dibuat lebih pendek dan tidak mendominasi kartu.

## Promo dan Voucher

- Submenu dipadatkan menjadi Daftar, Buat, dan Flash Sale.
- Daftar voucher/promo memakai kartu ringkas dengan nilai diskon yang menonjol.
- Target, syarat, penggunaan, status, dan tindakan tetap terlihat tanpa membuat kartu terlalu tinggi.
- Alias diskon persen (`percent`, `percentage`, `persen`, `%`) dinormalisasi.
- Perhitungan persen dibatasi maksimal 100% dan tidak dapat memotong melebihi subtotal.
- SQL v64 memperbaiki data diskon lama serta menambahkan constraint database.

## Pengaturan tombol bot

Pengaturan Toko sekarang memiliki tiga pilihan:

- Marketplace + Daftar Produk
- Marketplace saja
- Daftar Produk saja

Pengaturan diterapkan pada keyboard pesan `/start`.

## Broadcast

- Ditambahkan opsi tombol **🛒 Order Sekarang**.
- Tujuan tombol dapat dipilih:
  - Marketplace melalui Web App.
  - Daftar Produk melalui callback Telegram.
- Mendukung broadcast teks, foto, dan stiker.
- Opsi dapat dinonaktifkan sehingga broadcast tetap dikirim tanpa tombol.

## Database

File baru:

```text
supabase/update-v64-percentage-discount.sql
```

Tidak ada tabel baru. Migration hanya menormalisasi dan memvalidasi kolom diskon yang sudah digunakan.
