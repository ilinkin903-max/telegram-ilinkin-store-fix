# Perubahan v66 — Referral Fix & Notifikasi Channel

## Penyebab saldo referral v65 tidak masuk

Pada v65, fungsi referral langsung berhenti ketika akun Telegram sudah pernah tersimpan di tabel `bot_users`. Akibatnya, akun uji yang pernah membuka bot sebelum v65 tidak dapat menghubungkan referral walaupun belum pernah memakai referral atau bertransaksi.

## Perbaikan referral

- User baru tetap dapat memberi bonus referral seperti sebelumnya.
- User yang sudah pernah tersimpan masih dapat memakai link referral apabila:
  - belum memiliki pengundang;
  - belum pernah menerima atau menunggu bonus referral;
  - belum pernah melakukan transaksi.
- Akun yang sudah pernah bertransaksi tidak dapat dipasang referral baru untuk mencegah penyalahgunaan.
- Referral diri sendiri tetap ditolak.
- Kode referral yang salah tidak mengunci user secara permanen; user dapat mencoba link yang benar.
- Kredit bonus menggunakan `wallet_ledger.entry_key` sebagai gerbang idempoten, sehingga bonus tidak dapat masuk dua kali.
- Dua update `/start` yang datang bersamaan dikunci melalui advisory lock database.
- User yang memakai link referral mendapat konfirmasi bahwa referral berhasil digunakan atau berhasil terhubung.

## Notifikasi channel

Channel menerima notifikasi ketika:

- bonus referral langsung berhasil masuk;
- bonus referral setelah pembelian pertama berhasil masuk;
- top up QRIS berhasil menambah Saldo Utama.

Environment Variable:

```env
WALLET_CHANNEL=@username_channel
```

Jika `WALLET_CHANNEL` kosong, sistem memakai `CHANNEL_LOG`. Bot harus menjadi admin atau memiliki izin mengirim pesan ke channel tersebut.

## Database

Jalankan:

```text
supabase/update-v66-referral-notifications-fix.sql
```

setelah SQL v65.
