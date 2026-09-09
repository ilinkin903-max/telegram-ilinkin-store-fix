const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('redeem sukses tidak lagi memanggil helper cachedProducts yang tidak ada', () => {
  const source = read('lib/botHandlers.js');
  const redeemStart = source.indexOf('async function processRedeemCode');
  const redeemEnd = source.indexOf('\nasync function beginTopup', redeemStart);
  const redeem = source.slice(redeemStart, redeemEnd);
  assert.ok(redeem.includes('await db.completeRedeemCode(code, from.id, invoice);'));
  assert.ok(redeem.includes('invalidateUserFastCache(from.id);'));
  assert.equal(redeem.includes('cachedProducts('), false);
  assert.ok(redeem.includes('let fulfillmentSucceeded = false;'));
  assert.ok(redeem.includes('fulfillmentSucceeded = true;'));
  assert.ok(redeem.includes('if (transaction && claimed)'));
  assert.ok(redeem.indexOf('if (transaction && claimed)') < redeem.lastIndexOf('Redeem gagal:'));
});

test('dashboard menyimpan pilihan GoPay atau ShopeePay di submenu Pengaturan', () => {
  const ui = read('api/reseller.js');
  const api = read('api/reseller-data.js');
  const db = read('lib/db.js');
  assert.ok(ui.includes('data-tab="paymentSettings"'));
  assert.ok(ui.includes('id="paymentSettingsForm"'));
  assert.ok(ui.includes('name="autogopay_payment_method"'));
  assert.ok(ui.includes('value="gopay"'));
  assert.ok(ui.includes('value="shopeepay"'));
  assert.ok(ui.includes('id="checkPaymentMethodStatus"'));
  assert.ok(api.includes("action === 'payment-method-status'"));
  assert.ok(api.includes('autogopay_payment_method: body.autogopay_payment_method === undefined ? undefined'));
  assert.ok(db.includes("autogopay_payment_method: 'gopay'"));
  assert.ok(db.includes("'autogopay_payment_method'"));
});

