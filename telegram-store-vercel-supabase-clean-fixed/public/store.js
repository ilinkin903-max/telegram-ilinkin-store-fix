(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (_) {}
  }
  var initData = tg && tg.initData ? tg.initData : '';
  var state = {
    catalog: null,
    products: [],
    filtered: [],
    category: 'Semua',
    search: '',
    sort: 'recommended',
    selectedProduct: null,
    selectedVariantKey: '',
    activePayment: null,
    pollingTimer: null,
    countdownTimer: null
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    brandLogo: $('brandLogo'), brandName: $('brandName'), searchInput: $('searchInput'), clearSearch: $('clearSearch'),
    telegramNotice: $('telegramNotice'), hero: $('hero'), heroTitle: $('heroTitle'), heroDescription: $('heroDescription'),
    customerServiceHero: $('customerServiceHero'), customerServiceFooter: $('customerServiceFooter'), groupFooter: $('groupFooter'),
    footerStoreName: $('footerStoreName'), categoryList: $('categoryList'), productGrid: $('productGrid'), productSummary: $('productSummary'),
    emptyState: $('emptyState'), sortSelect: $('sortSelect'), resellerButton: $('resellerButton'), mobilePanel: $('mobilePanel'),
    productModal: $('productModal'), detailImage: $('detailImage'), detailCategory: $('detailCategory'), productModalTitle: $('productModalTitle'),
    detailSold: $('detailSold'), detailCode: $('detailCode'), detailPrice: $('detailPrice'), detailPromo: $('detailPromo'),
    detailDescription: $('detailDescription'), detailTerms: $('detailTerms'), detailStockBadge: $('detailStockBadge'),
    variantSection: $('variantSection'), variantOptions: $('variantOptions'), variantHint: $('variantHint'), stockHint: $('stockHint'),
    quantityInput: $('quantityInput'), voucherInput: $('voucherInput'), estimatedTotal: $('estimatedTotal'), buyNowButton: $('buyNowButton'),
    paymentModal: $('paymentModal'), paymentPendingView: $('paymentPendingView'), paymentSuccessView: $('paymentSuccessView'),
    paymentExpiredView: $('paymentExpiredView'), paymentQr: $('paymentQr'), paymentCountdown: $('paymentCountdown'),
    paymentBreakdown: $('paymentBreakdown'), watcherInfo: $('watcherInfo'), historyModal: $('historyModal'), historyList: $('historyList'),
    historySubtitle: $('historySubtitle'), loadingOverlay: $('loadingOverlay'), toast: $('toast')
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }
  function rupiah(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }
  function formatDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
  }
  function showLoading(show) { els.loadingOverlay.classList.toggle('hidden', !show); }
  var toastTimeout;
  function toast(message, isError) {
    clearTimeout(toastTimeout);
    els.toast.textContent = message;
    els.toast.className = 'toast show' + (isError ? ' error' : '');
    toastTimeout = setTimeout(function () { els.toast.className = 'toast'; }, 3500);
  }
  function headers() {
    return { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData };
  }
  async function api(action, options) {
    options = options || {};
    var query = options.query || {};
    var url = '/api/store-data?action=' + encodeURIComponent(action);
    Object.keys(query).forEach(function (key) {
      if (query[key] !== undefined && query[key] !== null && query[key] !== '') url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]);
    });
    var response = await fetch(url, {
      method: options.body ? 'POST' : 'GET',
      headers: headers(),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    var data;
    try { data = await response.json(); } catch (_) { data = { ok: false, error: 'Respons server tidak valid.' }; }
    if (!response.ok || !data.ok) {
      var error = new Error(data.error || 'Permintaan gagal.');
      error.code = data.code;
      error.details = data.details;
      throw error;
    }
    return data.data;
  }
  function openModal(el) {
    el.classList.add('show'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeModal(el) {
    el.classList.remove('show'); el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.show')) document.body.style.overflow = '';
  }
  function telegramUrl() {
    var username = state.catalog && state.catalog.bot_username;
    return username ? 'https://t.me/' + username + '?start=store' : '';
  }
  function openTelegram() {
    var url = telegramUrl();
    if (!url) return toast('BOT_USERNAME belum diatur di Vercel.', true);
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.location.href = url;
  }
  function setLink(el, value) {
    if (!value) return el.classList.add('hidden');
    var url = String(value).trim();
    if (url.charAt(0) === '@') url = 'https://t.me/' + url.slice(1);
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    el.href = url; el.classList.remove('hidden');
  }
  function imageFallback(img, productName) {
    img.onerror = function () {
      var parent = img.parentElement;
      if (!parent || parent.querySelector('.product-image-fallback')) return;
      img.style.display = 'none';
      var fallback = document.createElement('div');
      fallback.className = 'product-image-fallback';
      fallback.textContent = String(productName || 'P').slice(0, 1).toUpperCase();
      parent.appendChild(fallback);
    };
  }

  function renderSkeletons() {
    els.productGrid.innerHTML = Array.from({ length: 8 }).map(function () {
      return '<article class="product-card"><div class="product-image-wrap skeleton"></div><div class="product-card-body"><div class="skeleton" style="height:11px;width:45%;border-radius:5px"></div><div class="skeleton" style="height:34px;border-radius:7px"></div><div class="skeleton" style="height:20px;width:70%;border-radius:7px"></div><div class="skeleton" style="height:38px;border-radius:10px;margin-top:8px"></div></div></article>';
    }).join('');
  }

  function applySettings() {
    var settings = state.catalog.settings || {};
    document.title = (settings.store_name || 'iLink.in Store') + ' — Auto Order';
    els.brandName.textContent = settings.store_name || 'iLink.in Store';
    els.footerStoreName.textContent = settings.store_name || 'iLink.in Store';
    els.heroTitle.textContent = settings.store_name ? 'Belanja mudah di ' + settings.store_name : 'Cepat, aman, langsung terkirim';
    els.heroDescription.textContent = settings.store_description || 'Bayar dengan QRIS, sistem mendeteksi pembayaran, lalu produk dikirim otomatis ke Telegram.';
    if (settings.logo_url) {
      els.brandLogo.innerHTML = '<img src="' + escapeHtml(settings.logo_url) + '" alt="Logo toko">';
      imageFallback(els.brandLogo.querySelector('img'), settings.store_name);
    }
    if (settings.banner_url) {
      els.hero.querySelector('.hero-overlay').style.backgroundImage = 'url("' + settings.banner_url.replace(/"/g, '%22') + '")';
    }
    setLink(els.customerServiceHero, settings.customer_service_link);
    setLink(els.customerServiceFooter, settings.customer_service_link);
    setLink(els.groupFooter, settings.group_link);
    var viewer = state.catalog.viewer || {};
    if (state.catalog.store_active === false) {
      els.telegramNotice.classList.remove('hidden');
      els.telegramNotice.querySelector('strong').textContent = 'Toko sedang tidak aktif';
      els.telegramNotice.querySelector('p').textContent = 'Pembelian sementara dinonaktifkan. Silakan hubungi admin atau customer service.';
      $('openTelegramTop').classList.add('hidden');
    } else if (!viewer.telegram_ready) {
      els.telegramNotice.classList.remove('hidden');
    }
    if (viewer.is_owner) {
      els.resellerButton.classList.remove('hidden'); els.mobilePanel.classList.remove('hidden');
    }
  }

  function renderCategories() {
    var categories = ['Semua'].concat(state.catalog.categories || []);
    els.categoryList.innerHTML = categories.map(function (category) {
      return '<button class="category-chip' + (state.category === category ? ' active' : '') + '" type="button" data-category="' + escapeHtml(category) + '">' + escapeHtml(category) + '</button>';
    }).join('');
    els.categoryList.querySelectorAll('[data-category]').forEach(function (button) {
      button.addEventListener('click', function () { state.category = button.dataset.category; renderCategories(); filterProducts(); });
    });
  }

  function filteredProducts() {
    var query = state.search.toLowerCase().trim();
    var rows = state.products.filter(function (product) {
      var matchesCategory = state.category === 'Semua' || product.category === state.category;
      var haystack = [product.name, product.code, product.category, product.description].join(' ').toLowerCase();
      return matchesCategory && (!query || haystack.indexOf(query) >= 0);
    });
    rows.sort(function (a, b) {
      if (state.sort === 'price-low') return a.price_min - b.price_min;
      if (state.sort === 'price-high') return b.price_min - a.price_min;
      if (state.sort === 'sold') return b.sold - a.sold;
      if (state.sort === 'stock') return b.stock - a.stock;
      return Number(b.available) - Number(a.available) || Number(Boolean(b.promo)) - Number(Boolean(a.promo)) || b.sold - a.sold || a.name.localeCompare(b.name, 'id');
    });
    return rows;
  }

  function productPriceText(product) {
    return product.price_min === product.price_max ? rupiah(product.price_min) : rupiah(product.price_min) + ' – ' + rupiah(product.price_max);
  }
  function productCard(product) {
    var image = product.image_url
      ? '<img class="product-image" src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(product.name) + '">'
      : '<div class="product-image-fallback">' + escapeHtml(product.name.slice(0, 1).toUpperCase()) + '</div>';
    var badge = product.promo
      ? '<span class="card-badge promo">PROMO</span>'
      : (!product.available ? '<span class="card-badge empty">HABIS</span>' : '');
    var promo = product.promo ? 'Hemat ' + rupiah(product.promo.discount_amount) + ' · ' + product.promo.name : '';
    return '<article class="product-card" data-code="' + escapeHtml(product.code) + '">' +
      '<div class="product-image-wrap" data-open-product="' + escapeHtml(product.code) + '">' + image + badge + '<span class="stock-label">Stok ' + product.stock + '</span></div>' +
      '<div class="product-card-body">' +
        '<span class="product-category">' + escapeHtml(product.category || 'Lainnya') + '</span>' +
        '<h3 class="product-name">' + escapeHtml(product.name) + '</h3>' +
        '<div class="product-meta"><span>★ 5.0</span><span>•</span><span>' + product.sold + ' terjual</span>' + (product.variants.length ? '<span>•</span><span>' + product.variants.length + ' varian</span>' : '') + '</div>' +
        '<div class="product-price"><strong>' + escapeHtml(productPriceText(product)) + '</strong>' + (product.variants.length ? '<small>mulai</small>' : '') + '</div>' +
        '<div class="card-promo-note">' + escapeHtml(promo) + '</div>' +
        '<div class="card-actions"><button class="button button-primary" type="button" data-open-product="' + escapeHtml(product.code) + '"' + (!product.available ? ' disabled' : '') + '>' + (product.available ? 'Beli Sekarang' : 'Stok Habis') + '</button></div>' +
      '</div></article>';
  }
  function filterProducts() {
    state.filtered = filteredProducts();
    els.productSummary.textContent = state.filtered.length + ' dari ' + state.products.length + ' produk tersedia';
    els.productGrid.innerHTML = state.filtered.map(productCard).join('');
    els.emptyState.classList.toggle('hidden', state.filtered.length > 0);
    els.productGrid.classList.toggle('hidden', state.filtered.length === 0);
    els.productGrid.querySelectorAll('img.product-image').forEach(function (img) { imageFallback(img, img.alt); });
    els.productGrid.querySelectorAll('[data-open-product]').forEach(function (button) {
      button.addEventListener('click', function () { openProduct(button.dataset.openProduct); });
    });
  }

  function activeVariant() {
    if (!state.selectedProduct) return null;
    return state.selectedProduct.variants.find(function (variant) { return variant.key === state.selectedVariantKey; }) || null;
  }
  function selectedStock() {
    var variant = activeVariant();
    return variant ? variant.stock : (state.selectedProduct ? state.selectedProduct.stock : 0);
  }
  function selectedBulkRows() {
    var variant = activeVariant();
    return variant && variant.bulk_prices.length ? variant.bulk_prices : (state.selectedProduct ? state.selectedProduct.bulk_prices : []);
  }
  function selectedUnitPrice(qty) {
    var variant = activeVariant();
    var price = Number(variant ? variant.price : state.selectedProduct.price || state.selectedProduct.price_min || 0);
    selectedBulkRows().forEach(function (row) { if (qty >= Number(row.min_qty || 0)) price = Number(row.price || price); });
    return price;
  }
  function clampQuantity() {
    var max = Math.max(1, selectedStock());
    var qty = Math.max(1, Math.min(max, Number(els.quantityInput.value || 1)));
    els.quantityInput.value = qty;
    return qty;
  }
  function updateProductEstimate() {
    if (!state.selectedProduct) return;
    var qty = clampQuantity();
    var unit = selectedUnitPrice(qty);
    var subtotal = unit * qty;
    var product = state.selectedProduct;
    var variant = activeVariant();
    els.detailPrice.textContent = rupiah(unit) + (qty > 1 ? ' / item' : '');
    els.estimatedTotal.textContent = rupiah(subtotal);
    els.stockHint.textContent = 'Stok tersedia: ' + selectedStock();
    els.detailStockBadge.textContent = 'Stok ' + selectedStock();
    els.buyNowButton.disabled = state.catalog.store_active === false || selectedStock() < 1 || (product.variants.length && !variant);
    if (product.promo) {
      els.detailPromo.textContent = '🏷️ Promo otomatis tersedia: ' + product.promo.name + ' (diskon dihitung ulang saat checkout)';
      els.detailPromo.classList.remove('hidden');
    } else els.detailPromo.classList.add('hidden');
  }
  function renderVariants(product) {
    if (!product.variants.length) {
      els.variantSection.classList.add('hidden'); state.selectedVariantKey = ''; return;
    }
    els.variantSection.classList.remove('hidden');
    if (!product.variants.some(function (variant) { return variant.key === state.selectedVariantKey && variant.stock > 0; })) {
      var first = product.variants.find(function (variant) { return variant.stock > 0; }) || product.variants[0];
      state.selectedVariantKey = first ? first.key : '';
    }
    els.variantHint.textContent = product.variants.length + ' pilihan';
    els.variantOptions.innerHTML = product.variants.map(function (variant) {
      return '<button type="button" class="variant-button' + (variant.key === state.selectedVariantKey ? ' active' : '') + '" data-variant="' + escapeHtml(variant.key) + '"' + (variant.stock < 1 ? ' disabled' : '') + '><b>' + escapeHtml(variant.name) + '</b><small>' + rupiah(variant.price) + ' · stok ' + variant.stock + '</small></button>';
    }).join('');
    els.variantOptions.querySelectorAll('[data-variant]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedVariantKey = button.dataset.variant;
        renderVariants(product); updateProductEstimate();
        var variant = activeVariant();
        els.detailDescription.textContent = (variant && variant.description) || product.description || 'Tidak ada deskripsi.';
        els.detailTerms.textContent = (variant && variant.terms) || product.terms || 'Tidak ada ketentuan khusus.';
      });
    });
  }
  function openProduct(code) {
    var product = state.products.find(function (item) { return item.code === code; });
    if (!product) return;
    state.selectedProduct = product;
    state.selectedVariantKey = '';
    els.quantityInput.value = 1;
    els.voucherInput.value = '';
    els.detailCategory.textContent = product.category || 'Lainnya';
    els.productModalTitle.textContent = product.name;
    els.detailSold.textContent = product.sold + ' terjual';
    els.detailCode.textContent = 'Kode ' + product.code;
    els.detailDescription.textContent = product.description || 'Tidak ada deskripsi.';
    els.detailTerms.textContent = product.terms || 'Tidak ada ketentuan khusus.';
    els.detailImage.src = product.image_url || '';
    els.detailImage.alt = product.name;
    els.detailImage.style.display = product.image_url ? 'block' : 'none';
    if (product.image_url) imageFallback(els.detailImage, product.name);
    renderVariants(product);
    updateProductEstimate();
    openModal(els.productModal);
  }

  async function startCheckout() {
    if (!state.catalog.viewer.telegram_ready) {
      toast('Checkout harus dibuka melalui Telegram.', true); openTelegram(); return;
    }
    var product = state.selectedProduct;
    if (!product) return;
    var qty = clampQuantity();
    if (product.variants.length && !state.selectedVariantKey) return toast('Pilih varian terlebih dahulu.', true);
    showLoading(true);
    try {
      var payment = await api('checkout', { body: {
        product_code: product.code,
        variant_key: state.selectedVariantKey,
        quantity: qty,
        voucher_code: els.voucherInput.value.trim()
      }});
      state.activePayment = payment;
      closeModal(els.productModal);
      showPayment(payment);
    } catch (error) {
      if (error.code === 'ACTIVE_ORDER' && error.details && error.details.invoice) {
        toast('Masih ada invoice aktif: ' + error.details.invoice, true);
      } else toast(error.message, true);
    } finally { showLoading(false); }
  }

  function paymentRows(payment) {
    var rows = [
      ['Invoice', payment.invoice],
      ['Produk', payment.product + (payment.variant ? ' - ' + payment.variant : '')],
      ['Harga satuan', rupiah(payment.unit_price)],
      ['Jumlah', payment.quantity],
      ['Subtotal', rupiah(payment.subtotal)]
    ];
    if (payment.discount > 0) rows.push([payment.discount_label || 'Diskon', '− ' + rupiah(payment.discount)]);
    if (payment.discount > 0) rows.push(['Setelah diskon', rupiah(payment.after_discount)]);
    rows.push(['Fee', rupiah(payment.fee)]);
    rows.push(['Total bayar', rupiah(payment.total), true]);
    return rows.map(function (row) { return '<div class="payment-row' + (row[2] ? ' total' : '') + '"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>'; }).join('');
  }
  function clearPaymentTimers() {
    if (state.pollingTimer) clearInterval(state.pollingTimer);
    if (state.countdownTimer) clearInterval(state.countdownTimer);
    state.pollingTimer = null; state.countdownTimer = null;
  }
  function showPayment(payment) {
    clearPaymentTimers();
    els.paymentPendingView.classList.remove('hidden');
    els.paymentSuccessView.classList.add('hidden');
    els.paymentExpiredView.classList.add('hidden');
    els.paymentQr.src = payment.qr_data_url;
    els.paymentBreakdown.innerHTML = paymentRows(payment);
    els.watcherInfo.textContent = payment.watcher_scheduled
      ? 'Sistem memeriksa pembayaran otomatis. Tombol cek hanya sebagai cadangan.'
      : 'Webhook pembayaran tetap aktif. Gunakan tombol cek jika status belum berubah.';
    openModal(els.paymentModal);
    updateCountdown();
    state.countdownTimer = setInterval(updateCountdown, 1000);
    state.pollingTimer = setInterval(function () { checkPayment(false); }, 5000);
  }
  function updateCountdown() {
    if (!state.activePayment) return;
    var remaining = new Date(state.activePayment.expires_at).getTime() - Date.now();
    if (remaining <= 0) {
      els.paymentCountdown.textContent = '00:00'; clearPaymentTimers(); showExpiredPayment(); return;
    }
    var seconds = Math.floor(remaining / 1000);
    els.paymentCountdown.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  async function checkPayment(manual) {
    if (!state.activePayment) return;
    try {
      var status = await api('order-status', { query: { invoice: state.activePayment.invoice } });
      if (status.status === 'completed') {
        clearPaymentTimers();
        els.paymentPendingView.classList.add('hidden'); els.paymentSuccessView.classList.remove('hidden'); els.paymentExpiredView.classList.add('hidden');
        if (tg && tg.HapticFeedback) try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
        loadCatalog(false);
      } else if (status.status === 'expired' || status.status === 'not_found') {
        clearPaymentTimers(); showExpiredPayment();
      } else if (manual) toast('Pembayaran belum terdeteksi. Sistem tetap memeriksa otomatis.');
    } catch (error) { if (manual) toast(error.message, true); }
  }
  function showExpiredPayment() {
    els.paymentPendingView.classList.add('hidden'); els.paymentSuccessView.classList.add('hidden'); els.paymentExpiredView.classList.remove('hidden');
  }
  async function cancelPayment() {
    if (!state.activePayment) return closeModal(els.paymentModal);
    showLoading(true);
    try {
      await api('cancel-order', { body: { invoice: state.activePayment.invoice } });
      clearPaymentTimers(); state.activePayment = null; closeModal(els.paymentModal); toast('Pesanan dibatalkan.');
    } catch (error) { toast(error.message, true); }
    finally { showLoading(false); }
  }

  async function openHistory() {
    if (!state.catalog.viewer.telegram_ready) {
      toast('Riwayat pesanan hanya tersedia melalui Telegram.', true); openTelegram(); return;
    }
    openModal(els.historyModal);
    els.historySubtitle.textContent = 'Memuat riwayat...';
    els.historyList.innerHTML = '<div class="skeleton" style="height:78px;border-radius:14px"></div><div class="skeleton" style="height:78px;border-radius:14px"></div>';
    try {
      var history = await api('history', { query: { limit: 30 } });
      els.historySubtitle.textContent = (state.catalog.viewer.first_name ? 'Halo ' + state.catalog.viewer.first_name + ', ' : '') + history.length + ' pesanan selesai.';
      if (!history.length) {
        els.historyList.innerHTML = '<div class="empty-state"><span>🧾</span><h3>Belum ada pesanan</h3><p>Pesanan selesai akan tampil di sini.</p></div>';
      } else {
        els.historyList.innerHTML = history.map(function (row) {
          return '<article class="history-card"><div><h3>' + escapeHtml(row.product + (row.variant ? ' - ' + row.variant : '')) + '</h3><p>' + escapeHtml(row.invoice || '-') + ' · ' + escapeHtml(formatDate(row.created_at)) + ' · ' + row.quantity + ' item</p></div><strong>' + rupiah(row.total) + '</strong><span></span><span class="history-status">SELESAI</span></article>';
        }).join('');
      }
    } catch (error) {
      els.historySubtitle.textContent = 'Gagal memuat riwayat.';
      els.historyList.innerHTML = '<div class="empty-state"><span>⚠️</span><h3>Terjadi kesalahan</h3><p>' + escapeHtml(error.message) + '</p></div>';
    }
  }

  async function loadCatalog(showInitialLoading) {
    if (showInitialLoading !== false) renderSkeletons();
    try {
      state.catalog = await api('catalog');
      state.products = state.catalog.products || [];
      applySettings(); renderCategories(); filterProducts();
    } catch (error) {
      els.productGrid.innerHTML = '';
      els.emptyState.classList.remove('hidden');
      els.emptyState.querySelector('h3').textContent = 'Toko belum dapat dimuat';
      els.emptyState.querySelector('p').textContent = error.message;
      toast(error.message, true);
    }
  }

  document.querySelectorAll('[data-close="product"]').forEach(function (el) { el.addEventListener('click', function () { closeModal(els.productModal); }); });
  document.querySelectorAll('[data-close="history"]').forEach(function (el) { el.addEventListener('click', function () { closeModal(els.historyModal); }); });
  $('shopNowButton').addEventListener('click', function () { $('catalogSection').scrollIntoView({ behavior: 'smooth' }); });
  $('openTelegramTop').addEventListener('click', openTelegram);
  $('historyButton').addEventListener('click', openHistory);
  $('mobileOrders').addEventListener('click', openHistory);
  $('mobileHome').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('mobileSearch').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(function () { els.searchInput.focus(); }, 350); });
  $('resetFilterButton').addEventListener('click', function () { state.category = 'Semua'; state.search = ''; els.searchInput.value = ''; renderCategories(); filterProducts(); });
  els.searchInput.addEventListener('input', function () { state.search = els.searchInput.value; els.clearSearch.classList.toggle('hidden', !state.search); filterProducts(); });
  els.clearSearch.addEventListener('click', function () { state.search = ''; els.searchInput.value = ''; els.clearSearch.classList.add('hidden'); filterProducts(); els.searchInput.focus(); });
  els.sortSelect.addEventListener('change', function () { state.sort = els.sortSelect.value; filterProducts(); });
  $('minusQuantity').addEventListener('click', function () { els.quantityInput.value = Math.max(1, Number(els.quantityInput.value || 1) - 1); updateProductEstimate(); });
  $('plusQuantity').addEventListener('click', function () { els.quantityInput.value = Number(els.quantityInput.value || 1) + 1; updateProductEstimate(); });
  els.quantityInput.addEventListener('input', updateProductEstimate);
  els.buyNowButton.addEventListener('click', startCheckout);
  $('checkPaymentButton').addEventListener('click', function () { checkPayment(true); });
  $('cancelPaymentButton').addEventListener('click', cancelPayment);
  $('paymentCloseButton').addEventListener('click', function () { closeModal(els.paymentModal); });
  $('successDoneButton').addEventListener('click', function () { state.activePayment = null; closeModal(els.paymentModal); });
  $('expiredDoneButton').addEventListener('click', function () { state.activePayment = null; closeModal(els.paymentModal); });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (els.productModal.classList.contains('show')) closeModal(els.productModal);
    else if (els.historyModal.classList.contains('show')) closeModal(els.historyModal);
  });

  loadCatalog(true);
})();
