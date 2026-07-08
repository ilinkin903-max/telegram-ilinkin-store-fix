from pathlib import Path
p=Path('/mnt/data/v28work/api/reseller.js')
s=p.read_text()
# Replace promo section between section id promos and section id deepStats
start=s.index('  <section id="promos"')
end=s.index('  <section id="deepStats"', start)
new_section=r'''  <section id="promos" class="section">
    <div class="panel yellow"><h2 class="sectionTitle">Promo & Voucher</h2><p class="help">Satu menu untuk membuat <b>Voucher Manual</b> atau <b>Promo Otomatis</b>. Voucher dipakai user dengan kode, sedangkan Promo Otomatis diterapkan otomatis saat checkout jika syarat cocok.</p></div>
    <div class="panel lime"><h2 class="sectionTitle">Setting Promo / Voucher</h2>
      <form id="promoUnifiedForm" class="form">
        <input type="hidden" name="current_code" value="">
        <div class="row3">
          <div class="field"><label class="label">Tipe Setting</label><select class="select" name="promo_kind"><option value="voucher">Voucher Manual</option><option value="auto">Promo Otomatis</option></select></div>
          <div class="field"><label class="label">Kode</label><input class="input" name="code" placeholder="Contoh: DISKON10 / HEMAT20" required></div>
          <div class="field"><label class="label">Nama/Judul</label><input class="input" name="name" placeholder="Contoh: Diskon Member Lama"></div>
        </div>
        <div class="row3">
          <div class="field"><label class="label">Status</label><select class="select" name="active"><option value="true">ON</option><option value="false">OFF</option></select></div>
          <div class="field"><label class="label">Tipe Diskon</label><select class="select" name="discount_type"><option value="amount">Nominal Rupiah</option><option value="percent">Persen</option></select></div>
          <div class="field"><label class="label">Nilai Diskon</label><input class="input" name="discount_value" type="number" placeholder="Contoh nominal: 5000 / persen: 10" required></div>
        </div>
        <div class="row3">
          <div class="field"><label class="label">Limit Pemakaian</label><input class="input" name="usage_limit" type="number" placeholder="0 = tanpa limit untuk promo otomatis, voucher wajib isi limit"></div>
          <div class="field"><label class="label">Minimal Jumlah Beli</label><input class="input" name="min_qty" type="number" placeholder="Contoh: 2"></div>
          <div class="field"><label class="label">Minimal Belanja</label><input class="input" name="min_spend" type="number" placeholder="Contoh: 50000"></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">Produk Target</label><textarea class="textarea" name="products" placeholder="Kosong / semua = semua produk\nAtau isi kode produk: CANVA1B, NETFLIX"></textarea></div>
          <div class="field"><label class="label">Deskripsi / Catatan</label><textarea class="textarea" name="description" placeholder="Contoh: Berlaku minimal 2 produk, tidak bisa digabung voucher lain."></textarea></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">Mulai Berlaku</label><input class="input" name="start_at" type="datetime-local"></div>
          <div class="field"><label class="label">Berakhir / Expired</label><input class="input" name="end_at" type="datetime-local"></div>
        </div>
        <p class="help"><b>Voucher Manual:</b> user harus memasukkan kode. <b>Promo Otomatis:</b> langsung aktif saat checkout jika syarat cocok. Keduanya bisa dihapus kapan saja.</p>
        <div class="actions"><button class="btn yellow" type="submit">Simpan Promo / Voucher</button><button class="btn lime" type="button" id="resetPromoUnified">Buat Baru</button></div>
      </form>
    </div>
    <div class="panel voucherListPanel"><h2 class="sectionTitle">Daftar Promo & Voucher</h2><p class="help">Daftar voucher manual dan promo otomatis digabung. Lihat label warna untuk membedakan tipe. Semua bisa diedit atau dihapus kapan saja.</p><div id="promoUnifiedList"></div></div>
  </section>
'''
s=s[:start]+new_section+s[end:]
# Replace voucherForm/open/renderVouchers through renderVouchers function with unified functions
start=s.index('  function voucherFormHtml')
end=s.index('  async function openPollResult', start)
new_funcs=r'''  function promoUnifiedReset(){
    var f=document.getElementById('promoUnifiedForm'); if(!f) return;
    f.reset(); f.current_code.value='';
    var title=document.querySelector('#promos .sectionTitle');
    var btn=f.querySelector('button[type="submit"]'); if(btn) btn.textContent='Simpan Promo / Voucher';
  }
  function fillPromoUnified(type, item){
    var f=document.getElementById('promoUnifiedForm'); if(!f || !item) return;
    switchTab('promos');
    f.current_code.value=item.code||'';
    f.promo_kind.value=type;
    f.code.value=item.code||'';
    f.name.value=item.name || (type==='voucher' ? 'Voucher '+(item.code||'') : 'Promo '+(item.code||''));
    f.active.value=(item.active===false?'false':'true');
    f.discount_type.value=item.discount_type || 'amount';
    f.discount_value.value=item.discount_value || item.discount || '';
    f.usage_limit.value=item.usage_limit || item.limit || '';
    f.min_qty.value=item.min_qty || 1;
    f.min_spend.value=item.min_spend || 0;
    f.products.value=(item.products&&item.products.length)?item.products.join(', '):'semua';
    f.description.value=item.description||'';
    f.start_at.value=toLocalInputValue(item.start_at);
    f.end_at.value=toLocalInputValue(item.end_at || item.expires_at);
    var btn=f.querySelector('button[type="submit"]'); if(btn) btn.textContent='Update '+(type==='voucher'?'Voucher Manual':'Promo Otomatis');
    f.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function toLocalInputValue(value){
    if(!value) return '';
    var d=new Date(value); if(isNaN(d.getTime())) return '';
    var pad=function(n){return String(n).padStart(2,'0');};
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  }
  function unifiedDiscountText(x){
    var t=x.discount_type||'amount'; var v=x.discount_value || x.discount || 0;
    return t==='percent' ? (v+'%') : rupiah(v);
  }
  function renderUnifiedPromos(){
    var el=document.getElementById('promoUnifiedList'); if(!el) return;
    var vouchers=(state.vouchers||[]).map(function(v){return {type:'voucher',label:'Voucher Manual',row:v};});
    var promos=(state.promos||[]).map(function(p){return {type:'auto',label:'Promo Otomatis',row:p};});
    var rows=vouchers.concat(promos).sort(function(a,b){return String(b.row.updated_at||b.row.created_at||'').localeCompare(String(a.row.updated_at||a.row.created_at||''));});
    el.innerHTML=rows.map(function(item){ var x=item.row; var target=(x.products&&x.products.length)?x.products.join(', '):'Semua produk'; var min='Min '+(x.min_qty||1)+' pcs / '+rupiah(x.min_spend||0); var limit=(x.usage_limit?x.usage_limit:'∞'); var used=item.type==='auto'?(x.used_count||0):((x.used_by&&x.used_by.length)||0); var end=x.end_at||x.expires_at||''; return '<div class="voucherCard '+(item.type==='voucher'?'voucherManual':'promoAuto')+'"><div class="rowBetween"><div><span class="voucherCode">'+esc(x.code)+'</span> <span class="chip '+(item.type==='voucher'?'purple':'yellow')+'">'+esc(item.label)+'</span> '+(x.active===false?'<span class="chip red">OFF</span>':'<span class="chip green">ON</span>')+'</div><div class="actions"><button class="btn small cyan" data-edit-unified="'+esc(item.type)+'|'+esc(x.code)+'">Edit</button><button class="btn small red" data-delete-unified="'+esc(item.type)+'|'+esc(x.code)+'">Hapus</button></div></div><div class="voucherMeta"><span class="chip yellow">Diskon '+esc(unifiedDiscountText(x))+'</span><span class="chip purple">'+esc(min)+'</span><span class="chip green">Target '+esc(target)+'</span><span class="chip orange">Dipakai '+esc(used)+'/'+esc(limit)+'</span></div><p class="help">'+esc(x.name||x.description||'Tanpa deskripsi')+(x.description&&x.name?' — '+esc(x.description):'')+'</p>'+(x.start_at||end?'<small>Berlaku: '+esc(x.start_at||'sekarang')+' s/d '+esc(end||'tanpa batas')+'</small>':'')+'</div>'; }).join('')||'<div class="empty">Belum ada promo atau voucher.</div>';
    document.querySelectorAll('[data-edit-unified]').forEach(function(btn){btn.onclick=function(){ var parts=btn.dataset.editUnified.split('|'); var type=parts[0]; var code=parts.slice(1).join('|'); var item=(type==='voucher'?state.vouchers:state.promos).find(function(x){return String(x.code).toUpperCase()===String(code).toUpperCase();}); fillPromoUnified(type,item); };});
    document.querySelectorAll('[data-delete-unified]').forEach(function(btn){btn.onclick=async function(){ var parts=btn.dataset.deleteUnified.split('|'); var type=parts[0]; var code=parts.slice(1).join('|'); if(!confirm('Hapus '+(type==='voucher'?'voucher':'promo')+' '+code+'?')) return; await post(type==='voucher'?'delete-voucher':'promo-delete', type==='voucher'?{kode:code}:{code:code}); };});
  }
  function renderVouchers(){ renderUnifiedPromos(); }

'''
s=s[:start]+new_funcs+s[end:]
# Replace renderPromos function
start=s.index('  function renderPromos(){')
end=s.index('  function renderDeepStats(){', start)
new_render_promos="""  function renderPromos(){ renderUnifiedPromos(); }\n"""
s=s[:start]+new_render_promos+s[end:]
# Replace handler openAddVoucher with reset, promoForm to unified
s=s.replace("""  var addVoucherBtn=document.getElementById('openAddVoucher'); if(addVoucherBtn) addVoucherBtn.onclick=function(){ openVoucherModal(); };\n""", "")
s=s.replace("""  var promoForm=document.getElementById('promoForm'); if(promoForm) promoForm.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(e.target); await post('promo-save',d); e.target.reset(); };\n""", """  var promoUnifiedForm=document.getElementById('promoUnifiedForm'); if(promoUnifiedForm) promoUnifiedForm.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(e.target); var isAuto=d.promo_kind==='auto'; var payload={ code:d.code, kode:d.code, current_code:d.current_code, name:d.name||d.code, discount_type:d.discount_type, discount_value:d.discount_value, potongan:d.discount_value, produk:d.products, products:d.products, min_qty:d.min_qty||1, min_spend:d.min_spend||0, usage_limit:d.usage_limit, limit:d.usage_limit, description:d.description, active:d.active, start_at:d.start_at||null, end_at:d.end_at||null, expires_at:d.end_at||null }; if(isAuto){ await post('promo-save',payload); } else { await post(d.current_code?'edit-voucher':'add-voucher',payload); } promoUnifiedReset(); };\n  var resetPromoUnified=document.getElementById('resetPromoUnified'); if(resetPromoUnified) resetPromoUnified.onclick=promoUnifiedReset;\n""")
p.write_text(s)
