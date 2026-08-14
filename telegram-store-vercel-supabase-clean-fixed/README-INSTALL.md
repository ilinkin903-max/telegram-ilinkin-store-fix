# v73 — Banner Bawaan, Promo Rapi & Cara Order Marketplace

Versi ini melanjutkan v72. Tidak ada SQL baru.

## Instalasi
1. Pastikan migrasi database sampai versi yang sudah Anda pakai (minimal v69 untuk fitur PO per varian) sudah terpasang.
2. Upload seluruh isi folder ini ke root repository GitHub.
3. Deploy ke Vercel Production tanpa build cache.
4. Buka `/reseller` → Pengaturan → Banner Promosi untuk mengatur banner.
5. Buka Marketplace dan cek tombol Cara Order sesuai mode tombol toko.

## Perubahan utama
- Judul promo tidak diduplikasi lagi di bagian bawah kartu.
- Tombol Edit/Hapus promo kembali berada di bagian bawah kartu.
- Banner gambar dan Banner Bawaan dapat dicampur dalam carousel yang sama.
- Banner Bawaan dapat diedit: teks kecil, judul, deskripsi, warna, posisi teks, tombol, dan aksi tombol.
- Urutan banner dapat dinaikkan/diturunkan dengan tombol ↑ ↓.
- Tombol Cara Order tersedia di Marketplace.
- Mode Marketplace saja: Cara Order hanya tampil di Marketplace.
- Mode Daftar Produk saja: Cara Order hanya tampil di bot.
- Mode Keduanya: Cara Order tampil di bot dan Marketplace.

Tidak ada perubahan SQL.
