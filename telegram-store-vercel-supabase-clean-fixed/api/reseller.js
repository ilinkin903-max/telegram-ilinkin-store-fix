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
    :root{--bg:#fff0d8;--paper:#fff;--ink:#050505;--muted:#5e5e5e;--pink:#e83f9b;--cyan:#12b8ce;--lime:#83d904;--yellow:#ffe04b;--purple:#8557e8;--red:#ef3e45;--orange:#ff9f1c;--line:3px solid #050505;--shadow:6px 6px 0 #050505;--softshadow:3px 3px 0 #050505;--radius:7px}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 20% 0,#fff7cd 0,#fff0d8 36%,#ffe3bd 100%);color:var(--ink);font-family:Inter,Arial,system-ui,sans-serif;font-weight:900}.wrap{max-width:1220px;margin:auto;padding:20px 16px 70px}.hero{position:relative;overflow:hidden;background:var(--pink);color:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:22px 24px;margin:8px 0 18px}.hero:before{content:"";position:absolute;right:-12px;top:-12px;width:130px;height:130px;background:repeating-linear-gradient(45deg,rgba(0,0,0,.25) 0 3px,transparent 3px 12px)}.badge{position:absolute;right:22px;top:22px;background:var(--yellow);color:#000;border:var(--line);box-shadow:var(--softshadow);border-radius:6px;padding:7px 14px;font-size:13px}.eyebrow{letter-spacing:.06em;text-transform:uppercase;font-size:13px}.hero h1{font-size:34px;line-height:1;margin:10px 0 6px}.storeline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.storeline button{border:0;background:transparent;color:#fff;text-decoration:underline;font-weight:1000;cursor:pointer}.tier{font-size:13px;text-transform:uppercase;margin-top:8px}.statsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.stat{border:var(--line);box-shadow:var(--softshadow);border-radius:var(--radius);padding:13px;color:#000;min-height:74px}.stat:nth-child(1){background:var(--cyan)}.stat:nth-child(2){background:var(--yellow)}.stat:nth-child(3){background:var(--lime)}.stat:nth-child(4){background:var(--purple);color:#fff}.stat small{display:block;text-transform:uppercase;font-size:10px}.stat b{display:block;font-size:22px;margin-top:10px}.cta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.cta .bigBtn{min-height:54px;font-size:16px}.bigBtn,.btn{border:var(--line);box-shadow:var(--softshadow);border-radius:var(--radius);padding:12px 14px;background:#fff;color:#000;font-weight:1000;cursor:pointer;text-align:center;text-transform:uppercase}.bigBtn:active,.btn:active{transform:translate(3px,3px);box-shadow:0 0 0 #000}.cyan{background:var(--cyan)}.lime{background:var(--lime)}.pink{background:var(--pink);color:#fff}.yellow{background:var(--yellow)}.purple{background:var(--purple);color:#fff}.red{background:var(--red);color:#fff}.orange{background:var(--orange)}.search{width:100%;border:var(--line);border-radius:var(--radius);padding:14px 16px;background:#fff;box-shadow:var(--softshadow);font-weight:900;font-size:15px;margin-bottom:10px}.count{font-size:13px;color:var(--muted);margin-bottom:16px}.navTiles{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin:14px 0 18px}.tile{background:#fff;border:var(--line);box-shadow:var(--softshadow);border-radius:var(--radius);padding:13px 8px;text-align:center;min-height:70px;cursor:pointer}.tile.active{background:var(--pink);color:#fff}.tile .ico{font-size:20px;display:block;margin-bottom:6px}.section{display:none}.section.active{display:block}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.panel,.product,.miniCard{background:var(--paper);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px}.panel{margin-bottom:18px}.sectionTitle{margin:0 0 12px;font-size:23px}.subtle{color:var(--muted);font-size:13px}.product{min-height:260px;display:flex;flex-direction:column;gap:8px}.productTop{display:flex;gap:12px}.productImg{width:72px;height:72px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.product h3{font-size:18px;margin:0;line-height:1.2}.approved{margin-left:auto;align-self:flex-start;background:var(--lime);border:var(--line);border-radius:5px;padding:5px 8px;font-size:10px}.price{font-size:28px;margin-top:3px}.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:2px solid #000;border-radius:5px;background:#fff;padding:4px 7px;font-size:11px}.chip.green{background:var(--lime)}.chip.yellow{background:var(--yellow)}.chip.purple{background:var(--purple);color:#fff}.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:auto}.actions.three{grid-template-columns:1fr 1fr 1fr}.btn.small{font-size:12px;padding:9px 8px}.forms{display:grid;grid-template-columns:1fr 1fr;gap:14px}.row{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.input,.textarea,.select{width:100%;border:var(--line);border-radius:var(--radius);background:#fff;padding:12px;font-weight:900;font-size:14px}.textarea{min-height:105px;resize:vertical}.textarea.tall{min-height:170px}.label{font-size:12px;text-transform:uppercase;margin:4px 0 6px;display:block}.help{font-size:12px;color:var(--muted);line-height:1.4}.tableWrap{overflow:auto}.table{width:100%;border-collapse:collapse}.table th,.table td{border:var(--line);padding:10px;background:#fff;text-align:left;vertical-align:top}.table th{background:var(--yellow);text-transform:uppercase}.voucher{border:var(--line);box-shadow:var(--softshadow);background:#fff;border-radius:var(--radius);padding:12px;margin:0 0 10px}.chart{height:180px;border:var(--line);border-radius:var(--radius);display:flex;align-items:flex-end;gap:6px;padding:10px;background:#fff;overflow:auto}.bar{min-width:18px;border:2px solid #000;border-bottom-width:4px;background:var(--pink)}.bar:nth-child(2n){background:var(--cyan)}.bar:nth-child(3n){background:var(--yellow)}.toast{position:fixed;left:16px;right:16px;bottom:16px;z-index:99;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);background:var(--lime);padding:14px;display:none}.toast.error{background:var(--red);color:#fff}.preview{width:100%;max-height:180px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.empty{padding:22px;border:var(--line);border-radius:var(--radius);background:#fff;text-align:center;color:var(--muted)}
    @media(max-width:980px){.statsGrid{grid-template-columns:repeat(2,1fr)}.navTiles{grid-template-columns:repeat(4,1fr)}.grid{grid-template-columns:repeat(2,1fr)}.forms{grid-template-columns:1fr}}
    @media(max-width:620px){.wrap{padding:14px 10px 60px}.hero{padding:18px 14px}.badge{right:12px;top:12px}.hero h1{font-size:30px}.statsGrid,.cta,.grid,.row,.row3{grid-template-columns:1fr}.navTiles{grid-template-columns:repeat(3,1fr)}.productTop{align-items:flex-start}.productImg{width:64px;height:64px}.price{font-size:25px}}
  </style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="badge">PLATINUM</div>
    <div class="eyebrow">RESELLER</div>
    <h1 id="resellerName">Freze</h1>
    <div class="storeline"><span id="storeName">iLink.in Store</span><button data-tab="settings" type="button">Ubah</button></div>
    <div class="tier">Tier - Platinum</div>
    <div class="statsGrid" id="stats"></div>
  </header>

  <div class="cta">
    <button class="bigBtn cyan" data-tab="products">Belanja / Kelola Produk</button>
    <button class="bigBtn lime" id="shareStore">Bagikan Toko</button>
  </div>

  <input id="search" class="search" placeholder="Cari produk / kategori / kode..." />
  <div id="productCounter" class="count">0 produk</div>

  <nav class="navTiles" id="navTiles">
    <button class="tile active" data-tab="dashboard"><span class="ico">ST</span>Stats</button>
    <button class="tile" data-tab="products"><span class="ico">PD</span>Produk</button>
    <button class="tile" data-tab="orders"><span class="ico">PJ</span>Penjualan</button>
    <button class="tile" data-tab="addProduct"><span class="ico">+</span>Tambah</button>
    <button class="tile" data-tab="editProduct"><span class="ico">ED</span>Edit</button>
    <button class="tile" data-tab="vouchers"><span class="ico">VC</span>Voucher</button>
    <button class="tile" data-tab="broadcast"><span class="ico">BC</span>Broadcast</button>
    <button class="tile" data-tab="settings"><span class="ico">TK</span>Toko</button>
  </nav>

  <section id="dashboard" class="section active">
    <div class="forms">
      <div class="panel"><h2 class="sectionTitle">Grafik Penjualan</h2><div id="revenueChart" class="chart"></div><p class="help">Omzet harian bulan ini.</p></div>
      <div class="panel"><h2 class="sectionTitle">Produk Terlaris</h2><div id="topProductList"></div></div>
    </div>
  </section>

  <section id="products" class="section"><div id="productList" class="grid"></div></section>

  <section id="addProduct" class="section">
    <div class="panel">
      <h2 class="sectionTitle">Tambah Produk</h2>
      <form id="addForm" class="form">
        <div class="row3"><input class="input" name="nama" placeholder="Nama produk" required><input class="input" name="kode" placeholder="Kode produk" required><input class="input" name="harga" type="number" placeholder="Harga dasar" required></div>
        <div class="row"><input class="input" name="category" placeholder="Kategori, contoh: Akun Premium"><input class="input" name="image_url" placeholder="URL gambar produk"></div>
        <div class="row"><textarea class="textarea" name="deskripsi" placeholder="Deskripsi produk" required></textarea><textarea class="textarea" name="snk" placeholder="Syarat dan ketentuan" required></textarea></div>
        <div class="row"><div><label class="label">Harga bulk</label><textarea class="textarea" name="bulk_text" placeholder="Format per baris: qty|harga\n5|5000\n10|9000"></textarea><p class="help">Dipakai untuk catatan harga grosir di panel.</p></div><div><label class="label">Varian</label><textarea class="textarea" name="variants_text" placeholder="Format per baris: nama|harga|kode opsional\n1 Bulan|10000|BULAN1\nLifetime|50000|LIFE"></textarea><p class="help">Varian tersimpan di produk dan bisa diedit kapan saja.</p></div></div>
        <label class="label">Stok awal</label><textarea class="textarea tall" name="stock_text" placeholder="1 baris = 1 stok/item"></textarea>
        <button class="btn lime" type="submit">Tambah Produk</button>
      </form>
    </div>
  </section>

  <section id="editProduct" class="section">
    <div class="panel">
      <h2 class="sectionTitle">Edit Produk Nyaman</h2>
      <p class="help">Klik tombol EDIT pada kartu produk untuk mengisi form ini otomatis.</p>
      <form id="editProductForm" class="form">
        <div class="row3"><input class="input" name="kode" placeholder="Kode produk saat ini" required><input class="input" name="nama" placeholder="Nama produk"><input class="input" name="kode_baru" placeholder="Kode baru"></div>
        <div class="row3"><input class="input" name="harga" type="number" placeholder="Harga dasar"><input class="input" name="category" placeholder="Kategori"><input class="input" name="image_url" placeholder="URL gambar"></div>
        <div class="row"><textarea class="textarea" name="deskripsi" placeholder="Deskripsi"></textarea><textarea class="textarea" name="snk" placeholder="Syarat dan ketentuan"></textarea></div>
        <div class="row"><div><label class="label">Harga bulk</label><textarea class="textarea" name="bulk_text" placeholder="5|5000\n10|9000"></textarea></div><div><label class="label">Varian</label><textarea class="textarea" name="variants_text" placeholder="1 Bulan|10000|BULAN1"></textarea></div></div>
        <label class="label">Ganti semua stok</label><textarea class="textarea tall" name="stock_text" placeholder="Kosongkan jika stok tidak ingin diganti"></textarea>
        <button class="btn cyan" type="submit">Simpan Edit Produk</button>
      </form>
    </div>
  </section>

  <section id="stock" class="section">
    <div class="forms">
      <div class="panel"><h2 class="sectionTitle">Tambah Stok</h2><form class="form" data-action="add-stock"><input class="input" name="kode" placeholder="Kode produk" required><textarea class="textarea tall" name="stock_text" placeholder="Stok tambahan, 1 baris = 1 item" required></textarea><button class="btn lime" type="submit">Tambah Stok</button></form></div>
      <div class="panel"><h2 class="sectionTitle">Ganti Semua Stok</h2><form class="form" data-action="edit-stock"><input class="input" name="kode" placeholder="Kode produk" required><textarea class="textarea tall" name="stock_text" placeholder="Stok baru, boleh kosong"></textarea><button class="btn pink" type="submit">Ganti Stok</button></form></div>
    </div>
  </section>

  <section id="vouchers" class="section">
    <div class="forms">
      <div class="panel"><h2 class="sectionTitle">Tambah / Edit Voucher</h2><form id="voucherForm" class="form"><input type="hidden" name="current_code"><input class="input" name="kode" placeholder="Kode voucher" required><input class="input" name="produk" placeholder="Produk: semua atau KODE1,KODE2" value="semua"><div class="row"><input class="input" name="potongan" type="number" placeholder="Potongan rupiah" required><input class="input" name="limit" type="number" placeholder="Limit" required></div><div class="row"><select class="select" name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select><input class="input" name="expires_at" placeholder="Expired opsional"></div><textarea class="textarea" name="description" placeholder="Catatan voucher"></textarea><button class="btn lime" type="submit">Simpan Voucher</button><button class="btn" type="button" id="resetVoucher">Reset</button></form></div>
      <div class="panel"><h2 class="sectionTitle">Daftar Voucher</h2><div id="voucherList"></div></div>
    </div>
  </section>

  <section id="orders" class="section"><div class="panel tableWrap"><h2 class="sectionTitle">Penjualan</h2><table class="table"><thead><tr><th>Tanggal</th><th>Produk</th><th>User</th><th>Qty</th><th>Total</th></tr></thead><tbody id="orderList"></tbody></table></div></section>
  <section id="users" class="section"><div class="panel tableWrap"><h2 class="sectionTitle">Users</h2><table class="table"><thead><tr><th>ID</th><th>User</th><th>Transaksi</th><th>Spending</th><th>Aksi</th></tr></thead><tbody id="userList"></tbody></table></div></section>

  <section id="broadcast" class="section"><div class="panel"><h2 class="sectionTitle">Broadcast</h2><form id="broadcastForm" class="form"><select class="select" name="type"><option value="text">Teks</option><option value="photo">Gambar URL / file_id</option><option value="sticker">Stiker file_id</option></select><textarea class="textarea" name="message" placeholder="Pesan teks atau caption"></textarea><input class="input" name="photo" placeholder="URL/file_id gambar untuk tipe gambar"><input class="input" name="sticker" placeholder="file_id stiker untuk tipe stiker"><button class="btn red" type="submit">Kirim Broadcast</button></form></div></section>

  <section id="settings" class="section"><div class="forms"><div class="panel"><h2 class="sectionTitle">Gambar & Identitas Toko</h2><form id="settingsForm" class="form"><input class="input" name="store_name" placeholder="Nama toko"><textarea class="textarea" name="store_description" placeholder="Deskripsi toko"></textarea><input class="input" name="logo_url" placeholder="URL logo toko"><input class="input" name="banner_url" placeholder="URL banner toko"><button class="btn lime" type="submit">Simpan Toko</button></form></div><div class="panel"><h2 class="sectionTitle">Preview Banner</h2><img id="bannerPreview" class="preview" style="display:none" alt="Banner"><p class="help">Gunakan URL gambar publik agar bisa muncul di Telegram.</p></div></div></section>
</div>
<div id="toast" class="toast"></div>
<script>
(function(){
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { try { tg.ready(); tg.expand(); } catch(e) {} }
  var initData = tg && tg.initData ? tg.initData : '';
  var state = { stats:{}, products:[], orders:[], users:[], vouchers:[], settings:{}, analytics:{} };
  function rupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];}); }
  function toast(msg, err){ var el=document.getElementById('toast'); el.textContent=msg; el.className='toast'+(err?' error':''); el.style.display='block'; setTimeout(function(){el.style.display='none';},3500); }
  function headers(){ return { 'Content-Type':'application/json','X-Telegram-Init-Data':initData }; }
  async function api(action, body, query){ var url='/api/reseller-data?action='+encodeURIComponent(action); if(query){ Object.keys(query).forEach(function(k){ if(query[k]) url+='&'+encodeURIComponent(k)+'='+encodeURIComponent(query[k]); }); } var r=await fetch(url,{method:body?'POST':'GET',headers:headers(),body:body?JSON.stringify(body):undefined}); var j=await r.json(); if(!j.ok) throw new Error(j.error||'Gagal memuat data'); return j; }
  function formData(form){ var d=Object.fromEntries(new FormData(form).entries()); Object.keys(d).forEach(function(k){ if(d[k]==='') delete d[k]; }); return d; }
  function switchTab(id){ document.querySelectorAll('[data-tab]').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('.section').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('[data-tab="'+id+'"]').forEach(function(x){x.classList.add('active');}); var section=document.getElementById(id); if(section) section.classList.add('active'); window.scrollTo(0,0); }
  function bulkToText(rows){ return (rows||[]).map(function(x){return (x.min_qty||x.qty||'')+'|'+(x.price||x.harga||'');}).join('\n'); }
  function variantsToText(rows){ return (rows||[]).map(function(x){return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||'',x.note||x.catatan||''].filter(function(v,i){return i<2 || v;}).join('|');}).join('\n'); }
  function renderHeader(){ var s=state.settings||{}; if(s.store_name){ document.getElementById('storeName').textContent=s.store_name; } if(s.banner_url){ var b=document.getElementById('bannerPreview'); if(b){ b.src=s.banner_url; b.style.display='block'; } } var f=document.getElementById('settingsForm'); if(f){ f.store_name.value=s.store_name||''; f.store_description.value=s.store_description||''; f.logo_url.value=s.logo_url||''; f.banner_url.value=s.banner_url||''; } }
  function renderStats(){ var s=state.stats||{}; var items=[['Saldo',rupiah(s.omzet)],['Escrow',rupiah(Math.round(Number(s.omzet||0)*0.08))],['GMV',rupiah(s.omzet)],['Produk',s.products||0]]; document.getElementById('stats').innerHTML=items.map(function(x){return '<div class="stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join(''); }
  function renderCharts(){ var a=state.analytics||{}; var list=a.daily||[]; var max=Math.max.apply(null,list.map(function(d){return d.revenue;}).concat([1])); document.getElementById('revenueChart').innerHTML=list.map(function(d){var h=Math.max(5,Math.round((d.revenue/max)*145));return '<div class="bar" title="Tgl '+d.day+': '+rupiah(d.revenue)+'" style="height:'+h+'px"></div>';}).join(''); document.getElementById('topProductList').innerHTML=(a.top_products||[]).map(function(p,i){return '<div class="voucher"><b>'+(i+1)+'. '+esc(p.name)+'</b> <span class="chip purple">'+esc(p.code)+'</span><br>Qty '+esc(p.quantity)+' | Omzet '+rupiah(p.revenue)+'</div>';}).join('')||'<div class="empty">Belum ada data penjualan.</div>'; }
  function productMatches(p,q){ var text=[p.nama,p.kode,p.category,p.deskripsi].join(' ').toLowerCase(); return text.indexOf(q)>=0; }
  function renderProducts(){ var q=(document.getElementById('search').value||'').toLowerCase(); var rows=state.products.filter(function(p){return productMatches(p,q);}); document.getElementById('productCounter').textContent=rows.length+' / '+state.products.length+' produk'; document.getElementById('productList').innerHTML=rows.map(function(p){ var bulk=(p.bulk_prices||[]).slice(0,2).map(function(b){return '<span class="chip yellow">'+(b.min_qty||b.qty)+'+ '+rupiah(b.price||b.harga)+'</span>';}).join(''); var vars=(p.variants||[]).slice(0,2).map(function(v){return '<span class="chip purple">'+esc(v.name||v.nama)+' '+(v.price?rupiah(v.price):'')+'</span>';}).join(''); return '<article class="product">'+
      '<div class="productTop">'+(p.image_url?'<img class="productImg" src="'+esc(p.image_url)+'" alt="">':'<div class="productImg"></div>')+'<div><h3>'+esc(p.nama)+'</h3><div class="subtle">'+esc(p.category||'Produk')+' - STOK '+((p.data||[]).length)+'</div></div><span class="approved">APPROVED</span></div>'+
      '<div class="price">'+rupiah(p.harga)+'</div><div class="chips"><span class="chip green">'+esc(p.kode)+'</span>'+bulk+vars+'</div>'+
      '<div class="actions"><button class="btn small cyan" data-edit-product="'+esc(p.kode)+'">Edit</button><button class="btn small lime" data-stock-product="'+esc(p.kode)+'">Stok</button><button class="btn small yellow" data-manage-product="'+esc(p.kode)+'">Kelola</button><button class="btn small purple" data-share-product="'+esc(p.kode)+'">Share</button><button class="btn small red" data-delete-product="'+esc(p.kode)+'">Hapus</button></div></article>'; }).join('')||'<div class="empty">Produk belum ada.</div>'; wireProductButtons(); }
  function wireProductButtons(){ document.querySelectorAll('[data-edit-product]').forEach(function(btn){btn.onclick=function(){fillEditProduct(btn.dataset.editProduct);};}); document.querySelectorAll('[data-manage-product]').forEach(function(btn){btn.onclick=function(){fillEditProduct(btn.dataset.manageProduct);};}); document.querySelectorAll('[data-stock-product]').forEach(function(btn){btn.onclick=function(){var f=document.querySelector('form[data-action="add-stock"]'); f.kode.value=btn.dataset.stockProduct; switchTab('stock');};}); document.querySelectorAll('[data-delete-product]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus produk '+btn.dataset.deleteProduct+'?')) await post('delete-product',{kode:btn.dataset.deleteProduct});};}); document.querySelectorAll('[data-share-product]').forEach(function(btn){btn.onclick=function(){var p=state.products.find(function(x){return x.kode===btn.dataset.shareProduct;}); var text=p? p.nama+' - '+rupiah(p.harga)+' - Kode '+p.kode : btn.dataset.shareProduct; if(navigator.share){navigator.share({text:text}).catch(function(){});} else {navigator.clipboard&&navigator.clipboard.writeText(text); toast('Teks share disalin');}};}); }
  function fillEditProduct(code){ var p=state.products.find(function(x){return x.kode===code;}); if(!p) return; var f=document.getElementById('editProductForm'); f.kode.value=p.kode; f.nama.value=p.nama||''; f.kode_baru.value=p.kode||''; f.harga.value=p.harga||0; f.category.value=p.category||''; f.image_url.value=p.image_url||''; f.deskripsi.value=p.deskripsi||''; f.snk.value=p.snk||''; f.bulk_text.value=bulkToText(p.bulk_prices||[]); f.variants_text.value=variantsToText(p.variants||[]); f.stock_text.value=(p.data||[]).join('\n'); switchTab('editProduct'); }
  function renderOrders(){ document.getElementById('orderList').innerHTML=state.orders.map(function(o){return '<tr><td>'+new Date(o.created_at).toLocaleString('id-ID')+'</td><td>'+esc(o.product_name)+'<br><span class="chip green">'+esc(o.product_code)+'</span></td><td>'+(o.username?'@'+esc(o.username):esc(o.telegram_id))+'</td><td>'+esc(o.quantity)+'</td><td>'+rupiah(o.total_price)+'</td></tr>';}).join('')||'<tr><td colspan="5">Belum ada order.</td></tr>'; }
  function renderUsers(){ document.getElementById('userList').innerHTML=state.users.map(function(u){return '<tr><td>'+esc(u.telegram_id)+'</td><td>'+(u.username?'@'+esc(u.username):esc(u.first_name||'-'))+'</td><td>'+esc(u.transaction_count||0)+'</td><td>'+rupiah(u.spending||0)+'</td><td><button class="btn small red" data-del-user="'+esc(u.telegram_id)+'">Hapus</button></td></tr>';}).join('')||'<tr><td colspan="5">Belum ada user.</td></tr>'; document.querySelectorAll('[data-del-user]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus user '+btn.dataset.delUser+'?')) await post('delete-user',{telegram_id:btn.dataset.delUser});};}); }
  function renderVouchers(){ document.getElementById('voucherList').innerHTML=state.vouchers.map(function(v){ var target=(v.products&&v.products.length)?v.products.join(', '):'Semua produk'; return '<div class="voucher"><b>'+esc(v.code)+'</b> '+(v.active===false?'(nonaktif)':'')+'<br>Potongan: '+rupiah(v.discount)+' | Limit: '+esc(v.usage_limit)+'<br>Target: '+esc(target)+'<br><span class="help">'+esc(v.description||'')+'</span><div class="actions"><button class="btn small cyan" data-edit-voucher="'+esc(v.code)+'">Edit</button><button class="btn small red" data-delete-voucher="'+esc(v.code)+'">Hapus</button></div></div>';}).join('')||'<div class="empty">Belum ada voucher.</div>'; document.querySelectorAll('[data-edit-voucher]').forEach(function(btn){btn.onclick=function(){fillVoucher(btn.dataset.editVoucher);};}); document.querySelectorAll('[data-delete-voucher]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus voucher '+btn.dataset.deleteVoucher+'?')) await post('delete-voucher',{kode:btn.dataset.deleteVoucher});};}); }
  function fillVoucher(code){ var v=state.vouchers.find(function(x){return x.code===code;}); if(!v) return; var f=document.getElementById('voucherForm'); f.current_code.value=v.code; f.kode.value=v.code; f.produk.value=(v.products&&v.products.length)?v.products.join(','):'semua'; f.potongan.value=v.discount||0; f.limit.value=v.usage_limit||0; f.active.value=(v.active===false?'false':'true'); f.expires_at.value=v.expires_at||''; f.description.value=v.description||''; switchTab('vouchers'); }
  async function load(){ try{ var all=await Promise.all([api('stats'),api('products'),api('orders'),api('users'),api('vouchers'),api('settings'),api('analytics')]); state.stats=all[0].data; state.products=all[1].data; state.orders=all[2].data; state.users=all[3].data; state.vouchers=all[4].data; state.settings=all[5].data; state.analytics=all[6].data; renderHeader(); renderStats(); renderCharts(); renderProducts(); renderOrders(); renderUsers(); renderVouchers(); }catch(e){ toast(e.message,true); renderStats(); renderProducts(); } }
  async function post(action,data){ try{ var r=await api(action,data); toast('Berhasil diproses'); await load(); return r; }catch(e){ toast(e.message,true); throw e; } }
  document.querySelectorAll('[data-tab]').forEach(function(btn){btn.onclick=function(){switchTab(btn.dataset.tab);};});
  document.getElementById('search').oninput=renderProducts;
  document.getElementById('shareStore').onclick=function(){ var text='Cek toko '+(state.settings.store_name||'iLink.in Store')+' di Telegram'; if(navigator.share){navigator.share({text:text}).catch(function(){});} else {navigator.clipboard&&navigator.clipboard.writeText(text); toast('Teks share disalin');} };
  document.getElementById('addForm').onsubmit=async function(e){e.preventDefault(); await post('add-product',formData(e.target)); e.target.reset(); switchTab('products');};
  document.getElementById('editProductForm').onsubmit=async function(e){e.preventDefault(); var d=formData(e.target); d.current_code=d.kode; if(d.kode_baru) d.kode=d.kode_baru; delete d.kode_baru; await post('edit-product-full',d);};
  document.querySelectorAll('form[data-action]').forEach(function(form){form.onsubmit=async function(e){e.preventDefault(); await post(form.dataset.action,formData(form)); form.reset();};});
  document.getElementById('voucherForm').onsubmit=async function(e){e.preventDefault(); var d=formData(e.target); var action=d.current_code?'edit-voucher':'add-voucher'; await post(action,d); e.target.reset();};
  document.getElementById('resetVoucher').onclick=function(){document.getElementById('voucherForm').reset(); document.getElementById('voucherForm').current_code.value='';};
  document.getElementById('settingsForm').onsubmit=async function(e){e.preventDefault(); await post('save-settings',formData(e.target));};
  document.getElementById('broadcastForm').onsubmit=async function(e){e.preventDefault(); var r=await post('broadcast',formData(e.target)); if(r.data) toast('Broadcast terkirim '+r.data.sent+', gagal '+r.data.failed);};
  load();
})();
</script>
</body>
</html>`);
};
