const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeDateTime,
  discountAmount,
  promoState,
  promoEligible
} = require('../lib/promoUtils');
const db = require('../lib/db');

test('datetime-local dari panel dianggap WIB, bukan UTC', () => {
  assert.equal(normalizeDateTime('2026-07-19T01:30'), '2026-07-18T18:30:00.000Z');
  assert.equal(normalizeDateTime('2026-07-18T18:30:00.000Z'), '2026-07-18T18:30:00.000Z');
});

test('promo expired otomatis berstatus OFF', () => {
  const state = promoState({ active: true, end_at: '2026-07-18T10:00:00.000Z' }, { now: Date.parse('2026-07-18T11:00:00.000Z') });
  assert.equal(state.is_expired, true);
  assert.equal(state.effective_active, false);
  assert.equal(state.status, 'expired');
});

test('promo otomatis memenuhi target produk, jumlah, minimal belanja, dan limit', () => {
  const promo = {
    active: true,
    products: ['GEMINI'],
    discount_type: 'amount',
    discount_value: 5000,
    min_qty: 2,
    min_spend: 20000,
    usage_limit: 10,
    used_count: 2,
    start_at: '2020-01-01T00:00:00.000Z',
    end_at: '2099-01-01T00:00:00.000Z'
  };
  assert.equal(promoEligible(promo, { productCode: 'gemini', quantity: 2, subtotal: 30000 }), true);
  assert.equal(promoEligible(promo, { productCode: 'HOTMAIL', quantity: 2, subtotal: 30000 }), false);
  assert.equal(promoEligible(promo, { productCode: 'GEMINI', quantity: 1, subtotal: 30000 }), false);
  assert.equal(promoEligible({ ...promo, used_count: 10 }, { productCode: 'GEMINI', quantity: 2, subtotal: 30000 }), false);
});

test('potongan nominal dan persen benar-benar mengurangi subtotal', () => {
  assert.equal(discountAmount({ discount_type: 'amount', discount_value: 5000 }, 30000), 5000);
  assert.equal(discountAmount({ discount_type: 'percent', discount_value: 10 }, 30000), 3000);
  assert.equal(discountAmount({ discount_type: 'percent', discount_value: 150 }, 30000), 30000);
});

test('normalisasi promo menandai expired sebagai tidak efektif', () => {
  const promo = db.normalizePromo({
    code: 'EXPIRED',
    active: true,
    discount_type: 'amount',
    discount_value: 5000,
    end_at: '2000-01-01T00:00:00.000Z'
  });
  assert.equal(promo.active, true);
  assert.equal(promo.is_expired, true);
  assert.equal(promo.effective_active, false);
});

test('voucher valid sampai limit tercapai dan tidak bisa dipakai user yang sama', () => {
  const voucher = {
    code: 'HEMAT',
    active: true,
    products: ['GEMINI'],
    discount_type: 'amount',
    discount_value: 2500,
    min_qty: 1,
    min_spend: 0,
    usage_limit: 2,
    used_by: [100],
    expires_at: '2099-01-01T00:00:00.000Z'
  };
  assert.equal(db.voucherIsValid(voucher, 'GEMINI', 200, 1, 10000), true);
  assert.equal(db.voucherIsValid(voucher, 'GEMINI', 100, 1, 10000), false);
  assert.equal(db.voucherIsValid({ ...voucher, used_by: [100, 200] }, 'GEMINI', 300, 1, 10000), false);
  assert.equal(db.voucherIsValid({ ...voucher, expires_at: '2000-01-01T00:00:00.000Z' }, 'GEMINI', 200, 1, 10000), false);
});

test('promo dan voucher dapat menargetkan varian tertentu tanpa mengubah schema database', () => {
  const promo = {
    active: true,
    products: ['GEMINI::18-BULAN-INVITE'],
    discount_type: 'amount',
    discount_value: 4000,
    min_qty: 1,
    min_spend: 0,
    start_at: '2020-01-01T00:00:00.000Z',
    end_at: '2099-01-01T00:00:00.000Z'
  };

  assert.equal(promoEligible(promo, {
    productCode: 'GEMINI',
    variantKey: '18-BULAN-INVITE',
    quantity: 1,
    subtotal: 16000
  }), true);

  assert.equal(promoEligible(promo, {
    productCode: 'GEMINI',
    variantKey: '18-BULAN',
    quantity: 1,
    subtotal: 45000
  }), false);

  assert.equal(promoEligible({ ...promo, products: ['GEMINI'] }, {
    productCode: 'GEMINI',
    variantKey: '18-BULAN',
    quantity: 1,
    subtotal: 45000
  }), true);
});

test('voucher varian tertentu hanya valid pada varian yang dipilih', () => {
  const voucher = {
    code: 'INVITEONLY',
    active: true,
    products: ['GEMINI::18-BULAN-INVITE'],
    discount_type: 'amount',
    discount_value: 1000,
    min_qty: 1,
    min_spend: 0,
    usage_limit: 10,
    used_by: [],
    expires_at: '2099-01-01T00:00:00.000Z'
  };

  assert.equal(db.voucherIsValid(voucher, 'GEMINI', 200, 1, 16000, '18-BULAN-INVITE'), true);
  assert.equal(db.voucherIsValid(voucher, 'GEMINI', 200, 1, 45000, '18-BULAN'), false);
});

test('promo yang dipilih untuk Flash Sale hanya diizinkan selama jadwal Flash Sale aktif', () => {
  const promo = { code: 'FLASH10' };
  const base = {
    flash_sale_enabled: 'true',
    flash_sale_promo_codes: '["FLASH10"]',
    flash_sale_start_at: '2026-07-24T10:00:00.000Z',
    flash_sale_end_at: '2026-07-24T12:00:00.000Z'
  };

  assert.equal(db.promoAllowedByFlashSale(promo, base, Date.parse('2026-07-24T11:00:00.000Z')), true);
  assert.equal(db.promoAllowedByFlashSale(promo, base, Date.parse('2026-07-24T09:59:59.000Z')), false);
  assert.equal(db.promoAllowedByFlashSale(promo, base, Date.parse('2026-07-24T12:00:00.000Z')), false);
  assert.equal(db.promoAllowedByFlashSale(promo, { ...base, flash_sale_enabled: 'false' }, Date.parse('2026-07-24T11:00:00.000Z')), false);
});

test('promo biasa tetap diizinkan walaupun Flash Sale tidak aktif', () => {
  const settings = {
    flash_sale_enabled: 'false',
    flash_sale_promo_codes: '["FLASH10"]',
    flash_sale_start_at: '2026-07-24T10:00:00.000Z',
    flash_sale_end_at: '2026-07-24T12:00:00.000Z'
  };
  assert.equal(db.promoAllowedByFlashSale({ code: 'PROMOBIASA' }, settings, Date.parse('2026-07-24T11:00:00.000Z')), true);
});
