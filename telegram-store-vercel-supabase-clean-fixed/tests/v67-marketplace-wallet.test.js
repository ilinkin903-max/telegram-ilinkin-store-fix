const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'store.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'store.js'), 'utf8');
const service = fs.readFileSync(path.join(root, 'lib', 'storeService.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'store-data.js'), 'utf8');

 test('marketplace menampilkan saldo user segaris dengan header toko', () => {
  assert.match(html, /id="walletBalanceChip"/);
  assert.match(html, /id="walletBalanceValue"/);
  assert.match(css, /wallet-balance-chip/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*top-actions \{ display: flex/);
  assert.match(js, /function renderWalletBalance/);
  assert.match(js, /balance_total/);
});

test('katalog mengirim saldo aman tanpa ledger ke browser', () => {
  assert.match(service, /db\.getWalletSummary\(Number\(viewer\.id\), 1\)/);
  assert.match(service, /wallet_ready: Boolean\(wallet\)/);
  assert.match(service, /balance_main: Number\(wallet\.balance_main/);
  assert.match(service, /wallet_payment_enabled/);
});

test('konfirmasi checkout menyediakan pilihan QRIS dan Saldo Bot', () => {
  assert.match(html, /id="paymentMethodQris"/);
  assert.match(html, /id="paymentMethodWallet"/);
  assert.match(html, /Saldo Bot/);
  assert.match(js, /function renderPaymentMethods/);
  assert.match(js, /payment_method: state\.paymentMethod/);
  assert.match(css, /payment-method-card/);
});

test('API marketplace mengarahkan pembayaran saldo ke fulfillment atomik v65', () => {
  assert.match(api, /paymentMethod === 'wallet' \? store\.createWalletPayment : store\.createPayment/);
  assert.match(service, /async function createWalletPayment/);
  assert.match(service, /payment_method: 'wallet'/);
  assert.match(service, /paymentService\.fulfillPaidOrder\(\{ order: savedOrder, buyer: user, source: 'wallet-marketplace' \}\)/);
  assert.match(service, /INSUFFICIENT_WALLET_BALANCE/);
});

test('pembayaran saldo memperbarui header dan menampilkan sukses tanpa QRIS', () => {
  assert.match(js, /payment\.payment_method === 'wallet' && payment\.status === 'completed'/);
  assert.match(js, /Pembayaran Saldo Berhasil/);
  assert.match(js, /state\.catalog\.viewer\.wallet = payment\.wallet/);
  assert.match(js, /els\.paymentPendingView\.classList\.add\('hidden'\)/);
});
