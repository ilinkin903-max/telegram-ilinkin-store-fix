from pathlib import Path
root=Path('/mnt/data/v28work')
# Patch db.js
p=root/'lib/db.js'
s=p.read_text()
# Replace addVoucher/updateVoucher/voucherIsValid and add voucherDiscountAmount
start=s.index('async function addVoucher(input)')
end=s.index('async function listTransactions', start)
new=r'''async function addVoucher(input) {
  const code = String(input.kode || input.code || '').trim().toUpperCase();
  const existing = code ? await getVoucher(code).catch(() => null) : null;
  const discountType = String(input.discount_type || input.tipe_diskon || existing?.discount_type || 'amount').toLowerCase() === 'percent' ? 'percent' : 'amount';
  const discountValue = Number(input.discount_value ?? input.potongan ?? input.discount ?? existing?.discount_value ?? existing?.discount ?? 0);
  const payload = {
    code,
    products: parseVoucherProducts(input.produk ?? input.products),
    discount: discountValue,
    discount_type: discountType,
    discount_value: discountValue,
    min_qty: Math.max(1, Number(input.min_qty || existing?.min_qty || 1)),
    min_spend: Math.max(0, Number(input.min_spend || existing?.min_spend || 0)),
    usage_limit: Math.max(0, Number(input.limit ?? input.usage_limit ?? existing?.usage_limit ?? 0)),
    used_by: Array.isArray(input.used_by) ? input.used_by.map(Number) : (Array.isArray(existing?.used_by) ? existing.used_by : []),
    description: String(input.description || input.deskripsi || existing?.description || ''),
    active: input.active === undefined ? (existing?.active ?? true) : Boolean(input.active),
    start_at: input.start_at || input.mulai || existing?.start_at || null,
    expires_at: input.expires_at || input.end_at || input.expired_at || existing?.expires_at || null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('vouchers').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  return data;
}

async function updateVoucher(code, updates = {}) {
  const currentCode = String(code || '').trim().toUpperCase();
  if (!currentCode) return null;
  const current = await getVoucher(currentCode);
  if (!current) return null;
  const nextCode = String(updates.kode || updates.code || currentCode).trim().toUpperCase();
  const discountType = updates.discount_type !== undefined || updates.tipe_diskon !== undefined ? (String(updates.discount_type || updates.tipe_diskon).toLowerCase() === 'percent' ? 'percent' : 'amount') : (current.discount_type || 'amount');
  const discountValue = updates.discount_value !== undefined || updates.potongan !== undefined || updates.discount !== undefined ? Number(updates.discount_value ?? updates.potongan ?? updates.discount) : Number(current.discount_value ?? current.discount ?? 0);
  const payload = {
    code: nextCode,
    products: updates.produk !== undefined || updates.products !== undefined ? parseVoucherProducts(updates.produk ?? updates.products) : (Array.isArray(current.products) ? current.products : []),
    discount: discountValue,
    discount_type: discountType,
    discount_value: discountValue,
    min_qty: updates.min_qty !== undefined ? Math.max(1, Number(updates.min_qty || 1)) : Math.max(1, Number(current.min_qty || 1)),
    min_spend: updates.min_spend !== undefined ? Math.max(0, Number(updates.min_spend || 0)) : Math.max(0, Number(current.min_spend || 0)),
    usage_limit: updates.limit !== undefined || updates.usage_limit !== undefined ? Math.max(0, Number(updates.limit ?? updates.usage_limit ?? 0)) : Number(current.usage_limit || 0),
    used_by: Array.isArray(current.used_by) ? current.used_by : [],
    description: updates.description !== undefined || updates.deskripsi !== undefined ? String(updates.description ?? updates.deskripsi) : String(current.description || ''),
    active: updates.active === undefined ? (current.active ?? true) : Boolean(updates.active),
    start_at: updates.start_at !== undefined || updates.mulai !== undefined ? (updates.start_at || updates.mulai || null) : (current.start_at || null),
    expires_at: updates.expires_at !== undefined || updates.end_at !== undefined || updates.expired_at !== undefined ? (updates.expires_at || updates.end_at || updates.expired_at || null) : (current.expires_at || null),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb().from('vouchers').upsert(payload, { onConflict: 'code' }).select('*').single();
  if (error) throw error;
  if (nextCode !== currentCode) await deleteVoucher(currentCode);
  return data;
}

async function deleteVoucher(code) {
  const { error } = await sb().from('vouchers').delete().ilike('code', String(code || '').trim());
  if (error) throw error;
}

async function listVouchers(limit = 100) {
  const { data, error } = await sb()
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 100);
  if (error) throw error;
  return data || [];
}

function voucherDiscountAmount(voucher, subtotal) {
  const raw = Number(voucher?.discount_value ?? voucher?.discount ?? 0);
  if (String(voucher?.discount_type || 'amount') === 'percent') return Math.min(Number(subtotal || 0), Math.floor(Number(subtotal || 0) * raw / 100));
  return Math.min(Number(subtotal || 0), raw);
}

function voucherIsValid(voucher, productCode, telegramId, quantity = 1, subtotal = 0) {
  if (!voucher) return false;
  const products = Array.isArray(voucher.products) ? voucher.products : [];
  const usedBy = Array.isArray(voucher.used_by) ? voucher.used_by : [];
  const productAllowed = products.length === 0 || products.map((p) => String(p).toUpperCase()).includes(String(productCode).toUpperCase());
  const now = Date.now();
  const afterStart = !voucher.start_at || new Date(voucher.start_at).getTime() <= now;
  const notExpired = !voucher.expires_at || new Date(voucher.expires_at).getTime() > now;
  const active = voucher.active === undefined ? true : Boolean(voucher.active);
  const enoughQty = Number(quantity || 1) >= Number(voucher.min_qty || 1);
  const enoughSpend = Number(subtotal || 0) >= Number(voucher.min_spend || 0);
  return active && afterStart && notExpired && productAllowed && enoughQty && enoughSpend && Number(voucher.usage_limit || 0) > 0 && !usedBy.map(Number).includes(Number(telegramId));
}

'''
s=s[:start]+new+s[end:]
# export voucherDiscountAmount
s=s.replace('  getVoucher,\n  voucherIsValid,', '  getVoucher,\n  voucherIsValid,\n  voucherDiscountAmount,')
p.write_text(s)

