# v81
- Multi Telegram Userbot supplier connectors.
- Supabase queue dengan lock per supplier bot dan stale-lock recovery.
- Worker VPS Teleproto/MTProto dengan multi-slot concurrency.
- Flow engine configurable: start/send/click/wait/capture/sleep.
- Optional balance sync per connector.
- Telegram supplier product mapping ke produk/varian iLink.
- Live effective stock dari saldo snapshot + stok supplier.
- Automatic fulfillment queue after payment; bukan PO manual.
- Secure Vercel userbot bridge for final delivery to buyer.
- Retry Telegram supplier from Supplier / Reseller.

## Reliability / anti double-order
- Claim queue mengunci row connector + order agar dua worker tidak mengambil dua order pada bot supplier yang sama.
- Balance sync memakai RPC lock terpisah dan tidak berjalan bersamaan dengan order connector.
- Flow mendukung `commit:true`; timeout setelah saldo dipotong masuk `manual_review`, bukan auto-retry.
- Hasil akun/key disimpan sebelum retry bridge; retry delivery tidak membeli ulang ke supplier.
- Worker memakai Teleproto MTProto dan `floodSleepThreshold` untuk rate-limit pendek.
