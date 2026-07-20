# Pengaturan Singkat Marketplace

Gunakan nilai berikut untuk domain Anda:

```text
PUBLIC_URL=https://telegram-ilinkin-store-fix.vercel.app
STORE_URL=https://telegram-ilinkin-store-fix.vercel.app
MINIAPP_URL=https://telegram-ilinkin-store-fix.vercel.app/reseller
```

Setelah deploy:

1. Buka `https://telegram-ilinkin-store-fix.vercel.app/` untuk melihat katalog publik.
2. Kirim `/start` ke bot untuk membuka marketplace sebagai Telegram Web App.
3. Checkout hanya dapat dilakukan dari Telegram agar sistem mengetahui `telegram_id` tujuan pengiriman produk.
4. Buka `/reseller` dari tombol owner untuk mengelola produk, stok, promo, voucher, dan penjualan.
5. Isi `image_url` produk dengan URL HTTPS atau link berbagi Google Drive publik.
