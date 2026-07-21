module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(String.raw`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Reseller Dashboard — iLink.in Store</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root{--bg:#fff0d8;--paper:#fff;--ink:#050505;--muted:#646464;--pink:#e83f9b;--cyan:#12b8ce;--lime:#83d904;--yellow:#ffe04b;--purple:#8557e8;--red:#ef3e45;--orange:#ff9f1c;--line:3px solid #050505;--shadow:6px 6px 0 #050505;--soft:3px 3px 0 #050505;--radius:8px}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 20% 0,#fff9d8 0,#fff0d8 35%,#ffe1b8 100%);color:var(--ink);font-family:Inter,Arial,system-ui,sans-serif;font-weight:900;overflow-x:hidden}.wrap{max-width:1220px;margin:auto;padding:20px 16px 80px}.hero{position:relative;overflow:hidden;background:var(--pink);color:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:22px 24px;margin:8px 0 18px}.hero:after{content:"";position:absolute;inset:0;background-image:var(--hero-bg,none);background-size:cover;background-position:center;opacity:.18;filter:saturate(1.1) contrast(1.05);z-index:0;pointer-events:none}.hero:before{content:"";position:absolute;right:-18px;top:-18px;width:150px;height:150px;background:repeating-linear-gradient(45deg,rgba(0,0,0,.22) 0 3px,transparent 3px 12px);z-index:1}.hero>*{position:relative;z-index:2}.badge{position:absolute;right:22px;top:22px;background:var(--yellow);color:#000;border:var(--line);box-shadow:var(--soft);border-radius:6px;padding:7px 14px;font-size:13px}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.08em}.hero h1{font-size:34px;line-height:1;margin:10px 0 6px}.storeline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.storeline.byline{font-size:12px;opacity:.96;text-transform:uppercase;letter-spacing:.03em}.storeline.byline span{font-size:12px}.storeline button{border:0;background:transparent;color:#fff;text-decoration:underline;font-weight:1000;cursor:pointer}.tier{font-size:13px;text-transform:uppercase;margin-top:8px}.statsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px;max-width:520px}.stat{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:10px 12px;color:#000;min-height:66px;display:flex;flex-direction:column;justify-content:center}.stat:nth-child(1){background:var(--cyan)}.stat:nth-child(2){background:var(--yellow)}.stat:nth-child(3){background:var(--lime)}.stat:nth-child(4){background:var(--purple);color:#fff}.stat small{display:block;text-transform:uppercase;font-size:10px}.stat b{display:block;font-size:clamp(18px,4.5vw,22px);margin-top:7px;line-height:1.05}.search{width:100%;border:var(--line);border-radius:var(--radius);padding:14px 16px;background:#fff;box-shadow:var(--soft);font-weight:900;font-size:15px;margin-bottom:10px}.count{font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.35}.navTiles{display:flex;flex-wrap:nowrap;gap:10px;margin:14px 0 18px;background:var(--purple);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:10px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}.navTiles::-webkit-scrollbar{height:7px}.navTiles::-webkit-scrollbar-thumb{background:#000;border-radius:99px}.tile{background:var(--lime);border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:13px 12px;text-align:center;min-height:70px;min-width:106px;flex:0 0 auto;scroll-snap-align:start;cursor:pointer;text-transform:uppercase;font-weight:1000}.tile.active{background:var(--yellow);color:#000}.tile .ico{font-size:18px;display:block;margin-bottom:6px}.section{display:none;min-width:0;max-width:100%}.section.active{display:block}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.panel,.product,.miniCard{background:var(--paper);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px;min-width:0;max-width:100%;overflow-wrap:anywhere}.panel{margin-bottom:18px}.chartPanel{background:#5dc8ff}.addPanel{background:var(--lime)}.sectionTitle{margin:0 0 12px;font-size:23px}.subtle{color:var(--muted);font-size:13px}.product{min-height:260px;display:flex;flex-direction:column;gap:8px}.productTop{display:flex;gap:12px}.productImg{width:72px;height:72px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.productFallback{width:72px;height:72px;border:var(--line);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:1000;color:#000;text-transform:uppercase}::placeholder{color:#777;opacity:.55}.product h3{font-size:18px;margin:0;line-height:1.2}.approved{margin-left:auto;align-self:flex-start;background:var(--lime);border:var(--line);border-radius:5px;padding:5px 8px;font-size:10px}.price{font-size:28px;margin-top:3px}.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:2px solid #000;border-radius:5px;background:#fff;padding:4px 7px;font-size:11px}.chip.green{background:var(--lime)}.chip.yellow{background:var(--yellow)}.chip.purple{background:var(--purple);color:#fff}.actions{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:auto}.btn{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px 14px;background:#fff;color:#000;font-weight:1000;cursor:pointer;text-align:center;text-transform:uppercase}.btn:active{transform:translate(3px,3px);box-shadow:0 0 0 #000}.btn.small{font-size:12px;padding:9px 8px}.cyan{background:var(--cyan)}.lime{background:var(--lime)}.pink{background:var(--pink);color:#fff}.yellow{background:var(--yellow)}.purple{background:var(--purple);color:#fff}.red{background:var(--red);color:#fff}.orange{background:var(--orange)}.forms{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;min-width:0;max-width:100%}.dashboardGrid{grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);align-items:start}.dashboardGrid .panel{width:100%;overflow:hidden}.dashboardGrid #topProductList{display:grid;gap:10px;min-width:0}.dashboardGrid .voucher{margin:0;max-width:100%;overflow-wrap:anywhere}.row{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.input,.textarea,.select{width:100%;border:var(--line);border-radius:var(--radius);background:#fff;padding:12px;font-weight:900;font-size:14px}.textarea{min-height:105px;resize:vertical}.textarea.tall{min-height:170px}.label{font-size:12px;text-transform:uppercase;margin:4px 0 6px;display:block}.help{font-size:12px;color:var(--muted);line-height:1.4}.tableWrap{overflow:auto}.table{width:100%;border-collapse:collapse}.table th,.table td{border:var(--line);padding:10px;background:#fff;text-align:left;vertical-align:top}.table th{background:var(--yellow);text-transform:uppercase}.voucher{border:var(--line);box-shadow:var(--soft);background:#fff;border-radius:var(--radius);padding:12px;margin:0 0 10px}.chart{width:100%;max-width:100%;min-width:0;height:clamp(230px,34vw,340px);border:var(--line);border-radius:var(--radius);display:grid;grid-template-columns:repeat(7,minmax(0,1fr));align-items:end;gap:clamp(4px,1vw,10px);padding:clamp(8px,1.6vw,14px);background:#5dc8ff;overflow:hidden}.barBox{min-width:0;max-width:100%;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:6px}.bar{width:min(42px,70%);border:2px solid #000;border-bottom-width:4px;background:var(--pink);min-height:8px}.barBox:nth-child(2n) .bar{background:var(--cyan)}.barBox:nth-child(3n) .bar{background:var(--yellow)}.barLabel{font-size:clamp(9px,2.2vw,11px);text-align:center;line-height:1.15;word-break:keep-all;max-width:76px;color:#000}.toast{position:fixed;left:16px;right:16px;bottom:16px;z-index:120;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);background:var(--lime);padding:14px;display:none}.toast.error{background:var(--red);color:#fff}.preview{width:100%;max-height:180px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.empty{padding:22px;border:var(--line);border-radius:var(--radius);background:#fff;text-align:center;color:var(--muted)}.modal{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;display:none;align-items:flex-start;justify-content:center;padding:22px 12px;overflow:auto}.modal.show{display:flex}.modalBox{width:min(920px,100%);background:#fff;border:var(--line);box-shadow:10px 10px 0 #000;border-radius:var(--radius);padding:16px}.modalHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.modalTitle{font-size:22px;margin:0}.closeBtn{border:var(--line);box-shadow:var(--soft);background:var(--red);color:#fff;border-radius:6px;font-weight:1000;padding:8px 12px;cursor:pointer}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detailItem{border:2px solid #000;background:#f8f8f8;border-radius:6px;padding:9px;font-size:13px;white-space:pre-wrap}.variantList{display:grid;gap:10px;margin:12px 0}.variantCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;background:#fff}.variantCard h3{margin:0 0 6px;font-size:17px}.ghost{opacity:.58;color:#666;font-size:12px;line-height:1.4;margin-top:6px}.field{display:flex;flex-direction:column;gap:6px}.switchBox{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;margin:10px 0}.switchLabel{display:flex;align-items:center;gap:10px;font-size:14px;text-transform:uppercase;cursor:pointer}.switchLabel input{display:none}.toggleTrack{position:relative;width:54px;height:28px;border:3px solid #000;border-radius:999px;background:#ddd;box-shadow:2px 2px 0 #000;display:inline-block;flex:0 0 auto}.toggleTrack:after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border:3px solid #000;border-radius:50%;background:#fff;transition:.18s}.switchLabel input:checked+.toggleTrack{background:var(--lime)}.switchLabel input:checked+.toggleTrack:after{transform:translateX(24px)}.variantBuilder{display:none;margin-top:12px}.variantBuilder.show{display:block}.addVariantCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#f9fff0;padding:12px;margin:10px 0}.addVariantCardTitle{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px;text-transform:uppercase}.dangerText{color:#b00020;font-weight:1000}.hidden{display:none!important}.variantMainHide.hidden{display:none!important}.variantMainCompact{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#eaffc8;padding:10px;margin:8px 0 12px;font-size:12px;line-height:1.45}
    @media(max-width:980px){.grid{grid-template-columns:repeat(2,1fr)}.forms,.dashboardGrid{grid-template-columns:minmax(0,1fr)}}
    @media(max-width:620px){.wrap{width:100%;max-width:100%;padding:14px 10px 60px;overflow-x:hidden}.hero{padding:16px 12px}.hero h1{font-size:28px}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none;gap:8px}.stat{min-height:62px;padding:9px}.grid,.row,.row3,.detailGrid{grid-template-columns:minmax(0,1fr)}.tile{min-height:62px;min-width:98px;padding:10px 8px;font-size:12px}.productTop{align-items:flex-start}.productImg,.productFallback{width:64px;height:64px}.price{font-size:25px}.dashboardGrid{gap:12px}.dashboardGrid .panel{box-shadow:4px 4px 0 #050505;padding:12px}.chart{height:260px;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;padding:8px 6px 10px}.bar{width:min(26px,68%)}.barLabel{font-size:9px;max-width:42px;line-height:1.1}.sectionTitle{font-size:20px}.topPanel .voucher{font-size:13px;line-height:1.45}}
  
    .productOff{opacity:.72;filter:grayscale(.18)}.statusToggle{margin-left:auto;align-self:flex-start;border:var(--line);box-shadow:var(--soft);border-radius:999px;padding:6px 12px;font-size:11px;background:var(--lime);font-weight:1000;cursor:pointer}.statusToggle.off{background:var(--red);color:#fff}.miniSwitch{display:inline-flex;gap:6px;align-items:center;background:#8bd80f;color:#000;border:2px solid #000;border-radius:8px;padding:5px 8px;font-size:11px;font-weight:1000}.miniSwitch input{accent-color:#111}.miniSwitch:has(input:not(:checked)){background:#ff4b4b;color:#fff}.miniSwitch input:not(:checked)+span{font-size:0}.miniSwitch input:not(:checked)+span:before{content:'OFF';font-size:11px}.miniSwitch input:checked+span{font-size:0}.miniSwitch input:checked+span:before{content:'ON';font-size:11px}.promoSubGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px}.promoSubBtn{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;text-align:left;font-weight:1000;cursor:pointer;color:#000}.promoSubBtn .ico{display:block;font-size:22px;margin-bottom:6px}.promoSubBtn b{display:block;text-transform:uppercase;font-size:13px}.promoSubBtn small{display:block;color:#555;font-size:11px;line-height:1.35;margin-top:4px}.promoSubBtn.active{background:var(--yellow)}.voucherIntroPanel{background:var(--yellow)}.voucherListPanel{background:#ffe88a}.voucherCard{background:#fff7c4;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;margin:0 0 10px}.voucherCard:nth-child(3n+1){background:#fff0a6}.voucherCard:nth-child(3n+2){background:#d9fbff}.voucherCard:nth-child(3n){background:#e6d7ff}.voucherCode{display:inline-block;border:var(--line);box-shadow:var(--soft);border-radius:6px;background:var(--yellow);padding:5px 9px;margin-bottom:8px}.broadcastPanel{background:#ffd1e8}.pollPanel{background:#d9fbff}.pollCard{background:#fff;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;margin:0 0 10px}.pollResultRow{border:2px solid #000;border-radius:8px;background:#f7f7f7;padding:8px;margin:7px 0}.pollBar{height:14px;border:2px solid #000;background:var(--yellow);box-shadow:2px 2px 0 #000;margin-top:5px;min-width:8px}.topPanel{background:#d8f7ff}.settingsPanel{background:#eaffc8}.storeMenuPanel{background:var(--yellow)}.storeSubGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.storeSubBtn{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;text-align:left;font-weight:1000;cursor:pointer;color:#000}.storeSubBtn:active{transform:translate(3px,3px);box-shadow:0 0 0 #000}.storeSubBtn .ico{display:block;font-size:22px;margin-bottom:6px}.storeSubBtn b{display:block;text-transform:uppercase;font-size:13px}.storeSubBtn small{display:block;color:#555;font-size:11px;line-height:1.35;margin-top:4px}.mediaGuidePanel{background:#e6d7ff}.formCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;margin-bottom:10px}.orderGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.orderCard{background:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px;display:flex;flex-direction:column;gap:8px}.orderRef{font-size:11px;letter-spacing:.03em;color:#111}.orderTitle{font-size:19px;line-height:1.2}.orderMeta{font-size:13px;line-height:1.65;color:#333}.statusDone{align-self:flex-start;background:var(--lime);border:var(--line);box-shadow:var(--soft);border-radius:6px;padding:6px 10px;font-size:11px;color:#000}.userTools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.voucherMeta{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.softTitle{font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px;color:#111}.tile[data-tab="broadcast"]:not(.active),.tile[data-tab="settings"]:not(.active),.tile[data-tab="promos"]:not(.active){background:var(--lime)!important;color:#000!important}.tile.active{background:var(--yellow)!important;color:#000!important}.detailItem{color:#000!important}.deepStatsPanel{background:#e6d7ff!important;color:#000!important}.licensePanel{background:#d9fbff!important}.deepStatsPanel .help,.deepStatsPanel .sectionTitle{color:#000!important}
@media(max-width:620px){.chart{height:260px;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;padding:8px 6px 10px}.bar{width:min(26px,68%)}.barLabel{font-size:9px;max-width:42px;line-height:1.1}}

    /* Responsive product & user layout: prevent narrow columns from stretching vertically. */
    .productInfo{flex:1;min-width:0}.productInfo h3,.productInfo .subtle{overflow-wrap:break-word;word-break:normal}.product .chips{min-width:0}.userTable td{overflow-wrap:break-word;word-break:normal}.userTable .btn{white-space:nowrap}
    @media(max-width:620px){
      #productList{gap:12px}.product{min-height:0;padding:12px;gap:9px;overflow-wrap:normal}.productTop{gap:9px;align-items:flex-start}.productImg,.productFallback{width:56px;height:56px;flex:0 0 56px}.product h3{font-size:17px;line-height:1.15}.product .subtle{font-size:12px;line-height:1.3}.statusToggle{flex:0 0 auto;margin-left:4px;padding:5px 9px;font-size:10px;box-shadow:2px 2px 0 #050505}.price{font-size:23px;line-height:1.1;margin-top:1px}.product .chips{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding:1px 1px 5px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.product .chip{flex:0 0 auto;white-space:nowrap;font-size:10px;padding:4px 6px}.product .actions{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.product .btn.small{min-width:0;padding:10px 3px;font-size:10px;line-height:1;box-shadow:2px 2px 0 #050505}
      #users .panel{padding:12px;overflow:visible}.userTools{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding:1px 1px 5px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.userTools .btn{flex:0 0 auto;padding:9px 10px;font-size:10px;white-space:nowrap}.userTable,.userTable tbody,.userTable tr,.userTable td{display:block;width:100%}.userTable{border-collapse:separate;border-spacing:0}.userTable thead{display:none}.userTable tbody{display:grid;gap:10px}.userTable tr{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;overflow:hidden}.userTable td{border:0;border-bottom:2px solid #050505;padding:9px 10px;display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:start;line-height:1.3;overflow-wrap:anywhere}.userTable td::before{content:attr(data-label);font-size:10px;text-transform:uppercase;color:#555;letter-spacing:.03em}.userTable td:last-child{border-bottom:0;display:block}.userTable td:last-child::before{display:none}.userTable td:last-child .btn{width:100%;padding:10px}.userTable .userEmptyRow{display:block}.userTable .userEmptyRow td{display:block;border:0;text-align:center}.userTable .userEmptyRow td::before{display:none}
    }


    /* v46: tampilan lebih ringkas, menu tidak dobel, dan target promo per varian. */
    :root{--line:2px solid #050505;--shadow:4px 4px 0 #050505;--soft:2px 2px 0 #050505;--radius:12px}
    body{font-weight:700}.btn,.tile,.label,.sectionTitle,.product h3,.voucherCode{font-weight:900}
    .wrap{padding-top:12px}.hero{padding:18px 20px;margin-top:4px}.hero h1{font-size:30px}.navTiles{gap:8px;padding:8px;background:#fff}.tile{min-width:102px;min-height:62px;padding:10px 9px;font-size:12px}.tile .ico{margin-bottom:4px}.panel,.product,.miniCard{padding:16px}.sectionTitle{margin-bottom:6px}.sectionToolbar{display:flex;align-items:center;justify-content:space-between;gap:14px}.sectionToolbar .sectionTitle,.sectionToolbar .help{margin-top:0}.sectionToolbar .help{margin-bottom:0}.sectionToolbar .btn{flex:0 0 auto}.backButton{margin-bottom:14px}.broadcastGrid{align-items:start}.formDivider{border-top:2px dashed #111;margin:8px 0 2px;padding-top:14px;text-transform:uppercase;font-size:13px}
    .promoTargetBox{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff7c4;padding:14px}.promoTargetHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.promoTargetHead p{margin:4px 0 0}.compactSwitch{font-size:12px;white-space:nowrap}.compactSwitch .toggleTrack{width:48px;height:26px}.compactSwitch .toggleTrack:after{width:14px;height:14px}.compactSwitch input:checked+.toggleTrack:after{transform:translateX(21px)}.promoTargetBuilder{margin-top:12px}.promoTargetControls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:10px;align-items:end}.promoTargetControls .btn{min-height:47px}.promoTargetList{display:grid;gap:8px;margin-top:10px}.promoTargetItem{display:flex;align-items:center;justify-content:space-between;gap:10px;border:2px solid #000;border-radius:10px;background:#fff;padding:9px 10px}.promoTargetItem span{min-width:0;overflow-wrap:anywhere}.promoTargetItem button{border:2px solid #000;border-radius:8px;background:var(--red);color:#fff;padding:6px 9px;font-weight:900;cursor:pointer}.promoTargetEmpty{border:2px dashed #555;border-radius:10px;background:#fff;padding:12px;color:#555;font-size:12px}.rowBetween{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.voucherCard .rowBetween{align-items:flex-start}.voucherCard .actions{margin-top:0}.storeSubGrid{grid-template-columns:repeat(4,minmax(0,1fr))}
    @media(max-width:760px){.forms,.dashboardGrid,.broadcastGrid{grid-template-columns:1fr}.storeSubGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.promoTargetControls{grid-template-columns:1fr 1fr}.promoTargetControls .btn{grid-column:1/-1}.sectionToolbar{align-items:flex-start}.sectionToolbar .btn{padding:10px 12px}}
    @media(max-width:620px){.wrap{padding:8px 10px 70px}.hero{padding:16px;margin-bottom:14px}.hero h1{font-size:27px}.statsGrid{gap:7px;margin-top:12px}.stat{min-height:58px;padding:8px}.navTiles{margin:10px 0 14px}.tile{min-width:88px;min-height:56px;padding:8px 7px;font-size:10px}.tile .ico{font-size:17px}.panel,.product,.miniCard{padding:12px}.sectionToolbar{flex-direction:column}.sectionToolbar .btn{width:100%}.row,.row3{grid-template-columns:1fr}.promoTargetHead{flex-direction:column}.compactSwitch{width:100%;justify-content:space-between;border-top:2px dashed #111;padding-top:10px}.promoTargetControls{grid-template-columns:1fr}.promoTargetControls .btn{grid-column:auto}.storeSubGrid{grid-template-columns:1fr 1fr}.voucherCard .rowBetween{display:block}.voucherCard .rowBetween .actions{margin-top:10px}.broadcastGrid .panel{margin-bottom:12px}}

    /* v52: link manager seperti referensi, rapi untuk logo/banner/produk */
    .linkFieldBox{background:#eef5ff;border:var(--line);border-radius:var(--radius);padding:10px;box-shadow:var(--soft);display:grid;gap:8px}.linkFieldTitle{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#334155}.linkRows{display:grid;gap:9px}.linkRow{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(0,1.6fr) auto;gap:8px;align-items:center}.linkRow .input{margin:0}.linkRemove{width:42px;min-width:42px;height:42px;padding:0}.formDivider.withAction{display:flex;justify-content:space-between;align-items:center;gap:12px}.scopeBadge{display:inline-flex;align-items:center;border:2px solid #050505;border-radius:999px;padding:3px 7px;font-size:9px;background:#dbeafe;color:#0f172a}.scopeBadge.market{background:#bfdbfe}.linkHint{font-size:11px;color:var(--muted);line-height:1.45}
    .flashProductRow{grid-template-columns:minmax(0,1fr) auto}.flashProductRow .select{margin:0}.flashSaleHint{border:2px solid #050505;border-radius:var(--radius);background:#fff7d6;padding:10px 12px;font-size:11px;line-height:1.45}
    @media(max-width:720px){.linkRow{grid-template-columns:1fr auto}.linkRow .bannerName{grid-column:1/-1}.linkRow .bannerUrl{grid-column:1}.linkRow .linkRemove{grid-column:2;grid-row:2}.flashProductRow{grid-template-columns:1fr auto}.flashProductRow .select{grid-column:1}.flashProductRow .linkRemove{grid-column:2;grid-row:1}}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="eyebrow">RESELLER DASHBOARD</div>
    <h1 id="storeName">iLink.in Store</h1>
    <div class="storeline byline"><span>Kelola toko, produk, promo, dan penjualan</span></div>
    <div style="margin-top:12px"><a href="/" class="btn yellow" style="display:inline-block;text-decoration:none;color:#000">🛍️ Lihat Marketplace</a></div>
    <div class="statsGrid" id="stats"></div>
  </header>

  <input id="search" class="search" placeholder="Cari produk, penjualan, user, promo, voucher..." />
  <div id="productCounter" class="count">Pencarian berlaku untuk Produk, Penjualan, Users, Promo & Voucher.</div>

  <nav class="navTiles" id="navTiles" aria-label="Menu utama">
    <button class="tile active" data-tab="dashboard"><span class="ico">📊</span>Dashboard</button>
    <button class="tile" data-tab="products"><span class="ico">📦</span>Produk</button>
    <button class="tile" data-tab="orders"><span class="ico">🧾</span>Penjualan</button>
    <button class="tile" data-tab="users"><span class="ico">👥</span>Users</button>
    <button class="tile" data-tab="broadcast"><span class="ico">📣</span>Broadcast</button>
    <button class="tile" data-tab="promos"><span class="ico">🎟</span>Promo</button>
    <button class="tile" data-tab="settings"><span class="ico">⚙️</span>Pengaturan</button>
  </nav>

  <section id="dashboard" class="section active">
    <div class="forms dashboardGrid">
      <div class="panel chartPanel"><h2 class="sectionTitle">Grafik 7 Hari Terakhir</h2><div id="revenueChart" class="chart"></div><p class="help">Menampilkan tanggal dan omzet per hari.</p></div>
      <div class="panel topPanel"><h2 class="sectionTitle">Produk Terlaris</h2><div id="topProductList"></div></div>
    </div>
  </section>

  <section id="license" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Menu Toko</button>
    <div class="panel licensePanel">
      <h2 class="sectionTitle">Lisensi / Masa Aktif Bot</h2>
      <p class="help">Status sewa dibaca dari iLink.in Manager. Kode mulai dihitung setelah digunakan/diaktivasi.</p>
      <div id="licenseBox" class="detailGrid"></div>
      <button class="btn yellow" id="refreshLicense" type="button">Refresh Lisensi</button>
    </div>
  </section>

  <section id="products" class="section">
    <div class="panel sectionToolbar">
      <div><h2 class="sectionTitle">Produk</h2><p class="help">Kelola produk, varian, harga, status, dan stok dari satu halaman.</p></div>
      <button class="btn lime" type="button" data-tab="addProduct">+ Tambah Produk</button>
    </div>
    <div id="productList" class="grid"></div>
  </section>

  <section id="addProduct" class="section">
    <button class="btn yellow backButton" data-tab="products" type="button">← Kembali ke Produk</button>
    <div class="panel addPanel">
      <h2 class="sectionTitle">Tambah Produk</h2>
      <p class="help">Isi data utama produk. Jika produk punya pilihan paket, aktifkan varian agar harga, stok, dan grosir tiap varian terpisah.</p>
      <form id="addForm" class="form">
        <div class="row3">
          <div class="field"><label class="label">Nama Produk</label><input class="input" name="nama" placeholder="Contoh: Canva Pro 1 Bulan" required></div>
          <div class="field"><label class="label">Kode Produk</label><input class="input" name="kode" placeholder="Contoh: CANVA1B" required></div>
          <div class="field variantMainHide" data-hide-when-variant><label class="label">Harga Satuan</label><input class="input" name="harga" type="number" placeholder="Contoh: 13000" required></div>
        </div>
        <div class="row3">
          <div class="field"><label class="label">Kategori</label><input class="input" name="category" placeholder="Contoh: Akun Premium"></div>
          <div class="field"><label class="label">Link Gambar Produk</label><div class="linkFieldBox"><div class="linkFieldTitle">Gambar Produk</div><input class="input" name="image_url" placeholder="https://domain.com/produk.jpg atau Google Drive"></div></div>
          <div class="field"><label class="label">Tampilkan Produk Di</label><select class="select" name="display_scope"><option value="both">Bot Telegram + Marketplace</option><option value="marketplace">Marketplace saja</option></select><p class="help">Marketplace saja tidak akan muncul pada daftar /produk dan stok di bot.</p></div>
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

  <section id="orders" class="section"><div class="panel"><h2 class="sectionTitle">Penjualan</h2><div id="orderList" class="orderGrid"></div></div></section>
  <section id="users" class="section"><div class="panel tableWrap"><h2 class="sectionTitle">Users</h2><div class="userTools"><button class="btn small lime" type="button" data-user-sort="latest">Terbaru</button><button class="btn small purple" type="button" data-user-sort="transactions">Transaksi Terbanyak</button><button class="btn small yellow" type="button" data-user-sort="spending">Spending Terbanyak</button></div><table class="table userTable"><thead><tr><th>ID</th><th>User</th><th>Transaksi</th><th>Spending</th><th>Aksi</th></tr></thead><tbody id="userList"></tbody></table></div></section>
  <section id="broadcast" class="section">
    <div class="forms broadcastGrid">
      <div class="panel broadcastPanel">
        <h2 class="sectionTitle">Kirim Broadcast</h2>
        <p class="help">Pilih satu jenis broadcast. Kolom yang tidak sesuai tipe akan diabaikan.</p>
        <form id="broadcastForm" class="form">
          <div class="field"><label class="label">Jenis Broadcast</label><select class="select" name="type"><option value="text">Teks</option><option value="photo">Gambar URL / file_id</option><option value="sticker">Stiker file_id</option></select></div>
          <div class="field"><label class="label">Pesan / Caption</label><textarea class="textarea" name="message" placeholder="Contoh: Stok Canva sudah tersedia, cek sekarang."></textarea></div>
          <div class="field"><label class="label">Gambar</label><input class="input" name="photo" placeholder="URL HTTPS atau file_id foto Telegram"></div>
          <div class="field"><label class="label">Stiker</label><input class="input" name="sticker" placeholder="file_id stiker, contoh CAACAg..."></div>
          <button class="btn red" type="submit">Kirim Broadcast</button>
        </form>
      </div>
      <div class="panel pollPanel"><h2 class="sectionTitle">Polling Broadcast</h2><p class="help">Draft dan hasil polling disatukan di halaman Broadcast agar menu utama tidak dobel.</p><div id="pollList"></div></div>
    </div>
  </section>
  <section id="maintenance" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Menu Toko</button>
    <div class="panel orange"><h2 class="sectionTitle">Maintenance Database</h2><p class="help">Bersihkan data lama agar Supabase Free tetap ringan. Pilih target dengan hati-hati. Data yang dihapus tidak bisa dikembalikan kecuali kamu punya backup.</p><div id="maintenanceStats" class="detailGrid"></div></div>
    <div class="panel"><h2 class="sectionTitle">Aksi Bersih Database</h2><form id="maintenanceForm" class="form"><div class="row"><div class="field"><label class="label">Target Pembersihan</label><select class="select" name="target"><option value="pending-expired">Pending order expired</option><option value="pending-old">Pending order lama</option><option value="polls-old">Polling lama + hasilnya</option><option value="poll-answers-old">Detail jawaban polling lama</option><option value="delivered-old">Kosongkan produk terkirim lama</option><option value="users-empty-old">User tanpa transaksi lama</option><option value="vouchers-inactive-expired">Voucher nonaktif / expired</option><option value="transactions-old">Hapus transaksi lama permanen</option></select></div><div class="field"><label class="label">Umur Data Minimal</label><select class="select" name="days"><option value="7">7 hari</option><option value="14">14 hari</option><option value="30" selected>30 hari</option><option value="60">60 hari</option><option value="90">90 hari</option><option value="180">180 hari</option></select></div></div><p class="help"><b>Saran aman:</b> hapus pending order expired, polling lama, dan kosongkan produk terkirim lama. Mulai v36, Total Transaksi dashboard tetap aman walau transaksi lama dibersihkan. Tetap export backup dulu jika ingin menyimpan detail order lama.</p><button class="btn red" type="submit">Jalankan Maintenance</button></form></div>
  </section>

  <section id="backup" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Menu Toko</button>
    <div class="forms">
      <div class="panel cyan"><h2 class="sectionTitle">Backup Data</h2><p class="help">Backup manual akan mengunduh file JSON. Auto backup harian dikirim ke owner sekitar jam 00.00 WIB lewat Vercel Cron.</p><div class="actions"><button class="btn yellow" type="button" id="downloadBackup">Download Backup</button><button class="btn lime" type="button" id="sendBackupTelegram">Kirim Backup ke Telegram</button></div><p class="help">Simpan file backup sebelum maintenance besar atau sebelum pindah bot.</p></div>
      <div class="panel orange"><h2 class="sectionTitle">Import Backup</h2><form id="importBackupForm" class="form"><textarea class="textarea tall" name="backup" placeholder="Paste isi file backup .json di sini"></textarea><label class="switchLabel"><input type="checkbox" name="include_transactions" value="true"><span class="toggleTrack"></span><span>Ikut import transaksi</span></label><p class="help">Default hanya import data operasional seperti user, produk, voucher, setting, promo. Centang transaksi hanya kalau kamu benar-benar ingin mengembalikan riwayat transaksi.</p><button class="btn red" type="submit">Import Backup</button></form></div>
    </div>
    <div class="panel"><h2 class="sectionTitle">Riwayat Backup / Import</h2><div id="backupLogs"></div></div>
  </section>

  <section id="promos" class="section">
    <div class="panel yellow"><h2 class="sectionTitle">Promo & Voucher</h2><p class="help">Menu dibuat ringkas. Gunakan sub menu untuk melihat daftar atau membuat Voucher Manual / Promo Otomatis.</p><div class="promoSubGrid"><button class="promoSubBtn active" type="button" data-promo-sub="list"><span class="ico">📋</span><b>Daftar Promo & Voucher</b><small>Lihat, edit, dan hapus voucher/promo.</small></button><button class="promoSubBtn" type="button" data-promo-sub="create"><span class="ico">➕</span><b>Buat Promo / Voucher</b><small>Tambah promo otomatis atau kode voucher.</small></button></div></div>
    <div class="panel lime hidden" id="promoCreatePanel"><h2 class="sectionTitle">Buat / Edit Promo & Voucher</h2>
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
        <div class="promoTargetBox">
          <div class="promoTargetHead">
            <div><b>Target Promo</b><p class="help">Bisa untuk semua produk, satu produk, atau varian tertentu.</p></div>
            <label class="switchLabel compactSwitch"><input id="promoAllProducts" type="checkbox" checked><span class="toggleTrack"></span><span>Semua Produk</span></label>
          </div>
          <input type="hidden" name="products" id="promoProductsValue" value="">
          <div id="promoTargetBuilder" class="promoTargetBuilder hidden">
            <div class="promoTargetControls">
              <div class="field"><label class="label">Pilih Produk</label><select class="select" id="promoTargetProduct"></select></div>
              <div class="field"><label class="label">Pilih Cakupan</label><select class="select" id="promoTargetVariant"></select></div>
              <button class="btn purple" type="button" id="addPromoTarget">+ Tambah Target</button>
            </div>
            <div id="promoTargetList" class="promoTargetList"></div>
            <p class="help">Memilih “Semua varian” berlaku untuk produk tersebut. Memilih nama varian hanya memberi diskon pada varian itu.</p>
          </div>
        </div>
        <div class="field"><label class="label">Deskripsi / Catatan</label><textarea class="textarea" name="description" placeholder="Contoh: Berlaku minimal 2 item dan tidak dapat digabung voucher lain."></textarea></div>
        <div class="row">
          <div class="field"><label class="label">Mulai Berlaku</label><input class="input" name="start_at" type="datetime-local"></div>
          <div class="field"><label class="label">Berakhir / Expired</label><input class="input" name="end_at" type="datetime-local"></div>
        </div>
        <p class="help"><b>Voucher Manual:</b> user harus memasukkan kode. <b>Promo Otomatis:</b> langsung aktif saat checkout jika syarat cocok. Keduanya bisa dihapus kapan saja.</p>
        <div class="actions"><button class="btn yellow" type="submit">Simpan Promo / Voucher</button><button class="btn lime" type="button" id="resetPromoUnified">Buat Baru</button></div>
      </form>
    </div>
    <div class="panel voucherListPanel" id="promoListPanel"><h2 class="sectionTitle">Daftar Promo & Voucher</h2><p class="help">Daftar voucher manual dan promo otomatis digabung. Lihat label warna untuk membedakan tipe. Semua bisa diedit atau dihapus kapan saja.</p><div id="promoUnifiedList"></div></div>
  </section>
  <section id="deepStats" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Menu Toko</button>
    <div class="panel deepStatsPanel"><h2 class="sectionTitle">Statistik Lengkap</h2><p class="help">Ringkasan status lengkap toko: omset hari ini, omset bulan ini, total omset, rata-rata order, item terjual, conversion estimate, promo aktif, pending order, stok kritis, user terbaik, dan jam ramai.</p><div id="deepStatsBox" class="detailGrid"></div></div>
    <div class="forms"><div class="panel chartPanel"><h2 class="sectionTitle">Stok Hampir Habis</h2><div id="lowStockList"></div></div><div class="panel yellow"><h2 class="sectionTitle">Top User</h2><div id="topUsersList"></div></div></div>
    <div class="panel"><h2 class="sectionTitle">Jam Ramai Order</h2><div id="hourlyStats"></div></div>
  </section>

  <section id="settings" class="section">
    <div class="panel settingsPanel" id="settingsIdentityPanel">
      <div class="sectionToolbar"><div><h2 class="sectionTitle">Pengaturan Toko</h2><p class="help">Identitas, banner marketplace, dan media /start berada di satu formulir agar mudah dikelola.</p></div></div>
      <form id="settingsForm" class="form">
        <div class="field"><label class="label">Nama Toko</label><input class="input" name="store_name" placeholder="Contoh: iLink.in Store"></div>
        <div class="row"><div class="field"><label class="label">Link Customer Service</label><input class="input" name="customer_service_link" placeholder="https://t.me/username_cs atau @username_cs"></div><div class="field"><label class="label">Link Grup</label><input class="input" name="group_link" placeholder="https://t.me/grupkamu atau @grupkamu"></div></div>
        <div class="formDivider"><b>Logo Marketplace</b></div>
        <div class="field"><label class="label">Link Logo</label><div class="linkFieldBox"><div class="linkFieldTitle">Logo Toko</div><input class="input" name="logo_url" placeholder="https://domain.com/logo.png atau link Google Drive"></div><p class="help">Logo tampil pada bagian kiri atas Marketplace.</p></div>
        <div class="formDivider withAction"><b>Banner Promosi Marketplace</b><button class="btn lime small" id="addBannerRow" type="button">+ Tambah</button></div>
        <div id="bannerRows" class="linkRows"></div>
        <input type="hidden" name="banner_items" id="bannerItemsInput"><input type="hidden" name="banner_urls"><input type="hidden" name="banner_url"><input type="hidden" name="store_description" value="">
        <p class="help">Setiap banner memiliki nama dan link sendiri seperti daftar fitur. Gambar disarankan rasio 2,39:1. Maksimal 10 banner dan link Google Drive publik didukung.</p>
        <div class="field"><label class="label">Kecepatan Pergantian Banner</label><input class="input" type="number" name="banner_interval_seconds" min="3" max="15" step="1" value="5"><p class="help">Banner bergeser otomatis ke kiri setiap 3–15 detik.</p></div>
        <div class="formDivider withAction"><b>Flash Sale Marketplace</b><button class="btn lime small" id="addFlashSaleRow" type="button">+ Tambah Produk</button></div>
        <div class="row3"><div class="field"><label class="label">Status Flash Sale</label><select class="select" name="flash_sale_enabled"><option value="false">OFF</option><option value="true">ON</option></select></div><div class="field"><label class="label">Judul</label><input class="input" name="flash_sale_title" placeholder="FLASH SALE" value="FLASH SALE"></div><div class="field"><label class="label">Berakhir Pada</label><input class="input" type="datetime-local" name="flash_sale_end_at"></div></div>
        <div id="flashSaleRows" class="linkRows"></div>
        <input type="hidden" name="flash_sale_products" id="flashSaleProductsInput">
        <div class="flashSaleHint">Pilih maksimal 8 produk. Produk yang memiliki promo aktif akan otomatis menampilkan harga coret, harga promo, dan persentase diskon pada blok Flash Sale.</div>
        <div class="formDivider"><b>Media saat user membuka /start</b></div>
        <div class="row"><div class="field"><label class="label">Jenis Media</label><select class="select" name="start_media_type"><option value="none">Tanpa media</option><option value="photo">Gambar toko</option><option value="sticker">Stiker Telegram</option></select></div><div class="field"><label class="label">URL / File ID</label><input class="input" name="start_media_value" placeholder="URL HTTPS gambar atau file_id stiker"></div></div>
        <div class="field"><label class="label">Caption /start</label><textarea class="textarea" name="start_media_caption" placeholder="Kosongkan untuk menghapus caption."></textarea></div>
        <p class="help">Gambar harus memakai URL HTTPS publik atau file_id Telegram. Stiker menggunakan file_id stiker Telegram.</p>
        <button class="btn lime" type="submit">Simpan Pengaturan</button>
      </form>
    </div>
    <div class="panel storeMenuPanel">
      <h2 class="sectionTitle">Alat Toko</h2><p class="help">Fitur lanjutan dipisahkan dari pengaturan harian.</p>
      <div class="storeSubGrid">
        <button class="storeSubBtn" data-tab="license" data-scroll-target="license" type="button"><span class="ico">🔐</span><b>Lisensi</b><small>Masa aktif dan sisa hari</small></button>
        <button class="storeSubBtn" data-tab="deepStats" data-scroll-target="deepStats" type="button"><span class="ico">📈</span><b>Statistik Lengkap</b><small>Omzet, stok, dan user</small></button>
        <button class="storeSubBtn" data-tab="backup" data-scroll-target="backup" type="button"><span class="ico">💾</span><b>Backup</b><small>Export dan import data</small></button>
        <button class="storeSubBtn" data-tab="maintenance" data-scroll-target="maintenance" type="button"><span class="ico">🧹</span><b>Maintenance</b><small>Bersihkan data lama</small></button>
      </div>
    </div>
  </section>
</div>
<div id="modal" class="modal"><div class="modalBox"><div class="modalHead"><h2 id="modalTitle" class="modalTitle">Modal</h2><button id="modalClose" class="closeBtn">Tutup</button></div><div id="modalBody"></div></div></div>
<div id="toast" class="toast"></div>
<script>
(function(){
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { try { tg.ready(); tg.expand(); } catch(e) {} }
  var initData = tg && tg.initData ? tg.initData : '';
  var state = { stats:{}, products:[], orders:[], users:[], vouchers:[], polls:[], settings:{}, analytics:{}, maintenance:{}, backups:[], promos:[], deepStats:{}, license:{}, promoTargets:[] };
  function rupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];}); }
  function toast(msg, err){ var el=document.getElementById('toast'); el.textContent=msg; el.className='toast'+(err?' error':''); el.style.display='block'; setTimeout(function(){el.style.display='none';},3500); }
  function headers(){ return { 'Content-Type':'application/json','X-Telegram-Init-Data':initData }; }
  async function api(action, body, query){
    var url='/api/reseller-data?action='+encodeURIComponent(action);
    if(query){ Object.keys(query).forEach(function(k){ if(query[k]!==undefined && query[k]!==null && query[k] !== '') url+='&'+encodeURIComponent(k)+'='+encodeURIComponent(query[k]); }); }
    var r=await fetch(url,{method:body?'POST':'GET',headers:headers(),body:body?JSON.stringify(body):undefined});
    var text=await r.text();
    var j=null;
    try{ j=text?JSON.parse(text):{}; }
    catch(e){ throw new Error((text||'Server error').slice(0,160)); }
    if(!r.ok || !j.ok) throw new Error(j.error||('Gagal memuat data '+action));
    return j;
  }
  async function apiSafe(action, fallback, query){
    try{ var r=await api(action, null, query); return r.data===undefined?fallback:r.data; }
    catch(e){ console.warn('MiniApp load optional failed:', action, e.message); return fallback; }
  }
  function formData(form){ var d=Object.fromEntries(new FormData(form).entries()); Object.keys(d).forEach(function(k){ if(d[k]==='') delete d[k]; }); return d; }
  function formDataRaw(form){ return Object.fromEntries(new FormData(form).entries()); }
  function searchQuery(){ var el=document.getElementById('search'); return String((el&&el.value)||'').trim().toLowerCase(); }
  function textMatch(parts,q){ if(!q) return true; return parts.map(function(x){ return String(x==null?'':x).toLowerCase(); }).join(' ').indexOf(q)>=0; }
  function normalizePromoTargetPart(value){ return String(value||'').trim().toUpperCase().replace(/\s+/g,'-'); }
  function normalizePromoTargetToken(value){ var raw=String(value||'').trim(); if(!raw) return ''; var parts=raw.split('::'); var product=normalizePromoTargetPart(parts.shift()); var variant=normalizePromoTargetPart(parts.join('::')); if(!product || product==='SEMUA' || product==='ALL' || product==='-') return ''; return variant ? product+'::'+variant : product; }
  function parsePromoTargets(value){ var rows=Array.isArray(value)?value:String(value||'').split(/[,|\n]+/); var seen={}; return rows.map(normalizePromoTargetToken).filter(function(x){ if(!x||seen[x]) return false; seen[x]=1; return true; }); }
  function promoProductCode(product){ return normalizePromoTargetPart(product&&product.kode); }
  function promoVariantKey(variant,index){ return normalizePromoTargetPart((variant&&(variant.sku||variant.kode||variant.key||variant.name||variant.nama))||('VAR'+(Number(index||0)+1))); }
  function promoTargetParts(token){ var clean=normalizePromoTargetToken(token); var parts=clean.split('::'); return {token:clean,productCode:parts.shift()||'',variantKey:parts.join('::')}; }
  function findPromoProduct(code){ var target=normalizePromoTargetPart(code); return (state.products||[]).find(function(p){return promoProductCode(p)===target;})||null; }
  function promoTargetLabel(token){ var parts=promoTargetParts(token); var product=findPromoProduct(parts.productCode); var productName=product?(product.nama+' ('+parts.productCode+')'):parts.productCode; if(!parts.variantKey) return productName+' — Semua varian'; var vars=productVariants(product); var variant=vars.find(function(v,i){return promoVariantKey(v,i)===parts.variantKey;}); return productName+' — '+(variant?(variant.name||variant.nama||parts.variantKey):parts.variantKey); }
  function refreshPromoTargetProducts(){ var select=document.getElementById('promoTargetProduct'); if(!select) return; var current=select.value; var rows=(state.products||[]).slice().sort(function(a,b){return String(a.nama||'').localeCompare(String(b.nama||''),'id');}); select.innerHTML=rows.map(function(p){return '<option value="'+esc(promoProductCode(p))+'">'+esc(p.nama||p.kode)+' ('+esc(p.kode||'')+')</option>';}).join('')||'<option value="">Belum ada produk</option>'; if(current&&rows.some(function(p){return promoProductCode(p)===current;})) select.value=current; refreshPromoTargetVariants(); }
  function refreshPromoTargetVariants(){ var productSelect=document.getElementById('promoTargetProduct'); var variantSelect=document.getElementById('promoTargetVariant'); if(!variantSelect) return; var product=findPromoProduct(productSelect&&productSelect.value); var vars=productVariants(product); var firstLabel=vars.length?'Semua varian produk':'Produk utama / seluruh produk'; variantSelect.innerHTML='<option value="">'+esc(firstLabel)+'</option>'+vars.map(function(v,i){return '<option value="'+esc(promoVariantKey(v,i))+'">Varian: '+esc(v.name||v.nama||promoVariantKey(v,i))+'</option>';}).join(''); variantSelect.disabled=!product; }
  function syncPromoTargetValue(){ var input=document.getElementById('promoProductsValue'); if(input) input.value=(state.promoTargets||[]).join(','); }
  function renderPromoTargetList(){ var el=document.getElementById('promoTargetList'); if(!el) return; var rows=state.promoTargets||[]; el.innerHTML=rows.length?rows.map(function(token){return '<div class="promoTargetItem"><span>'+esc(promoTargetLabel(token))+'</span><button type="button" data-remove-promo-target="'+esc(token)+'">Hapus</button></div>';}).join(''):'<div class="promoTargetEmpty">Belum ada target dipilih. Tambahkan produk atau aktifkan “Semua Produk”.</div>'; document.querySelectorAll('[data-remove-promo-target]').forEach(function(btn){btn.onclick=function(){ state.promoTargets=(state.promoTargets||[]).filter(function(x){return x!==btn.dataset.removePromoTarget;}); if(!state.promoTargets.length) setPromoTargets([]); else {syncPromoTargetValue();renderPromoTargetList();} };}); }
  function setPromoTargets(value){ state.promoTargets=parsePromoTargets(value); var all=document.getElementById('promoAllProducts'); var builder=document.getElementById('promoTargetBuilder'); if(all) all.checked=state.promoTargets.length===0; if(builder) builder.classList.toggle('hidden',state.promoTargets.length===0); syncPromoTargetValue(); refreshPromoTargetProducts(); renderPromoTargetList(); }
  function togglePromoTargetMode(){ var all=document.getElementById('promoAllProducts'); var builder=document.getElementById('promoTargetBuilder'); if(!all||!builder) return; if(all.checked){ state.promoTargets=[]; builder.classList.add('hidden'); } else { builder.classList.remove('hidden'); refreshPromoTargetProducts(); } syncPromoTargetValue(); renderPromoTargetList(); }
  function addSelectedPromoTarget(){ var productSelect=document.getElementById('promoTargetProduct'); var variantSelect=document.getElementById('promoTargetVariant'); var productCode=normalizePromoTargetPart(productSelect&&productSelect.value); if(!productCode) return toast('Pilih produk target terlebih dahulu',true); var variantKey=normalizePromoTargetPart(variantSelect&&variantSelect.value); var token=productCode+(variantKey?'::'+variantKey:''); var rows=state.promoTargets||[]; if(!variantKey){ rows=rows.filter(function(x){return promoTargetParts(x).productCode!==productCode;}); } else if(rows.indexOf(productCode)>=0){ return toast('Produk ini sudah dipilih untuk semua varian',true); } if(rows.indexOf(token)<0) rows.push(token); state.promoTargets=rows; var all=document.getElementById('promoAllProducts'); if(all) all.checked=false; syncPromoTargetValue(); renderPromoTargetList(); }
  function updateSearchCounter(){ var q=searchQuery(); var el=document.getElementById('productCounter'); if(!el) return; if(!q){ el.textContent='Pencarian berlaku untuk Produk, Penjualan, Users, Promo & Voucher.'; return; } var pc=state.products.filter(function(p){return productMatches(p,q);}).length; var oc=state.orders.filter(function(o){return orderMatches(o,q);}).length; var uc=state.users.filter(function(u){return userMatches(u,q);}).length; var vc=getUnifiedPromoRows().filter(function(x){return promoMatches(x,q);}).length; el.textContent='Hasil: '+pc+' produk · '+oc+' penjualan · '+uc+' user · '+vc+' promo/voucher'; }
  function rupiahShort(n){ n=Number(n||0); if(Math.abs(n)>=1000000000) return 'Rp'+(n/1000000000).toFixed(n%1000000000?1:0).replace('.0','')+'M'; if(Math.abs(n)>=1000000) return 'Rp'+(n/1000000).toFixed(n%1000000?1:0).replace('.0','')+'jt'; if(Math.abs(n)>=1000) return 'Rp'+Math.round(n/1000)+'rb'; return 'Rp'+n; }
  function setPromoSub(mode){ mode=mode||'list'; var list=document.getElementById('promoListPanel'); var create=document.getElementById('promoCreatePanel'); if(list) list.classList.toggle('hidden', mode!=='list'); if(create) create.classList.toggle('hidden', mode!=='create'); document.querySelectorAll('[data-promo-sub]').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.promoSub===mode); }); if(mode==='create' && create) setTimeout(function(){ create.scrollIntoView({behavior:'smooth',block:'start'}); },20); }
  function switchTab(id, opts){ opts=opts||{}; var storeSubTabs={license:1,maintenance:1,backup:1,deepStats:1}; document.querySelectorAll('.tile[data-tab]').forEach(function(x){x.classList.remove('active'); x.setAttribute('aria-selected','false');}); document.querySelectorAll('.section').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('.tile[data-tab="'+id+'"]').forEach(function(x){x.classList.add('active'); x.setAttribute('aria-selected','true');}); if(storeSubTabs[id]){ document.querySelectorAll('.navTiles .tile[data-tab="settings"]').forEach(function(x){x.classList.add('active'); x.setAttribute('aria-selected','true');}); } var section=document.getElementById(id); if(section) section.classList.add('active'); try{ localStorage.setItem('admin_active_tab', id); }catch(e){} var target=document.getElementById(opts.scrollTarget||id)||section; if(opts.smooth && target){ setTimeout(function(){ target.scrollIntoView({behavior:'smooth',block:'start'}); },25); } else { window.scrollTo(0,0); } }
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
  function parseAdminBannerItems(s){
    var rows=[];
    try{ if(s.banner_items){ var x=typeof s.banner_items==='string'?JSON.parse(s.banner_items):s.banner_items; if(Array.isArray(x)) rows=x; } }catch(e){}
    if(!rows.length){ var legacy=String(s.banner_urls||s.banner_url||'').split(/\r?\n|;/).map(function(x){return x.trim();}).filter(Boolean); rows=legacy.map(function(url,i){return {name:'Banner '+(i+1),url:url};}); }
    return rows.slice(0,10).map(function(x,i){ return {name:String((x&&x.name)||('Banner '+(i+1))),url:String((x&&x.url)||x||'')}; });
  }
  function bannerRowHtml(item,index){ item=item||{}; return '<div class="linkRow" data-banner-row><input class="input bannerName" data-banner-name placeholder="Nama banner, contoh: Promo Canva" value="'+esc(item.name||('Banner '+(index+1)))+'"><input class="input bannerUrl" data-banner-url placeholder="https://domain.com/banner.jpg" value="'+esc(item.url||'')+'"><button class="btn red linkRemove" type="button" data-remove-banner>×</button></div>'; }
  function wireBannerRows(){ document.querySelectorAll('[data-remove-banner]').forEach(function(btn){btn.onclick=function(){var rows=document.querySelectorAll('[data-banner-row]');if(rows.length<=1){var row=btn.closest('[data-banner-row]');if(row){row.querySelector('[data-banner-name]').value='Banner 1';row.querySelector('[data-banner-url]').value='';}return;}var row=btn.closest('[data-banner-row]');if(row)row.remove();};}); }
  function renderBannerRows(items){ var box=document.getElementById('bannerRows'); if(!box)return; var rows=(items&&items.length?items:[{name:'Banner 1',url:''}]).slice(0,10); box.innerHTML=rows.map(bannerRowHtml).join(''); wireBannerRows(); }
  function addBannerRow(){ var box=document.getElementById('bannerRows'); if(!box)return; var count=box.querySelectorAll('[data-banner-row]').length; if(count>=10)return toast('Maksimal 10 banner.',true); box.insertAdjacentHTML('beforeend',bannerRowHtml({name:'Banner '+(count+1),url:''},count)); wireBannerRows(); }
  function collectBannerRows(){ return Array.from(document.querySelectorAll('[data-banner-row]')).map(function(row,i){return {name:String(row.querySelector('[data-banner-name]').value||('Banner '+(i+1))).trim(),url:String(row.querySelector('[data-banner-url]').value||'').trim()};}).filter(function(x){return x.url;}).slice(0,10); }
  function parseAdminFlashProducts(s){ var rows=[]; var raw=s&&s.flash_sale_products; try{ if(raw){ var x=typeof raw==='string'?JSON.parse(raw):raw; if(Array.isArray(x)) rows=x; } }catch(e){} if(!rows.length&&raw) rows=String(raw).split(/[\r\n,;|]+/); var seen={}; return rows.map(function(x){return String((x&&typeof x==='object'?(x.code||x.kode||''):x)||'').trim().toUpperCase();}).filter(function(x){if(!x||seen[x])return false;seen[x]=1;return true;}).slice(0,8); }
  function flashProductOptions(selected){ var rows=(state.products||[]).slice().sort(function(a,b){return String(a.nama||'').localeCompare(String(b.nama||''),'id');}); var opts='<option value="">Pilih produk...</option>'; opts+=rows.map(function(p){var code=String(p.kode||'').trim().toUpperCase();return '<option value="'+esc(code)+'" '+(code===selected?'selected':'')+'>'+esc(p.nama||p.kode)+' ('+esc(code)+')</option>';}).join(''); return opts; }
  function flashSaleRowHtml(code){ code=String(code||'').trim().toUpperCase(); return '<div class="linkRow flashProductRow" data-flash-sale-row><select class="select" data-flash-product-code>'+flashProductOptions(code)+'</select><button class="btn red linkRemove" type="button" data-remove-flash-product>×</button></div>'; }
  function wireFlashSaleRows(){ document.querySelectorAll('[data-remove-flash-product]').forEach(function(btn){btn.onclick=function(){var row=btn.closest('[data-flash-sale-row]');if(row)row.remove();};}); }
  function renderFlashSaleRows(items){ var box=document.getElementById('flashSaleRows'); if(!box)return; var rows=(items||[]).slice(0,8); box.innerHTML=rows.map(flashSaleRowHtml).join(''); wireFlashSaleRows(); }
  function addFlashSaleRow(){ var box=document.getElementById('flashSaleRows'); if(!box)return; var count=box.querySelectorAll('[data-flash-sale-row]').length; if(count>=8)return toast('Maksimal 8 produk Flash Sale.',true); box.insertAdjacentHTML('beforeend',flashSaleRowHtml('')); wireFlashSaleRows(); }
  function collectFlashSaleProducts(){ var seen={}; return Array.from(document.querySelectorAll('[data-flash-product-code]')).map(function(el){return String(el.value||'').trim().toUpperCase();}).filter(function(x){if(!x||seen[x])return false;seen[x]=1;return true;}).slice(0,8); }
  function datetimeLocalValue(value){ if(!value)return ''; var text=String(value).trim(); var m=text.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/); if(m)return m[1]; try{var d=new Date(text);if(isNaN(d.getTime()))return '';var pad=function(n){return String(n).padStart(2,'0');};return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());}catch(e){return '';} }
  function renderSettingsForm(){ var s=state.settings||{}; var f=document.getElementById('settingsForm'); if(!f) return; ['store_name','logo_url','customer_service_link','group_link','start_media_type','start_media_value','start_media_caption','banner_interval_seconds','flash_sale_enabled','flash_sale_title'].forEach(function(k){ if(!f[k]) return; var fallback=(k==='start_media_type'?'none':(k==='banner_interval_seconds'?'5':(k==='flash_sale_enabled'?'false':(k==='flash_sale_title'?'FLASH SALE':'')))); f[k].value = s[k] || fallback; }); if(f.flash_sale_end_at) f.flash_sale_end_at.value=datetimeLocalValue(s.flash_sale_end_at); if(f.store_description) f.store_description.value=''; if(f.banner_url) f.banner_url.value=''; renderBannerRows(parseAdminBannerItems(s)); renderFlashSaleRows(parseAdminFlashProducts(s)); }
  function daysLeftText(n){ n=Number(n); if(!isFinite(n)) return '-'; if(n<0) return 'Expired'; if(n===0) return 'Hari ini'; return n+' hari'; }
  function fmtLicenseDate(v){ if(!v) return '-'; try{return new Date(v).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return String(v);} }
  function renderLicense(){ var l=state.license||{}; var box=document.getElementById('licenseBox'); if(!box) return; var status=(l.enabled===false)?'Belum diaktifkan':(l.active?'Aktif':(l.status||'Tidak aktif')); var rows=[['Status',status],['Kode Aktivasi',l.license_code||l.code||'-'],['Bot','@'+(l.bot_username||'-')],['Paket',l.plan_name||'-'],['Masa Aktif Sampai',fmtLicenseDate(l.expires_at)],['Sisa Durasi',daysLeftText(l.days_left)],['Catatan',l.reason||'-']]; box.innerHTML=rows.map(function(r){return '<div class="detailItem"><b>'+esc(r[0])+'</b><br><span style="font-size:18px">'+esc(r[1])+'</span></div>';}).join(''); }

  function renderStats(){ var s=state.stats||{}; var daily=(state.analytics&&state.analytics.daily)||[]; var today=(state.analytics&&state.analytics.today_revenue!==undefined)?state.analytics.today_revenue:(daily.length?daily[daily.length-1].revenue:0); var items=[['Omset Hari Ini',rupiah(today)],['Order',s.orders||0],['Produk',s.products||0],['Stok',s.stokTersedia||0]]; document.getElementById('stats').innerHTML=items.map(function(x){return '<div class="stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join(''); }
  function renderCharts(){ var a=state.analytics||{}; var list=a.daily||[]; var max=Math.max.apply(null,list.map(function(d){return Number(d.revenue||0);}).concat([1])); var chart=document.getElementById('revenueChart'); if(chart){ chart.innerHTML=list.map(function(d){var chartHeight=Math.max(150,(chart.clientHeight||300)-128); var h=Math.max(8,Math.round((Number(d.revenue||0)/max)*chartHeight)); return '<div class="barBox"><div class="bar" title="'+esc(d.label)+' - '+rupiah(d.revenue)+'" style="height:'+h+'px"></div><div class="barLabel">'+esc(d.label)+'<br>'+esc(rupiahShort(d.revenue))+'</div></div>';}).join('')||'<div class="empty">Belum ada data.</div>'; } document.getElementById('topProductList').innerHTML=(a.top_products||[]).map(function(p,i){return '<div class="voucher"><b>'+(i+1)+'. '+esc(p.name)+(p.variant?' - '+esc(p.variant):'')+'</b><br>Qty '+esc(p.quantity)+' | Omzet '+rupiah(p.revenue)+'</div>';}).join('')||'<div class="empty">Belum ada data penjualan.</div>'; }
  function productMatches(p,q){ var vars=productVariants(p).map(function(v){return [v.name||v.nama,v.sku||v.kode,v.description||v.deskripsi,v.snk||v.terms].join(' ');}).join(' '); return textMatch([p.nama,p.kode,p.category,p.deskripsi,p.snk,vars],q); }
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
  function renderProducts(){ var q=searchQuery(); var rows=state.products.filter(function(p){return productMatches(p,q);}); updateSearchCounter(); document.getElementById('productList').innerHTML=rows.map(function(p){ var varsArr=productVariants(p); var bulk=productBulkChips(p); var vars=varsArr.slice(0,3).map(function(v){return '<span class="chip '+(variantActive(v)?'purple':'red')+'">'+esc(v.name||v.nama)+' '+rupiah(v.price||v.harga||p.harga)+' • '+variantStock(v).length+' stok • '+(variantActive(v)?'ON':'OFF')+'</span>';}).join(''); return '<article class="product '+(p.active===false?'productOff':'')+'">'+
      '<div class="productTop">'+productMediaHtml(p)+'<div class="productInfo"><h3>'+esc(p.nama)+'</h3><div class="subtle">'+esc(p.category||'Produk')+' - STOK '+stockCount(p)+(varsArr.length?' - '+varsArr.length+' varian':'')+'<br><span class="scopeBadge '+(p.display_scope==='marketplace'?'market':'')+'">'+(p.display_scope==='marketplace'?'MARKETPLACE SAJA':'BOT + MARKETPLACE')+'</span></div></div><button class="statusToggle '+(p.active===false?'off':'')+'" data-toggle-product="'+esc(p.kode)+'">'+(p.active===false?'OFF':'ON')+'</button></div>'+ 
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
      '<div class="row"><div class="field"><label class="label">Link Gambar Produk</label><div class="linkFieldBox"><div class="linkFieldTitle">Gambar Produk</div><input class="input" name="image_url" placeholder="https://domain.com/produk.jpg atau Google Drive" value="'+esc(p.image_url||'')+'"></div></div><div class="field"><label class="label">Tampilkan Produk Di</label><select class="select" name="display_scope"><option value="both" '+(p.display_scope!=='marketplace'?'selected':'')+'>Bot Telegram + Marketplace</option><option value="marketplace" '+(p.display_scope==='marketplace'?'selected':'')+'>Marketplace saja</option></select></div></div>'+ 
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
  function orderMatches(o,q){ return textMatch([o.order_ref,o.product_name,o.variant_name,o.username,o.telegram_id,o.total_price,o.quantity,o.created_at,orderProductText(o)],q); }
  function renderOrders(){
    var q=searchQuery(); var rows=state.orders.filter(function(o){return orderMatches(o,q);}); updateSearchCounter();
    document.getElementById('orderList').innerHTML=rows.map(function(o){
      var user=o.username?'@'+esc(o.username):esc(o.telegram_id);
      var ref=esc(o.order_ref||('INV-'+String(o.created_at||'').replace(/[^0-9]/g,'').slice(-10)));
      var name=esc(o.product_name)+(o.variant_name?' <span class="chip yellow">'+esc(o.variant_name)+'</span>':'');
      return '<article class="orderCard"><div class="orderRef">'+ref+'</div><b class="orderTitle">'+name+'</b><span class="statusDone">COMPLETED</span><div class="orderMeta">×'+esc(o.quantity||1)+' · <b>'+rupiah(o.total_price)+'</b><br>💰 Earning: <b style="color:#00877a">'+rupiah(o.total_price)+'</b><br>👤 '+user+'<br>🗓 '+new Date(o.created_at).toLocaleString('id-ID')+'</div><button class="btn small purple" type="button" data-order-products="'+ref+'">Lihat Produk</button></article>';
    }).join('')||'<div class="empty">Belum ada order.</div>';
    document.querySelectorAll('[data-order-products]').forEach(function(btn){btn.onclick=function(){openOrderProducts(btn.dataset.orderProducts);};});
  }
  function userMatches(u,q){ return textMatch([u.telegram_id,u.username,u.first_name,u.transaction_count,u.spending],q); }
  function renderUsers(sortMode){ if(sortMode) state.userSort=sortMode; var q=searchQuery(); var rows=state.users.filter(function(u){return userMatches(u,q);}); updateSearchCounter(); if(state.userSort==='transactions') rows.sort(function(a,b){return Number(b.transaction_count||0)-Number(a.transaction_count||0);}); else if(state.userSort==='spending') rows.sort(function(a,b){return Number(b.spending||0)-Number(a.spending||0);}); document.getElementById('userList').innerHTML=rows.map(function(u){return '<tr><td data-label="ID">'+esc(u.telegram_id)+'</td><td data-label="User">'+(u.username?'@'+esc(u.username):esc(u.first_name||'-'))+'</td><td data-label="Transaksi">'+esc(u.transaction_count||0)+'</td><td data-label="Spending">'+rupiah(u.spending||0)+'</td><td data-label="Aksi"><button class="btn small red" data-del-user="'+esc(u.telegram_id)+'">Hapus</button></td></tr>';}).join('')||'<tr class="userEmptyRow"><td colspan="5">Belum ada user.</td></tr>'; document.querySelectorAll('[data-del-user]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus user '+btn.dataset.delUser+'?')) await post('delete-user',{telegram_id:btn.dataset.delUser});};}); document.querySelectorAll('[data-user-sort]').forEach(function(btn){btn.onclick=function(){ renderUsers(btn.dataset.userSort); };}); }
  function promoUnifiedReset(){
    var f=document.getElementById('promoUnifiedForm'); if(!f) return;
    f.reset(); f.current_code.value=''; setPromoTargets([]);
    var btn=f.querySelector('button[type="submit"]'); if(btn) btn.textContent='Simpan Promo / Voucher'; setPromoSub('create');
  }
  function fillPromoUnified(type, item){
    var f=document.getElementById('promoUnifiedForm'); if(!f || !item) return;
    switchTab('promos');
    setPromoSub('create');
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
    setPromoTargets(item.products||[]);
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
  function promoStatus(x,type){
    x=x||{};
    var now=Date.now();
    var end=x.end_at||x.expires_at||'';
    var endTime=end?new Date(end).getTime():NaN;
    var startTime=x.start_at?new Date(x.start_at).getTime():NaN;
    var expired=x.is_expired===true || (!isNaN(endTime) && endTime<=now);
    var scheduled=x.is_scheduled===true || (!isNaN(startTime) && startTime>now);
    var used=type==='auto'?Number(x.used_count||0):((x.used_by&&x.used_by.length)||0);
    var limit=Number(x.usage_limit||0);
    var limitReached=x.limit_reached===true || (limit>0 && used>=limit);
    var configured=x.active!==false;
    // Hitung ulang terhadap jam browser agar status berubah OFF saat halaman tetap terbuka melewati waktu expired.
    var on=configured&&!expired&&!scheduled&&!limitReached;
    if(x.effective_active===false) on=false;
    var reason=expired?'EXPIRED':(scheduled?'TERJADWAL':(limitReached?'LIMIT HABIS':(!configured?'NONAKTIF':(!on?'TIDAK AKTIF':''))));
    return {on:on,expired:expired,scheduled:scheduled,limitReached:limitReached,reason:reason,used:used,limit:limit};
  }
  function promoDateText(value){ if(!value) return ''; var d=new Date(value); if(isNaN(d.getTime())) return String(value); return d.toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}); }
  function getUnifiedPromoRows(){ var vouchers=(state.vouchers||[]).map(function(v){return {type:'voucher',label:'Voucher Manual',row:v};}); var promos=(state.promos||[]).map(function(p){return {type:'auto',label:'Promo Otomatis',row:p};}); return vouchers.concat(promos).sort(function(a,b){return String(b.row.updated_at||b.row.created_at||'').localeCompare(String(a.row.updated_at||a.row.created_at||''));}); }
  function promoMatches(item,q){ var x=(item&&item.row)||{}; var st=promoStatus(x,item&&item.type); return textMatch([item&&item.label,x.code,x.name,x.description,x.discount_type,x.discount_value,x.min_qty,x.min_spend,x.usage_limit,(x.products||[]).join(' '),st.on?'on':'off',st.reason],q); }
  function renderUnifiedPromos(){
    var el=document.getElementById('promoUnifiedList'); if(!el) return;
    var q=searchQuery(); var rows=getUnifiedPromoRows().filter(function(item){return promoMatches(item,q);}); updateSearchCounter();
    el.innerHTML=rows.map(function(item){
      var x=item.row; var st=promoStatus(x,item.type);
      var target=(x.products&&x.products.length)?x.products.map(promoTargetLabel).join(', '):'Semua produk';
      var min='Min '+(x.min_qty||1)+' pcs / '+rupiah(x.min_spend||0);
      var limit=(x.usage_limit?x.usage_limit:'∞');
      var end=x.end_at||x.expires_at||'';
      var statusHtml=st.on?'<span class="chip green">ON</span>':'<span class="chip red">OFF</span>';
      if(!st.on&&st.reason) statusHtml+=' <span class="chip orange">'+esc(st.reason)+'</span>';
      return '<div class="voucherCard '+(item.type==='voucher'?'voucherManual':'promoAuto')+'"><div class="rowBetween"><div><span class="voucherCode">'+esc(x.code)+'</span> <span class="chip '+(item.type==='voucher'?'purple':'yellow')+'">'+esc(item.label)+'</span> '+statusHtml+'</div><div class="actions"><button class="btn small cyan" data-edit-unified="'+esc(item.type)+'|'+esc(x.code)+'">Edit</button><button class="btn small red" data-delete-unified="'+esc(item.type)+'|'+esc(x.code)+'">Hapus</button></div></div><div class="voucherMeta"><span class="chip yellow">Diskon '+esc(unifiedDiscountText(x))+'</span><span class="chip purple">'+esc(min)+'</span><span class="chip green">Target '+esc(target)+'</span><span class="chip orange">Dipakai '+esc(st.used)+'/'+esc(limit)+'</span></div><p class="help">'+esc(x.name||x.description||'Tanpa deskripsi')+(x.description&&x.name?' — '+esc(x.description):'')+'</p>'+(x.start_at||end?'<small>Berlaku: '+esc(promoDateText(x.start_at)||'sekarang')+' s/d '+esc(promoDateText(end)||'tanpa batas')+'</small>':'')+'</div>';
    }).join('')||'<div class="empty">Belum ada promo atau voucher.</div>';
    document.querySelectorAll('[data-edit-unified]').forEach(function(btn){btn.onclick=function(){ var parts=btn.dataset.editUnified.split('|'); var type=parts[0]; var code=parts.slice(1).join('|'); var item=(type==='voucher'?state.vouchers:state.promos).find(function(x){return String(x.code).toUpperCase()===String(code).toUpperCase();}); fillPromoUnified(type,item); };});
    document.querySelectorAll('[data-delete-unified]').forEach(function(btn){btn.onclick=async function(){ var parts=btn.dataset.deleteUnified.split('|'); var type=parts[0]; var code=parts.slice(1).join('|'); if(!confirm('Hapus '+(type==='voucher'?'voucher':'promo')+' '+code+'?')) return; await post(type==='voucher'?'delete-voucher':'promo-delete', type==='voucher'?{kode:code}:{code:code}); };});
  }

  function renderVouchers(){ renderUnifiedPromos(); }

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

  function renderMaintenance(){
    var m=state.maintenance||{};
    var el=document.getElementById('maintenanceStats'); if(!el) return;
    var rows=[
      ['Pending Order', m.pending_orders||0, 'Expired: '+(m.pending_orders_expired||0)+' | >7 hari: '+(m.pending_orders_old_7d||0)],
      ['Transaksi', m.transactions||0, '>90 hari: '+(m.transactions_old_90d||0)],
      ['Produk Terkirim Lama', m.delivered_items_old_90d||0, 'Bisa dikosongkan tanpa menghapus invoice'],
      ['Polling', m.broadcast_polls||0, '>30 hari: '+(m.broadcast_polls_old_30d||0)],
      ['Jawaban Polling', m.broadcast_poll_answers||0, 'Detail voter polling'],
      ['Users', m.bot_users||0, 'Kosong lama: '+(m.bot_users_empty_old_30d||0)],
      ['Voucher Nonaktif/Expired', m.vouchers_inactive_or_expired||0, 'Aman dibersihkan jika tidak dipakai']
    ];
    el.innerHTML=rows.map(function(r){return '<div class="detailItem"><b>'+esc(r[0])+'</b><br><span style="font-size:22px">'+esc(r[1])+'</span><br><small>'+esc(r[2])+'</small></div>';}).join('');
  }


  function renderBackup(){
    var el=document.getElementById('backupLogs'); if(!el) return;
    el.innerHTML=(state.backups||[]).map(function(b){return '<div class="voucher"><b>'+esc(b.type||'-')+'</b> <span class="chip '+(b.status==='failed'?'red':'green')+'">'+esc(b.status||'-')+'</span><br>File: '+esc(b.filename||'-')+'<br>Ukuran: '+esc(b.size_bytes||0)+' bytes<br><small>'+esc(b.created_at||'')+'</small><p class="help">'+esc(b.note||'')+'</p></div>';}).join('')||'<div class="empty">Belum ada log backup.</div>';
  }
  function renderPromos(){ renderUnifiedPromos(); }
  function renderDeepStats(){
    var d=state.deepStats||{};
    var box=document.getElementById('deepStatsBox'); if(box){ var rows=[['Omset Hari Ini',rupiah(d.revenue_today)],['Omset Bulan Ini',rupiah(d.revenue_month)],['Total Omset Semua Waktu',rupiah(d.revenue_total)],['Rata-rata Nilai Order',rupiah(d.average_order_value)],['Total Item Terjual',d.quantity_sold||0],['Estimasi Checkout Berhasil',(d.conversion_rate||0)+'%'],['Promo Otomatis Aktif',d.active_promos||0],['Pending Order Aktif',d.pending_orders||0]]; box.innerHTML=rows.map(function(r){return '<div class="detailItem"><b>'+esc(r[0])+'</b><br><span style="font-size:22px">'+esc(r[1])+'</span></div>';}).join(''); }
    var low=document.getElementById('lowStockList'); if(low){ low.innerHTML=(d.low_stock||[]).map(function(p){return '<div class="voucher"><b>'+esc(p.name)+'</b><br><span class="chip red">Stok '+esc(p.stock)+'</span></div>';}).join('')||'<div class="empty">Tidak ada stok kritis.</div>'; }
    var tu=document.getElementById('topUsersList'); if(tu){ tu.innerHTML=(d.top_users||[]).map(function(u,i){return '<div class="voucher"><b>'+(i+1)+'. '+(u.username?'@'+esc(u.username):esc(u.first_name||u.telegram_id))+'</b><br>Transaksi '+esc(u.transaction_count||0)+' | Spending '+rupiah(u.spending||0)+'</div>';}).join('')||'<div class="empty">Belum ada user.</div>'; }
    var hr=document.getElementById('hourlyStats'); if(hr){ hr.innerHTML=(d.hourly||[]).filter(function(x){return x.orders>0;}).map(function(x){return '<span class="chip yellow">'+String(x.hour).padStart(2,'0')+'.00: '+x.orders+' order / '+rupiah(x.revenue)+'</span>';}).join(' ')||'<div class="empty">Belum ada data jam ramai.</div>'; }
  }

  async function load(){
    try{
      var all=await Promise.all([
        apiSafe('license-status',{}), apiSafe('stats',{}), apiSafe('products',[]), apiSafe('orders',[]), apiSafe('users',[]), apiSafe('vouchers',[]), apiSafe('settings',{}), apiSafe('analytics',{}), apiSafe('polls',[]), apiSafe('maintenance-stats',{}), apiSafe('backup-logs',[]), apiSafe('promos',[]), apiSafe('deep-stats',{})
      ]);
      state.license=all[0]||{}; state.stats=all[1]||{}; state.products=all[2]||[]; state.orders=all[3]||[]; state.users=all[4]||[]; state.vouchers=all[5]||[]; state.settings=all[6]||{}; state.analytics=all[7]||{}; state.polls=all[8]||[]; state.maintenance=all[9]||{}; state.backups=all[10]||[]; state.promos=all[11]||[]; state.deepStats=all[12]||{}; refreshPromoTargetProducts();
      renderHeader(); renderLicense(); renderStats(); renderCharts(); renderProducts(); renderOrders(); renderUsers(); renderVouchers(); renderPolls(); renderMaintenance(); renderBackup(); renderPromos(); renderDeepStats(); updateSearchCounter();
    }catch(e){ toast(e.message,true); renderLicense(); renderStats(); renderProducts(); renderMaintenance(); }
  }
  async function post(action,data){ try{ var r=await api(action,data); toast('Berhasil diproses'); await load(); return r; }catch(e){ toast(e.message,true); throw e; } }
  document.querySelectorAll('[data-tab]').forEach(function(btn){btn.onclick=function(){ switchTab(btn.dataset.tab,{smooth:btn.classList.contains('storeSubBtn'),scrollTarget:btn.dataset.scrollTarget}); };});
  var refreshLicense=document.getElementById('refreshLicense'); if(refreshLicense) refreshLicense.onclick=async function(){ state.license=await apiSafe('license-status',{}); renderLicense(); toast('Status lisensi diperbarui'); }; try{ var lastTab=localStorage.getItem('admin_active_tab'); if(lastTab==='vouchers') lastTab='promos'; if(lastTab && document.getElementById(lastTab)) switchTab(lastTab); }catch(e){}
  document.getElementById('search').oninput=function(){ renderProducts(); renderOrders(); renderUsers(); renderUnifiedPromos(); };
  document.querySelectorAll('[data-promo-sub]').forEach(function(btn){btn.onclick=function(){ if(btn.dataset.promoSub==='create') promoUnifiedReset(); else setPromoSub('list'); };});
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
  var addBannerRowBtn=document.getElementById('addBannerRow'); if(addBannerRowBtn) addBannerRowBtn.onclick=addBannerRow;
  var addFlashSaleRowBtn=document.getElementById('addFlashSaleRow'); if(addFlashSaleRowBtn) addFlashSaleRowBtn.onclick=addFlashSaleRow;
  document.getElementById('settingsForm').onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(e.target); var banners=collectBannerRows(); var flashProducts=collectFlashSaleProducts(); d.store_description=''; d.banner_items=JSON.stringify(banners); d.banner_urls=banners.map(function(x){return x.url;}).join('\n'); d.banner_url=banners.length?banners[0].url:''; d.banner_interval_seconds=Math.max(3,Math.min(15,Number(d.banner_interval_seconds||5))); d.flash_sale_products=JSON.stringify(flashProducts); if(String(d.flash_sale_enabled)==='true' && (!d.flash_sale_end_at || !flashProducts.length)) return toast('Flash Sale ON membutuhkan waktu berakhir dan minimal satu produk.',true); await post('save-settings',d);};
  document.getElementById('broadcastForm').onsubmit=async function(e){
    e.preventDefault();
    var d=formDataRaw(e.target);
    if(d.type==='photo' && !String(d.photo||'').trim()) return toast('URL/file_id gambar wajib diisi untuk broadcast gambar', true);
    if(d.type==='sticker' && !String(d.sticker||'').trim()) return toast('File ID stiker wajib diisi untuk broadcast stiker', true);
    if(d.type==='text' && !String(d.message||'').trim()) return toast('Pesan teks wajib diisi', true);
    d.request_id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():('bc-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    var btn=e.target.querySelector('button[type="submit"]'); if(btn&&btn.disabled) return; if(btn){btn.disabled=true;btn.textContent='Mengirim...';}
    try{ var r=await post('broadcast',d); if(r.data){ var extra=(r.data.errors&&r.data.errors.length)?' | Error: '+r.data.errors[0]:''; toast('Broadcast terkirim '+r.data.sent+', gagal '+r.data.failed+extra, r.data.failed>0); } }
    finally{ if(btn){btn.disabled=false;btn.textContent='Kirim Broadcast';} }
  };

  var downloadBackup=document.getElementById('downloadBackup'); if(downloadBackup) downloadBackup.onclick=async function(){ var r=await api('backup-export'); var text=JSON.stringify(r.data,null,2); var blob=new Blob([text],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup-bot-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); toast('Backup berhasil diunduh'); await load(); };
  var sendBackupTelegram=document.getElementById('sendBackupTelegram'); if(sendBackupTelegram) sendBackupTelegram.onclick=async function(){ await post('backup-send',{}); toast('Backup dikirim ke Telegram owner'); };
  var importBackupForm=document.getElementById('importBackupForm'); if(importBackupForm) importBackupForm.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(e.target); if(!String(d.backup||'').trim()) return toast('Paste isi backup JSON dulu', true); if(confirm('Import backup sekarang? Data dengan kode/ID sama akan ditimpa.')){ await post('backup-import',{backup:d.backup,include_transactions:!!d.include_transactions}); e.target.reset(); }};
  var promoUnifiedForm=document.getElementById('promoUnifiedForm'); if(promoUnifiedForm) promoUnifiedForm.onsubmit=async function(e){ e.preventDefault(); var all=document.getElementById('promoAllProducts'); if(all&&!all.checked&&!(state.promoTargets||[]).length) return toast('Tambahkan minimal satu produk atau varian target',true); syncPromoTargetValue(); var d=formDataRaw(e.target); var isAuto=d.promo_kind==='auto'; var payload={ code:d.code, kode:d.code, current_code:d.current_code, name:d.name||d.code, discount_type:d.discount_type, discount_value:d.discount_value, potongan:d.discount_value, produk:d.products, products:d.products, min_qty:d.min_qty||1, min_spend:d.min_spend||0, usage_limit:d.usage_limit, limit:d.usage_limit, description:d.description, active:d.active, start_at:d.start_at||null, end_at:d.end_at||null, expires_at:d.end_at||null }; if(isAuto){ await post('promo-save',payload); } else { await post(d.current_code?'edit-voucher':'add-voucher',payload); } promoUnifiedReset(); setPromoSub('list'); };
  var resetPromoUnified=document.getElementById('resetPromoUnified'); if(resetPromoUnified) resetPromoUnified.onclick=promoUnifiedReset;
  var promoAllProducts=document.getElementById('promoAllProducts'); if(promoAllProducts) promoAllProducts.onchange=togglePromoTargetMode;
  var promoTargetProduct=document.getElementById('promoTargetProduct'); if(promoTargetProduct) promoTargetProduct.onchange=refreshPromoTargetVariants;
  var addPromoTarget=document.getElementById('addPromoTarget'); if(addPromoTarget) addPromoTarget.onclick=addSelectedPromoTarget;

  var maintenanceForm=document.getElementById('maintenanceForm'); if(maintenanceForm) maintenanceForm.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(e.target); var label=e.target.target.options[e.target.target.selectedIndex].text; var days=d.days||30; var warn='Jalankan maintenance: '+label+'?\n\nUmur data minimal: '+days+' hari.\nData yang dihapus tidak bisa dikembalikan.'; if(d.target==='transactions-old') warn='PERINGATAN: ini akan menghapus detail transaksi lama permanen. Total Transaksi dashboard tetap tersimpan, tapi detail order lama hilang. Pastikan sudah backup/export.\n\n'+warn; if(confirm(warn)){ var r=await post('maintenance-cleanup',d); if(r.data) toast((r.data.message||'Maintenance selesai')+' Terproses: '+(r.data.affected||0)); } };
  load();
  setInterval(function(){ if(document.getElementById('promos')&&document.getElementById('promos').classList.contains('active')) renderUnifiedPromos(); },30000);
})();
</script>
</body>
</html>`);
};
