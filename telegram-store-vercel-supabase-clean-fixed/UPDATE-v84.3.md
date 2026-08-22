# UPDATE v84.3

1. Deploy source v84.3.
2. Tidak ada SQL tambahan untuk perubahan stop/no-auto-retry karena kolom/statistik dari v84.2 sudah digunakan.
3. Setelah deploy, workflow yang gagal akan berhenti pada `ATTENTION`.
4. Tidak ada retry otomatis walaupun supplier sedang sibuk.
5. Pembeli hanya menerima notifikasi kendala satu kali per invoice.
6. Owner dapat memeriksa chat supplier sebelum memilih retry manual dari Dashboard; sistem tidak akan memulai ulang sendiri.