# Patch botHandlers voucher calls
p=root/'lib/botHandlers.js'
s=p.read_text()
old="""  if (pending?.status === 'waiting_voucher') {\n    const voucherCode = text.toUpperCase().trim();\n    const voucher = await db.getVoucher(voucherCode);\n    const valid = db.voucherIsValid(voucher, pending.product_code, from.id);\n    if (!valid) {\n      return tg.sendMessage(chatId, '⚠️ Voucher tidak valid, sudah habis, sudah pernah kamu pakai, atau tidak cocok dengan produk ini.');\n    }\n    await db.upsertPendingOrder({ ...pending, voucher_code: voucher.code, status: 'ready_to_pay' });\n    return tg.sendMessage(chatId, `✅ Voucher *${voucher.code}* berhasil dipasang. Potongan: *${formatRupiah(voucher.discount)}*`, {\n      parse_mode: 'Markdown',\n      reply_markup: { inline_keyboard: [[{ text: '💸 Lanjut Bayar', callback_data: 'bayar' }], [{ text: '❌ Batal', callback_data: 'batalbeli' }]] }\n    });\n  }\n"""
new="""  if (pending?.status === 'waiting_voucher') {\n    const voucherCode = text.toUpperCase().trim();\n    const voucher = await db.getVoucher(voucherCode);\n    const product = await db.getProductByCode(pending.product_code).catch(() => null);\n    const qty = Number(pending.quantity || 1);\n    const subtotal = product ? qty * orderUnitPrice(product, pending) : Number(pending.amount || 0);\n    const valid = db.voucherIsValid(voucher, pending.product_code, from.id, qty, subtotal);\n    if (!valid) {\n      return tg.sendMessage(chatId, '⚠️ Voucher tidak valid, belum aktif, sudah habis, syarat minimal belum terpenuhi, sudah pernah kamu pakai, atau tidak cocok dengan produk ini.');\n    }\n    const discount = db.voucherDiscountAmount(voucher, subtotal);\n    await db.upsertPendingOrder({ ...pending, voucher_code: voucher.code, status: 'ready_to_pay' });\n    return tg.sendMessage(chatId, `✅ Voucher *${voucher.code}* berhasil dipasang. Potongan: *${formatRupiah(discount)}*`, {\n      parse_mode: 'Markdown',\n      reply_markup: { inline_keyboard: [[{ text: '💸 Lanjut Bayar', callback_data: 'bayar' }], [{ text: '❌ Batal', callback_data: 'batalbeli' }]] }\n    });\n  }\n"""
if old not in s: print('old waiting voucher not found')
s=s.replace(old,new)
old="""  if (db.voucherIsValid(voucher, product.kode, userId)) {\n    harga -= Number(voucher.discount || 0);\n  } else {\n"""
new="""  if (db.voucherIsValid(voucher, product.kode, userId, Number(order.quantity || 1), harga)) {\n    harga -= db.voucherDiscountAmount(voucher, harga);\n  } else {\n"""
if old not in s: print('old payment voucher not found')
s=s.replace(old,new)
p.write_text(s)