test('AutoGoPay ShopeePay create/status memakai endpoint dan order_sn sesuai dokumentasi', async () => {
  const paymentPath = path.join(ROOT, 'lib/paymentService.js');
  delete require.cache[paymentPath];
  const originalLoad = Module._load;
  const calls = [];
  let selectedMethod = 'shopeepay';

  const axiosMock = {
    post: async (url, body, options) => {
      calls.push({ kind: 'post', url, body, options });
      if (url.endsWith('/shopeepay/qris/create')) {
        return { data: { success: true, data: {
          amount: 50000,
          order_sn: '162264876479351110',
          qr_string: '000201SHOPEE',
          qr_url: 'https://v1-gateway.autogopay.site/shopeepay/qr/test',
          expiry_time: '2026-09-10 01:15:00'
        } } };
      }
      if (url.endsWith('/transactions')) {
        return { data: { success: true, data: { transactions: [] } } };
      }
      if (url.endsWith('/qris/generate')) {
        return { data: { success: true, data: {
          transaction_id: 'gopay-trx-1',
          order_id: 'AUTOGOPAY-1',
          amount: 50000,
          transaction_status: 'pending',
          qr_string: '000201GOPAY',
          qr_url: 'https://v1-gateway.autogopay.site/qris/gopay-trx-1/qr-code',
          checkout_url: 'https://autogopay.site/pay/test',
          expiry_time: '2026-09-10 01:15:00'
        } } };
      }
      throw new Error('Unexpected POST ' + url);
    },
    get: async (url, options) => {
      calls.push({ kind: 'get', url, options });
      if (url.endsWith('/shopeepay/status')) {
        return { data: { success: true, data: { connected: true, token_valid: true, store_id: '22864392' } } };
      }
      if (url.endsWith('/shopeepay/qris/status')) {
        assert.equal(options.params.order_sn, '162264876479351110');
        return { data: { success: true, data: {
          order_sn: '162264876479351110',
          status: 'success',
          order_status: 1,
          paid: true,
          amount: 50000,
          paid_at: '2026-09-10 01:00:00'
        } } };
      }
      throw new Error('Unexpected GET ' + url);
    }
  };

  const dbMock = {
    getShopSettings: async () => ({ autogopay_payment_method: selectedMethod })
  };
  const configMock = {
    config: {
      paymentProvider: 'autogopay',
      autogopayApiKey: 'agp_test',
      autogopayBaseUrl: 'https://v1-gateway.autogopay.site',
      pakasirSlug: '',
      pakasirApiKey: ''
    }
  };

  Module._load = function(request, parent, isMain) {
    if (parent && parent.filename === paymentPath) {
      if (request === 'axios') return axiosMock;
      if (request === './config') return configMock;
      if (request === './db') return dbMock;
      if (request === './telegram') return {};
      if (request === './walletNotifications') return {};
      if (request === './prodsellerService') return {};
      if (request === './userbotWorkflowService') return {};
      if (request === './utils') return {
        formatRupiah: (n) => `Rp ${Number(n || 0)}`,
        formatWIB: (v) => String(v || '')
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    const payment = require(paymentPath);
    const createdShopee = await payment.createPaymentTransaction({ amount: 50000, invoiceRef: 'LOCAL-1' });
    assert.equal(createdShopee.provider, 'autogopay_shopeepay');
    assert.equal(createdShopee.channel, 'shopeepay');
    assert.equal(createdShopee.transaction_id, '162264876479351110');
    assert.equal(createdShopee.method_label, 'QRIS ShopeePay');
    assert.ok(calls.some((x) => x.kind === 'post' && x.url.endsWith('/shopeepay/qris/create')));

    const shopeeStatus = await payment.getAutoGopayMethodStatus('shopeepay');
    assert.equal(shopeeStatus.ok, true);
    assert.equal(shopeeStatus.connected, true);
    assert.equal(shopeeStatus.token_valid, true);
    assert.equal(shopeeStatus.store_id, '22864392');
    assert.ok(calls.some((x) => x.kind === 'get' && x.url.endsWith('/shopeepay/status')));

    const verified = await payment.verifyPaymentTransaction({
      invoice_ref: 'LOCAL-1',
      amount: 50000,
      payment_provider: 'autogopay_shopeepay',
      provider_transaction_id: '162264876479351110'
    });
    assert.equal(verified.status, 'completed');
    assert.equal(verified.transaction_id, '162264876479351110');
    assert.ok(calls.some((x) => x.kind === 'get' && x.url.endsWith('/shopeepay/qris/status')));

    const beforeCancelCalls = calls.length;
    const cancelled = await payment.cancelPaymentTransaction({
      payment_provider: 'autogopay_shopeepay',
      provider_transaction_id: '162264876479351110'
    });
    assert.equal(cancelled.state, 'local_cancel_only');
    assert.equal(calls.length, beforeCancelCalls);

    selectedMethod = 'gopay';
    const createdGopay = await payment.createPaymentTransaction({ amount: 50000, invoiceRef: 'LOCAL-2' });
    assert.equal(createdGopay.provider, 'autogopay');
    assert.equal(createdGopay.channel, 'gopay');
    assert.equal(createdGopay.transaction_id, 'gopay-trx-1');
    assert.equal(createdGopay.method_label, 'QRIS GoPay');
    assert.ok(calls.some((x) => x.kind === 'post' && x.url.endsWith('/qris/generate')));

    const gopayStatus = await payment.getAutoGopayMethodStatus('gopay');
    assert.equal(gopayStatus.ok, true);
    assert.equal(gopayStatus.channel, 'gopay');
    assert.ok(calls.some((x) => x.kind === 'post' && x.url.endsWith('/transactions')));
  } finally {
    Module._load = originalLoad;
    delete require.cache[paymentPath];
  }
});

test('webhook membedakan QRIS GoPay dan QRIS ShopeePay serta menerima provider ShopeePay', () => {
  const source = read('api/payment-webhook.js');
  const payment = read('lib/paymentService.js');
  assert.ok(payment.includes("selected === 'QRIS_SHOPEEPAY'"));
  assert.ok(payment.includes("provider === 'autogopay_shopeepay'"));
  assert.ok(source.includes('paymentService.autoGopayChannelForOrder(order)'));
  assert.ok(source.includes('paymentService.autoGopayChannelFromPaymentMethod(incoming.payment_method)'));
  assert.ok(source.includes('paymentService.paymentProviderForOrder(order)'));
});

test('marketplace menerima label metode pembayaran aktif', () => {
  assert.ok(read('lib/storeService.js').includes("payment_method_label: gatewayPayment.method_label || 'QRIS'"));
  assert.ok(read('public/store.js').includes("['Metode', payment.payment_method_label || 'QRIS']"));
});
