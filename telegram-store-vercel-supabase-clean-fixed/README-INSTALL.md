# Telegram Store Vercel Supabase - Admin UI v6

Update ini mempertahankan UI Admin Dashboard sebelumnya dan menambahkan pemisahan fungsi tombol produk:

- **Edit**: mengubah data produk dan data varian selain stok.
- **Stok**: menambahkan stok baru, termasuk stok per varian.
- **Kelola**: mengganti/mengelola stok yang ada, termasuk stok per varian.
- Pada tambah produk, stok default/non-varian disembunyikan saat varian produk diaktifkan.
- Tampilan stok produk di bot Telegram tidak menampilkan kode produk.

## Pasang

1. Upload isi ZIP ke GitHub.
2. Redeploy Vercel.
3. Buka ulang webhook:

```text
https://telegram-ilinkin-store-fix.vercel.app/api/set-webhook?secret=abc123
```

Ganti `abc123` sesuai `WEBHOOK_SECRET` milikmu.