# Patch reseller-data add/edit voucher
p=root/'api/reseller-data.js'
s=p.read_text()
s=s.replace("""    if (action === 'add-voucher') {
      const code = String(body.kode || '').trim().toUpperCase();
      const produk = String(body.produk || body.products || 'semua').trim();
      const potongan = numberOf(body.potongan || body.discount);
      const limit = numberOf(body.limit || body.usage_limit);
      if (!code || !potongan || !limit) return json(res, 400, { ok: false, error: 'Kode, potongan, dan limit voucher wajib diisi.' });
      const voucher = await db.addVoucher({ kode: code, produk, potongan, limit, description: body.description || '', active: body.active === undefined ? true : boolOf(body.active), expires_at: body.expires_at || null });
      return json(res, 200, { ok: true, data: voucher });
    }
""", """    if (action === 'add-voucher') {
      const code = String(body.kode || body.code || '').trim().toUpperCase();
      const produk = String(body.produk || body.products || 'semua').trim();
      const discountValue = numberOf(body.discount_value || body.potongan || body.discount);
      const limit = numberOf(body.limit || body.usage_limit);
      if (!code || !discountValue || !limit) return json(res, 400, { ok: false, error: 'Kode, nilai diskon, dan limit voucher wajib diisi.' });
      const voucher = await db.addVoucher({
        kode: code,
        produk,
        discount_type: body.discount_type || 'amount',
        discount_value: discountValue,
        potongan: discountValue,
        min_qty: body.min_qty || 1,
        min_spend: body.min_spend || 0,
        limit,
        description: body.description || '',
        active: body.active === undefined ? true : boolOf(body.active),
        start_at: body.start_at || null,
        expires_at: body.expires_at || body.end_at || null
      });
      return json(res, 200, { ok: true, data: voucher });
    }
""")
s=s.replace("""        potongan: body.potongan || body.discount,
        limit: body.limit || body.usage_limit,
        description: body.description || body.deskripsi,
        active: boolOf(body.active),
        expires_at: body.expires_at || null
""", """        discount_type: body.discount_type || 'amount',
        discount_value: body.discount_value || body.potongan || body.discount,
        potongan: body.discount_value || body.potongan || body.discount,
        min_qty: body.min_qty || 1,
        min_spend: body.min_spend || 0,
        limit: body.limit || body.usage_limit,
        description: body.description || body.deskripsi,
        active: boolOf(body.active),
        start_at: body.start_at || null,
        expires_at: body.expires_at || body.end_at || null
""")
p.write_text(s)

# Patch SQL schema/update voucher columns
for fname in ['supabase/update-owner-tools.sql','supabase/schema.sql']:
    p=root/fname
    s=p.read_text()
    marker="alter table public.vouchers add column if not exists expires_at timestamptz;"
    add="""alter table public.vouchers add column if not exists discount_type text not null default 'amount';
alter table public.vouchers add column if not exists discount_value integer not null default 0;
alter table public.vouchers add column if not exists min_qty integer not null default 1;
alter table public.vouchers add column if not exists min_spend integer not null default 0;
alter table public.vouchers add column if not exists start_at timestamptz;
update public.vouchers set discount_value = discount where coalesce(discount_value, 0) = 0 and coalesce(discount, 0) > 0;
"""
    if marker in s and 'public.vouchers add column if not exists discount_type' not in s:
        s=s.replace(marker, marker+'\n'+add)
    # Schema table create add columns after discount
    if fname.endswith('schema.sql') and 'discount_type text not null default' not in s:
        s=s.replace('  discount integer not null default 0,\n', "  discount integer not null default 0,\n  discount_type text not null default 'amount',\n  discount_value integer not null default 0,\n  min_qty integer not null default 1,\n  min_spend integer not null default 0,\n  start_at timestamptz,\n  expires_at timestamptz,\n")
    p.write_text(s)
