# Google Gemini AI Flow Assistant - v82.6

## 1. Buat API key
Buka Google AI Studio > API Keys dan buat API key baru. Gunakan key baru/auth key jika tersedia.

## 2. Dashboard iLink
Buka Pengaturan > Supplier / Reseller > AI Flow Assistant · Google Gemini.

Isi:
- Model: `gemini-2.5-flash` (disarankan)
- Gemini API Key: API key dari AI Studio

Base URL dan backend diatur otomatis oleh iLink.

Klik **Simpan Gemini**, lalu **Tes Koneksi Gemini**.

## 3. Buat flow supplier
Di produk Telegram Supplier, tulis langkah bot pada Instruksi Alur untuk AI lalu klik **Susun / Perbaiki Flow dengan AI**.
Periksa Flow Cek Stok, Stock Regex, Flow Order, dan Regex Hasil sebelum menyimpan.

## Keamanan
API key disimpan terenkripsi server-side. Jangan commit API key ke GitHub.

## v82.8 - Model otomatis dari Google
Jika model default tidak tersedia untuk API key/project Anda, klik **Muat Model dari Google**. Dashboard akan membaca `/v1beta/openai/models`, memilih model teks yang tersedia, lalu **Tes Koneksi Gemini** akan menggunakan model tersebut. Tidak perlu menebak nama model secara manual.
