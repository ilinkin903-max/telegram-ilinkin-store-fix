from pathlib import Path
p=Path('/mnt/data/v34/lib/botHandlers.js')
s=p.read_text()
insert="""
function escapeMarkdownText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[');
}

function formatProductInfoText(value, maxLength = 900) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text === '-') return '-';
  const clean = text.length > maxLength ? text.slice(0, maxLength).trim() + '\n...': text;
  return escapeMarkdownText(clean);
}
"""
needle="""function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\\"/g, '&quot;');
}
"""
if insert.strip() not in s:
    s=s.replace(needle, needle+insert)
old="""  const text = '*DAFTAR PRODUK*\\n=======================\\nPilih produk. Jika ada varian, pilih varian lalu langsung atur jumlah beli.';"""
new="""  const text = '*DAFTAR PRODUK*\\n=======================\\nPilih produk. Deskripsi dan syarat ketentuan akan tampil sebelum pembayaran.';"""
s=s.replace(old,new)
old_conf="""  const bulk = formatBulkText(product, variant);
  return `*KONFIRMASI PESANAN*
` +
    `=======================
` +
    `Produk: *${product.nama}*
` +
    `Varian: *${variant ? variant.name : (order.variant_name || 'Default')}*
` +
    `Harga Satuan: *${formatRupiah(unit)}*
` +
    `Harga Grosir:
${bulk}
` +
    `Stok Tersedia: *${availableStockForOrder(product, order)}*
` +
    `-----------------------
` +
"""
new_conf="""  const bulk = formatBulkText(product, variant);
  const desc = formatProductInfoText(variantDescription(product, variant));
  const terms = formatProductInfoText(variantTerms(product, variant));
  return `*KONFIRMASI PESANAN*
` +
    `=======================
` +
    `Produk: *${escapeMarkdownText(product.nama)}*
` +
    `Varian: *${escapeMarkdownText(variant ? variant.name : (order.variant_name || 'Default'))}*
` +
    `Harga Satuan: *${formatRupiah(unit)}*
` +
    `Harga Grosir:
${bulk}
` +
    `Deskripsi Produk:
${desc}

` +
    `Syarat & Ketentuan:
${terms}
` +
    `-----------------------
` +
    `Stok Tersedia: *${availableStockForOrder(product, order)}*
` +
    `-----------------------
` +
"""
if old_conf not in s:
    raise SystemExit('old_conf not found')
s=s.replace(old_conf,new_conf)
old_variant_msg="""    return editMessage(query, `📦 *${product.nama}*
=======================
Pilih varian produk yang ingin dibeli. Setelah memilih varian, kamu langsung mengatur jumlah beli.`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
"""
new_variant_msg="""    return editMessage(query, `📦 *${escapeMarkdownText(product.nama)}*
=======================
Pilih varian produk yang ingin dibeli. Setelah memilih varian, deskripsi dan syarat ketentuan akan tampil di halaman konfirmasi sebelum pembayaran.`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: rows }
    });
"""
s=s.replace(old_variant_msg,new_variant_msg)
p.write_text(s)
