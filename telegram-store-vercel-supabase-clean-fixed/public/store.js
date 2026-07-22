(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    try { tg.ready(); tg.expand(); } catch (_) {}
  }
  var initData = tg && tg.initData ? tg.initData : '';
  var ACTIVE_PAYMENT_KEY = 'ilinkin_store_active_payment_v52';
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
    paymentStatus: 'idle',
    paymentRestored: false,
    pollingTimer: null,
    countdownTimer: null,
    bannerIndex: 0,
    bannerTimer: null,
    bannerInterval: 5000,
    flashTimer: null
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    brandLogo: $('brandLogo'), brandName: $('brandName'), searchInput: $('searchInput'), clearSearch: $('clearSearch'),
    telegramNotice: $('telegramNotice'), hero: $('hero'), heroTitle: $('heroTitle'), heroDescription: $('heroDescription'),
    heroCarousel: $('heroCarousel'), heroTrack: $('heroTrack'), heroDots: $('heroDots'),
    flashSaleSection: $('flashSaleSection'), flashSaleTitle: $('flashSaleTitle'), flashSaleGrid: $('flashSaleGrid'),
    flashHours: $('flashHours'), flashMinutes: $('flashMinutes'), flashSeconds: $('flashSeconds'),
    customerServiceBubble: $('customerServiceBubble'), groupFooter: $('groupFooter'),
    footerStoreName: $('footerStoreName'), categoryList: $('categoryList'), productGrid: $('productGrid'), productSummary: $('productSummary'),
    emptyState: $('emptyState'), sortSelect: $('sortSelect'), resellerButton: $('resellerButton'), mobilePanel: $('mobilePanel'),
    productModal: $('productModal'), detailImage: $('detailImage'), detailCategory: $('detailCategory'), productModalTitle: $('productModalTitle'),
    detailSold: $('detailSold'), detailCode: $('detailCode'), detailPrice: $('detailPrice'), detailPromo: $('detailPromo'),
    detailDescription: $('detailDescription'), detailTerms: $('detailTerms'), detailStockBadge: $('detailStockBadge'),
    variantSection: $('variantSection'), variantOptions: $('variantOptions'), variantHint: $('variantHint'), stockHint: $('stockHint'),
    quantityInput: $('quantityInput'), voucherInput: $('voucherInput'), estimatedTotal: $('estimatedTotal'), buyNowButton: $('buyNowButton'),
    paymentModal: $('paymentModal'), paymentPendingView: $('paymentPendingView'), paymentSuccessView: $('paymentSuccessView'),
    paymentExpiredView: $('paymentExpiredView'), paymentQr: $('paymentQr'), paymentCountdown: $('paymentCountdown'),
    paymentBreakdown: $('paymentBreakdown'), watcherInfo: $('watcherInfo'), downloadQrButton: $('downloadQrButton'), paymentCheckoutLink: $('paymentCheckoutLink'),
    paymentBubble: $('paymentBubble'), paymentBubbleText: $('paymentBubbleText'), historyModal: $('historyModal'), historyList: $('historyList'),
    historySubtitle: $('historySubtitle'), loadingOverlay: $('loadingOverlay'), toast: $('toast'),
    confirmModal: $('confirmModal'), confirmOrderSummary: $('confirmOrderSummary'), confirmCheckoutButton: $('confirmCheckoutButton')
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
    if (el === els.paymentModal) updatePaymentBubble();
  }
  function closeModal(el) {
    el.classList.remove('show'); el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.show')) document.body.style.overflow = '';
    if (el === els.paymentModal) updatePaymentBubble();
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
    if (!el) return;
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

  function clearBannerTimer() {
    if (state.bannerTimer) clearInterval(state.bannerTimer);
    state.bannerTimer = null;
  }
  function goToBanner(index) {
    var count = els.heroTrack ? els.heroTrack.children.length : 0;
    if (!count) return;
    state.bannerIndex = (Number(index) + count) % count;
    els.heroTrack.style.transform = 'translateX(-' + (state.bannerIndex * 100) + '%)';
    els.heroDots.querySelectorAll('.hero-dot').forEach(function (dot, dotIndex) {
      dot.classList.toggle('active', dotIndex === state.bannerIndex);
      dot.setAttribute('aria-current', dotIndex === state.bannerIndex ? 'true' : 'false');
    });
  }
  function startBannerTimer() {
    clearBannerTimer();
    var count = els.heroTrack ? els.heroTrack.children.length : 0;
    if (count < 2) return;
    state.bannerTimer = setInterval(function () { goToBanner(state.bannerIndex + 1); }, state.bannerInterval);
  }
  function renderHeroBanners(settings) {
    var items = Array.isArray(settings.banner_items) ? settings.banner_items.filter(function (item) { return item && item.url; }) : [];
    if (!items.length) {
      var legacy = Array.isArray(settings.banner_urls) ? settings.banner_urls.filter(Boolean) : [];
      if (!legacy.length && settings.banner_url) legacy = [settings.banner_url];
      items = legacy.map(function (url, index) { return { name: 'Banner ' + (index + 1), url: url }; });
    }
    clearBannerTimer();
    state.bannerIndex = 0;
    if (!items.length) {
      els.hero.classList.remove('has-banners');
      els.heroCarousel.classList.add('hidden');
      els.heroTrack.innerHTML = '';
      els.heroDots.innerHTML = '';
      return;
    }
    state.bannerInterval = Math.max(3000, Math.min(15000, Number(settings.banner_interval_ms || 5000)));
    els.heroTrack.innerHTML = items.map(function (item, index) {
      return '<div class="hero-slide"><img src="' + escapeHtml(item.url) + '" alt="Banner promosi ' + (index + 1) + '"></div>';
    }).join('');
    els.heroDots.innerHTML = items.length > 1 ? items.map(function (item, index) {
      return '<button class="hero-dot' + (index === 0 ? ' active' : '') + '" type="button" data-banner-index="' + index + '" aria-label="Tampilkan banner ' + (index + 1) + '"></button>';
    }).join('') : '';
    els.heroDots.classList.toggle('hidden', items.length < 2);
    els.heroDots.querySelectorAll('[data-banner-index]').forEach(function (dot) {
      dot.addEventListener('click', function () { goToBanner(Number(dot.dataset.bannerIndex)); startBannerTimer(); });
    });
    els.heroTrack.querySelectorAll('img').forEach(function (img) {
      img.onerror = function () { img.style.display = 'none'; };
    });
    els.hero.classList.add('has-banners');
    els.heroCarousel.classList.remove('hidden');
    els.heroCarousel.onmouseenter = clearBannerTimer;
    els.heroCarousel.onmouseleave = startBannerTimer;
    goToBanner(0);
    startBannerTimer();
  }

  function renderSkeletons() {
    els.productGrid.innerHTML = Array.from({ length: 8 }).map(function () {
      return '<article class="product-card"><div class="product-image-wrap skeleton"></div><div class="product-card-body"><div class="skeleton" style="height:11px;width:45%;border-radius:5px"></div><div class="skeleton" style="height:34px;border-radius:7px"></div><div class="skeleton" style="height:20px;width:70%;border-radius:7px"></div><div class="skeleton" style="height:38px;border-radius:10px;margin-top:8px"></div></div></article>';
    }).join('');
  }

  function clearFlashTimer() {
    if (state.flashTimer) clearInterval(state.flashTimer);
    state.flashTimer = null;
  }
  function bestFlashPromo(product) {
    var choices = [];
    if (product && product.flash_promo && Number(product.flash_promo.final_price) < Number(product.flash_promo.original_price)) {
      choices.push({
        code: product.flash_promo.code || '',
        name: product.flash_promo.name || 'Promo',
        variant: '',
        variantKey: '',
        original: Number(product.flash_promo.original_price || product.price_min || 0),
        final: Number(product.flash_promo.final_price || product.sale_price_min || product.price_min || 0),
        sold: Number(product.flash_sale_sold || 0)
      });
    }
    (product && product.variants || []).forEach(function (variant) {
      if (!variant.flash_promo) return;
      var original = Number(variant.flash_promo.original_price != null ? variant.flash_promo.original_price : variant.price || 0);
      var final = Number(variant.flash_promo.final_price || original);
      if (final < original) choices.push({
        code: variant.flash_promo.code || '',
        name: variant.flash_promo.name || 'Promo',
        variant: variant.name || '',
        variantKey: variant.key || '',
        original: original,
        final: final,
        sold: Number(variant.flash_sale_sold || 0)
      });
    });
    choices.sort(function (a, b) {
      return a.final - b.final || a.original - b.original || String(a.variant).localeCompare(String(b.variant), 'id');
    });
    return choices[0] || null;
  }
  function updateFlashCountdown(endAt) {
    if (!els.flashSaleSection || els.flashSaleSection.classList.contains('hidden')) return;
    var end = new Date(endAt || '').getTime();
    var remaining = end - Date.now();
    if (!end || !isFinite(end) || remaining <= 0) {
      clearFlashTimer();
      els.flashSaleSection.classList.add('hidden');
      return;
    }
    var totalSeconds = Math.max(0, Math.floor(remaining / 1000));
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    els.flashHours.textContent = String(hours).padStart(2, '0');
    els.flashMinutes.textContent = String(minutes).padStart(2, '0');
    els.flashSeconds.textContent = String(seconds).padStart(2, '0');
  }
  function renderFlashSale(settings) {
    clearFlashTimer();
    if (!els.flashSaleSection || String(settings.flash_sale_enabled || '').toLowerCase() !== 'true') {
      if (els.flashSaleSection) els.flashSaleSection.classList.add('hidden');
      return;
    }
    var startAt = settings.flash_sale_start_at || '';
    var endAt = settings.flash_sale_end_at || '';
    var startTime = startAt ? new Date(startAt).getTime() : NaN;
    var endTime = endAt ? new Date(endAt).getTime() : NaN;
    var now = Date.now();
    var products = state.products.filter(function (product) {
      return product.available && product.flash_sale_eligible && bestFlashPromo(product);
    }).slice(0, 8);
    if (!products.length || !endTime || !isFinite(endTime) || endTime <= now || (isFinite(startTime) && startTime > now)) {
      els.flashSaleSection.classList.add('hidden');
      return;
    }
    els.flashSaleTitle.textContent = settings.flash_sale_title || 'FLASH SALE';
    els.flashSaleGrid.innerHTML = products.map(function (product) {
      var promo = bestFlashPromo(product);
      var original = promo.original;
      var final = promo.final;
      var pct = original > 0 ? Math.max(1, Math.round(((original - final) / original) * 100)) : 0;
      var image = product.image_url
        ? '<img src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(product.name) + '">'
        : '<div class="product-image-fallback">' + escapeHtml(String(product.name || 'P').slice(0, 1).toUpperCase()) + '</div>';
      var price = '<del>' + escapeHtml(rupiah(original)) + '</del><strong>' + escapeHtml(rupiah(final)) + '</strong>';
      var sold = Math.max(0, Number(promo.sold || 0));
      var stockBase = promo.variant
        ? Number(((product.variants || []).find(function (variant) { return variant.key === promo.variantKey; }) || {}).stock || 0)
        : Number(product.stock || 0);
      var fill = Math.max(8, Math.min(100, sold + stockBase > 0 ? Math.round((sold / (sold + stockBase)) * 100) : 8));
      return '<article class="flash-card" data-flash-product="' + escapeHtml(product.code) + '">' +
        '<div class="flash-image-wrap">' + image + (pct ? '<span class="flash-discount">⚡-' + pct + '%</span>' : '') + '</div>' +
        '<div class="flash-body"><h3 class="flash-name">' + escapeHtml(product.name) + '</h3>' +
        (promo.variant ? '<div class="flash-variant">' + escapeHtml(promo.variant) + '</div>' : '') +
        '<div class="flash-price">' + price + '</div>' +
        '<div class="flash-stock-track"><div class="flash-stock-fill" style="width:' + fill + '%"></div><div class="flash-stock-label">' + sold + ' TERJUAL</div></div></div></article>';
    }).join('');
    els.flashSaleGrid.querySelectorAll('[data-flash-product]').forEach(function (card) {
      card.addEventListener('click', function () { openProduct(card.dataset.flashProduct); });
    });
    els.flashSaleGrid.querySelectorAll('img').forEach(function (img) { imageFallback(img, img.alt); });
    els.flashSaleSection.classList.remove('hidden');
    updateFlashCountdown(endAt);
    state.flashTimer = setInterval(function () { updateFlashCountdown(endAt); }, 1000);
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
    renderHeroBanners(settings);
    renderFlashSale(settings);
    setLink(els.customerServiceBubble, settings.customer_service_link);
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
      return Number(b.available) - Number(a.available) || Number(Boolean(b.has_promo)) - Number(Boolean(a.has_promo)) || b.sold - a.sold || a.name.localeCompare(b.name, 'id');
    });
    return rows;
  }

  function productPriceText(product) {
    return rupiah(Number(product.price_min || product.price || 0));
  }
  function cardBestPromo(product) {
    var choices = [];
    if (product && product.promo && Number(product.promo.final_price) < Number(product.promo.original_price)) {
      choices.push({ original: Number(product.promo.original_price), final: Number(product.promo.final_price), name: product.promo.name || 'Promo' });
    }
    (product && product.variants || []).forEach(function (variant) {
      if (!variant.promo) return;
      var original = Number(variant.promo.original_price != null ? variant.promo.original_price : variant.price || 0);
      var final = Number(variant.promo.final_price || original);
      if (final < original) choices.push({ original: original, final: final, name: variant.promo.name || 'Promo' });
    });
    choices.sort(function (a, b) { return a.final - b.final || a.original - b.original; });
    return choices[0] || null;
  }
  function promoPriceHtml(original, promo) {
    if (!promo) return '<strong>' + escapeHtml(rupiah(original)) + '</strong>';
    return '<del>' + escapeHtml(rupiah(promo.original_price != null ? promo.original_price : original)) + '</del><strong>' + escapeHtml(rupiah(promo.final_price)) + '</strong>';
  }
  function productCard(product) {
    var image = product.image_url
      ? '<img class="product-image" src="' + escapeHtml(product.image_url) + '" alt="' + escapeHtml(product.name) + '">'
      : '<div class="product-image-fallback">' + escapeHtml(product.name.slice(0, 1).toUpperCase()) + '</div>';
    var badge = product.has_promo
      ? '<span class="card-badge promo">PROMO</span>'
      : (!product.available ? '<span class="card-badge empty">HABIS</span>' : '');
    var bestPromo = cardBestPromo(product);
    var priceHtml = bestPromo
      ? '<del>' + escapeHtml(rupiah(bestPromo.original)) + '</del><strong>' + escapeHtml(rupiah(bestPromo.final)) + '</strong>'
      : '<strong>' + escapeHtml(productPriceText(product)) + '</strong>';
    var promo = product.promo ? '<div class="card-promo-note"><b>' + escapeHtml(product.promo.name) + '</b><span>Hemat ' + escapeHtml(rupiah(product.promo.discount_amount)) + '</span></div>' : '';
    return '<article class="product-card" data-code="' + escapeHtml(product.code) + '">' +
      '<div class="product-image-wrap" data-open-product="' + escapeHtml(product.code) + '">' + image + badge + '<span class="stock-label">Stok ' + product.stock + '</span></div>' +
      '<div class="product-card-body">' +
        '<span class="product-category">' + escapeHtml(product.category || 'Lainnya') + '</span>' +
        '<h3 class="product-name">' + escapeHtml(product.name) + '</h3>' +
        '<div class="product-meta"><span>★ 5.0</span><span>•</span><span>' + product.sold + ' terjual</span>' + (product.variants.length ? '<span>•</span><span>' + product.variants.length + ' varian</span>' : '') + '</div>' +
        '<div class="product-price">' + priceHtml + '</div>' +
        promo +
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
    var promo = variant && variant.promo ? variant.promo : product.promo;
    var promoAppliesToShownPrice = Boolean(promo && qty === 1 && Number(promo.original_price) === Number(unit));
    if (promoAppliesToShownPrice) {
      els.detailPrice.innerHTML = '<del>' + escapeHtml(rupiah(unit)) + '</del> <strong>' + escapeHtml(rupiah(promo.final_price)) + '</strong>';
      els.estimatedTotal.textContent = rupiah(promo.final_price);
      els.detailPromo.innerHTML = '<b>🏷️ ' + escapeHtml(promo.name) + '</b><span>Potongan ' + escapeHtml(rupiah(promo.discount_amount)) + ' untuk ' + escapeHtml(variant ? variant.name : product.name) + '.</span>';
      els.detailPromo.classList.remove('hidden');
    } else {
      els.detailPrice.textContent = rupiah(unit) + (qty > 1 ? ' / item' : '');
      els.estimatedTotal.textContent = rupiah(subtotal);
      if (promo) {
        els.detailPromo.innerHTML = '<b>🏷️ ' + escapeHtml(promo.name) + '</b><span>Promo tersedia untuk ' + escapeHtml(variant ? variant.name : product.name) + '. Nilai akhir dihitung ulang saat checkout.</span>';
        els.detailPromo.classList.remove('hidden');
      } else els.detailPromo.classList.add('hidden');
    }
    els.stockHint.textContent = 'Stok tersedia: ' + selectedStock();
    els.detailStockBadge.textContent = 'Stok ' + selectedStock();
    els.buyNowButton.disabled = state.catalog.store_active === false || selectedStock() < 1 || (product.variants.length && !variant);
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
      var priceLine = variant.promo
        ? '<span class="variant-price"><del>' + escapeHtml(rupiah(variant.price)) + '</del><strong>' + escapeHtml(rupiah(variant.promo.final_price)) + '</strong></span><span class="variant-promo-chip">' + escapeHtml(variant.promo.name) + ' · hemat ' + escapeHtml(rupiah(variant.promo.discount_amount)) + '</span>'
        : '<span class="variant-price"><strong>' + escapeHtml(rupiah(variant.price)) + '</strong></span>';
      return '<button type="button" class="variant-button' + (variant.key === state.selectedVariantKey ? ' active' : '') + '" data-variant="' + escapeHtml(variant.key) + '"' + (variant.stock < 1 ? ' disabled' : '') + '><b>' + escapeHtml(variant.name) + '</b>' + priceLine + '<small>Stok ' + variant.stock + '</small></button>';
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

  function openCheckoutConfirmation() {
    if (!state.catalog.viewer.telegram_ready) {
      toast('Checkout harus dibuka melalui Telegram.', true); openTelegram(); return;
    }
    var product = state.selectedProduct;
    if (!product) return;
    var variant = activeVariant();
    var qty = clampQuantity();
    if (product.variants.length && !variant) return toast('Pilih varian terlebih dahulu.', true);
    var unit = selectedUnitPrice(qty);
    var promo = variant && variant.promo ? variant.promo : product.promo;
    var shownTotal = unit * qty;
    if (promo && qty === 1 && Number(promo.original_price) === Number(unit)) shownTotal = Number(promo.final_price);
    els.confirmOrderSummary.innerHTML = [
      ['Produk', product.name],
      ['Varian', variant ? variant.name : 'Tanpa varian'],
      ['Jumlah', qty + ' item'],
      ['Perkiraan total', rupiah(shownTotal)],
      ['Voucher', els.voucherInput.value.trim() || 'Tidak digunakan']
    ].map(function (row) {
      return '<div class="confirm-order-row"><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>';
    }).join('');
    openModal(els.confirmModal);
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
      closeModal(els.confirmModal);
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
  function saveActivePayment() {
    if (!state.activePayment || state.paymentStatus !== 'pending') return;
    try { localStorage.setItem(ACTIVE_PAYMENT_KEY, JSON.stringify(state.activePayment)); } catch (_) {}
  }
  function clearActivePaymentStorage() {
    try { localStorage.removeItem(ACTIVE_PAYMENT_KEY); } catch (_) {}
  }
  function updatePaymentBubble() {
    if (!els.paymentBubble) return;
    var modalOpen = els.paymentModal.classList.contains('show');
    var visible = Boolean(state.activePayment && state.paymentStatus === 'pending' && !modalOpen);
    els.paymentBubble.classList.toggle('hidden', !visible);
    if (visible) els.paymentBubbleText.textContent = state.activePayment.invoice + ' · ' + rupiah(state.activePayment.total);
  }
  function startPaymentTimers() {
    clearPaymentTimers();
    updateCountdown();
    if (state.paymentStatus !== 'pending') return;
    state.countdownTimer = setInterval(updateCountdown, 1000);
    state.pollingTimer = setInterval(function () { checkPayment(false); }, 5000);
  }
  function showPayment(payment, shouldOpen) {
    state.activePayment = payment;
    state.paymentStatus = 'pending';
    saveActivePayment();
    els.paymentPendingView.classList.remove('hidden');
    els.paymentSuccessView.classList.add('hidden');
    els.paymentExpiredView.classList.add('hidden');
    els.paymentQr.src = payment.qr_data_url;
    els.paymentBreakdown.innerHTML = paymentRows(payment);
    if (els.paymentCheckoutLink) {
      els.paymentCheckoutLink.classList.toggle('hidden', !payment.checkout_url);
      if (payment.checkout_url) els.paymentCheckoutLink.href = payment.checkout_url;
      else els.paymentCheckoutLink.removeAttribute('href');
    }
    els.watcherInfo.textContent = payment.watcher_scheduled
      ? 'Sistem memeriksa pembayaran otomatis. Tombol cek hanya sebagai cadangan.'
      : 'Webhook pembayaran tetap aktif. Gunakan tombol cek jika status belum berubah.';
    startPaymentTimers();
    if (shouldOpen !== false) openModal(els.paymentModal);
    updatePaymentBubble();
  }
  function restoreActivePayment() {
    if (!state.catalog || !state.catalog.viewer || !state.catalog.viewer.telegram_ready) return;
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(ACTIVE_PAYMENT_KEY) || 'null'); } catch (_) {}
    if (!stored || !stored.invoice || !stored.qr_data_url || !stored.expires_at) return clearActivePaymentStorage();
    if (new Date(stored.expires_at).getTime() <= Date.now()) return clearActivePaymentStorage();
    showPayment(stored, false);
    checkPayment(false);
  }
  function qrDownloadUrl() {
    if (!state.activePayment || !state.activePayment.invoice) return '';
    var url = window.location.origin + '/api/store-data?action=qr-download&invoice=' + encodeURIComponent(state.activePayment.invoice);
    if (initData) url += '&initData=' + encodeURIComponent(initData);
    return url;
  }
  async function downloadQr() {
    if (!state.activePayment || !state.activePayment.invoice) return toast('QRIS belum tersedia.', true);
    var filename = 'QRIS-' + String(state.activePayment.invoice || 'pembayaran').replace(/[^a-z0-9_-]/gi, '-') + '.png';
    var url = qrDownloadUrl();
    if (!url) return toast('Link unduhan QRIS tidak tersedia.', true);
    try {
      if (tg && typeof tg.downloadFile === 'function') {
        tg.downloadFile({ url: url, file_name: filename }, function (accepted) {
          toast(accepted ? 'Unduhan QRIS dimulai.' : 'Unduhan QRIS dibatalkan.');
        });
        return;
      }
      var link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('QRIS sedang diunduh.');
    } catch (error) {
      try {
        if (tg && typeof tg.openLink === 'function') tg.openLink(url);
        else window.open(url, '_blank', 'noopener');
      } catch (_) {}
      toast('QRIS dibuka sebagai file. Simpan gambar dari halaman yang terbuka.', true);
    }
  }

  function updateCountdown() {
    if (!state.activePayment || state.paymentStatus !== 'pending') return;
    var remaining = new Date(state.activePayment.expires_at).getTime() - Date.now();
    if (remaining <= 0) {
      els.paymentCountdown.textContent = '00:00'; clearPaymentTimers(); showExpiredPayment(); return;
    }
    var seconds = Math.floor(remaining / 1000);
    els.paymentCountdown.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  async function checkPayment(manual) {
    if (!state.activePayment || state.paymentStatus !== 'pending') return;
    try {
      var status = await api('order-status', { query: { invoice: state.activePayment.invoice } });
      if (status.status === 'completed') {
        clearPaymentTimers(); clearActivePaymentStorage(); state.paymentStatus = 'success'; updatePaymentBubble();
        els.paymentPendingView.classList.add('hidden'); els.paymentSuccessView.classList.remove('hidden'); els.paymentExpiredView.classList.add('hidden');
        if (!els.paymentModal.classList.contains('show')) openModal(els.paymentModal);
        if (tg && tg.HapticFeedback) try { tg.HapticFeedback.notificationOccurred('success'); } catch (_) {}
        loadCatalog(false);
      } else if (status.status === 'expired' || status.status === 'not_found') {
        clearPaymentTimers(); showExpiredPayment();
      } else if (manual) toast('Pembayaran belum terdeteksi. Sistem tetap memeriksa otomatis.');
    } catch (error) { if (manual) toast(error.message, true); }
  }
  function showExpiredPayment() {
    clearActivePaymentStorage(); state.paymentStatus = 'expired'; updatePaymentBubble();
    els.paymentPendingView.classList.add('hidden'); els.paymentSuccessView.classList.add('hidden'); els.paymentExpiredView.classList.remove('hidden');
    if (!els.paymentModal.classList.contains('show')) toast('Invoice pembayaran sudah kedaluwarsa.', true);
  }
  async function cancelPayment() {
    if (!state.activePayment) return closeModal(els.paymentModal);
    showLoading(true);
    try {
      await api('cancel-order', { body: { invoice: state.activePayment.invoice } });
      clearPaymentTimers(); clearActivePaymentStorage(); state.activePayment = null; state.paymentStatus = 'idle'; updatePaymentBubble(); closeModal(els.paymentModal); toast('Pesanan dibatalkan.');
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
      if (!state.paymentRestored) { state.paymentRestored = true; restoreActivePayment(); }
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
  document.querySelectorAll('[data-close="confirm"]').forEach(function (el) { el.addEventListener('click', function () { closeModal(els.confirmModal); }); });
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
  els.buyNowButton.addEventListener('click', openCheckoutConfirmation);
  els.confirmCheckoutButton.addEventListener('click', startCheckout);
  $('cancelCheckoutConfirm').addEventListener('click', function () { closeModal(els.confirmModal); });
  $('checkPaymentButton').addEventListener('click', function () { checkPayment(true); });
  els.downloadQrButton.addEventListener('click', downloadQr);
  els.paymentBubble.addEventListener('click', function () { if (state.activePayment) showPayment(state.activePayment, true); });
  $('cancelPaymentButton').addEventListener('click', cancelPayment);
  $('paymentCloseButton').addEventListener('click', function () { closeModal(els.paymentModal); });
  $('successDoneButton').addEventListener('click', function () { clearActivePaymentStorage(); state.activePayment = null; state.paymentStatus = 'idle'; updatePaymentBubble(); closeModal(els.paymentModal); });
  $('expiredDoneButton').addEventListener('click', function () { clearActivePaymentStorage(); state.activePayment = null; state.paymentStatus = 'idle'; updatePaymentBubble(); closeModal(els.paymentModal); });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (els.confirmModal.classList.contains('show')) closeModal(els.confirmModal);
    else if (els.productModal.classList.contains('show')) closeModal(els.productModal);
    else if (els.historyModal.classList.contains('show')) closeModal(els.historyModal);
    else if (els.paymentModal.classList.contains('show')) closeModal(els.paymentModal);
  });

  loadCatalog(true);
})();
