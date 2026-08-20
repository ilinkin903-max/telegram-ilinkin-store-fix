# AI Flow Assistant - Google Gemini (v82.6)

## Provider default
AI Flow Assistant sekarang memakai Google Gemini melalui endpoint OpenAI-compatible resmi.

- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai`
- Backend: `chat_completions`
- Model disarankan: `gemini-2.5-flash`
- Alternatif ringan: `gemini-2.5-flash-lite`

## Setup
1. Buka Google AI Studio > API Keys.
2. Buat/copy Gemini API key.
3. Buka iLink > Pengaturan > Supplier / Reseller > AI Flow Assistant · Google Gemini.
4. Masukkan API key.
5. Pilih model.
6. Klik Simpan Gemini.
7. Klik Tes Koneksi Gemini.

## Membuat flow
Di form produk Telegram Supplier, isi Instruksi Alur untuk AI dalam bahasa biasa, lalu klik Susun / Perbaiki Flow dengan AI.
AI membuat draft Flow Cek Stok, Stock Regex, Flow Order, dan Regex Hasil. Selalu periksa draft sebelum menyimpan.

## Keamanan
API key disimpan terenkripsi server-side. Jangan masukkan API key ke GitHub atau source code.
