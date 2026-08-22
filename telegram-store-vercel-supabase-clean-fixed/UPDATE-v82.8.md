# UPDATE v82.8 — Multi Klik Tombol dalam Satu Pesan

Versi ini memperbaiki workflow untuk bot supplier/reseller yang menampilkan beberapa pilihan tombol pada **satu pesan Telegram yang sama**.

## Perubahan utama

- Satu pesan dapat dipakai untuk beberapa klik berurutan, misalnya **Paket → Durasi → Jumlah → Konfirmasi**.
- Klik yang tidak menghasilkan pesan baru otomatis disimpan sebagai **Lanjut di Pesan yang Sama**.
- Recorder tetap menampilkan pesan aktif dan tombol berikutnya meskipun klik sebelumnya tidak menghasilkan balasan baru.
- Saat replay order, step `same_message` tidak menunggu timeout normal; sistem memberi jeda callback singkat lalu menekan tombol berikutnya pada message ID yang sama.
- Jika tombol menyebabkan pesan diedit atau muncul pesan baru, perubahan tersebut tetap direkam seperti biasa.
- Mode setiap step dapat diedit manual dari **Edit Step → Setelah Step Ini**.
- Workflow salinan ikut membawa mode rangkaian tombol ini.
- Aktivasi workflow menolak step yang benar-benar belum mempunyai balasan kecuali step tersebut memang bertipe **Lanjut di Pesan yang Sama**.

## Cara update

1. Deploy source v82.8 ke Vercel.
2. Buka Supabase SQL Editor.
3. Jalankan `supabase/update-v82.8-same-message-button-chain.sql` satu kali.
4. Buka Dashboard → Workflow Reseller dan lakukan rekaman ulang untuk alur yang memakai beberapa tombol dalam satu pesan.

Migration hanya menambah metadata pada `reseller_workflow_steps`; tidak menghapus produk, order, saldo, workflow, atau data lama.
