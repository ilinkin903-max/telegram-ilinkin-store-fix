module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(String.raw`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Reseller Panel</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root{--bg:#fff0d8;--paper:#fff;--ink:#050505;--muted:#646464;--pink:#e83f9b;--cyan:#12b8ce;--lime:#83d904;--yellow:#ffe04b;--purple:#8557e8;--red:#ef3e45;--orange:#ff9f1c;--line:3px solid #050505;--shadow:6px 6px 0 #050505;--soft:3px 3px 0 #050505;--radius:8px}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#fff9d8 0,#fff0d8 35%,#ffe1b8 100%);color:var(--ink);font-family:Inter,Arial,system-ui,sans-serif;font-weight:900}.wrap{max-width:1220px;margin:auto;padding:20px 16px 80px}.hero{position:relative;overflow:hidden;background:var(--pink);color:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:22px 24px;margin:8px 0 18px}.hero:after{content:"";position:absolute;inset:0;background-image:var(--hero-bg,none);background-size:cover;background-position:center;opacity:.18;filter:saturate(1.1) contrast(1.05);z-index:0;pointer-events:none}.hero:before{content:"";position:absolute;right:-18px;top:-18px;width:150px;height:150px;background:repeating-linear-gradient(45deg,rgba(0,0,0,.22) 0 3px,transparent 3px 12px);z-index:1}.hero>*{position:relative;z-index:2}.badge{position:absolute;right:22px;top:22px;background:var(--yellow);color:#000;border:var(--line);box-shadow:var(--soft);border-radius:6px;padding:7px 14px;font-size:13px}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.08em}.hero h1{font-size:34px;line-height:1;margin:10px 0 6px}.storeline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.storeline.byline{font-size:12px;opacity:.96;text-transform:uppercase;letter-spacing:.03em}.storeline.byline span{font-size:12px}.storeline button{border:0;background:transparent;color:#fff;text-decoration:underline;font-weight:1000;cursor:pointer}.tier{font-size:13px;text-transform:uppercase;margin-top:8px}.statsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px;max-width:520px}.stat{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:10px 12px;color:#000;min-height:66px;display:flex;flex-direction:column;justify-content:center}.stat:nth-child(1){background:var(--cyan)}.stat:nth-child(2){background:var(--yellow)}.stat:nth-child(3){background:var(--lime)}.stat:nth-child(4){background:var(--purple);color:#fff}.stat small{display:block;text-transform:uppercase;font-size:10px}.stat b{display:block;font-size:clamp(18px,4.5vw,22px);margin-top:7px;line-height:1.05}.search{width:100%;border:var(--line);border-radius:var(--radius);padding:14px 16px;background:#fff;box-shadow:var(--soft);font-weight:900;font-size:15px;margin-bottom:10px}.count{font-size:13px;color:var(--muted);margin-bottom:16px}.navTiles{display:flex;flex-wrap:nowrap;gap:10px;margin:14px 0 18px;background:var(--purple);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:10px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}.navTiles::-webkit-scrollbar{height:7px}.navTiles::-webkit-scrollbar-thumb{background:#000;border-radius:99px}.tile{background:var(--lime);border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:13px 12px;text-align:center;min-height:70px;min-width:106px;flex:0 0 auto;scroll-snap-align:start;cursor:pointer;text-transform:uppercase;font-weight:1000}.tile.active{background:var(--yellow);color:#000}.tile .ico{font-size:18px;display:block;margin-bottom:6px}.section{display:none}.section.active{display:block}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.panel,.product,.miniCard{background:var(--paper);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px}.panel{margin-bottom:18px}.chartPanel{background:#5dc8ff}.addPanel{background:var(--lime)}.sectionTitle{margin:0 0 12px;font-size:23px}.subtle{color:var(--muted);font-size:13px}.product{min-height:260px;display:flex;flex-direction:column;gap:8px}.productTop{display:flex;gap:12px}.productImg{width:72px;height:72px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.productFallback{width:72px;height:72px;border:var(--line);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:1000;color:#000;text-transform:uppercase}::placeholder{color:#777;opacity:.55}.product h3{font-size:18px;margin:0;line-height:1.2}.approved{margin-left:auto;align-self:flex-start;background:var(--lime);border:var(--line);border-radius:5px;padding:5px 8px;font-size:10px}.price{font-size:28px;margin-top:3px}.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:2px solid #000;border-radius:5px;background:#fff;padding:4px 7px;font-size:11px}.chip.green{background:var(--lime)}.chip.yellow{background:var(--yellow)}.chip.purple{background:var(--purple);color:#fff}.actions{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:auto}.btn{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px 14px;background:#fff;color:#000;font-weight:1000;cursor:pointer;text-align:center;text-transform:uppercase}.btn:active{transform:translate(3px,3px);box-shadow:0 0 0 #000}.btn.small{font-size:12px;padding:9px 8px}.cyan{background:var(--cyan)}.lime{background:var(--lime)}.pink{background:var(--pink);color:#fff}.yellow{background:var(--yellow)}.purple{background:var(--purple);color:#fff}.red{background:var(--red);color:#fff}.orange{background:var(--orange)}.forms{display:grid;grid-template-columns:1fr 1fr;gap:14px}.row{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.input,.textarea,.select{width:100%;border:var(--line);border-radius:var(--radius);background:#fff;padding:12px;font-weight:900;font-size:14px}.textarea{min-height:105px;resize:vertical}.textarea.tall{min-height:170px}.label{font-size:12px;text-transform:uppercase;margin:4px 0 6px;display:block}.help{font-size:12px;color:var(--muted);line-height:1.4}.tableWrap{overflow:auto}.table{width:100%;border-collapse:collapse}.table th,.table td{border:var(--line);padding:10px;background:#fff;text-align:left;vertical-align:top}.table th{background:var(--yellow);text-transform:uppercase}.voucher{border:var(--line);box-shadow:var(--soft);background:#fff;border-radius:var(--radius);padding:12px;margin:0 0 10px}.chart{height:clamp(190px,32vw,320px);border:var(--line);border-radius:var(--radius);display:grid;grid-template-columns:repeat(7,minmax(42px,1fr));align-items:end;gap:clamp(4px,1.4vw,10px);padding:clamp(8px,2vw,14px);background:#5dc8ff;overflow:hidden}.barBox{min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}.bar{width:min(42px,70%);border:2px solid #000;border-bottom-width:4px;background:var(--pink);min-height:8px}.barBox:nth-child(2n) .bar{background:var(--cyan)}.barBox:nth-child(3n) .bar{background:var(--yellow)}.barLabel{font-size:clamp(9px,2.2vw,11px);text-align:center;line-height:1.15;word-break:keep-all}.toast{position:fixed;left:16px;right:16px;bottom:16px;z-index:120;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);background:var(--lime);padding:14px;display:none}.toast.error{background:var(--red);color:#fff}.preview{width:100%;max-height:180px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.empty{padding:22px;border:var(--line);border-radius:var(--radius);background:#fff;text-align:center;color:var(--muted)}.modal{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;display:none;align-items:flex-start;justify-content:center;padding:22px 12px;overflow:auto}.modal.show{display:flex}.modalBox{width:min(920px,100%);background:#fff;border:var(--line);box-shadow:10px 10px 0 #000;border-radius:var(--radius);padding:16px}.modalHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.modalTitle{font-size:22px;margin:0}.closeBtn{border:var(--line);box-shadow:var(--soft);background:var(--red);color:#fff;border-radius:6px;font-weight:1000;padding:8px 12px;cursor:pointer}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detailItem{border:2px solid #000;background:#f8f8f8;border-radius:6px;padding:9px;font-size:13px;white-space:pre-wrap}.variantList{display:grid;gap:10px;margin:12px 0}.variantCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;background:#fff}.variantCard h3{margin:0 0 6px;font-size:17px}.ghost{opacity:.58;color:#666;font-size:12px;line-height:1.4;margin-top:6px}.field{display:flex;flex-direction:column;gap:6px}.switchBox{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;margin:10px 0}.switchLabel{display:flex;align-items:center;gap:10px;font-size:14px;text-transform:uppercase;cursor:pointer}.switchLabel input{display:none}.toggleTrack{position:relative;width:54px;height:28px;border:3px solid #000;border-radius:999px;background:#ddd;box-shadow:2px 2px 0 #000;display:inline-block;flex:0 0 auto}.toggleTrack:after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border:3px solid #000;border-radius:50%;background:#fff;transition:.18s}.switchLabel input:checked+.toggleTrack{background:var(--lime)}.switchLabel input:checked+.toggleTrack:after{transform:translateX(24px)}.variantBuilder{display:none;margin-top:12px}.variantBuilder.show{display:block}.addVariantCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#f9fff0;padding:12px;margin:10px 0}.addVariantCardTitle{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px;text-transform:uppercase}.dangerText{color:#b00020;font-weight:1000}.hidden{display:none!important}.variantMainHide.hidden{display:none!important}.variantMainCompact{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#eaffc8;padding:10px;margin:8px 0 12px;font-size:12px;line-height:1.45}
    @media(max-width:980px){.grid{grid-template-columns:repeat(2,1fr)}.forms{grid-template-columns:1fr}}
    @media(max-width:620px){.wrap{padding:14px 10px 60px}.hero{padding:16px 12px}.hero h1{font-size:28px}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none;gap:8px}.stat{min-height:62px;padding:9px}.grid,.row,.row3,.detailGrid{grid-template-columns:1fr}.tile{min-height:62px;min-width:98px;padding:10px 8px;font-size:12px}.productTop{align-items:flex-start}.productImg,.productFallback{width:64px;height:64px}.price{font-size:25px}.chart{grid-template-columns:repeat(7,minmax(34px,1fr));gap:4px}}
  
    .productOff{opacity:.72;filter:grayscale(.18)}.statusToggle{margin-left:auto;align-self:flex-start;border:var(--line);box-shadow:var(--soft);border-radius:999px;padding:6px 12px;font-size:11px;background:var(--lime);font-weight:1000;cursor:pointer}.statusToggle.off{background:var(--red);color:#fff}.miniSwitch{display:inline-flex;gap:6px;align-items:center;background:#8bd80f;color:#000;border:2px solid #000;border-radius:8px;padding:5px 8px;font-size:11px;font-weight:1000}.miniSwitch input{accent-color:#111}.miniSwitch:has(input:not(:checked)){background:#ff4b4b;color:#fff}.miniSwitch input:not(:checked)+span{font-size:0}.miniSwitch input:not(:checked)+span:before{content:'OFF';font-size:11px}.miniSwitch input:checked+span{font-size:0}.miniSwitch input:checked+span:before{content:'ON';font-size:11px}.voucherIntroPanel{background:var(--yellow)}.voucherListPanel{background:#ffe88a}.voucherCard{background:#fff7c4;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;margin:0 0 10px}.voucherCard:nth-child(3n+1){background:#fff0a6}.voucherCard:nth-child(3n+2){background:#d9fbff}.voucherCard:nth-child(3n){background:#e6d7ff}.voucherCode{display:inline-block;border:var(--line);box-shadow:var(--soft);border-radius:6px;background:var(--yellow);padding:5px 9px;margin-bottom:8px}.broadcastPanel{background:#ffd1e8}.pollPanel{background:#d9fbff}.pollCard{background:#fff;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;margin:0 0 10px}.pollResultRow{border:2px solid #000;border-radius:8px;background:#f7f7f7;padding:8px;margin:7px 0}.pollBar{height:14px;border:2px solid #000;background:var(--yellow);box-shadow:2px 2px 0 #000;margin-top:5px;min-width:8px}.topPanel{background:#d8f7ff}.settingsPanel{background:#eaffc8}.mediaGuidePanel{background:#e6d7ff}.formCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;margin-bottom:10px}.orderGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.orderCard{background:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px;display:flex;flex-direction:column;gap:8px}.orderRef{font-size:11px;letter-spacing:.03em;color:#111}.orderTitle{font-size:19px;line-height:1.2}.orderMeta{font-size:13px;line-height:1.65;color:#333}.statusDone{align-self:flex-start;background:var(--lime);border:var(--line);box-shadow:var(--soft);border-radius:6px;padding:6px 10px;font-size:11px;color:#000}.userTools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.voucherMeta{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.softTitle{font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px;color:#111}.tile[data-tab="vouchers"]:not(.active),.tile[data-tab="broadcast"]:not(.active),.tile[data-tab="settings"]:not(.active){background:var(--lime)!important;color:#000!important}.tile.active{background:var(--yellow)!important;color:#000!important}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="eyebrow">ADMIN DASHBOARD</div>
    <h1 id="storeName">iLink.in Store</h1>
    <div class="storeline byline"><span>By iLink</span></div>
    <div class="statsGrid" id="stats"></div>
  </header>

  <input id="search" class="search" placeholder="Cari produk / kategori / kode..." />
  <div id="productCounter" class="count">0 produk</div>

  <nav class="navTiles" id="navTiles">
    <button class="tile active" data-tab="dashboard"><span class="ico">📊</span>Stats</button>
    <button class="tile" data-tab="products"><span class="ico">📦</span>Produk</button>
    <button class="tile" data-tab="orders"><span class="ico">🧾</span>Penjualan</button>
    <button class="tile" data-tab="addProduct"><span class="ico">➕</span>Tambah</button>
    <button class="tile" data-tab="vouchers"><span class="ico">🎟</span>Voucher</button>
    <button class="tile" data-tab="users"><span class="ico">👥</span>Users</button>
    <button class="tile" data-tab="broadcast"><span class="ico">📣</span>Broadcast</button>
    <button class="tile" data-tab="polling"><span class="ico">📊</span>Polling</button>
    <button class="tile" data-tab="settings"><span class="ico">🏪</span>Toko</button>
  </nav>

  <section id="dashboard" class="section active">
    <div class="forms">
      <div class="panel chartPanel"><h2 class="sectionTitle">Grafik 7 Hari Terakhir</h2><div id="revenueChart" class="chart"></div><p class="help">Menampilkan tanggal dan omzet per hari.</p></div>
      <div class="panel topPanel"><h2 class="sectionTitle">Produk Terlaris</h2><div id="topProductList"></div></div>
    </div>
  </section>

  <section id="products" class="section"><div id="productList" class="grid"></div></section>

  <section id="addProduct" class="section">
    <div class="panel addPanel">
      <h2 class="sectionTitle">Tambah Produk</h2>
      <p class="help">Isi data utama produk. Jika produk punya pilihan paket, aktifkan varian agar harga, stok, dan grosir tiap varian terpisah.</p>
      <form id="addForm" class="form">
        <div class="row3">
          <div class="field"><label class="label">Nama Produk</label><input class="input" name="nama" placeholder="Contoh: Canva Pro 1 Bulan" required></div>
          <div class="field"><label class="label">Kode Produk</label><input class="input" name="kode" placeholder="Contoh: CANVA1B" required></div>
          <div class="field variantMainHide" data-hide-when-variant><label class="label">Harga Satuan</label><input class="input" name="harga" type="number" placeholder="Contoh: 13000" required></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">Kategori</label><input class="input" name="category" placeholder="Contoh: Akun Premium"></div>
          <div class="field"><label class="label">Link Gambar Produk</label><input class="input" name="image_url" placeholder="Opsional: https://domain.com/canva.jpg"></div>
        </div>
        <div class="row variantMainHide" data-hide-when-variant>
          <div class="field"><label class="label">Deskripsi</label><textarea class="textarea" name="deskripsi" placeholder="Contoh: Canva EDU 1 tahun, cocok untuk desain, login via email." required></textarea></div>
          <div class="field"><label class="label">Syarat & Ketentuan</label><textarea class="textarea" name="snk" placeholder="Contoh: Garansi 7 hari jika akun bermasalah. Dilarang ganti password." required></textarea></div>
        </div>
        <div class="row">
          <div class="field variantMainHide" data-hide-when-variant><label class="label">Harga Grosir Default</label><textarea class="textarea" name="bulk_text" placeholder="Contoh per baris:\\n5|5000\\n10|9000"></textarea><p class="help">Dipakai untuk produk tanpa varian, atau jika varian belum punya harga grosir sendiri.</p></div>
          <div class="field variantMainHide" data-hide-when-variant><label class="label">Stok Default / Non-Varian</label><textarea class="textarea" name="stock_text" placeholder="Contoh: satu baris satu stok
email1:password1
email2:password2"></textarea><p class="help">Disembunyikan saat varian aktif karena stok diisi per varian.</p></div>
        </div>
        <div class="switchBox">
          <label class="switchLabel"><input id="addVariantToggle" type="checkbox"><span class="toggleTrack"></span><span>Aktifkan Varian Produk</span></label>
          <p class="help">Jika aktif, harga satuan, deskripsi, SnK, dan grosir utama disembunyikan agar ringkas. Semua diisi per varian.</p>
          <input type="hidden" name="variants_text" id="addVariantsText" value="">
          <div id="addVariantBuilder" class="variantBuilder">
            <div class="variantMainCompact">Mode varian aktif: harga, deskripsi, SnK, stok, dan grosir diatur per varian. Produk utama hanya butuh nama, kode, kategori, dan gambar.</div>
            <div id="addVariantCards"></div>
            <button class="btn purple small" type="button" id="addVariantRow">+ Tambah Varian</button>
          </div>
        </div>
        <button class="btn lime" type="submit">Tambah Produk</button>
      </form>
    </div>
  </section>

  <section id="vouchers" class="section">
    <div class="panel voucherIntroPanel"><h2 class="sectionTitle">Voucher</h2><p class="help">Kelola voucher lewat popup agar lebih mudah. Kode voucher dapat berlaku untuk semua produk atau kode produk tertentu.</p><button class="btn lime" type="button" id="openAddVoucher">+ Tambah Voucher</button></div>
    <div class="panel voucherListPanel"><h2 class="sectionTitle">Daftar Voucher</h2><div id="voucherList"></div></div>
  </section>

  <section id="orders" class="section"><div class="panel"><h2 class="sectionTitle">Penjualan</h2><div id="orderList" class="orderGrid"></div></div></section>
  <section id="users" class="section"><div class="panel tableWrap"><h2 class="sectionTitle">Users</h2><div class="userTools"><button class="btn small lime" type="button" data-user-sort="latest">Terbaru</button><button class="btn small purple" type="button" data-user-sort="transactions">Transaksi Terbanyak</button><button class="btn small yellow" type="button" data-user-sort="spending">Spending Terbanyak</button></div><table class="table"><thead><tr><th>ID</th><th>User</th><th>Transaksi</th><th>Spending</th><th>Aksi</th></tr></thead><tbody id="userList"></tbody></table></div></section>
  <section id="broadcast" class="section"><div class="panel broadcastPanel"><h2 class="sectionTitle">Broadcast</h2><form id="broadcastForm" class="form"><select class="select" name="type"><option value="text">Teks</option><option value="photo">Gambar URL / file_id</option><option value="sticker">Stiker file_id</option></select><textarea class="textarea" name="message" placeholder="Contoh teks/caption: Stok Canva sudah ready, cek sekarang."></textarea><input class="input" name="photo" placeholder="Untuk tipe gambar: URL https://... atau file_id foto Telegram"><input class="input" name="sticker" placeholder="Untuk tipe stiker: file_id stiker, contoh CAACAg..."><p class="help">Jika pilih Gambar, isi kolom gambar. Jika pilih Stiker, isi kolom stiker. Caption bisa diisi di pesan.</p><button class="btn red" type="submit">Kirim Broadcast</button></form></div></section>
  <section id="polling" class="section"><div class="panel pollPanel"><h2 class="sectionTitle">Hasil Polling</h2><p class="help">Polling yang dikirim/forward ke bot akan masuk sebagai draft preview. Setelah dibroadcast, hasil voting tampil di sini. Hapus polling lama untuk menghemat database.</p><div id="pollList"></div></div></section>
  <section id="settings" class="section"><div class="forms"><div class="panel settingsPanel"><h2 class="sectionTitle">Identitas Toko</h2><form id="settingsForm" class="form"><div class="field"><label class="label">Nama Toko</label><input class="input" name="store_name" placeholder="Contoh: iLink.in Store"></div><div class="row"><div class="field"><label class="label">Link Customer Service</label><input class="input" name="customer_service_link" placeholder="Contoh: https://t.me/username_cs atau @username_cs"></div><div class="field"><label class="label">Link Grup</label><input class="input" name="group_link" placeholder="Contoh: https://t.me/grupkamu atau @grupkamu"></div></div><input type="hidden" name="store_description" value=""><input type="hidden" name="logo_url" value=""><input type="hidden" name="banner_url" value=""><h3>Media Saat User /start</h3><select class="select" name="start_media_type"><option value="none">Tanpa media</option><option value="photo">Gambar toko</option><option value="sticker">Stiker Telegram</option></select><input class="input" name="start_media_value" placeholder="Contoh gambar: https://domain.com/banner.jpg atau file_id stiker"><textarea class="textarea" name="start_media_caption" placeholder="Caption gambar /start. Kosongkan lalu simpan jika ingin menghapus caption."></textarea><p class="help">URL toko dan deskripsi toko sudah dihapus. Untuk gambar gunakan URL HTTPS publik. Untuk stiker isi file_id stiker Telegram.</p><button class="btn lime" type="submit">Simpan Toko</button></form></div><div class="panel mediaGuidePanel"><h2 class="sectionTitle">Panduan Media /start</h2><p class="help">Pilih Gambar toko jika ingin /start mengirim gambar dengan caption. Pilih Stiker Telegram jika ingin /start mengirim stiker. Caption bisa diedit atau dikosongkan kapan saja.</p></div></div></section>
</div>
<div id="modal" class="modal"><div class="modalBox"><div class="modalHead"><h2 id="modalTitle" class="modalTitle">Modal</h2><button id="modalClose" class="closeBtn">Tutup</button></div><div id="modalBody"></div></div></div>
<div id="toast" class="toast"></div>
<script>
(function(){
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { try { tg.ready(); tg.expand(); } catch(e) {} }
  var initData = tg && tg.initData ? tg.initData : '';
  var state = { stats:{}, products:[], orders:[], users:[], vouchers:[], polls:[], settings:{}, analytics:{} };
  function rupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];}); }
  function toast(msg, err){ var el=document.getElementById('toast'); el.textContent=msg; el.className='toast'+(err?' error':''); el.style.display='block'; setTimeout(function(){el.style.display='none';},3500); }
  function headers(){ return { 'Content-Type':'application/json','X-Telegram-Init-Data':initData }; }
  async function api(action, body, query){ var url='/api/reseller-data?action='+encodeURIComponent(action); if(query){ Object.keys(query).forEach(function(k){ if(query[k]) url+='&'+encodeURIComponent(k)+'='+encodeURIComponent(query[k]); }); } var r=await fetch(url,{method:body?'POST':'GET',headers:headers(),body:body?JSON.stringify(body):undefined}); var j=await r.json(); if(!j.ok) throw new Error(j.error||'Gagal memuat data'); return j; }
  function formData(form){ var d=Object.fromEntries(new FormData(form).entries()); Object.keys(d).forEach(function(k){ if(d[k]==='') delete d[k]; }); return d; }
  function formDataRaw(form){ return Object.fromEntries(new FormData(form).entries()); }
  function switchTab(id){ document.querySelectorAll('.tile[data-tab]').forEach(function(x){x.classList.remove('active'); x.setAttribute('aria-selected','false');}); document.querySelectorAll('.section').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('.tile[data-tab="'+id+'"]').forEach(function(x){x.classList.add('active'); x.setAttribute('aria-selected','true');}); var section=document.getElementById(id); if(section) section.classList.add('active'); try{ localStorage.setItem('admin_active_tab', id); }catch(e){} window.scrollTo(0,0); }
  function openModal(title, html){ document.getElementById('modalTitle').textContent=title; document.getElementById('modalBody').innerHTML=html; document.getElementById('modal').classList.add('show'); }
  function closeModal(){ document.getElementById('modal').classList.remove('show'); document.getElementById('modalBody').innerHTML=''; }
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modal').addEventListener('click',function(e){ if(e.target.id==='modal') closeModal(); });
  function bulkToText(rows){ return (rows||[]).map(function(x){return (x.min_qty||x.qty||'')+'|'+(x.price||x.harga||'');}).join('\n'); }
  function variantStock(v){ return Array.isArray(v&&v.stock) ? v.stock : []; }
  function variantActive(v){ return !(v && v.active === false); }
  function variantBulkText(v){ return bulkToText((v&&v.bulk_prices)||[]).replace(/\|/g,':').replace(/\n/g,','); }
  function variantsToText(rows){ return (rows||[]).map(function(x,i){ var stock=variantStock(x).join(','); var bulk=variantBulkText(x); return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||('VAR'+(i+1)),stock,bulk,x.description||x.deskripsi||'',x.snk||x.terms||'',variantActive(x)?'on':'off'].join('|'); }).join('\n'); }
  function variantHelp(){ return '<div class="ghost">Contoh samar:<br>1 Bulan|10000|BULAN1|akun1,akun2|5:9000,10:8000|Deskripsi khusus 1 bulan|SnK khusus 1 bulan<br>Lifetime|50000|LIFE|kode1,kode2|3:45000|Deskripsi lifetime|SnK lifetime</div>'; }
  function cleanListText(value){ return String(value||'').split(/[\n,]+/).map(function(x){return x.trim();}).filter(Boolean); }
  function parseBulkArray(value){
    return String(value||'').split(/[\n,]+/).map(function(line){
      var parts=String(line||'').split(/[=|:;]/).map(function(x){return x.trim();}).filter(Boolean);
      return {min_qty:Number(String(parts[0]||'').replace(/[^0-9]/g,'')||0), price:Number(String(parts[1]||'').replace(/[^0-9]/g,'')||0)};
    }).filter(function(x){return x.min_qty>0 && x.price>0;});
  }
  function variantMetaToText(rows){ return (rows||[]).map(function(x,i){ return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||('VAR'+(i+1)),variantBulkText(x),x.description||x.deskripsi||'',x.snk||x.terms||'',variantActive(x)?'on':'off'].join('|'); }).join('\n'); }
  function mergeVariantMetaText(product, metaText){
    var existing=product.variants||[];
    var bySku={};
    existing.forEach(function(v,i){ bySku[String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase()]=v; });
    return String(metaText||'').split(/\n+/).map(function(line,i){
      var parts=line.split('|').map(function(x){return x.trim();});
      if(!parts[0]) return '';
      var sku=String(parts[2]||('VAR'+(i+1))).toUpperCase();
      var old=bySku[sku]||existing[i]||{};
      var stock=variantStock(old).join(',');
      var active = parts[6] || (variantActive(old) ? 'on' : 'off');
      return [parts[0]||'',parts[1]||'',sku,stock,parts[3]||'',parts[4]||'',parts[5]||'',active].join('|');
    }).filter(Boolean).join('\n');
  }
  function mergeVariantStockArray(product, mode){
    var existing=product.variants||[];
    return existing.map(function(v,i){
      var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase();
      var el=document.querySelector('[data-stock-field="'+sku.replace(/"/g,'&quot;')+'"]');
      var input=el?cleanListText(el.value):[];
      var stock=mode==='append' ? variantStock(v).concat(input) : input;
      return {
        name:v.name||v.nama||'',
        price:v.price||v.harga||0,
        sku:sku,
        stock:stock,
        bulk_prices:Array.isArray(v.bulk_prices)?v.bulk_prices:parseBulkArray(variantBulkText(v)),
        description:v.description||v.deskripsi||'',
        snk:v.snk||v.terms||'',
        active:variantActive(v)
      };
    });
  }
  function stockCount(p){ var v=(p.variants||[]).reduce(function(sum,x){return sum+variantStock(x).length;},0); return v>0?v:((p.data||[]).length); }
  function addVariantRow(data){
    data=data||{};
    var wrap=document.getElementById('addVariantCards');
    if(!wrap) return;
    var n=wrap.querySelectorAll('.addVariantCard').length+1;
    var div=document.createElement('div');
    div.className='addVariantCard';
    div.innerHTML='<div class="addVariantCardTitle"><b>Varian '+n+'</b><div><label class="miniSwitch"><input type="checkbox" data-vfield="active" '+(data.active===false?'':'checked')+'><span>ON</span></label> <button class="btn small red" type="button" data-remove-variant>Hapus</button></div></div>'+ 
      '<div class="row3"><div class="field"><label class="label">Nama Varian</label><input class="input" data-vfield="name" placeholder="Contoh: 1 Bulan" value="'+esc(data.name||'')+'"></div><div class="field"><label class="label">Harga Varian</label><input class="input" data-vfield="price" type="number" placeholder="Contoh: 10000" value="'+esc(data.price||'')+'"></div><div class="field"><label class="label">Kode Varian</label><input class="input" data-vfield="sku" placeholder="Contoh: BULAN1" value="'+esc(data.sku||'')+'"></div></div>'+ 
      '<div class="row"><div class="field"><label class="label">Stok Varian</label><textarea class="textarea" data-vfield="stock" placeholder="Contoh, pisahkan koma atau baris baru:\nakun1,akun2,akun3">'+esc(data.stock||'')+'</textarea></div><div class="field"><label class="label">Harga Grosir Varian</label><textarea class="textarea" data-vfield="bulk" placeholder="Contoh:\n5:9000,10:8000">'+esc(data.bulk||'')+'</textarea></div></div>'+
      '<div class="row"><div class="field"><label class="label">Deskripsi Varian</label><textarea class="textarea" data-vfield="description" placeholder="Contoh: Canva EDU 1 tahun untuk satu user.">'+esc(data.description||'')+'</textarea></div><div class="field"><label class="label">Syarat & Ketentuan Varian</label><textarea class="textarea" data-vfield="snk" placeholder="Contoh: Garansi 7 hari, jangan ganti password.">'+esc(data.snk||'')+'</textarea></div></div>';
    wrap.appendChild(div);
    var remove=div.querySelector('[data-remove-variant]');
    remove.onclick=function(){ div.remove(); refreshVariantTitles(); };
  }
  function refreshVariantTitles(){ document.querySelectorAll('#addVariantCards .addVariantCard').forEach(function(card,i){ var b=card.querySelector('.addVariantCardTitle b'); if(b) b.textContent='Varian '+(i+1); }); }
  function toggleAddVariantBuilder(){
    var chk=document.getElementById('addVariantToggle');
    var box=document.getElementById('addVariantBuilder');
    if(!chk||!box) return;
    var active=!!chk.checked;
    box.classList.toggle('show', active);
    document.querySelectorAll('[data-hide-when-variant]').forEach(function(el){
      el.classList.toggle('hidden', active);
      el.querySelectorAll('input,textarea,select').forEach(function(inp){
        if(active){ inp.dataset.wasRequired = inp.required ? '1' : ''; inp.required=false; }
        else if(inp.dataset.wasRequired==='1'){ inp.required=true; }
      });
    });
    if(active && !document.querySelector('#addVariantCards .addVariantCard')) addVariantRow({name:'',price:'',sku:'',stock:'',bulk:'',description:'',snk:'',active:true});
  }
  function collectAddVariants(){
    var chk=document.getElementById('addVariantToggle');
    if(!chk || !chk.checked) return [];
    var rows=[];
    document.querySelectorAll('#addVariantCards .addVariantCard').forEach(function(card){
      function val(k){ var el=card.querySelector('[data-vfield="'+k+'"]'); return el?String(el.value||'').trim():''; }
      var name=val('name');
      if(name){ rows.push({
        name:name,
        price:val('price'),
        sku:val('sku'),
        stock:cleanListText(val('stock')),
        bulk_prices:parseBulkArray(val('bulk')),
        description:val('description'),
        snk:val('snk'),
        active:(function(){ var el=card.querySelector('[data-vfield="active"]'); return !el || el.checked; })()
      }); }
    });
    return rows;
  }
  function compileAddVariants(){
    var hidden=document.getElementById('addVariantsText');
    var rows=collectAddVariants();
    if(hidden) hidden.value='';
    return rows;
  }
  function renderHeader(){
    var s=state.settings||{};
    if(s.store_name){ document.getElementById('storeName').textContent=s.store_name; }
    var hero=document.querySelector('.hero');
    var mediaType=String(s.start_media_type||'').toLowerCase();
    var mediaValue=String(s.start_media_value||'').trim();
    if(hero){
      if(mediaType==='photo' && mediaValue){
        hero.style.setProperty('--hero-bg','url("'+mediaValue.replace(/\"/g,'\\"')+'")');
      } else {
        hero.style.removeProperty('--hero-bg');
      }
    }
    renderSettingsForm();
  }
  function renderSettingsForm(){ var s=state.settings||{}; var f=document.getElementById('settingsForm'); if(!f) return; ['store_name','customer_service_link','group_link','start_media_type','start_media_value','start_media_caption'].forEach(function(k){ if(f[k]) f[k].value = s[k] || (k==='start_media_type'?'none':''); }); if(f.store_description) f.store_description.value=''; if(f.logo_url) f.logo_url.value=''; if(f.banner_url) f.banner_url.value=''; }
  function renderStats(){ var s=state.stats||{}; var daily=(state.analytics&&state.analytics.daily)||[]; var today=(state.analytics&&state.analytics.today_revenue!==undefined)?state.analytics.today_revenue:(daily.length?daily[daily.length-1].revenue:0); var items=[['Omset Hari Ini',rupiah(today)],['Order',s.orders||0],['Produk',s.products||0],['Stok',s.stokTersedia||0]]; document.getElementById('stats').innerHTML=items.map(function(x){return '<div class="stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join(''); }
  function renderCharts(){ var a=state.analytics||{}; var list=a.daily||[]; var max=Math.max.apply(null,list.map(function(d){return d.revenue;}).concat([1])); document.getElementById('revenueChart').innerHTML=list.map(function(d){var chartEl=document.getElementById('revenueChart'); var chartHeight=Math.max(140,(chartEl.clientHeight||240)-82); var h=Math.max(8,Math.round((d.revenue/max)*chartHeight)); return '<div class="barBox"><div class="bar" title="'+esc(d.label)+' - '+rupiah(d.revenue)+'" style="height:'+h+'px"></div><div class="barLabel">'+esc(d.label)+'<br>'+rupiah(d.revenue)+'</div></div>';}).join('')||'<div class="empty">Belum ada data.</div>'; document.getElementById('topProductList').innerHTML=(a.top_products||[]).map(function(p,i){return '<div class="voucher"><b>'+(i+1)+'. '+esc(p.name)+(p.variant?' - '+esc(p.variant):'')+'</b><br>Qty '+esc(p.quantity)+' | Omzet '+rupiah(p.revenue)+'</div>';}).join('')||'<div class="empty">Belum ada data penjualan.</div>'; }
  function productMatches(p,q){ var text=[p.nama,p.kode,p.category,p.deskripsi].join(' ').toLowerCase(); return text.indexOf(q)>=0; }
  function productInitial(p){ return String((p&&p.nama)||'?').trim().charAt(0).toUpperCase() || '?'; }
  function productColor(p){ var text=String((p&&p.kode)||(p&&p.nama)||'x'); var h=0; for(var i=0;i<text.length;i++) h=(h*31+text.charCodeAt(i))%360; return 'hsl('+h+' 85% 68%)'; }
  function productMediaHtml(p){ if(p.image_url) return '<img class="productImg" src="'+esc(p.image_url)+'" alt="">'; return '<div class="productFallback" style="background:'+productColor(p)+'">'+esc(productInitial(p))+'</div>'; }
  function productVariants(p){ return Array.isArray(p&&p.variants) ? p.variants.filter(function(v){ return (v.name||v.nama||v.sku||v.kode) && Number(v.price||v.harga||0)>0; }) : []; }
  function activeProductVariants(p){ return productVariants(p).filter(function(v){ return variantActive(v); }); }
  function productDisplayPrice(p){
    var vars=activeProductVariants(p);
    if(!vars.length) vars=productVariants(p);
    if(!vars.length) return rupiah(p.harga);
    var prices=vars.map(function(v){return Number(v.price||v.harga||0);}).filter(function(n){return n>0;}).sort(function(a,b){return a-b;});
    if(!prices.length) return rupiah(p.harga);
    if(prices[0]===prices[prices.length-1]) return rupiah(prices[0]);
    return rupiah(prices[0])+' - '+rupiah(prices[prices.length-1]);
  }
  function productBulkChips(p){
    var vars=activeProductVariants(p);
    if(!vars.length) vars=productVariants(p);
    if(vars.length){
      return vars.slice(0,3).map(function(v){
        var b=(v.bulk_prices||[])[0];
        if(!b) return '';
        return '<span class="chip yellow">'+esc(v.name||v.nama||v.sku||v.kode)+' '+(b.min_qty||b.qty)+'+ '+rupiah(b.price||b.harga)+'</span>';
      }).join('');
    }
    return (p.bulk_prices||[]).slice(0,2).map(function(b){return '<span class="chip yellow">'+(b.min_qty||b.qty)+'+ '+rupiah(b.price||b.harga)+'</span>';}).join('');
  }
  function renderProducts(){ var q=(document.getElementById('search').value||'').toLowerCase(); var rows=state.products.filter(function(p){return productMatches(p,q);}); document.getElementById('productCounter').textContent=rows.length+' / '+state.products.length+' produk'; document.getElementById('productList').innerHTML=rows.map(function(p){ var varsArr=productVariants(p); var bulk=productBulkChips(p); var vars=varsArr.slice(0,3).map(function(v){return '<span class="chip '+(variantActive(v)?'purple':'red')+'">'+esc(v.name||v.nama)+' '+rupiah(v.price||v.harga||p.harga)+' • '+variantStock(v).length+' stok • '+(variantActive(v)?'ON':'OFF')+'</span>';}).join(''); return '<article class="product '+(p.active===false?'productOff':'')+'">'+
      '<div class="productTop">'+productMediaHtml(p)+'<div><h3>'+esc(p.nama)+'</h3><div class="subtle">'+esc(p.category||'Produk')+' - STOK '+stockCount(p)+(varsArr.length?' - '+varsArr.length+' varian':'')+'</div></div><button class="statusToggle '+(p.active===false?'off':'')+'" data-toggle-product="'+esc(p.kode)+'">'+(p.active===false?'OFF':'ON')+'</button></div>'+ 
      '<div class="price">'+productDisplayPrice(p)+'</div><div class="chips">'+bulk+vars+'</div>'+ 
      '<div class="actions"><button class="btn small cyan" data-edit-product="'+esc(p.kode)+'">Edit</button><button class="btn small lime" data-stock-product="'+esc(p.kode)+'">Stok</button><button class="btn small yellow" data-manage-product="'+esc(p.kode)+'">Kelola</button><button class="btn small red" data-delete-product="'+esc(p.kode)+'">Hapus</button></div></article>'; }).join('')||'<div class="empty">Produk belum ada.</div>'; wireProductButtons(); }
  function findProduct(code){ return state.products.find(function(x){return x.kode===code;}); }
  function editVariantCardHtml(v,i, allowRemove){
    v=v||{};
    var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase();
    return '<div class="addVariantCard" data-edit-variant-card data-old-sku="'+esc(sku)+'">'+
      '<div class="addVariantCardTitle"><b>Varian '+(i+1)+'</b><div><label class="miniSwitch"><input type="checkbox" data-evfield="active" '+(variantActive(v)?'checked':'')+'><span>ON</span></label> <span class="chip yellow">Stok diatur dari Stok/Kelola</span> '+(allowRemove?'<button class="btn small red" type="button" data-remove-edit-variant>Hapus</button>':'')+'</div></div>'+ 
      '<div class="row3"><div class="field"><label class="label">Nama Varian</label><input class="input" data-evfield="name" placeholder="Contoh: 1 Bulan" value="'+esc(v.name||v.nama||'')+'"></div><div class="field"><label class="label">Harga Varian</label><input class="input" data-evfield="price" type="number" placeholder="Contoh: 10000" value="'+esc(v.price||v.harga||'')+'"></div><div class="field"><label class="label">Kode Varian</label><input class="input" data-evfield="sku" placeholder="Contoh: BULAN1" value="'+esc(sku)+'"></div></div>'+
      '<div class="field"><label class="label">Harga Grosir Varian</label><textarea class="textarea" data-evfield="bulk" placeholder="Contoh:\n5:9000\n10:8000">'+esc(variantBulkText(v)||'')+'</textarea></div>'+ 
      '<div class="row"><div class="field"><label class="label">Deskripsi Varian</label><textarea class="textarea tall" data-evfield="description" placeholder="Contoh:\nCanva EDU 1 tahun.\nLogin menggunakan email pembeli.">'+esc(v.description||v.deskripsi||'')+'</textarea></div><div class="field"><label class="label">Syarat & Ketentuan Varian</label><textarea class="textarea tall" data-evfield="snk" placeholder="Contoh:\nGaransi 7 hari.\nDilarang ganti password.">'+esc(v.snk||v.terms||'')+'</textarea></div></div>'+ 
      '</div>';
  }
  function refreshEditVariantTitles(){ document.querySelectorAll('#editVariantCards [data-edit-variant-card]').forEach(function(card,i){ var b=card.querySelector('.addVariantCardTitle b'); if(b) b.textContent='Varian '+(i+1); }); }
  function addEditVariantRow(data){
    var wrap=document.getElementById('editVariantCards'); if(!wrap) return;
    var n=wrap.querySelectorAll('[data-edit-variant-card]').length;
    wrap.insertAdjacentHTML('beforeend', editVariantCardHtml(data||{}, n, true));
    wireEditVariantRemoveButtons();
    refreshEditVariantTitles();
  }
  function wireEditVariantRemoveButtons(){ document.querySelectorAll('[data-remove-edit-variant]').forEach(function(btn){ btn.onclick=function(){ var card=btn.closest('[data-edit-variant-card]'); if(card) card.remove(); refreshEditVariantTitles(); }; }); }
  function collectEditVariants(product){
    var existing=product.variants||[];
    var bySku={}; existing.forEach(function(v,i){ bySku[String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase()]=v; });
    var rows=[];
    document.querySelectorAll('[data-edit-variant-card]').forEach(function(card,i){
      function val(k){ var el=card.querySelector('[data-evfield="'+k+'"]'); return el?String(el.value||'').trim():''; }
      var oldSku=String(card.getAttribute('data-old-sku')||('VAR'+(i+1))).toUpperCase();
      var sku=String(val('sku')||oldSku).toUpperCase();
      var old=bySku[oldSku]||bySku[sku]||existing[i]||{};
      var name=val('name');
      if(name){ rows.push({
        name:name,
        price:val('price'),
        sku:sku,
        stock:variantStock(old),
        bulk_prices:parseBulkArray(val('bulk')),
        description:val('description'),
        snk:val('snk'),
        active:(function(){ var el=card.querySelector('[data-evfield="active"]'); return !el || el.checked; })()
      }); }
    });
    return rows;
  }
  function compileEditVariants(product){
    return collectEditVariants(product);
  }
  function toggleEditVariantBuilder(){
    var chk=document.getElementById('editVariantToggle');
    var box=document.getElementById('editVariantBuilder');
    if(!chk||!box) return;
    var active=!!chk.checked;
    box.classList.toggle('show', active);
    document.querySelectorAll('[data-hide-when-edit-variant]').forEach(function(el){
      el.classList.toggle('hidden', active);
      el.querySelectorAll('input,textarea,select').forEach(function(inp){
        if(active){ inp.dataset.wasRequired = inp.required ? '1' : ''; inp.required=false; }
        else if(inp.dataset.wasRequired==='1'){ inp.required=true; }
      });
    });
    if(active && !document.querySelector('#editVariantCards [data-edit-variant-card]')) addEditVariantRow({name:'',price:'',sku:'',stock:'',bulk:'',description:'',snk:'',active:true});
  }
  function editFormHtml(p){
    var hasVar=(p.variants||[]).length>0;
    var variantCards=(p.variants||[]).map(function(v,i){return editVariantCardHtml(v,i,true);}).join('');
    return '<form id="modalEditForm" class="form"><input type="hidden" name="kode" value="'+esc(p.kode)+'">'+
      '<div class="row3"><div class="field"><label class="label">Nama Produk</label><input class="input" name="nama" placeholder="Contoh: Canva Pro 1 Bulan" value="'+esc(p.nama||'')+'"></div><div class="field"><label class="label">Kode Produk</label><input class="input" name="kode_baru" placeholder="Contoh: CANVA1B" value="'+esc(p.kode||'')+'"></div><div class="field"><label class="label">Kategori</label><input class="input" name="category" placeholder="Contoh: Akun Premium" value="'+esc(p.category||'')+'"></div></div>'+
      '<div class="field"><label class="label">Link Gambar Produk</label><input class="input" name="image_url" placeholder="Opsional: https://domain.com/canva.jpg" value="'+esc(p.image_url||'')+'"></div>'+ 
      '<div class="row '+(hasVar?'hidden':'')+'" data-hide-when-edit-variant><div class="field"><label class="label">Harga Satuan</label><input class="input" name="harga" type="number" placeholder="Contoh: 13000" value="'+esc(p.harga||'')+'"></div><div class="field"><label class="label">Harga Grosir</label><textarea class="textarea" name="bulk_text" placeholder="Contoh per baris:\n5|5000\n10|9000">'+esc(bulkToText(p.bulk_prices||[]))+'</textarea></div></div>'+
      '<div class="row '+(hasVar?'hidden':'')+'" data-hide-when-edit-variant><div class="field"><label class="label">Deskripsi</label><textarea class="textarea tall" name="deskripsi" placeholder="Contoh:\nCanva EDU 1 tahun.\nLogin via email.">'+esc(p.deskripsi||'')+'</textarea></div><div class="field"><label class="label">Syarat & Ketentuan</label><textarea class="textarea tall" name="snk" placeholder="Contoh:\nGaransi 7 hari.\nDilarang ganti password.">'+esc(p.snk||'')+'</textarea></div></div>'+
      '<div class="switchBox" style="background:#f4e7ff"><label class="switchLabel"><input id="editVariantToggle" type="checkbox" '+(hasVar?'checked':'')+'><span class="toggleTrack"></span><span>Aktifkan / Edit Varian Produk</span></label><p class="help">Jika aktif, harga, grosir, deskripsi, dan SnK utama disembunyikan. Gunakan tombol + Tambah Varian untuk menambah pilihan varian. Stok tetap dikelola dari tombol Stok/Kelola.</p><input type="hidden" name="variants_text" id="editVariantsText"><div id="editVariantBuilder" class="variantBuilder '+(hasVar?'show':'')+'"><div class="variantMainCompact">Mode varian aktif: harga, grosir, deskripsi, dan SnK diatur per varian. Stok tidak ikut diedit di sini.</div><div id="editVariantCards">'+variantCards+'</div><button class="btn purple small" type="button" id="addEditVariantRowBtn">+ Tambah Varian</button></div></div>'+
      '<button class="btn cyan" type="submit">Simpan Perubahan</button></form>';
  }
  function openEditProduct(code){
    var p=findProduct(code); if(!p) return;
    openModal('Edit Produk - '+p.nama, editFormHtml(p));
    var toggle=document.getElementById('editVariantToggle'); if(toggle) toggle.onchange=toggleEditVariantBuilder;
    var addBtn=document.getElementById('addEditVariantRowBtn'); if(addBtn) addBtn.onclick=function(){ addEditVariantRow({}); };
    wireEditVariantRemoveButtons();
    toggleEditVariantBuilder();
    document.getElementById('modalEditForm').onsubmit=async function(e){
      e.preventDefault();
      var d=formDataRaw(e.target);
      d.current_code=d.kode;
      if(d.kode_baru) d.kode=d.kode_baru;
      delete d.kode_baru;
      var active=!!(document.getElementById('editVariantToggle')&&document.getElementById('editVariantToggle').checked);
      if(active){
        var variants=collectEditVariants(p);
        d.variants=variants;
        delete d.variants_text;
        delete d.variant_text;
        if(variants.length){
          // Saat varian aktif, data harga/grosir/deskripsi/SnK utama mengikuti varian pertama.
          // Field utama disembunyikan agar edit produk sama ringkasnya seperti tambah produk.
          d.harga=variants[0].price||0;
          d.deskripsi=variants[0].description||'Produk dengan varian.';
          d.snk=variants[0].snk||'Syarat mengikuti varian yang dipilih.';
          d.bulk_text='';
        }
      } else {
        d.variants=[];
        delete d.variants_text;
        delete d.variant_text;
      }
      await post('edit-product-full',d); closeModal();
    };
  }
  function openVariantProduct(code){ openEditProduct(code); }
  function openStockProduct(code){
    var p=findProduct(code); if(!p) return;
    var hasVar=(p.variants||[]).length>0;
    var html='<form id="modalAppendStockForm" class="form"><p class="help">Tombol Stok dipakai untuk <b>menambahkan stok</b>. Stok lama tidak akan hilang.</p><input type="hidden" name="kode" value="'+esc(p.kode)+'">';
    if(hasVar){
      html += '<div class="variantList">'+(p.variants||[]).map(function(v,i){ var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+' <span class="chip '+(variantActive(v)?'green':'red')+'">'+(variantActive(v)?'ON':'OFF')+'</span></h3><p class="help">Stok sekarang: '+variantStock(v).length+'</p><label class="label">Tambah Stok Varian</label><textarea class="textarea" data-stock-field="'+esc(sku)+'" placeholder="Satu stok per baris atau pisahkan koma\nakun1:pass1\nakun2:pass2"></textarea></div>'; }).join('')+'</div>';
    } else {
      html += '<label class="label">Tambah Stok Produk</label><textarea class="textarea tall" id="appendDefaultStock" placeholder="Satu stok per baris\nemail1:password1\nemail2:password2"></textarea><p class="help">Stok sekarang: '+((p.data||[]).length)+'</p>';
    }
    html += '<button class="btn lime" type="submit">Tambahkan Stok</button></form>';
    openModal('Tambah Stok - '+p.nama, html);
    document.getElementById('modalAppendStockForm').onsubmit=async function(e){ e.preventDefault(); var d={kode:p.kode}; if(hasVar){ d.variants=mergeVariantStockArray(p,'append'); delete d.variants_text; delete d.variant_text; } else { var add=cleanListText(document.getElementById('appendDefaultStock').value); d.stock_text=(p.data||[]).concat(add).join('\n'); } await post('edit-product-full',d); closeModal(); };
  }
  function openManageProduct(code){
    var p=findProduct(code); if(!p) return;
    var hasVar=(p.variants||[]).length>0;
    var html='<form id="modalManageStockForm" class="form"><p class="help">Kelola dipakai untuk <b>mengganti/mengatur stok</b>. Hapus baris stok yang sudah tidak dipakai, lalu simpan.</p><input type="hidden" name="kode" value="'+esc(p.kode)+'">';
    if(hasVar){
      html += '<div class="variantList">'+(p.variants||[]).map(function(v,i){ var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+' <span class="chip '+(variantActive(v)?'green':'red')+'">'+(variantActive(v)?'ON':'OFF')+'</span></h3><p class="help">Harga: '+rupiah(v.price||v.harga||p.harga)+' | Grosir: '+esc(variantBulkText(v)||'-')+'</p><label class="label">Stok Varian</label><textarea class="textarea tall" data-stock-field="'+esc(sku)+'" placeholder="Satu stok per baris">'+esc(variantStock(v).join('\n'))+'</textarea></div>'; }).join('')+'</div>';
    } else {
      html += '<label class="label">Stok Produk</label><textarea class="textarea tall" id="manageDefaultStock" placeholder="Satu stok per baris">'+esc((p.data||[]).join('\n'))+'</textarea>';
    }
    html += '<button class="btn yellow" type="submit">Simpan Kelola Stok</button></form>';
    openModal('Kelola Stok - '+p.nama, html);
    document.getElementById('modalManageStockForm').onsubmit=async function(e){ e.preventDefault(); var d={kode:p.kode}; if(hasVar){ d.variants=mergeVariantStockArray(p,'replace'); delete d.variants_text; delete d.variant_text; } else { d.stock_text=cleanListText(document.getElementById('manageDefaultStock').value).join('\n'); } await post('edit-product-full',d); closeModal(); };
  }
  function openDeleteProduct(code){ var p=findProduct(code); if(!p) return; openModal('Hapus Produk','<p class="dangerText">Yakin hapus produk '+esc(p.nama)+' ('+esc(p.kode)+')?</p><button class="btn red" id="confirmDeleteProduct">Hapus Sekarang</button>'); document.getElementById('confirmDeleteProduct').onclick=async function(){ await post('delete-product',{kode:p.kode}); closeModal(); }; }
  function wireProductButtons(){ document.querySelectorAll('[data-edit-product]').forEach(function(btn){btn.onclick=function(){openEditProduct(btn.dataset.editProduct);};}); document.querySelectorAll('[data-manage-product]').forEach(function(btn){btn.onclick=function(){openManageProduct(btn.dataset.manageProduct);};}); document.querySelectorAll('[data-stock-product]').forEach(function(btn){btn.onclick=function(){openStockProduct(btn.dataset.stockProduct);};}); document.querySelectorAll('[data-delete-product]').forEach(function(btn){btn.onclick=function(){openDeleteProduct(btn.dataset.deleteProduct);};}); document.querySelectorAll('[data-toggle-product]').forEach(function(btn){btn.onclick=async function(e){ e.stopPropagation(); var p=findProduct(btn.dataset.toggleProduct); if(!p) return; await post('toggle-product',{kode:p.kode,active:p.active===false}); };}); }
  function orderProductText(o){
    if(Array.isArray(o.delivered_items) && o.delivered_items.length) return o.delivered_items.join('\n');
    if(o.delivered_text) return String(o.delivered_text);
    return 'Data produk pembelian ini belum tersimpan. Order lama sebelum update v13 belum memiliki arsip produk terkirim.';
  }
  function openOrderProducts(ref){
    var o=state.orders.find(function(x){return String(x.order_ref||'')===String(ref||'');});
    if(!o) return;
    var user=o.username?'@'+esc(o.username):esc(o.telegram_id);
    var text=orderProductText(o);
    openModal('Produk Pembelian', '<div class="detailGrid"><div class="detailItem"><b>Invoice</b><br>'+esc(o.order_ref||'-')+'</div><div class="detailItem"><b>User</b><br>'+user+'</div><div class="detailItem"><b>Produk</b><br>'+esc(o.product_name||'-')+(o.variant_name?' - '+esc(o.variant_name):'')+'</div><div class="detailItem"><b>Total</b><br>'+rupiah(o.total_price)+'</div></div><div class="field" style="margin-top:12px"><label class="label">Produk yang diterima pembeli</label><textarea class="textarea tall" readonly>'+esc(text)+'</textarea></div>');
  }
  function renderOrders(){
    document.getElementById('orderList').innerHTML=state.orders.map(function(o){
      var user=o.username?'@'+esc(o.username):esc(o.telegram_id);
      var ref=esc(o.order_ref||('INV-'+String(o.created_at||'').replace(/[^0-9]/g,'').slice(-10)));
      var name=esc(o.product_name)+(o.variant_name?' <span class="chip yellow">'+esc(o.variant_name)+'</span>':'');
      return '<article class="orderCard"><div class="orderRef">'+ref+'</div><b class="orderTitle">'+name+'</b><span class="statusDone">COMPLETED</span><div class="orderMeta">×'+esc(o.quantity||1)+' · <b>'+rupiah(o.total_price)+'</b><br>💰 Earning: <b style="color:#00877a">'+rupiah(o.total_price)+'</b><br>👤 '+user+'<br>🗓 '+new Date(o.created_at).toLocaleString('id-ID')+'</div><button class="btn small purple" type="button" data-order-products="'+ref+'">Lihat Produk</button></article>';
    }).join('')||'<div class="empty">Belum ada order.</div>';
    document.querySelectorAll('[data-order-products]').forEach(function(btn){btn.onclick=function(){openOrderProducts(btn.dataset.orderProducts);};});
  }
  function renderUsers(sortMode){ if(sortMode) state.userSort=sortMode; var rows=state.users.slice(); if(state.userSort==='transactions') rows.sort(function(a,b){return Number(b.transaction_count||0)-Number(a.transaction_count||0);}); else if(state.userSort==='spending') rows.sort(function(a,b){return Number(b.spending||0)-Number(a.spending||0);}); document.getElementById('userList').innerHTML=rows.map(function(u){return '<tr><td>'+esc(u.telegram_id)+'</td><td>'+(u.username?'@'+esc(u.username):esc(u.first_name||'-'))+'</td><td>'+esc(u.transaction_count||0)+'</td><td>'+rupiah(u.spending||0)+'</td><td><button class="btn small red" data-del-user="'+esc(u.telegram_id)+'">Hapus</button></td></tr>';}).join('')||'<tr><td colspan="5">Belum ada user.</td></tr>'; document.querySelectorAll('[data-del-user]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus user '+btn.dataset.delUser+'?')) await post('delete-user',{telegram_id:btn.dataset.delUser});};}); document.querySelectorAll('[data-user-sort]').forEach(function(btn){btn.onclick=function(){ renderUsers(btn.dataset.userSort); };}); }
  function voucherFormHtml(v){ v=v||{}; var target=(v.products&&v.products.length)?v.products.join(','):'semua'; return '<form id="modalVoucherForm" class="form">'+
    '<input type="hidden" name="current_code" value="'+esc(v.code||'')+'">'+
    '<div class="formCard"><p class="softTitle">Data Voucher</p><div class="row"><div class="field"><label class="label">Kode Voucher</label><input class="input" name="kode" placeholder="Contoh: DISKON10" value="'+esc(v.code||'')+'" required></div><div class="field"><label class="label">Target Produk</label><input class="input" name="produk" placeholder="Contoh: semua atau CANVA1B,NETFLIX" value="'+esc(target)+'"></div></div></div>'+
    '<div class="formCard"><p class="softTitle">Nilai dan Batas Pemakaian</p><div class="row"><div class="field"><label class="label">Potongan Harga</label><input class="input" name="potongan" type="number" placeholder="Contoh: 10000" value="'+esc(v.discount||'')+'" required></div><div class="field"><label class="label">Limit Pemakaian</label><input class="input" name="limit" type="number" placeholder="Contoh: 20" value="'+esc(v.usage_limit||'')+'" required></div></div></div>'+
    '<div class="formCard"><p class="softTitle">Status dan Masa Berlaku</p><div class="row"><div class="field"><label class="label">Status Voucher</label><select class="select" name="active"><option value="true" '+(v.active===false?'':'selected')+'>Aktif</option><option value="false" '+(v.active===false?'selected':'')+'>Nonaktif</option></select></div><div class="field"><label class="label">Tanggal Expired</label><input class="input" name="expires_at" placeholder="Opsional: 2026-07-30T23:59:00+07:00" value="'+esc(v.expires_at||'')+'"></div></div></div>'+
    '<div class="formCard"><div class="field"><label class="label">Deskripsi Voucher</label><textarea class="textarea" name="description" placeholder="Contoh: Voucher promo khusus member lama.">'+esc(v.description||'')+'</textarea></div></div>'+
    '<button class="btn lime" type="submit">Simpan Voucher</button></form>'; }
  function openVoucherModal(code){ var v=code?state.vouchers.find(function(x){return x.code===code;}):null; openModal(v?'Edit Voucher':'Tambah Voucher', voucherFormHtml(v)); document.getElementById('modalVoucherForm').onsubmit=async function(e){ e.preventDefault(); var d=formData(e.target); var action=d.current_code?'edit-voucher':'add-voucher'; await post(action,d); closeModal(); }; }
  function renderVouchers(){ document.getElementById('voucherList').innerHTML=state.vouchers.map(function(v){ var target=(v.products&&v.products.length)?v.products.join(', '):'Semua produk'; return '<div class="voucherCard"><span class="voucherCode">'+esc(v.code)+'</span> '+(v.active===false?'<span class="chip red">OFF</span>':'<span class="chip green">ON</span>')+'<div class="voucherMeta"><span class="chip yellow">Potongan '+rupiah(v.discount)+'</span><span class="chip purple">Limit '+esc(v.usage_limit)+'</span><span class="chip green">Target '+esc(target)+'</span></div><p class="help">'+esc(v.description||'Belum ada deskripsi voucher.')+'</p><div class="actions"><button class="btn small cyan" data-edit-voucher="'+esc(v.code)+'">Edit</button><button class="btn small red" data-delete-voucher="'+esc(v.code)+'">Hapus</button></div></div>';}).join('')||'<div class="empty">Belum ada voucher.</div>'; document.querySelectorAll('[data-edit-voucher]').forEach(function(btn){btn.onclick=function(){openVoucherModal(btn.dataset.editVoucher);};}); document.querySelectorAll('[data-delete-voucher]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus voucher '+btn.dataset.deleteVoucher+'?')) await post('delete-voucher',{kode:btn.dataset.deleteVoucher});};}); }

  async function openPollResult(id){
    try{
      var r=await api('poll-result', null, {id:id});
      var p=r.data||{};
      var rows=(p.options_result||[]).map(function(o,i){return '<div class="pollResultRow"><b>'+(i+1)+'. '+esc(o.text)+'</b><br>'+esc(o.votes||0)+' suara ('+esc(o.percent||0)+'%)<div class="pollBar" style="width:'+Math.max(3,Math.min(100,Number(o.percent||0)))+'%"></div></div>';}).join('') || '<div class="empty">Belum ada suara.</div>';
      openModal('Hasil Polling', '<div class="detailGrid"><div class="detailItem"><b>Pertanyaan</b><br>'+esc(p.question||'-')+'</div><div class="detailItem"><b>Status</b><br>'+esc(p.status||'-')+'</div><div class="detailItem"><b>Terkirim</b><br>'+esc(p.total_sent||0)+'</div><div class="detailItem"><b>Total Vote</b><br>'+esc(p.total_votes||0)+'</div></div><div style="margin-top:12px">'+rows+'</div><button class="btn red" style="margin-top:12px" type="button" id="deletePollFromModal">Hapus Polling dari Database</button>');
      var del=document.getElementById('deletePollFromModal'); if(del) del.onclick=async function(){ if(confirm('Hapus data polling ini dari database?')){ await post('delete-poll',{id:id}); closeModal(); } };
    }catch(e){ toast(e.message,true); }
  }
  function renderPolls(){
    var list=state.polls||[];
    var el=document.getElementById('pollList'); if(!el) return;
    el.innerHTML=list.map(function(p){ return '<div class="pollCard"><span class="chip yellow">'+esc(p.status||'draft')+'</span> <b>'+esc(p.question||'Polling')+'</b><p class="help">Terkirim: '+esc(p.total_sent||0)+' | Gagal: '+esc(p.total_failed||0)+' | '+esc(new Date(p.created_at||Date.now()).toLocaleString('id-ID'))+'</p><div class="actions"><button class="btn small cyan" data-poll-result="'+esc(p.id)+'">Lihat Hasil</button><button class="btn small red" data-poll-delete="'+esc(p.id)+'">Hapus</button></div></div>'; }).join('') || '<div class="empty">Belum ada polling tersimpan.</div>';
    document.querySelectorAll('[data-poll-result]').forEach(function(btn){btn.onclick=function(){openPollResult(btn.dataset.pollResult);};});
    document.querySelectorAll('[data-poll-delete]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus polling ini dari database?')) await post('delete-poll',{id:btn.dataset.pollDelete}); };});
  }

  async function load(){ try{ var all=await Promise.all([api('stats'),api('products'),api('orders'),api('users'),api('vouchers'),api('settings'),api('analytics'),api('polls')]); state.stats=all[0].data; state.products=all[1].data; state.orders=all[2].data; state.users=all[3].data; state.vouchers=all[4].data; state.settings=all[5].data; state.analytics=all[6].data; state.polls=all[7].data||[]; renderHeader(); renderStats(); renderCharts(); renderProducts(); renderOrders(); renderUsers(); renderVouchers(); renderPolls(); }catch(e){ toast(e.message,true); renderStats(); renderProducts(); } }
  async function post(action,data){ try{ var r=await api(action,data); toast('Berhasil diproses'); await load(); return r; }catch(e){ toast(e.message,true); throw e; } }
  document.querySelectorAll('.tile[data-tab]').forEach(function(btn){btn.onclick=function(){switchTab(btn.dataset.tab);};}); try{ var lastTab=localStorage.getItem('admin_active_tab'); if(lastTab && document.getElementById(lastTab)) switchTab(lastTab); }catch(e){}
  document.getElementById('search').oninput=renderProducts;
  document.getElementById('addForm').onsubmit=async function(e){
    e.preventDefault();
    var variants=compileAddVariants();
    var t=document.getElementById('addVariantToggle');
    var payload=formDataRaw(e.target);
    if(t&&t.checked){
      if(variants.length){
        payload.variants=variants;
        delete payload.variants_text;
        delete payload.variant_text;
        payload.harga=variants[0].price||'0';
        payload.deskripsi=variants[0].description||'Produk dengan varian.';
        payload.snk=variants[0].snk||'Syarat mengikuti varian yang dipilih.';
        payload.bulk_text='';
        payload.stock_text='';
      }
    }
    await post('add-product',payload);
    e.target.reset();
    var cards=document.getElementById('addVariantCards'); if(cards) cards.innerHTML='';
    var t2=document.getElementById('addVariantToggle'); if(t2) t2.checked=false;
    toggleAddVariantBuilder();
    switchTab('products');
  };
  var addVariantToggle=document.getElementById('addVariantToggle'); if(addVariantToggle) addVariantToggle.onchange=toggleAddVariantBuilder;
  var addVariantRowBtn=document.getElementById('addVariantRow'); if(addVariantRowBtn) addVariantRowBtn.onclick=function(){ addVariantRow(); };
  var addVoucherBtn=document.getElementById('openAddVoucher'); if(addVoucherBtn) addVoucherBtn.onclick=function(){ openVoucherModal(); };
  document.getElementById('settingsForm').onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(e.target); d.store_description=''; d.logo_url=''; d.banner_url=''; await post('save-settings',d);};
  document.getElementById('broadcastForm').onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(e.target); if(d.type==='photo' && !String(d.photo||'').trim()) return toast('URL/file_id gambar wajib diisi untuk broadcast gambar', true); if(d.type==='sticker' && !String(d.sticker||'').trim()) return toast('File ID stiker wajib diisi untuk broadcast stiker', true); if(d.type==='text' && !String(d.message||'').trim()) return toast('Pesan teks wajib diisi', true); var r=await post('broadcast',d); if(r.data) toast('Broadcast terkirim '+r.data.sent+', gagal '+r.data.failed);};
  load();
})();
</script>
</body>
</html>`);
};
