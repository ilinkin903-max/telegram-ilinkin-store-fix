# UPDATE v84.5

1. Deploy source `link-auto-order-v84.5-full.zip`.
2. Tidak ada SQL migration baru.
3. Coba hapus workflow dari Dashboard seperti biasa.

Flow delete:
`restore link produk → hapus run-step history → hapus workflow run history → hapus workflow`

Jika workflow mempunyai history run, history tersebut ikut dihapus. Transaksi/order marketplace tetap aman karena berada di tabel terpisah.
