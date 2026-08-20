# Vinnstore - Alight Motion test flow (v82.4)

Flow ini dibuat untuk alur:

1. `/start`
2. pilih tombol keyboard nomor 2 (`ALIGHT MOTION`)
3. jika jumlah = 1: langsung `Buy(Saldo)`
4. jika jumlah > 1: klik `📝`, kirim jumlah, lalu `Buy(Saldo)`
5. klik `⏭️ Skip`
6. klik `✅ Konfirmasi & proses`
7. tunggu pesan yang berisi `〔 ACCOUNT DETAIL 〕`
8. kirim ke pembeli hanya teks setelah marker tersebut

## Flow Order

```json
[
  {"type":"start"},
  {"type":"click","button_index":2,"expect_text":"ALIGHT MOTION"},
  {"type":"click","text":"📝","when":{"quantity_gt":1}},
  {"type":"send","text":"{{quantity}}","when":{"quantity_gt":1}},
  {"type":"click","regex":"/Buy\\s*\\(Saldo\\)/i"},
  {"type":"click","text":"⏭️ Skip"},
  {"type":"click","text":"✅ Konfirmasi & proses","commit":true,"wait_after":false},
  {
    "type":"wait",
    "contains":"〔 ACCOUNT DETAIL 〕",
    "capture_delivery":true,
    "delivery_regex":"/〔 ACCOUNT DETAIL 〕\\s*([\\s\\S]*)/i",
    "timeout_ms":45000
  }
]
```

`button_index` adalah nomor tombol mulai dari 1, dibaca dari kiri ke kanan dan dari baris atas ke bawah.

Jika hasil supplier seperti:

```text
〔 ACCOUNT DETAIL 〕
1. Email: 454.jurijsoligorsk@textsave.net
- Password: akses buka https://generator.email/jurijsoligorsk@textsave.net
```

maka yang disimpan/dikirim ke pembeli hanya:

```text
1. Email: 454.jurijsoligorsk@textsave.net
- Password: akses buka https://generator.email/jurijsoligorsk@textsave.net
```

Untuk uji awal, gunakan jumlah 1 dahulu dan saldo supplier secukupnya. Pastikan tombol/teks bot supplier benar-benar sama; jika berubah, sesuaikan `text` atau `regex` pada flow.


## Flow Cek Stok

Jika setelah `/start` keyboard supplier menampilkan tombol seperti:

```text
ALIGHT MOTION (74)
```

gunakan Flow Cek Stok:

```json
[
  {"type":"start"},
  {"type":"capture","source":"buttons"}
]
```

Dan isi **Stock Regex**:

```text
ALIGHT\s*MOTION\s*\((\d+)\)
```

Angka di grup pertama akan dibaca sebagai stok. Contoh `ALIGHT MOTION (74)` menghasilkan stok `74`. `source:"buttons"` membaca teks keyboard tanpa perlu menekan tombol produk.
