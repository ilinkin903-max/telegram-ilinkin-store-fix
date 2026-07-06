
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
  function formDataRaw(form){ return Object.fromEntries(new FormData(form).entries()); }
  function switchTab(id){ document.querySelectorAll('[data-tab]').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('.section').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('[data-tab="'+id+'"]').forEach(function(x){x.classList.add('active');}); var section=document.getElementById(id); if(section) section.classList.add('active'); window.scrollTo(0,0); }
  function openModal(title, html){ document.getElementById('modalTitle').textContent=title; document.getElementById('modalBody').innerHTML=html; document.getElementById('modal').classList.add('show'); }
  function closeModal(){ document.getElementById('modal').classList.remove('show'); document.getElementById('modalBody').innerHTML=''; }
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modal').addEventListener('click',function(e){ if(e.target.id==='modal') closeModal(); });
  function bulkToText(rows){ return (rows||[]).map(function(x){return (x.min_qty||x.qty||'')+'|'+(x.price||x.harga||'');}).join('\n'); }
  function variantStock(v){ return Array.isArray(v&&v.stock) ? v.stock : []; }
  function variantBulkText(v){ return bulkToText((v&&v.bulk_prices)||[]).replace(/\|/g,':').replace(/\n/g,','); }
  function variantsToText(rows){ return (rows||[]).map(function(x,i){ var stock=variantStock(x).join(','); var bulk=variantBulkText(x); return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||('VAR'+(i+1)),stock,bulk,x.description||x.deskripsi||'',x.snk||x.terms||''].join('|'); }).join('\n'); }
  function variantHelp(){ return '<div class="ghost">Contoh samar:<br>1 Bulan|10000|BULAN1|akun1,akun2|5:9000,10:8000|Deskripsi khusus 1 bulan|SnK khusus 1 bulan<br>Lifetime|50000|LIFE|kode1,kode2|3:45000|Deskripsi lifetime|SnK lifetime</div>'; }
  function cleanListText(value){ return String(value||'').split(/[\n,]+/).map(function(x){return x.trim();}).filter(Boolean); }
  function variantMetaToText(rows){ return (rows||[]).map(function(x,i){ return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||('VAR'+(i+1)),variantBulkText(x),x.description||x.deskripsi||'',x.snk||x.terms||''].join('|'); }).join('\n'); }
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
      return [parts[0]||'',parts[1]||'',sku,stock,parts[3]||'',parts[4]||'',parts[5]||''].join('|');
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
    div.innerHTML='<div class="addVariantCardTitle"><b>Varian '+n+'</b><button class="btn small red" type="button" data-remove-variant>Hapus</button></div>'+ 
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
    if(active && !document.querySelector('#addVariantCards .addVariantCard')) addVariantRow({name:'',price:'',sku:'',stock:'',bulk:'',description:'',snk:''});
  }
  function compileAddVariants(){
    var chk=document.getElementById('addVariantToggle');
    var hidden=document.getElementById('addVariantsText');
    if(!hidden) return;
    if(!chk || !chk.checked){ hidden.value=''; return; }
    var rows=[];
    document.querySelectorAll('#addVariantCards .addVariantCard').forEach(function(card){
      function val(k){ var el=card.querySelector('[data-vfield="'+k+'"]'); return el?String(el.value||'').trim():''; }
      var name=val('name'), price=val('price'), sku=val('sku'), stock=val('stock').replace(/\n/g,','), bulk=val('bulk').replace(/\n/g,','), desc=val('description').replace(/\n/g,' '), snk=val('snk').replace(/\n/g,' ');
      if(name) rows.push([name,price,sku,stock,bulk,desc,snk].join('|')); 
    });
    hidden.value=rows.join('\n');
  }
  function renderHeader(){ var s=state.settings||{}; if(s.store_name){ document.getElementById('storeName').textContent=s.store_name; } document.querySelector('.hero').style.backgroundImage=''; renderSettingsForm(); }
  function renderSettingsForm(){ var s=state.settings||{}; var f=document.getElementById('settingsForm'); if(!f) return; ['store_name','start_media_type','start_media_value','start_media_caption'].forEach(function(k){ if(f[k]) f[k].value = s[k] || (k==='start_media_type'?'none':''); }); if(f.store_description) f.store_description.value=''; if(f.logo_url) f.logo_url.value=''; if(f.banner_url) f.banner_url.value=''; }
  function renderStats(){ var s=state.stats||{}; var items=[['Saldo',rupiah(s.omzet)],['Order',s.orders||0],['Produk',s.products||0],['Stok',s.stokTersedia||0]]; document.getElementById('stats').innerHTML=items.map(function(x){return '<div class="stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join(''); }
  function renderCharts(){ var a=state.analytics||{}; var list=a.daily||[]; var max=Math.max.apply(null,list.map(function(d){return d.revenue;}).concat([1])); document.getElementById('revenueChart').innerHTML=list.map(function(d){var chartEl=document.getElementById('revenueChart'); var chartHeight=Math.max(140,(chartEl.clientHeight||240)-82); var h=Math.max(8,Math.round((d.revenue/max)*chartHeight)); return '<div class="barBox"><div class="bar" title="'+esc(d.label)+' - '+rupiah(d.revenue)+'" style="height:'+h+'px"></div><div class="barLabel">'+esc(d.label)+'<br>'+rupiah(d.revenue)+'</div></div>';}).join('')||'<div class="empty">Belum ada data.</div>'; document.getElementById('topProductList').innerHTML=(a.top_products||[]).map(function(p,i){return '<div class="voucher"><b>'+(i+1)+'. '+esc(p.name)+(p.variant?' - '+esc(p.variant):'')+'</b> <span class="chip purple">'+esc(p.code)+'</span><br>Qty '+esc(p.quantity)+' | Omzet '+rupiah(p.revenue)+'</div>';}).join('')||'<div class="empty">Belum ada data penjualan.</div>'; }
  function productMatches(p,q){ var text=[p.nama,p.kode,p.category,p.deskripsi].join(' ').toLowerCase(); return text.indexOf(q)>=0; }
  function productInitial(p){ return String((p&&p.nama)||'?').trim().charAt(0).toUpperCase() || '?'; }
  function productColor(p){ var text=String((p&&p.kode)||(p&&p.nama)||'x'); var h=0; for(var i=0;i<text.length;i++) h=(h*31+text.charCodeAt(i))%360; return 'hsl('+h+' 85% 68%)'; }
  function productMediaHtml(p){ if(p.image_url) return '<img class="productImg" src="'+esc(p.image_url)+'" alt="">'; return '<div class="productFallback" style="background:'+productColor(p)+'">'+esc(productInitial(p))+'</div>'; }
  function renderProducts(){ var q=(document.getElementById('search').value||'').toLowerCase(); var rows=state.products.filter(function(p){return productMatches(p,q);}); document.getElementById('productCounter').textContent=rows.length+' / '+state.products.length+' produk'; document.getElementById('productList').innerHTML=rows.map(function(p){ var bulk=(p.bulk_prices||[]).slice(0,2).map(function(b){return '<span class="chip yellow">'+(b.min_qty||b.qty)+'+ '+rupiah(b.price||b.harga)+'</span>';}).join(''); var vars=(p.variants||[]).slice(0,3).map(function(v){return '<span class="chip purple">'+esc(v.name||v.nama)+' '+rupiah(v.price||v.harga||p.harga)+' • '+variantStock(v).length+' stok</span>';}).join(''); return '<article class="product '+(p.active===false?'productOff':'')+'">'+
      '<div class="productTop">'+productMediaHtml(p)+'<div><h3>'+esc(p.nama)+'</h3><div class="subtle">'+esc(p.category||'Produk')+' - STOK '+stockCount(p)+'</div></div><button class="statusToggle '+(p.active===false?'off':'')+'" data-toggle-product="'+esc(p.kode)+'">'+(p.active===false?'OFF':'ON')+'</button></div>'+ 
      '<div class="price">'+rupiah(p.harga)+'</div><div class="chips"><span class="chip green">'+esc(p.kode)+'</span>'+bulk+vars+'</div>'+ 
      '<div class="actions"><button class="btn small cyan" data-edit-product="'+esc(p.kode)+'">Edit</button><button class="btn small lime" data-stock-product="'+esc(p.kode)+'">Stok</button><button class="btn small yellow" data-manage-product="'+esc(p.kode)+'">Kelola</button><button class="btn small red" data-delete-product="'+esc(p.kode)+'">Hapus</button></div></article>'; }).join('')||'<div class="empty">Produk belum ada.</div>'; wireProductButtons(); }
  function findProduct(code){ return state.products.find(function(x){return x.kode===code;}); }
  function editVariantCardHtml(v,i){
    var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase();
    return '<div class="addVariantCard" data-edit-variant-card data-old-sku="'+esc(sku)+'">'+
      '<div class="addVariantCardTitle"><b>Varian '+(i+1)+'</b><span class="chip yellow">Stok diatur dari tombol Stok/Kelola</span></div>'+ 
      '<div class="row3"><div class="field"><label class="label">Nama Varian</label><input class="input" data-evfield="name" placeholder="Contoh: 1 Bulan" value="'+esc(v.name||v.nama||'')+'"></div><div class="field"><label class="label">Harga Varian</label><input class="input" data-evfield="price" type="number" placeholder="Contoh: 10000" value="'+esc(v.price||v.harga||'')+'"></div><div class="field"><label class="label">Kode Varian</label><input class="input" data-evfield="sku" placeholder="Contoh: BULAN1" value="'+esc(sku)+'"></div></div>'+
      '<div class="field"><label class="label">Harga Grosir Varian</label><textarea class="textarea" data-evfield="bulk" placeholder="Contoh:\n5:9000,10:8000">'+esc(variantBulkText(v)||'')+'</textarea></div>'+ 
      '<div class="row"><div class="field"><label class="label">Deskripsi Varian</label><textarea class="textarea" data-evfield="description" placeholder="Contoh: Canva EDU 1 tahun untuk satu user.">'+esc(v.description||v.deskripsi||'')+'</textarea></div><div class="field"><label class="label">Syarat & Ketentuan Varian</label><textarea class="textarea" data-evfield="snk" placeholder="Contoh: Garansi 7 hari, jangan ganti password.">'+esc(v.snk||v.terms||'')+'</textarea></div></div>'+ 
      '</div>';
  }
  function compileEditVariants(product){
    var existing=product.variants||[];
    var bySku={}; existing.forEach(function(v,i){ bySku[String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase()]=v; });
    var rows=[];
    document.querySelectorAll('[data-edit-variant-card]').forEach(function(card,i){
      function val(k){ var el=card.querySelector('[data-evfield="'+k+'"]'); return el?String(el.value||'').trim():''; }
      var oldSku=String(card.getAttribute('data-old-sku')||('VAR'+(i+1))).toUpperCase();
      var sku=String(val('sku')||oldSku).toUpperCase();
      var old=bySku[oldSku]||bySku[sku]||existing[i]||{};
      var stock=variantStock(old).join(',');
      var desc=val('description').replace(/\n/g,' ');
      var snk=val('snk').replace(/\n/g,' ');
      var bulk=val('bulk').replace(/\n/g,',');
      var name=val('name');
      if(name) rows.push([name,val('price'),sku,stock,bulk,desc,snk].join('|'));
    });
    return rows.join('\n');
  }
  function editFormHtml(p){
    var hasVar=(p.variants||[]).length>0;
    var variantSection=hasVar ? '<div class="switchBox" style="background:#f4e7ff"><label class="switchLabel"><span class="toggleTrack" style="background:var(--lime)"></span><span>Varian Produk Aktif</span></label><p class="help">Edit varian mengikuti bentuk Tambah Produk, tetapi stok tidak ikut diedit di sini. Gunakan tombol Stok untuk tambah stok dan Kelola untuk mengganti stok.</p><input type="hidden" name="variants_text" id="editVariantsText"><div class="variantBuilder show"><div class="variantMainCompact">Mode varian aktif: harga, grosir, deskripsi, dan SnK diatur per varian. Produk utama tetap bisa mengubah nama, kode, kategori, dan gambar.</div><div id="editVariantCards">'+(p.variants||[]).map(function(v,i){return editVariantCardHtml(v,i);}).join('')+'</div></div></div>' : '';
    var baseFields = hasVar ? '<input type="hidden" name="harga" value="'+esc(p.harga||0)+'"><input type="hidden" name="deskripsi" value="'+esc(p.deskripsi||'')+'"><input type="hidden" name="snk" value="'+esc(p.snk||'')+'"><input type="hidden" name="bulk_text" value="'+esc(bulkToText(p.bulk_prices||[]))+'">' : '<div class="row"><div class="field"><label class="label">Harga Satuan</label><input class="input" name="harga" type="number" placeholder="Contoh: 13000" value="'+esc(p.harga||'')+'"></div><div class="field"><label class="label">Harga Grosir</label><textarea class="textarea" name="bulk_text" placeholder="Contoh per baris:\n5|5000\n10|9000">'+esc(bulkToText(p.bulk_prices||[]))+'</textarea></div></div><div class="row"><div class="field"><label class="label">Deskripsi</label><textarea class="textarea" name="deskripsi" placeholder="Contoh: Canva EDU 1 tahun, cocok untuk desain.">'+esc(p.deskripsi||'')+'</textarea></div><div class="field"><label class="label">Syarat & Ketentuan</label><textarea class="textarea" name="snk" placeholder="Contoh: Garansi 7 hari jika akun bermasalah.">'+esc(p.snk||'')+'</textarea></div></div>';
    return '<form id="modalEditForm" class="form"><input type="hidden" name="kode" value="'+esc(p.kode)+'"><div class="row3"><div class="field"><label class="label">Nama Produk</label><input class="input" name="nama" placeholder="Contoh: Canva Pro 1 Bulan" value="'+esc(p.nama||'')+'"></div><div class="field"><label class="label">Kode Produk</label><input class="input" name="kode_baru" placeholder="Contoh: CANVA1B" value="'+esc(p.kode||'')+'"></div><div class="field"><label class="label">Kategori</label><input class="input" name="category" placeholder="Contoh: Akun Premium" value="'+esc(p.category||'')+'"></div></div><div class="field"><label class="label">Link Gambar Produk</label><input class="input" name="image_url" placeholder="Opsional: https://domain.com/canva.jpg" value="'+esc(p.image_url||'')+'"></div>'+baseFields+variantSection+'<button class="btn cyan" type="submit">Simpan Perubahan</button></form>';
  }
  function openEditProduct(code){ var p=findProduct(code); if(!p) return; openModal('Edit Produk - '+p.nama, editFormHtml(p)); document.getElementById('modalEditForm').onsubmit=async function(e){ e.preventDefault(); var d=formData(e.target); d.current_code=d.kode; if(d.kode_baru) d.kode=d.kode_baru; delete d.kode_baru; if((p.variants||[]).length>0){ d.variants_text=compileEditVariants(p); } await post('edit-product-full',d); closeModal(); }; }
  function openVariantProduct(code){ openEditProduct(code); }
  function openStockProduct(code){
    var p=findProduct(code); if(!p) return;
    var hasVar=(p.variants||[]).length>0;
    var html='<form id="modalAppendStockForm" class="form"><p class="help">Tombol Stok dipakai untuk <b>menambahkan stok</b>. Stok lama tidak akan hilang.</p><input type="hidden" name="kode" value="'+esc(p.kode)+'">';
    if(hasVar){
      html += '<div class="variantList">'+(p.variants||[]).map(function(v,i){ var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+'</h3><p class="help">Stok sekarang: '+variantStock(v).length+'</p><label class="label">Tambah Stok Varian</label><textarea class="textarea" data-stock-field="'+esc(sku)+'" placeholder="Satu stok per baris atau pisahkan koma\nakun1:pass1\nakun2:pass2"></textarea></div>'; }).join('')+'</div>';
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
      html += '<div class="variantList">'+(p.variants||[]).map(function(v,i){ var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+'</h3><p class="help">Harga: '+rupiah(v.price||v.harga||p.harga)+' | Grosir: '+esc(variantBulkText(v)||'-')+'</p><label class="label">Stok Varian</label><textarea class="textarea tall" data-stock-field="'+esc(sku)+'" placeholder="Satu stok per baris">'+esc(variantStock(v).join('\n'))+'</textarea></div>'; }).join('')+'</div>';
    } else {
      html += '<label class="label">Stok Produk</label><textarea class="textarea tall" id="manageDefaultStock" placeholder="Satu stok per baris">'+esc((p.data||[]).join('\n'))+'</textarea>';
    }
    html += '<button class="btn yellow" type="submit">Simpan Kelola Stok</button></form>';
    openModal('Kelola Stok - '+p.nama, html);
    document.getElementById('modalManageStockForm').onsubmit=async function(e){ e.preventDefault(); var d={kode:p.kode}; if(hasVar){ d.variants=mergeVariantStockArray(p,'replace'); delete d.variants_text; delete d.variant_text; } else { d.stock_text=cleanListText(document.getElementById('manageDefaultStock').value).join('\n'); } await post('edit-product-full',d); closeModal(); };
  }
  function openDeleteProduct(code){ var p=findProduct(code); if(!p) return; openModal('Hapus Produk','<p class="dangerText">Yakin hapus produk '+esc(p.nama)+' ('+esc(p.kode)+')?</p><button class="btn red" id="confirmDeleteProduct">Hapus Sekarang</button>'); document.getElementById('confirmDeleteProduct').onclick=async function(){ await post('delete-product',{kode:p.kode}); closeModal(); }; }
  function wireProductButtons(){ document.querySelectorAll('[data-edit-product]').forEach(function(btn){btn.onclick=function(){openEditProduct(btn.dataset.editProduct);};}); document.querySelectorAll('[data-manage-product]').forEach(function(btn){btn.onclick=function(){openManageProduct(btn.dataset.manageProduct);};}); document.querySelectorAll('[data-stock-product]').forEach(function(btn){btn.onclick=function(){openStockProduct(btn.dataset.stockProduct);};}); document.querySelectorAll('[data-delete-product]').forEach(function(btn){btn.onclick=function(){openDeleteProduct(btn.dataset.deleteProduct);};}); document.querySelectorAll('[data-toggle-product]').forEach(function(btn){btn.onclick=async function(e){ e.stopPropagation(); var p=findProduct(btn.dataset.toggleProduct); if(!p) return; await post('toggle-product',{kode:p.kode,active:p.active===false}); };}); }
  function renderOrders(){ document.getElementById('orderList').innerHTML=state.orders.map(function(o){return '<tr><td>'+new Date(o.created_at).toLocaleString('id-ID')+'</td><td>'+esc(o.product_name)+(o.variant_name?'<br><span class="chip yellow">'+esc(o.variant_name)+'</span>':'')+'<br><span class="chip green">'+esc(o.product_code)+'</span></td><td>'+(o.username?'@'+esc(o.username):esc(o.telegram_id))+'</td><td>'+esc(o.quantity)+'</td><td>'+rupiah(o.total_price)+'</td></tr>';}).join('')||'<tr><td colspan="5">Belum ada order.</td></tr>'; }
  function renderUsers(){ document.getElementById('userList').innerHTML=state.users.map(function(u){return '<tr><td>'+esc(u.telegram_id)+'</td><td>'+(u.username?'@'+esc(u.username):esc(u.first_name||'-'))+'</td><td>'+esc(u.transaction_count||0)+'</td><td>'+rupiah(u.spending||0)+'</td><td><button class="btn small red" data-del-user="'+esc(u.telegram_id)+'">Hapus</button></td></tr>';}).join('')||'<tr><td colspan="5">Belum ada user.</td></tr>'; document.querySelectorAll('[data-del-user]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus user '+btn.dataset.delUser+'?')) await post('delete-user',{telegram_id:btn.dataset.delUser});};}); }
  function voucherFormHtml(v){ v=v||{}; var target=(v.products&&v.products.length)?v.products.join(','):'semua'; return '<form id="modalVoucherForm" class="form">'+
    '<input type="hidden" name="current_code" value="'+esc(v.code||'')+'">'+
    '<div class="formCard"><p class="softTitle">Data Voucher</p><div class="row"><div class="field"><label class="label">Kode Voucher</label><input class="input" name="kode" placeholder="Contoh: DISKON10" value="'+esc(v.code||'')+'" required></div><div class="field"><label class="label">Target Produk</label><input class="input" name="produk" placeholder="Contoh: semua atau CANVA1B,NETFLIX" value="'+esc(target)+'"></div></div></div>'+
    '<div class="formCard"><p class="softTitle">Nilai dan Batas Pemakaian</p><div class="row"><div class="field"><label class="label">Potongan Harga</label><input class="input" name="potongan" type="number" placeholder="Contoh: 10000" value="'+esc(v.discount||'')+'" required></div><div class="field"><label class="label">Limit Pemakaian</label><input class="input" name="limit" type="number" placeholder="Contoh: 20" value="'+esc(v.usage_limit||'')+'" required></div></div></div>'+
    '<div class="formCard"><p class="softTitle">Status dan Masa Berlaku</p><div class="row"><div class="field"><label class="label">Status Voucher</label><select class="select" name="active"><option value="true" '+(v.active===false?'':'selected')+'>Aktif</option><option value="false" '+(v.active===false?'selected':'')+'>Nonaktif</option></select></div><div class="field"><label class="label">Tanggal Expired</label><input class="input" name="expires_at" placeholder="Opsional: 2026-07-30T23:59:00+07:00" value="'+esc(v.expires_at||'')+'"></div></div></div>'+
    '<div class="formCard"><div class="field"><label class="label">Deskripsi Voucher</label><textarea class="textarea" name="description" placeholder="Contoh: Voucher promo khusus member lama.">'+esc(v.description||'')+'</textarea></div></div>'+
    '<button class="btn lime" type="submit">Simpan Voucher</button></form>'; }
  function openVoucherModal(code){ var v=code?state.vouchers.find(function(x){return x.code===code;}):null; openModal(v?'Edit Voucher':'Tambah Voucher', voucherFormHtml(v)); document.getElementById('modalVoucherForm').onsubmit=async function(e){ e.preventDefault(); var d=formData(e.target); var action=d.current_code?'edit-voucher':'add-voucher'; await post(action,d); closeModal(); }; }
  function renderVouchers(){ document.getElementById('voucherList').innerHTML=state.vouchers.map(function(v){ var target=(v.products&&v.products.length)?v.products.join(', '):'Semua produk'; return '<div class="voucherCard"><span class="voucherCode">'+esc(v.code)+'</span> '+(v.active===false?'<span class="chip red">OFF</span>':'<span class="chip green">ON</span>')+'<div class="voucherMeta"><span class="chip yellow">Potongan '+rupiah(v.discount)+'</span><span class="chip purple">Limit '+esc(v.usage_limit)+'</span><span class="chip green">Target '+esc(target)+'</span></div><p class="help">'+esc(v.description||'Belum ada deskripsi voucher.')+'</p><div class="actions"><button class="btn small cyan" data-edit-voucher="'+esc(v.code)+'">Edit</button><button class="btn small red" data-delete-voucher="'+esc(v.code)+'">Hapus</button></div></div>';}).join('')||'<div class="empty">Belum ada voucher.</div>'; document.querySelectorAll('[data-edit-voucher]').forEach(function(btn){btn.onclick=function(){openVoucherModal(btn.dataset.editVoucher);};}); document.querySelectorAll('[data-delete-voucher]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus voucher '+btn.dataset.deleteVoucher+'?')) await post('delete-voucher',{kode:btn.dataset.deleteVoucher});};}); }
  async function load(){ try{ var all=await Promise.all([api('stats'),api('products'),api('orders'),api('users'),api('vouchers'),api('settings'),api('analytics')]); state.stats=all[0].data; state.products=all[1].data; state.orders=all[2].data; state.users=all[3].data; state.vouchers=all[4].data; state.settings=all[5].data; state.analytics=all[6].data; renderHeader(); renderStats(); renderCharts(); renderProducts(); renderOrders(); renderUsers(); renderVouchers(); }catch(e){ toast(e.message,true); renderStats(); renderProducts(); } }
  async function post(action,data){ try{ var r=await api(action,data); toast('Berhasil diproses'); await load(); return r; }catch(e){ toast(e.message,true); throw e; } }
  document.querySelectorAll('[data-tab]').forEach(function(btn){btn.onclick=function(){switchTab(btn.dataset.tab);};});
  document.getElementById('search').oninput=renderProducts;
  document.getElementById('addForm').onsubmit=async function(e){
    e.preventDefault();
    compileAddVariants();
    var t=document.getElementById('addVariantToggle');
    if(t&&t.checked){
      var first=document.querySelector('#addVariantCards .addVariantCard');
      if(first){
        function fv(k){ var el=first.querySelector('[data-vfield="'+k+'"]'); return el?String(el.value||'').trim():''; }
        if(e.target.harga) e.target.harga.value=fv('price')||'0';
        if(e.target.deskripsi) e.target.deskripsi.value=fv('description')||'Produk dengan varian.';
        if(e.target.snk) e.target.snk.value=fv('snk')||'Syarat mengikuti varian yang dipilih.';
        if(e.target.bulk_text) e.target.bulk_text.value='';
      }
    }
    await post('add-product',formData(e.target));
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
