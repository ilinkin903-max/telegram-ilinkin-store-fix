module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(String.raw`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Dashboard Owner — Link Auto Order</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    :root{--bg:#fff0d8;--paper:#fff;--ink:#050505;--muted:#646464;--pink:#e83f9b;--cyan:#12b8ce;--lime:#83d904;--yellow:#ffe04b;--purple:#8557e8;--red:#ef3e45;--orange:#ff9f1c;--line:3px solid #050505;--shadow:6px 6px 0 #050505;--soft:3px 3px 0 #050505;--radius:8px}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 20% 0,#fff9d8 0,#fff0d8 35%,#ffe1b8 100%);color:var(--ink);font-family:Inter,Arial,system-ui,sans-serif;font-weight:900;overflow-x:hidden}.wrap{max-width:1220px;margin:auto;padding:20px 16px 80px}.hero{position:relative;overflow:hidden;background:var(--pink);color:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:22px 24px;margin:8px 0 18px}.hero:after{content:"";position:absolute;inset:0;background-image:var(--hero-bg,none);background-size:cover;background-position:center;opacity:.18;filter:saturate(1.1) contrast(1.05);z-index:0;pointer-events:none}.hero:before{content:"";position:absolute;right:-18px;top:-18px;width:150px;height:150px;background:repeating-linear-gradient(45deg,rgba(0,0,0,.22) 0 3px,transparent 3px 12px);z-index:1}.hero>*{position:relative;z-index:2}.badge{position:absolute;right:22px;top:22px;background:var(--yellow);color:#000;border:var(--line);box-shadow:var(--soft);border-radius:6px;padding:7px 14px;font-size:13px}.eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:.08em}.hero h1{font-size:34px;line-height:1;margin:10px 0 6px}.storeline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.storeline.byline{font-size:12px;opacity:.96;text-transform:uppercase;letter-spacing:.03em}.storeline.byline span{font-size:12px}.storeline button{border:0;background:transparent;color:#fff;text-decoration:underline;font-weight:1000;cursor:pointer}.tier{font-size:13px;text-transform:uppercase;margin-top:8px}.statsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px;max-width:900px}.stat{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:10px 12px;color:#000;min-height:66px;display:flex;flex-direction:column;justify-content:center}.stat:nth-child(1){background:var(--cyan)}.stat:nth-child(2){background:var(--yellow)}.stat:nth-child(3){background:var(--lime)}.stat:nth-child(4){background:#fff;color:#000}.stat small{display:block;text-transform:uppercase;font-size:10px}.stat b{display:block;font-size:clamp(18px,4.5vw,22px);margin-top:7px;line-height:1.05}.search{width:100%;border:var(--line);border-radius:var(--radius);padding:14px 16px;background:#fff;box-shadow:var(--soft);font-weight:900;font-size:15px;margin-bottom:10px}.count{font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.35}.navTiles{display:flex;flex-wrap:nowrap;gap:10px;margin:14px 0 18px;background:var(--purple);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:10px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity}.navTiles::-webkit-scrollbar{height:7px}.navTiles::-webkit-scrollbar-thumb{background:#000;border-radius:99px}.tile{background:var(--lime);border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:13px 12px;text-align:center;min-height:70px;min-width:106px;flex:0 0 auto;scroll-snap-align:start;cursor:pointer;text-transform:uppercase;font-weight:1000}.tile.active{background:var(--yellow);color:#000}.tile .ico{font-size:18px;display:block;margin-bottom:6px}.section{display:none;min-width:0;max-width:100%}.section.active{display:block}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.panel,.product,.miniCard{background:var(--paper);border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px;min-width:0;max-width:100%;overflow-wrap:anywhere}.panel{margin-bottom:18px}.chartPanel{background:#5dc8ff}.addPanel{background:var(--lime)}.sectionTitle{margin:0 0 12px;font-size:23px}.subtle{color:var(--muted);font-size:13px}.product{min-height:260px;display:flex;flex-direction:column;gap:8px}.productTop{display:flex;gap:12px}.productImg{width:72px;height:72px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.productFallback{width:72px;height:72px;border:var(--line);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:1000;color:#000;text-transform:uppercase}::placeholder{color:#777;opacity:.55}.product h3{font-size:18px;margin:0;line-height:1.2}.approved{margin-left:auto;align-self:flex-start;background:var(--lime);border:var(--line);border-radius:5px;padding:5px 8px;font-size:10px}.price{font-size:28px;margin-top:3px}.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:2px solid #000;border-radius:5px;background:#fff;padding:4px 7px;font-size:11px}.chip.green{background:var(--lime)}.chip.yellow{background:var(--yellow)}.chip.purple{background:var(--purple);color:#fff}.actions{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:auto}.btn{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px 14px;background:#fff;color:#000;font-weight:1000;cursor:pointer;text-align:center;text-transform:uppercase}.btn:active{transform:translate(3px,3px);box-shadow:0 0 0 #000}.btn.small{font-size:12px;padding:9px 8px}.cyan{background:var(--cyan)}.lime{background:var(--lime)}.pink{background:var(--pink);color:#fff}.yellow{background:var(--yellow)}.purple{background:var(--purple);color:#fff}.red{background:var(--red);color:#fff}.orange{background:var(--orange)}.forms{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;min-width:0;max-width:100%}.dashboardGrid{grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);align-items:start}.dashboardGrid .panel{width:100%;overflow:hidden}.dashboardGrid #topProductList{display:grid;gap:10px;min-width:0}.dashboardGrid .voucher{margin:0;max-width:100%;overflow-wrap:anywhere}.row{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.row3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.row4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.input,.textarea,.select{width:100%;border:var(--line);border-radius:var(--radius);background:#fff;padding:12px;font-weight:900;font-size:14px}.textarea{min-height:105px;resize:vertical}.textarea.tall{min-height:170px}.label{font-size:12px;text-transform:uppercase;margin:4px 0 6px;display:block}.help{font-size:12px;color:var(--muted);line-height:1.4}.tableWrap{overflow:auto}.table{width:100%;border-collapse:collapse}.table th,.table td{border:var(--line);padding:10px;background:#fff;text-align:left;vertical-align:top}.table th{background:var(--yellow);text-transform:uppercase}.voucher{border:var(--line);box-shadow:var(--soft);background:#fff;border-radius:var(--radius);padding:12px;margin:0 0 10px}.chart{width:100%;max-width:100%;min-width:0;height:clamp(230px,34vw,340px);border:var(--line);border-radius:var(--radius);display:grid;grid-template-columns:repeat(7,minmax(0,1fr));align-items:end;gap:clamp(4px,1vw,10px);padding:clamp(8px,1.6vw,14px);background:#5dc8ff;overflow:hidden}.barBox{min-width:0;max-width:100%;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:6px}.bar{width:min(42px,70%);border:2px solid #000;border-bottom-width:4px;background:var(--pink);min-height:8px}.barBox:nth-child(2n) .bar{background:var(--cyan)}.barBox:nth-child(3n) .bar{background:var(--yellow)}.barLabel{font-size:clamp(9px,2.2vw,11px);text-align:center;line-height:1.15;word-break:keep-all;max-width:76px;color:#000}.toast{position:fixed;left:16px;right:16px;bottom:16px;z-index:120;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);background:var(--lime);padding:14px;display:none}.toast.error{background:var(--red);color:#fff}.preview{width:100%;max-height:180px;object-fit:cover;border:var(--line);border-radius:var(--radius);background:#eee}.empty{padding:22px;border:var(--line);border-radius:var(--radius);background:#fff;text-align:center;color:var(--muted)}.modal{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:400;display:none;align-items:flex-start;justify-content:center;padding:22px 12px;overflow:auto}.modal.show{display:flex}.modalBox{width:min(920px,100%);background:#fff;border:var(--line);box-shadow:10px 10px 0 #000;border-radius:var(--radius);padding:16px}.modalHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.modalTitle{font-size:22px;margin:0}.closeBtn{border:var(--line);box-shadow:var(--soft);background:var(--red);color:#fff;border-radius:6px;font-weight:1000;padding:8px 12px;cursor:pointer}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detailItem{border:2px solid #000;background:#f8f8f8;border-radius:6px;padding:9px;font-size:13px;white-space:pre-wrap}.variantList{display:grid;gap:10px;margin:12px 0}.variantCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;background:#fff}.variantCard h3{margin:0 0 6px;font-size:17px}.ghost{opacity:.58;color:#666;font-size:12px;line-height:1.4;margin-top:6px}.field{display:flex;flex-direction:column;gap:6px}.switchBox{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;margin:10px 0}.switchLabel{display:flex;align-items:center;gap:10px;font-size:14px;text-transform:uppercase;cursor:pointer}.switchLabel input{display:none}.toggleTrack{position:relative;width:54px;height:28px;border:3px solid #000;border-radius:999px;background:#ddd;box-shadow:2px 2px 0 #000;display:inline-block;flex:0 0 auto}.toggleTrack:after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border:3px solid #000;border-radius:50%;background:#fff;transition:.18s}.switchLabel input:checked+.toggleTrack{background:var(--lime)}.switchLabel input:checked+.toggleTrack:after{transform:translateX(24px)}.variantBuilder{display:none;margin-top:12px}.variantBuilder.show{display:block}.addVariantCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#f9fff0;padding:12px;margin:10px 0}.addVariantCardTitle{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px;text-transform:uppercase}.dangerText{color:#b00020;font-weight:1000}.hidden{display:none!important}.variantMainHide.hidden{display:none!important}.variantMainCompact{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#eaffc8;padding:10px;margin:8px 0 12px;font-size:12px;line-height:1.45}
    @media(max-width:980px){.grid{grid-template-columns:repeat(2,1fr)}.forms,.dashboardGrid{grid-template-columns:minmax(0,1fr)}}
    @media(max-width:620px){.wrap{width:100%;max-width:100%;padding:14px 10px 60px;overflow-x:hidden}.hero{padding:16px 12px}.hero h1{font-size:28px}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none;gap:8px}.stat{min-height:62px;padding:9px}.grid,.row,.row3,.detailGrid{grid-template-columns:minmax(0,1fr)}.tile{min-height:62px;min-width:98px;padding:10px 8px;font-size:12px}.productTop{align-items:flex-start}.productImg,.productFallback{width:64px;height:64px}.price{font-size:25px}.dashboardGrid{gap:12px}.dashboardGrid .panel{box-shadow:4px 4px 0 #050505;padding:12px}.chart{height:260px;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;padding:8px 6px 10px}.bar{width:min(26px,68%)}.barLabel{font-size:9px;max-width:42px;line-height:1.1}.sectionTitle{font-size:20px}.topPanel .voucher{font-size:13px;line-height:1.45}}
  
    .productOff{opacity:.72;filter:grayscale(.18)}.statusToggle{margin-left:auto;align-self:flex-start;border:var(--line);box-shadow:var(--soft);border-radius:999px;padding:6px 12px;font-size:11px;background:var(--lime);font-weight:1000;cursor:pointer}.statusToggle.off{background:var(--red);color:#fff}.miniSwitch{display:inline-flex;gap:6px;align-items:center;background:#8bd80f;color:#000;border:2px solid #000;border-radius:8px;padding:5px 8px;font-size:11px;font-weight:1000}.miniSwitch input{accent-color:#111}.miniSwitch:has(input:not(:checked)){background:#ff4b4b;color:#fff}.miniSwitch input:not(:checked)+span{font-size:0}.miniSwitch input:not(:checked)+span:before{content:'OFF';font-size:11px}.miniSwitch input:checked+span{font-size:0}.miniSwitch input:checked+span:before{content:'ON';font-size:11px}.promoSubGrid{display:flex;flex-wrap:nowrap;gap:10px;margin-top:12px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}.promoSubGrid::-webkit-scrollbar{height:7px}.promoSubGrid::-webkit-scrollbar-thumb{background:#000;border-radius:99px}.promoSubBtn{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;text-align:left;font-weight:1000;cursor:pointer;color:#000;flex:0 0 210px;min-height:92px;scroll-snap-align:start}.promoSubBtn .ico{display:block;font-size:22px;margin-bottom:6px}.promoSubBtn b{display:block;text-transform:uppercase;font-size:13px}.promoSubBtn small{display:block;color:#555;font-size:11px;line-height:1.35;margin-top:4px}.promoSubBtn.active{background:var(--yellow)}.settingsSubNav{display:grid;grid-template-columns:1fr;gap:9px;margin-top:12px}.settingsSubBtn{width:100%;display:grid;grid-template-columns:44px minmax(0,1fr);grid-template-rows:auto auto;column-gap:12px;align-items:center;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:11px 13px;text-align:left;font-weight:1000;cursor:pointer;color:#000;min-height:66px}.settingsSubBtn:active{transform:translate(2px,2px);box-shadow:0 0 0 #000}.settingsSubBtn .ico{grid-row:1/3;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:2px solid #000;border-radius:10px;background:#eef5ff;font-size:21px}.settingsSubBtn b{display:block;text-transform:uppercase;font-size:13px;align-self:end}.settingsSubBtn small{display:block;color:#555;font-size:11px;line-height:1.35;margin-top:2px;align-self:start}.settingsSubBtn.active{background:var(--yellow)}.settingsSubPanel.hidden,.flashSaleAdminPanel.hidden{display:none!important}.voucherIntroPanel{background:var(--yellow)}.voucherListPanel{background:#ffe88a}.voucherCard{background:#fff7c4;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;margin:0 0 10px}.voucherCard:nth-child(3n+1){background:#fff0a6}.voucherCard:nth-child(3n+2){background:#d9fbff}.voucherCard:nth-child(3n){background:#e6d7ff}.voucherCode{display:inline-block;border:var(--line);box-shadow:var(--soft);border-radius:6px;background:var(--yellow);padding:5px 9px;margin-bottom:8px}.broadcastPanel{background:#ffd1e8}.pollPanel{background:#d9fbff}.pollCard{background:#fff;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;margin:0 0 10px}.pollResultRow{border:2px solid #000;border-radius:8px;background:#f7f7f7;padding:8px;margin:7px 0}.pollBar{height:14px;border:2px solid #000;background:var(--yellow);box-shadow:2px 2px 0 #000;margin-top:5px;min-width:8px}.topPanel{background:#d8f7ff}.settingsPanel{background:#eaffc8}.storeMenuPanel{background:var(--yellow)}.mediaGuidePanel{background:#e6d7ff}.formCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;margin-bottom:10px}.orderGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.orderCard{background:#fff;border:var(--line);box-shadow:var(--shadow);border-radius:var(--radius);padding:14px;display:flex;flex-direction:column;gap:8px}.orderRef{font-size:11px;letter-spacing:.03em;color:#111}.orderTitle{font-size:19px;line-height:1.2}.orderMeta{font-size:13px;line-height:1.65;color:#333}.statusDone{align-self:flex-start;background:var(--lime);border:var(--line);box-shadow:var(--soft);border-radius:6px;padding:6px 10px;font-size:11px;color:#000}.userTools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.voucherMeta{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.softTitle{font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px;color:#111}.tile[data-tab="broadcast"]:not(.active),.tile[data-tab="settings"]:not(.active),.tile[data-tab="promos"]:not(.active){background:var(--lime)!important;color:#000!important}.tile.active{background:var(--yellow)!important;color:#000!important}.detailItem{color:#000!important}.deepStatsPanel{background:#e6d7ff!important;color:#000!important}.licensePanel{background:#d9fbff!important}.deepStatsPanel .help,.deepStatsPanel .sectionTitle{color:#000!important}
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
    .promoTargetBox{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff7c4;padding:14px}.promoTargetHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.promoTargetHead p{margin:4px 0 0}.compactSwitch{font-size:12px;white-space:nowrap}.compactSwitch .toggleTrack{width:48px;height:26px}.compactSwitch .toggleTrack:after{width:14px;height:14px}.compactSwitch input:checked+.toggleTrack:after{transform:translateX(21px)}.promoTargetBuilder{margin-top:12px}.promoTargetControls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:10px;align-items:end}.promoTargetControls .btn{min-height:47px}.promoTargetList{display:grid;gap:8px;margin-top:10px}.promoTargetItem{display:flex;align-items:center;justify-content:space-between;gap:10px;border:2px solid #000;border-radius:10px;background:#fff;padding:9px 10px}.promoTargetItem span{min-width:0;overflow-wrap:anywhere}.promoTargetItem button{border:2px solid #000;border-radius:8px;background:var(--red);color:#fff;padding:6px 9px;font-weight:900;cursor:pointer}.promoTargetEmpty{border:2px dashed #555;border-radius:10px;background:#fff;padding:12px;color:#555;font-size:12px}.rowBetween{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.voucherCard .rowBetween{align-items:flex-start}.voucherCard .actions{margin-top:0}.profitPositive{color:#087f5b}.profitNegative{color:#c92a2a}.settingsMenuPanel{background:#eaffc8}.settingsSubPanel{scroll-margin-top:12px}
    @media(max-width:760px){.forms,.dashboardGrid,.broadcastGrid{grid-template-columns:1fr}.promoSubBtn{flex-basis:178px;min-height:86px}.promoTargetControls{grid-template-columns:1fr 1fr}.promoTargetControls .btn{grid-column:1/-1}.sectionToolbar{align-items:flex-start}.sectionToolbar .btn{padding:10px 12px}}
    @media(max-width:620px){.wrap{padding:8px 10px 70px}.hero{padding:16px;margin-bottom:14px}.hero h1{font-size:27px}.statsGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}.stat{min-height:58px;padding:8px}.navTiles{margin:10px 0 14px}.tile{min-width:88px;min-height:56px;padding:8px 7px;font-size:10px}.tile .ico{font-size:17px}.panel,.product,.miniCard{padding:12px}.sectionToolbar{flex-direction:column}.sectionToolbar .btn{width:100%}.row,.row3,.row4{grid-template-columns:1fr}.promoTargetHead{flex-direction:column}.compactSwitch{width:100%;justify-content:space-between;border-top:2px dashed #111;padding-top:10px}.promoTargetControls{grid-template-columns:1fr}.promoTargetControls .btn{grid-column:auto}.settingsSubBtn{grid-template-columns:40px minmax(0,1fr);padding:10px;min-height:62px}.settingsSubBtn .ico{width:36px;height:36px;font-size:19px}.voucherCard .rowBetween{display:block}.voucherCard .rowBetween .actions{margin-top:10px}.broadcastGrid .panel{margin-bottom:12px}}

    .flashSaleAdminPanel{background:#dbeafe!important}.flashSaleAdminPanel .flashSaleHint{background:#eff6ff;border-color:#0b4fba}.flashSaleAdminPanel .btn.cyan{background:#5dc8ff}.chip.cyan{background:#5dc8ff;color:#000}
    /* v52: link manager seperti referensi, rapi untuk logo/banner/produk */
    .linkFieldBox{background:#eef5ff;border:var(--line);border-radius:var(--radius);padding:10px;box-shadow:var(--soft);display:grid;gap:8px}.linkFieldTitle{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#334155}.linkRows{display:grid;gap:9px}.linkRow{display:grid;grid-template-columns:minmax(120px,.7fr) minmax(0,1.6fr) auto;gap:8px;align-items:center}.linkRow .input{margin:0}.linkRemove{width:42px;min-width:42px;height:42px;padding:0}.formDivider.withAction{display:flex;justify-content:space-between;align-items:center;gap:12px}.scopeBadge{display:inline-flex;align-items:center;border:2px solid #050505;border-radius:999px;padding:3px 7px;font-size:9px;background:#dbeafe;color:#0f172a}.scopeBadge.market{background:#bfdbfe}.linkHint{font-size:11px;color:var(--muted);line-height:1.45}
    .flashProductRow{grid-template-columns:minmax(0,1fr) auto}.flashProductRow .select{margin:0}.flashSaleHint{border:2px solid #050505;border-radius:var(--radius);background:#fff7d6;padding:10px 12px;font-size:11px;line-height:1.45}
    @media(max-width:720px){.linkRow{grid-template-columns:1fr auto}.linkRow .bannerName{grid-column:1/-1}.linkRow .bannerUrl{grid-column:1}.linkRow .linkRemove{grid-column:2;grid-row:2}.flashProductRow{grid-template-columns:1fr auto}.flashProductRow .select{grid-column:1}.flashProductRow .linkRemove{grid-column:2;grid-row:1}}

    /* v63: penjualan, users, dan halaman pengaturan lebih ringkas */
    .hidden{display:none!important}.orderCard{position:relative;padding-top:46px}.orderRef{padding-right:92px}.orderStatusButton{position:absolute;right:12px;top:12px;border:var(--line);box-shadow:var(--soft);border-radius:8px;padding:7px 10px;font-size:10px;font-weight:1000;cursor:pointer}.orderStatusButton.completed{background:var(--lime);color:#000}.orderStatusButton.canceled{background:var(--red);color:#fff}.orderCanceled{background:#fff1f1}.orderCanceled .orderTitle,.orderCanceled .orderMeta{opacity:.78}.statusConfirm{text-align:center;max-width:580px;margin:auto}.statusConfirmIcon{width:58px;height:58px;border:var(--line);border-radius:18px;background:var(--yellow);display:grid;place-items:center;font-size:30px;margin:0 auto 10px}.statusConfirm h3{font-size:22px;margin:6px 0}.statusConfirm p{color:#555;line-height:1.55}.statusConfirm .detailItem{text-align:left;margin:12px 0}.userCardGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.userCard{display:grid;grid-template-columns:46px minmax(0,1fr) auto auto auto;align-items:center;gap:10px;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:10px}.userAvatar{width:46px;height:46px;border:2px solid #000;border-radius:14px;background:#dbeafe;display:grid;place-items:center;font-size:20px;font-weight:1000}.userMain{min-width:0;display:flex;flex-direction:column}.userMain b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.userMain small{color:#666;font-size:10px;margin-top:3px}.userMetric{display:flex;flex-direction:column;align-items:flex-end;min-width:74px}.userMetric span{font-size:9px;text-transform:uppercase;color:#666}.userMetric b{font-size:12px;margin-top:3px;white-space:nowrap}.userDelete{margin:0}.compactToolbar{margin-bottom:10px}.settingsSubBtn.active{background:#fff}.settingsSubPanel{display:none!important}
    @media(max-width:900px){.userCardGrid{grid-template-columns:1fr}.userCard{grid-template-columns:44px minmax(0,1fr) auto auto}.userDelete{grid-column:1/-1;width:100%}}
    @media(max-width:620px){.orderCard{padding:45px 11px 11px}.orderStatusButton{right:10px;top:10px}.orderRef{padding-right:88px}.userCard{grid-template-columns:40px minmax(0,1fr) auto;gap:8px;padding:9px}.userAvatar{width:40px;height:40px;border-radius:12px;font-size:18px}.userMetric:nth-of-type(2){grid-column:2}.userMetric{align-items:flex-start;min-width:0}.userDelete{grid-column:3;grid-row:1/3;width:auto;align-self:stretch}.settingsSubNav{gap:8px}}

    /* v64: sales, users, promo, broadcast, dan bot-menu polish */
    .orderCard{padding:14px;position:relative}.orderRef{padding-right:0;font-size:10px;color:#5b6472}.orderTitleRow{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.orderTitleRow .orderTitle{min-width:0;flex:1}.orderStatusButton{position:static;right:auto;top:auto;flex:0 0 auto;align-self:flex-start;border:2px solid #000;box-shadow:2px 2px 0 #000;border-radius:999px;padding:5px 8px;font-size:9px;line-height:1;font-weight:1000;cursor:pointer}.orderStatusButton:active{transform:translate(2px,2px);box-shadow:0 0 0 #000}.orderCanceled .orderTitleRow .orderTitle,.orderCanceled .orderMeta{opacity:.78}.statusConfirmIcon.danger{background:#ffd6d8;color:#b91c1c}.statusConfirmIcon.success{background:#d9ffc0;color:#14532d}.statusOrderSummary{background:#f8fafc!important}.statusOrderSummary span{font-size:11px;color:#64748b}.statusConfirmActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
    .userCardGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.userCard{display:grid;grid-template-columns:minmax(0,1fr) 72px 112px auto;align-items:center;gap:10px;padding:10px 11px}.userIdentity{display:flex;align-items:center;gap:10px;min-width:0}.userAvatar{flex:0 0 auto}.userMetric{min-width:0;align-items:flex-end}.userTransactions{justify-self:end}.userSpending{justify-self:end;min-width:106px}.userDelete{width:auto;min-height:32px;padding:6px 8px!important;font-size:9px!important;line-height:1;align-self:center}.userTools{gap:6px}.userTools .btn{padding:8px 9px;font-size:10px}
    .promoMenuPanel{padding:12px}.promoMenuPanel .sectionTitle{margin-bottom:8px}.promoSubGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:0;overflow:visible;padding:0}.promoSubBtn{min-width:0;min-height:58px;flex:none;padding:9px 8px;display:flex;align-items:center;justify-content:center;gap:7px;text-align:center}.promoSubBtn .ico{display:inline;font-size:18px;margin:0}.promoSubBtn b{font-size:11px;line-height:1.15}.promoSubBtn small{display:none}.voucherListPanel{padding:12px}.promoCompactCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:11px;margin-bottom:9px}.promoCompactCard.voucherManual{background:#f7f0ff}.promoCompactCard.promoAuto{background:#f3fbff}.promoCompactHead{display:flex;justify-content:space-between;gap:9px;align-items:flex-start}.promoIdentity{display:flex;gap:8px;align-items:center;min-width:0}.promoIcon{width:34px;height:34px;border:2px solid #000;border-radius:10px;background:#fff;display:grid;place-items:center;font-size:17px;flex:0 0 auto}.promoIdentity>div{min-width:0}.promoCode{font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.promoIdentity small{display:block;font-size:9px;color:#64748b;text-transform:uppercase;margin-top:2px}.promoStatusGroup{display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap}.promoStatusGroup .chip{font-size:8px;padding:3px 5px}.promoCompactBody{display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px;align-items:stretch;margin-top:9px}.promoDiscountValue{border:2px solid #000;border-radius:8px;background:var(--yellow);padding:8px;display:flex;flex-direction:column;justify-content:center}.promoDiscountValue small{font-size:9px;text-transform:uppercase}.promoDiscountValue b{font-size:19px;line-height:1.1;margin-top:3px}.promoFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.promoFacts span{border:2px solid #000;border-radius:7px;background:#fff;padding:6px;font-size:9px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.promoFacts b{display:block;text-transform:uppercase;font-size:8px;color:#64748b}.promoCompactNote{font-size:10px;color:#475569;line-height:1.4;margin:8px 0 0}.promoCompactDate{font-size:9px;color:#64748b;margin-top:5px}.promoCompactActions{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}.promoCompactActions .btn{min-width:68px;padding:6px 8px;font-size:9px;box-shadow:2px 2px 0 #000}
    .broadcastOrderBox{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff4b8;padding:11px;display:grid;gap:10px}.broadcastOrderBox .switchLabel{font-size:12px}.broadcastOrderBox .field{margin-top:1px}
    @media(max-width:1024px){.userCardGrid{grid-template-columns:1fr}.userCard{grid-template-columns:minmax(0,1fr) 72px 112px auto}.userIdentity{min-width:0}.userDelete{width:auto}.promoCompactBody{grid-template-columns:92px minmax(0,1fr)}}
    @media(max-width:700px){.orderTitleRow{gap:7px}.orderStatusButton{font-size:8px;padding:5px 7px}.statusConfirmActions{grid-template-columns:1fr}.userCard{grid-template-columns:minmax(0,1fr) 62px 96px;gap:7px;padding:9px}.userIdentity{gap:8px}.userAvatar{width:40px;height:40px;border-radius:12px;font-size:18px}.userMetric span{font-size:8px}.userMetric b{font-size:10px}.userSpending{min-width:92px}.userDelete{grid-column:3;grid-row:2;justify-self:end;align-self:end;padding:5px 7px!important;font-size:8px!important;min-height:26px}.promoSubGrid{gap:6px}.promoSubBtn{min-height:52px;padding:7px 5px;gap:4px}.promoSubBtn .ico{font-size:16px}.promoSubBtn b{font-size:9px}.promoCompactBody{grid-template-columns:84px minmax(0,1fr);gap:7px}.promoFacts{grid-template-columns:1fr 1fr}.promoFacts span:first-child{grid-column:1/-1}.promoDiscountValue b{font-size:16px}.promoCompactActions .btn{min-width:60px}.row3{grid-template-columns:1fr}}
    @media(max-width:390px){.userCard{grid-template-columns:minmax(0,1fr) 56px 88px}.userIdentity{gap:6px}.userAvatar{width:36px;height:36px}.userMain b{font-size:12px}.userMain small{font-size:8px}.userSpending{min-width:84px}.promoSubBtn b{font-size:8px}.promoCompactBody{grid-template-columns:76px minmax(0,1fr)}.promoFacts span{font-size:8px}}


    /* v65: wallet, referral, top up, dan editor saldo user */
    .walletSettingsPanel{background:#eaf3ff}.walletSettingGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.walletSettingCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;display:grid;gap:10px}.walletSettingCard h3{margin:0;font-size:17px}.walletSettingCard .help{margin:0}.walletPreview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.walletPreview .detailItem{background:#eef5ff}.userCard.walletUserCard{grid-template-columns:minmax(0,1.25fr) 62px 104px minmax(180px,.8fr) auto}.userWallet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.userWallet span{border:2px solid #000;border-radius:7px;padding:5px 6px;background:#eef5ff;min-width:0}.userWallet small{display:block;font-size:7px;text-transform:uppercase;color:#64748b}.userWallet b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}.userActions{display:flex;gap:5px;align-items:center;justify-content:flex-end}.userBalanceBtn,.userDelete{white-space:nowrap}.balanceEditorSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.balanceEditorSummary .detailItem{background:#eef5ff}.balanceReason{margin-top:8px}.referralModeHint{border:2px dashed #0b4fba;background:#eff6ff;border-radius:8px;padding:9px;font-size:11px;line-height:1.45}
    @media(max-width:1100px){.userCard.walletUserCard{grid-template-columns:minmax(0,1fr) 62px 104px minmax(170px,.9fr) auto}}
    @media(max-width:920px){.walletSettingGrid{grid-template-columns:1fr}.userCard.walletUserCard{grid-template-columns:minmax(0,1fr) 62px 104px}.userWallet{grid-column:1/-1}.userActions{grid-column:1/-1;justify-content:flex-end}}
    @media(max-width:620px){.walletPreview,.balanceEditorSummary{grid-template-columns:1fr}.userCard.walletUserCard{grid-template-columns:minmax(0,1fr) 56px 92px;gap:7px}.userWallet{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.userWallet span{padding:4px}.userWallet small{font-size:6px}.userWallet b{font-size:9px}.userActions{justify-content:stretch}.userActions .btn{flex:1;min-height:28px;padding:6px 7px!important;font-size:8px!important}.walletSettingCard{padding:10px}}
    @media(max-width:390px){.userCard.walletUserCard{grid-template-columns:minmax(0,1fr) 52px 84px}.userWallet{grid-template-columns:1fr 1fr}.userWallet span:last-child{grid-column:1/-1}.userActions{flex-wrap:wrap}}


    /* v68: PRE-ORDER */
    .poGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.poCard{background:#fff;border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:13px;display:grid;gap:9px}.poCard.delivered{opacity:.78}.poHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.poHead h3{margin:0;font-size:17px;line-height:1.25}.poStatus{border:2px solid #000;border-radius:999px;padding:4px 7px;font-size:10px;white-space:nowrap}.poStatus.waiting{background:var(--yellow)}.poStatus.delivered{background:var(--lime)}.poMeta{font-size:12px;line-height:1.5;color:var(--muted)}.poDelivery{min-height:120px}.deliveryModeBadge{display:inline-flex;border:2px solid #000;border-radius:6px;padding:3px 6px;font-size:10px;background:#dff6ff;margin-top:5px}.product.poProduct{background:#f5fbff}.poProduct .approved{background:#dff6ff}.poNotice{background:#dff6ff;border:var(--line);border-radius:var(--radius);padding:10px 12px;font-size:12px;line-height:1.45;margin-bottom:12px}
    @media(max-width:760px){.poGrid{grid-template-columns:1fr}.poCard{padding:11px}.poDelivery{min-height:105px}}

.editSaveDock{position:sticky;bottom:6px;z-index:30;margin:16px -4px -4px;padding:10px 12px;border:3px solid #000;box-shadow:4px 4px 0 #000;border-radius:10px;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:space-between;gap:12px}
.editSaveDock>div{min-width:0;font-size:12px;line-height:1.25}.editSaveDock small{display:block;color:#5a5963;margin-top:2px}.editSaveDock .btn{flex:0 0 auto;padding:10px 14px}
@media(max-width:900px){#modalEditForm{padding-bottom:76px}.editSaveDock{position:fixed;left:12px;right:12px;bottom:12px;z-index:145;max-width:860px;margin:0 auto;padding:8px 9px;box-shadow:5px 5px 0 #000}.editSaveDock>div{display:none}.editSaveDock .btn{width:100%;min-height:46px}}


    /* v71: UI klasik kembali + menu utama selalu di bawah */
    .wrap{padding-bottom:138px}
    .navTiles{
      position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);
      width:min(1180px,calc(100% - 24px));margin:0;z-index:170;padding:8px;
      background:var(--purple);border:var(--line);box-shadow:6px 6px 0 #050505;border-radius:12px;
      overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior-x:contain;
    }
    .navTiles::-webkit-scrollbar{display:none}
    .navTiles .tile{min-width:96px;min-height:58px;padding:8px 9px;border-radius:8px;font-size:10px;line-height:1.12}
    .navTiles .tile .ico{font-size:17px;margin-bottom:3px}
    .navTiles .tile.active{background:var(--yellow);color:#000}
    body.modalOpen{overflow:hidden}
    body.modalOpen .navTiles{visibility:hidden;pointer-events:none}
    .toast{bottom:118px}
    @media(max-width:760px){
      .wrap{padding:12px 10px 128px}
      .navTiles{width:calc(100% - 16px);bottom:max(8px,env(safe-area-inset-bottom));padding:7px;gap:7px;border-radius:10px;box-shadow:4px 4px 0 #050505}
      .navTiles .tile{min-width:78px;min-height:54px;padding:7px 6px;font-size:8px;box-shadow:2px 2px 0 #050505}
      .navTiles .tile .ico{font-size:16px;margin-bottom:2px}
      .toast{bottom:105px;left:10px;right:10px}
    }
    @media(max-width:900px){
      .editSaveDock{bottom:max(12px,env(safe-area-inset-bottom))!important}
      #modalEditForm{padding-bottom:82px}
    }


    /* v72: polish grafik, desktop nav, users, dan promo */
    .barBox{overflow:visible;justify-content:flex-end;gap:5px}
    .barValue{font-size:clamp(8px,1.5vw,10px);line-height:1.05;font-weight:1000;color:#050505;background:#fff;border:2px solid #050505;border-radius:6px;padding:3px 5px;white-space:nowrap;box-shadow:1px 1px 0 #050505;max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .barDate{font-size:clamp(8px,1.6vw,10px);line-height:1.05;text-align:center;color:#050505;white-space:nowrap}
    .barLabel{display:none}
    @media(min-width:1000px){
      .navTiles{justify-content:center}
      .userCardGrid{grid-template-columns:1fr}
      .userCard.walletUserCard{grid-template-columns:minmax(250px,1.2fr) 84px 140px minmax(260px,.9fr) auto;gap:14px;padding:12px 14px}
      .userTransactions,.userSpending{justify-self:end}
      .userWallet{min-width:260px}
      .userActions{min-width:150px}
    }
    .promoCompactCard{padding:12px}
    .promoCompactHead{align-items:flex-start}
    .promoTitle{font-size:14px;line-height:1.2;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:360px}
    .promoHeadTools{display:grid;gap:6px;justify-items:end;flex:0 0 auto}
    .promoHeadTools .promoCompactActions{margin:0;display:flex;gap:6px;justify-content:flex-end}
    .promoHeadTools .promoCompactActions .btn{min-width:62px;padding:6px 8px;font-size:9px}
    .promoDiscountValue{min-width:132px;overflow:hidden}
    .promoDiscountValue b{font-size:clamp(15px,2vw,19px);line-height:1.1;white-space:normal;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
    .promoCompactBody{grid-template-columns:minmax(132px,150px) minmax(0,1fr)}
    @media(max-width:700px){
      .promoCompactHead{gap:7px}
      .promoTitle{max-width:170px;font-size:12px}
      .promoHeadTools{gap:4px}
      .promoHeadTools .promoCompactActions .btn{min-width:54px;padding:5px 6px;font-size:8px}
      .promoCompactBody{grid-template-columns:minmax(102px,118px) minmax(0,1fr)}
      .promoDiscountValue{min-width:0}
      .barValue{padding:2px 3px;border-width:1.5px;box-shadow:none}
    }


    /* v74: banner manager ringkas — preview + Edit + Posisi Banner */
    .promoHeadTools{display:contents!important}
    .promoCompactHead{align-items:flex-start}
    .promoCompactHead>.promoStatusGroup{margin-left:auto;max-width:46%;align-self:flex-start}
    .promoBottomActions{border-top:2px dashed #111;padding-top:9px;margin-top:10px;justify-content:flex-end}
    .promoBottomActions .btn{min-width:78px}
    .bannerManagerHead{align-items:center;gap:10px}
    .bannerAddActions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
    .bannerEditorList{display:grid;gap:14px}
    .bannerEditorCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:10px;display:grid;gap:9px;overflow:hidden}
    .bannerPreviewWrap{width:100%;aspect-ratio:2.39/1;border:2px solid #050505;border-radius:7px;overflow:hidden;background:#eaf2ff;position:relative}
    .bannerAdminPreview{position:absolute;inset:0;overflow:hidden}
    .bannerAdminPreview.image img{width:100%;height:100%;display:block;object-fit:cover}
    .bannerAdminPreview.image .bannerPreviewEmpty{position:absolute;inset:0;display:grid;place-items:center;padding:12px;text-align:center;background:#e9f3ff;color:#58677c;font-size:11px}
    .bannerAdminPreview.image.hasImage .bannerPreviewEmpty{display:none}
    .bannerAdminPreview.native{display:flex;padding:clamp(9px,2.4vw,22px);background:linear-gradient(120deg,var(--preview-bg1,#1769e0),var(--preview-bg2,#0d47a1));color:var(--preview-text,#fff)}
    .bannerAdminPreview.native.pos-left{justify-content:flex-start;text-align:left}.bannerAdminPreview.native.pos-center{justify-content:center;text-align:center}.bannerAdminPreview.native.pos-right{justify-content:flex-end;text-align:right}
    .bannerAdminPreview.native.vpos-top{align-items:flex-start}.bannerAdminPreview.native.vpos-center{align-items:center}.bannerAdminPreview.native.vpos-bottom{align-items:flex-end}
    .bannerPreviewContent{position:relative;z-index:2;width:68%;display:flex;flex-direction:column;align-items:flex-start;min-width:0}
    .bannerAdminPreview.native.pos-center .bannerPreviewContent{align-items:center}.bannerAdminPreview.native.pos-right .bannerPreviewContent{align-items:flex-end}
    .bannerPreviewKicker{display:inline-flex;max-width:100%;padding:3px 5px;border:1.5px solid #050505;border-radius:4px;background:var(--preview-accent,#ffe15a);color:#050505;font-size:clamp(5px,1vw,8px);font-weight:1000;box-shadow:1px 1px 0 #050505;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bannerPreviewTitle{display:block;max-width:100%;margin-top:5px;color:var(--preview-text,#fff);font-size:clamp(12px,3vw,27px);line-height:1;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bannerPreviewDescription{max-width:100%;margin:4px 0 0;color:var(--preview-text,#fff);font-size:clamp(6px,1.2vw,10px);line-height:1.25;font-weight:800;opacity:.92;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .bannerPreviewButton{display:inline-flex;margin-top:5px;padding:3px 6px;border:1.5px solid #050505;border-radius:4px;background:var(--preview-accent,#ffe15a);color:#050505;font-size:clamp(5px,1vw,8px);font-weight:1000;box-shadow:1px 1px 0 #050505}
    .bannerPreviewDecor{position:absolute;inset:0;pointer-events:none}.bannerPreviewDecor:before,.bannerPreviewDecor:after{content:"";position:absolute;border:2px solid rgba(5,5,5,.72);background:rgba(255,255,255,.15);transform:rotate(18deg)}
    .bannerPreviewDecor:before{width:15%;aspect-ratio:1;right:8%;top:14%;border-radius:24%}.bannerPreviewDecor:after{width:9%;aspect-ratio:1;right:19%;bottom:12%;border-radius:50%;background:var(--preview-accent,#ffe15a)}
    .bannerCardActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .bannerCardActions .btn{min-width:0;padding:10px 8px}
    .bannerEditPanel,.bannerPositionPanel{display:none;border-top:2px dashed #111;padding-top:10px}
    .bannerEditorCard.editing .bannerEditPanel{display:grid;gap:10px}
    .bannerEditorCard.positioning .bannerPositionPanel{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .bannerPositionInfo{display:flex;align-items:center;gap:8px;font-size:11px}
    .bannerOrderNumber{width:30px;height:30px;border:2px solid #000;border-radius:7px;background:var(--yellow);display:grid;place-items:center;font-size:11px;font-weight:1000}
    .bannerOrderTools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    .bannerMove{min-width:104px!important;padding:8px!important}.bannerMove:disabled{opacity:.35}
    .bannerDelete{margin-top:2px}
    .bannerColorGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .colorField{border:2px solid #000;border-radius:8px;background:#fff;padding:7px;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:9px;font-weight:900}
    .colorField input{width:34px;height:28px;padding:0;border:0;background:transparent}
    .textarea.compact{min-height:76px}
    @media(max-width:700px){
      .bannerManagerHead{align-items:flex-start;flex-direction:column}
      .bannerAddActions{width:100%;display:grid;grid-template-columns:1fr 1fr}
      .bannerAddActions .btn{min-width:0}
      .bannerColorGrid{grid-template-columns:1fr 1fr}
      .bannerEditorCard{padding:8px}
      .bannerCardActions{gap:6px}.bannerCardActions .btn{font-size:10px;padding:9px 6px}
      .bannerEditorCard.positioning .bannerPositionPanel{align-items:stretch;flex-direction:column}
      .bannerOrderTools{display:grid;grid-template-columns:1fr 1fr;width:100%}.bannerMove{min-width:0!important;width:100%}
      .promoCompactHead>.promoStatusGroup{max-width:52%}
      .promoBottomActions{display:grid;grid-template-columns:1fr 1fr}
      .promoBottomActions .btn{width:100%}
    }

    .supplierPanel{background:#d9fbff}.supplierHero{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.supplierStat{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:12px;background:#fff}.supplierStat:nth-child(2){background:var(--lime)}.supplierStat:nth-child(3){background:var(--yellow)}.supplierStat:nth-child(4){background:#e6d7ff}.supplierStat small{display:block;font-size:10px;text-transform:uppercase}.supplierStat b{display:block;font-size:20px;margin-top:5px}.supplierToolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}.supplierToolbar .input{flex:1;min-width:220px}.supplierGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px}.supplierCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px;display:flex;flex-direction:column;gap:9px}.supplierCard.selected{background:#f3ffe0}.supplierCardTop{display:flex;gap:10px;align-items:flex-start}.supplierThumb{width:64px;height:64px;object-fit:cover;border:2px solid #000;border-radius:8px;background:#eee}.supplierThumbFallback{width:64px;height:64px;border:2px solid #000;border-radius:8px;background:var(--cyan);display:grid;place-items:center;font-size:25px}.supplierCard h3{margin:0;font-size:17px;line-height:1.2}.supplierMeta{font-size:12px;line-height:1.5;color:#333}.supplierPriceRow{display:grid;grid-template-columns:1fr 1fr;gap:8px}.supplierOrderList{display:grid;gap:9px}.supplierOrder{border:2px solid #000;border-radius:8px;background:#fff;padding:10px;font-size:12px;line-height:1.5}.supplierOrder.error{background:#ffd8d8}.supplierOrder.delivered{background:#e4ffd1}.supplierConfigWarning{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:14px;background:var(--yellow);margin-bottom:12px}.supplierApiBadge{display:inline-flex;border:2px solid #000;border-radius:999px;padding:4px 8px;font-size:10px;background:var(--lime)}
    .workflowPanel{background:#eefcff}.workflowStatus{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:10px 0}.workflowStat{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);padding:10px;background:#fff}.workflowStat b{display:block;font-size:17px;margin-top:4px}.workflowRecorder{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:12px;margin-top:12px}.workflowMessage{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:13px;min-height:150px}.workflowMessage pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-weight:800;margin:8px 0}.workflowButtons{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.workflowSteps{display:grid;gap:8px}.workflowStep{border:2px solid #000;border-radius:8px;background:#fff;padding:10px;font-size:12px;line-height:1.45}.workflowStep.result{background:#e2ffd4}.workflowStep .stepResponse{margin-top:6px;padding:7px;border:2px dashed #000;background:#f8f8f8;white-space:pre-wrap;word-break:break-word;max-height:130px;overflow:auto}.workflowList{display:grid;gap:9px}.workflowCard{border:var(--line);box-shadow:var(--soft);border-radius:var(--radius);background:#fff;padding:12px}.workflowCard.active{background:#e4ffd1}.workflowRun.attention{background:#ffd8d8}.workflowRun.delivered{background:#e4ffd1}.workflowPlaceholder{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px}.workflowPlaceholder button{font-size:11px}.workflowDanger{background:#ffd8d8;border:2px solid #000;padding:9px;border-radius:7px}.workflowHint{background:#fff6b9;border:2px solid #000;padding:9px;border-radius:7px;font-size:12px;line-height:1.45}.workflowMessageChoice{border:2px solid #000;border-radius:8px;padding:10px;margin-top:9px;background:#fff}.workflowMessageChoice.selected{background:#e4ffd1;box-shadow:3px 3px 0 #000}.workflowMessageChoice.pending{background:#fff6b9}.workflowMessageChoice .messageHead{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.workflowMessageChoice pre{max-height:180px;overflow:auto}.workflowSelectableText{width:100%;min-height:120px;max-height:220px;resize:vertical;border:2px solid #000;border-radius:7px;background:#f8f8f8;padding:9px;font:800 12px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}.workflowMessageChoice.selected .workflowSelectableText{background:#fff}.workflowSelectionInfo{font-size:11px;font-weight:800;margin-top:6px}.workflowCategoryBox{border:2px solid #000;border-radius:8px;padding:10px;background:#f5f5ff}.workflowCategoryBox.quantity{background:#e5fbff}.workflowSelectionWarning{background:#ffdca8;border:2px solid #000;border-radius:7px;padding:8px;margin-top:8px;font-size:12px;font-weight:800}
    @media(max-width:700px){.supplierHero,.workflowStatus{grid-template-columns:1fr 1fr}.supplierPriceRow{grid-template-columns:1fr}.supplierToolbar .input{min-width:100%}.workflowRecorder{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="eyebrow">DASHBOARD OWNER</div>
    <h1 id="storeName">iLink.in Store</h1>
    <div class="storeline byline"><span>Kelola toko, produk, stok, penjualan, promo, dan reseller</span></div>
    <div style="margin-top:12px"><a href="/" class="btn yellow" style="display:inline-block;text-decoration:none;color:#000">🛍️ Lihat Marketplace</a></div>
    <div class="statsGrid" id="stats"></div>
  </header>

  <input id="search" class="search" placeholder="Cari produk, penjualan, user, promo, voucher..." />
  <div id="productCounter" class="count hidden"></div>

  <nav class="navTiles" id="navTiles" aria-label="Menu utama">
    <button class="tile active" data-tab="dashboard"><span class="ico">📊</span>Dashboard</button>
    <button class="tile" data-tab="products"><span class="ico">📦</span>Produk</button>
    <button class="tile" data-tab="orders"><span class="ico">🧾</span>Penjualan</button>
    <button class="tile" data-tab="poOrders"><span class="ico">📨</span>Pesanan PO</button>
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
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Pengaturan</button>
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
        <div class="row4">
          <div class="field"><label class="label">Nama Produk</label><input class="input" name="nama" placeholder="Contoh: Canva Pro 1 Bulan" required></div>
          <div class="field"><label class="label">Kode Produk</label><input class="input" name="kode" placeholder="Contoh: CANVA1B" required></div>
          <div class="field variantMainHide" data-hide-when-variant><label class="label">Harga Jual Satuan</label><input class="input" name="harga" type="number" placeholder="Contoh: 13000" required></div>
          <div class="field variantMainHide" data-hide-when-variant><label class="label">Modal Supplier / Item</label><input class="input" name="cost_price" type="number" min="0" placeholder="Contoh: 9000"><p class="help">Disalin ke transaksi saat pembeli checkout.</p></div>
        </div>
        <div class="row3">
          <div class="field"><label class="label">Kategori</label><input class="input" name="category" placeholder="Contoh: Akun Premium"></div>
          <div class="field"><label class="label">Link Gambar Produk</label><div class="linkFieldBox"><div class="linkFieldTitle">Gambar Produk</div><input class="input" name="image_url" placeholder="https://domain.com/produk.jpg atau Google Drive"></div></div>
          <div class="field"><label class="label">Tampilkan Produk Di</label><select class="select" name="display_scope"><option value="both">Bot Telegram + Marketplace</option><option value="marketplace">Marketplace saja</option></select><p class="help">Marketplace saja tidak akan muncul pada daftar /produk dan stok di bot.</p></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">Sistem Pengiriman Default</label><select class="select" name="delivery_mode"><option value="auto">Otomatis dari stok</option><option value="po">Pre-Order · saya kirim manual setelah pembayaran</option></select><p class="help">PRE-ORDER tidak memotong stok otomatis. Setelah pembayaran berhasil, pesanan masuk ke menu Pesanan PO untuk Anda kirim.</p></div>
          <div class="field"><label class="label">Catatan Sistem PO</label><div class="variantMainCompact">Gunakan PRE-ORDER untuk produk yang baru Anda beli/siapkan dari supplier setelah konsumen membayar.</div></div>
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
  <section id="poOrders" class="section"><div class="panel"><div class="sectionToolbar compactToolbar"><div><h2 class="sectionTitle">Pesanan Pre-Order</h2><p class="help">Hanya pesanan yang pembayarannya sudah berhasil. Masukkan produk/akun, lalu kirim ke chat pembeli.</p></div></div><div class="poNotice"><b>Alur aman:</b> pembayaran berhasil → pesanan masuk di sini → Anda tempel akun/produk → konfirmasi → bot mengirim ke pembeli → status menjadi TERKIRIM.</div><div id="poOrderList" class="poGrid"></div></div></section>
  <section id="users" class="section"><div class="panel"><div class="sectionToolbar compactToolbar"><div><h2 class="sectionTitle">Users</h2><p class="help">Ringkasan pelanggan dan aktivitas transaksi.</p></div></div><div class="userTools"><button class="btn small lime" type="button" data-user-sort="latest">Terbaru</button><button class="btn small purple" type="button" data-user-sort="transactions">Transaksi Terbanyak</button><button class="btn small yellow" type="button" data-user-sort="spending">Spending Terbanyak</button></div><div id="userList" class="userCardGrid"></div></div></section>
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
          <div class="broadcastOrderBox">
            <label class="switchLabel"><input id="broadcastOrderEnabled" type="checkbox" name="order_button_enabled" value="true"><span class="toggleTrack"></span><span>Tambahkan tombol “Order Sekarang”</span></label>
            <div class="field hidden" id="broadcastOrderTargetBox"><label class="label">Tujuan Tombol</label><select class="select" name="order_button_target"><option value="marketplace">Buka Marketplace</option><option value="products">Buka Daftar Produk Bot</option></select></div>
          </div>
          <button class="btn red" type="submit">Kirim Broadcast</button>
        </form>
      </div>
      <div class="panel pollPanel"><h2 class="sectionTitle">Polling Broadcast</h2><p class="help">Draft dan hasil polling disatukan di halaman Broadcast agar menu utama tidak dobel.</p><div id="pollList"></div></div>
    </div>
  </section>
  <section id="maintenance" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Pengaturan</button>
    <div class="panel orange"><h2 class="sectionTitle">Maintenance Database</h2><p class="help">Bersihkan data lama agar Supabase Free tetap ringan. Pilih target dengan hati-hati. Data yang dihapus tidak bisa dikembalikan kecuali kamu punya backup.</p><div id="maintenanceStats" class="detailGrid"></div></div>
    <div class="panel"><h2 class="sectionTitle">Aksi Bersih Database</h2><form id="maintenanceForm" class="form"><div class="row"><div class="field"><label class="label">Target Pembersihan</label><select class="select" name="target"><option value="pending-expired">Pending order expired</option><option value="pending-old">Pending order lama</option><option value="polls-old">Polling lama + hasilnya</option><option value="poll-answers-old">Detail jawaban polling lama</option><option value="delivered-old">Kosongkan produk terkirim lama</option><option value="users-empty-old">User tanpa transaksi lama</option><option value="vouchers-inactive-expired">Voucher nonaktif / expired</option><option value="job-locks-expired">Lock pekerjaan kedaluwarsa</option><option value="transactions-old">Hapus transaksi lama permanen</option></select></div><div class="field"><label class="label">Umur Data Minimal</label><select class="select" name="days"><option value="7">7 hari</option><option value="14">14 hari</option><option value="30" selected>30 hari</option><option value="60">60 hari</option><option value="90">90 hari</option><option value="180">180 hari</option></select></div></div><p class="help"><b>Saran aman:</b> hapus pending order expired, polling lama, dan kosongkan produk terkirim lama. Mulai v36, Total Transaksi dashboard tetap aman walau transaksi lama dibersihkan. Tetap export backup dulu jika ingin menyimpan detail order lama.</p><button class="btn red" type="submit">Jalankan Maintenance</button></form></div>
  </section>

  <section id="backup" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Pengaturan</button>
    <div class="forms">
      <div class="panel cyan"><h2 class="sectionTitle">Backup Data</h2><p class="help">Backup manual akan mengunduh file JSON. Auto backup harian dikirim ke owner sekitar jam 00.00 WIB lewat Vercel Cron.</p><div class="actions"><button class="btn yellow" type="button" id="downloadBackup">Download Backup</button><button class="btn lime" type="button" id="sendBackupTelegram">Kirim Backup ke Telegram</button></div><p class="help">Simpan file backup sebelum maintenance besar atau sebelum pindah bot.</p></div>
      <div class="panel orange"><h2 class="sectionTitle">Import Backup</h2><form id="importBackupForm" class="form"><textarea class="textarea tall" name="backup" placeholder="Paste isi file backup .json di sini"></textarea><label class="switchLabel"><input type="checkbox" name="include_transactions" value="true"><span class="toggleTrack"></span><span>Ikut import transaksi</span></label><p class="help">Default hanya import data operasional seperti user, produk, voucher, setting, promo. Centang transaksi hanya kalau kamu benar-benar ingin mengembalikan riwayat transaksi.</p><button class="btn red" type="submit">Import Backup</button></form></div>
    </div>
    <div class="panel"><h2 class="sectionTitle">Riwayat Backup / Import</h2><div id="backupLogs"></div></div>
  </section>

  <section id="promos" class="section">
    <div class="panel yellow promoMenuPanel"><h2 class="sectionTitle">Promo & Voucher</h2><div class="promoSubGrid"><button class="promoSubBtn active" type="button" data-promo-sub="list"><span class="ico">📋</span><b>Daftar</b></button><button class="promoSubBtn" type="button" data-promo-sub="create"><span class="ico">➕</span><b>Buat</b></button><button class="promoSubBtn" type="button" data-promo-sub="flash"><span class="ico">⚡</span><b>Flash Sale</b></button></div></div>
    <div class="panel flashSaleAdminPanel hidden" id="promoFlashPanel">
      <h2 class="sectionTitle">⚡ Flash Sale Marketplace</h2>
      <p class="help">Produk masuk Flash Sale melalui pilihan pada <b>Promo Otomatis</b>. Promo yang dipilih hanya memotong harga ketika Flash Sale ON dan jadwalnya sedang berlangsung. Jumlah terjual dihitung hanya dari transaksi selama periode Flash Sale.</p>
      <form id="flashSaleForm" class="form">
        <div class="row">
          <div class="field"><label class="label">Status Flash Sale</label><select class="select" name="flash_sale_enabled"><option value="false">OFF</option><option value="true">ON</option></select></div>
          <div class="field"><label class="label">Judul</label><input class="input" name="flash_sale_title" placeholder="FLASH SALE" value="FLASH SALE"></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">Mulai Flash Sale</label><input class="input" type="datetime-local" name="flash_sale_start_at"></div>
          <div class="field"><label class="label">Berakhir Flash Sale</label><input class="input" type="datetime-local" name="flash_sale_end_at"></div>
        </div>
        <div id="flashSalePromoSummary" class="flashSaleHint">Belum ada promo otomatis yang dipilih untuk Flash Sale.</div>
        <button class="btn cyan" type="submit">Simpan Pengaturan Flash Sale</button>
      </form>
    </div>
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
          <div class="field"><label class="label">Nilai Diskon</label><input class="input" name="discount_value" type="number" min="1" step="1" placeholder="Contoh: 5000" required><p class="help" id="discountValueHelp">Masukkan nominal potongan dalam rupiah.</p></div>
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
        <div class="switchBox" id="promoFlashSaleBox">
          <label class="switchLabel"><input type="checkbox" name="flash_sale" value="true" id="promoFlashSale"><span class="toggleTrack"></span><span>Masukkan target promo ini ke Flash Sale Marketplace</span></label>
          <p class="help">Hanya tersedia untuk Promo Otomatis. Setelah dicentang, promo tidak berlaku di luar waktu Flash Sale. Jika menargetkan varian tertentu, nama varian tampil tepat di bawah nama produk.</p>
        </div>
        <p class="help"><b>Voucher Manual:</b> user harus memasukkan kode. <b>Promo Otomatis:</b> langsung aktif saat checkout jika syarat cocok. Keduanya bisa dihapus kapan saja.</p>
        <div class="actions"><button class="btn yellow" type="submit">Simpan Promo / Voucher</button><button class="btn lime" type="button" id="resetPromoUnified">Buat Baru</button></div>
      </form>
    </div>
    <div class="panel voucherListPanel" id="promoListPanel"><h2 class="sectionTitle">Daftar Promo & Voucher</h2><div id="promoUnifiedList"></div></div>
  </section>
  <section id="deepStats" class="section">
    <button class="btn yellow" data-tab="settings" type="button" style="margin-bottom:12px">← Kembali ke Pengaturan</button>
    <div class="panel deepStatsPanel"><h2 class="sectionTitle">Statistik Lengkap</h2><p class="help">Ringkasan status lengkap toko: omset hari ini, omset bulan ini, total omset, rata-rata order, item terjual, conversion estimate, promo aktif, pending order, stok kritis, user terbaik, dan jam ramai.</p><div id="deepStatsBox" class="detailGrid"></div></div>
    <div class="forms"><div class="panel chartPanel"><h2 class="sectionTitle">Stok Hampir Habis</h2><div id="lowStockList"></div></div><div class="panel yellow"><h2 class="sectionTitle">Top User</h2><div id="topUsersList"></div></div></div>
    <div class="panel"><h2 class="sectionTitle">Jam Ramai Order</h2><div id="hourlyStats"></div></div>
  </section>

  <section id="settings" class="section">
    <div class="panel settingsPanel settingsMenuPanel">
      <h2 class="sectionTitle">Pengaturan</h2><p class="help">Pilih bagian yang ingin dikelola.</p>
      <div class="settingsSubNav">
        <button class="settingsSubBtn" data-tab="storeSettings" type="button"><span class="ico">🏪</span><b>Pengaturan Toko</b><small>Nama toko, logo, customer service, dan grup.</small></button>
        <button class="settingsSubBtn" data-tab="bannerSettings" type="button"><span class="ico">🖼️</span><b>Banner Promosi</b><small>Kelola gambar promosi dan kecepatan pergantian.</small></button>
        <button class="settingsSubBtn" data-tab="startSettings" type="button"><span class="ico">▶️</span><b>Media /start</b><small>Atur gambar, stiker, dan caption pembuka bot.</small></button>
        <button class="settingsSubBtn" data-tab="walletSettings" type="button"><span class="ico">💰</span><b>Saldo, Referral & Top Up</b><small>Atur hadiah referral, isi saldo, dan pembayaran memakai saldo.</small></button>
        <button class="settingsSubBtn" data-tab="supplierSettings" type="button"><span class="ico">🔄</span><b>Supplier / Reseller</b><small>Kelola Supplier 1, Supplier 2, saldo manual, modal, stok perkiraan, serta ProdSeller.</small></button>
        <button class="settingsSubBtn" data-tab="workflowSettings" type="button"><span class="ico">🎙️</span><b>Workflow Reseller</b><small>Rekam /start, klik tombol, atau kirim teks ke bot supplier lalu jalankan ulang otomatis saat order.</small></button>
        <button class="settingsSubBtn" data-tab="license" type="button"><span class="ico">🔐</span><b>Lisensi</b><small>Lihat masa aktif bot dan sisa hari penggunaan.</small></button>
        <button class="settingsSubBtn" data-tab="deepStats" type="button"><span class="ico">📈</span><b>Statistik Lengkap</b><small>Lihat omzet, profit bersih, stok, dan pengguna.</small></button>
        <button class="settingsSubBtn" data-tab="backup" type="button"><span class="ico">💾</span><b>Backup</b><small>Unduh, kirim, atau pulihkan data toko.</small></button>
        <button class="settingsSubBtn" data-tab="maintenance" type="button"><span class="ico">🧹</span><b>Maintenance</b><small>Bersihkan data lama agar database tetap ringan.</small></button>
      </div>
    </div>
  </section>

  <section id="storeSettings" class="section">
    <button class="btn yellow backButton" data-tab="settings" type="button">← Kembali ke Pengaturan</button>
    <div class="panel settingsPanel">
      <h2 class="sectionTitle">Pengaturan Toko</h2>
      <form id="storeSettingsForm" class="form">
        <div class="field"><label class="label">Nama Toko / Bot</label><input class="input" name="store_name" maxlength="64" placeholder="Contoh: Link Auto Order"><p class="help">Nama ini dipakai di /start, halaman toko, dan disinkronkan ke nama tampilan bot Telegram. Username @bot tidak berubah.</p></div>
        <div class="workflowCategoryBox" style="margin-bottom:12px">
          <b>🤖 Status Bot Telegram</b>
          <p class="help">Matikan bot saat maintenance. Pelanggan tidak dapat menjalankan menu/order dan hanya menerima pesan maintenance. Owner tetap dapat mengakses bot dan Dashboard.</p>
          <div class="field"><label class="label">Bot</label><select class="select" name="bot_enabled"><option value="true">🟢 ON — Bot dapat digunakan</option><option value="false">🔴 OFF — Mode maintenance</option></select></div>
          <div class="field"><label class="label">Pesan Saat Bot OFF</label><textarea class="textarea tall" name="bot_maintenance_message" maxlength="1500" placeholder="Contoh: 🛠️ Bot sedang maintenance selama ±15 menit. Silakan coba kembali nanti."></textarea><p class="help">Pesan ini dikirim ke pelanggan setiap kali mereka mencoba memakai bot saat status OFF. Bisa diubah kapan saja.</p></div>
        </div>
        <div class="field"><label class="label">Tombol Belanja & Cara Order</label><select class="select" name="bot_menu_mode"><option value="both">Marketplace + Daftar Produk</option><option value="marketplace">Marketplace saja</option><option value="products">Daftar Produk saja</option></select><p class="help">Marketplace saja: Cara Order tampil di Marketplace. Daftar Produk saja: Cara Order tampil di bot. Jika keduanya aktif, Cara Order tersedia di bot dan Marketplace. Perintah /produk tetap dapat digunakan.</p></div>
        <div class="row3">
          <div class="field"><label class="label">Total User di Menu /start</label><select class="select" name="show_total_users"><option value="true">Tampilkan</option><option value="false">Sembunyikan</option></select><p class="help">Jika disembunyikan, statistik user tetap ada di Dashboard tetapi tidak tampil ke pelanggan.</p></div>
          <div class="field"><label class="label">Wajib Join Channel</label><select class="select" name="join_required_enabled"><option value="false">Nonaktif</option><option value="true">Aktif</option></select><p class="help">Jika aktif, user harus menjadi member channel sebelum dapat memakai menu dan tombol bot.</p></div>
          <div class="field"><label class="label">Notifikasi Transaksi</label><select class="select" name="transaction_notifications_enabled"><option value="true">Aktif</option><option value="false">Nonaktif</option></select><p class="help">Mengirim transaksi berhasil ke channel log, termasuk order supplier ProdSeller.</p></div>
        </div>
        <div class="row">
          <div class="field"><label class="label">ID / Username Channel Wajib Join</label><input class="input" name="required_channel_id" placeholder="@channelanda atau -1001234567890"><p class="help">Untuk pengecekan member, bot harus menjadi admin channel. Public channel boleh memakai @username; private channel gunakan ID -100...</p></div>
          <div class="field"><label class="label">Link Join Channel</label><input class="input" name="required_channel_link" placeholder="https://t.me/channelanda atau link invite private"><p class="help">Link ini ditampilkan pada tombol Join Channel. Wajib diisi untuk private channel.</p></div>
        </div>
        <div class="field"><label class="label">Channel Notifikasi Transaksi</label><input class="input" name="transaction_channel_id" placeholder="@channel_log atau -1001234567890"><p class="help">Kosongkan untuk memakai CHANNEL_LOG dari Vercel. Bot harus memiliki izin mengirim pesan ke channel.</p></div>
        <div class="actions"><button class="btn cyan" id="testTransactionChannel" type="button">Tes Notifikasi Channel</button><button class="btn lime" id="retryTransactionNotifications" type="button">Pulihkan Notif 30 Order</button><button class="btn yellow" id="testRequiredChannel" type="button">Tes Cek Join Owner</button></div>
        <div class="row"><div class="field"><label class="label">Link Customer Service</label><input class="input" name="customer_service_link" placeholder="https://t.me/username_cs atau @username_cs"></div><div class="field"><label class="label">Link Grup / Channel</label><input class="input" name="group_link" placeholder="https://t.me/grupkamu atau @grupkamu"></div></div>
        <div class="field"><label class="label">Link Logo Marketplace</label><div class="linkFieldBox"><div class="linkFieldTitle">Logo Toko</div><input class="input" name="logo_url" placeholder="https://domain.com/logo.png atau link Google Drive"></div><p class="help">Logo tampil pada bagian kiri atas Marketplace.</p></div>
        <button class="btn lime" type="submit">Simpan Pengaturan Toko</button>
      </form>
    </div>
  </section>

  <section id="bannerSettings" class="section">
    <button class="btn yellow backButton" data-tab="settings" type="button">← Kembali ke Pengaturan</button>
    <div class="panel settingsPanel">
      <h2 class="sectionTitle">Banner Promosi</h2>
      <form id="bannerSettingsForm" class="form">
        <div class="formDivider withAction bannerManagerHead"><b>Banner Marketplace</b><div class="bannerAddActions"><button class="btn cyan small" id="addImageBannerRow" type="button">+ Banner Gambar</button><button class="btn lime small" id="addNativeBannerRow" type="button">+ Banner Bawaan</button></div></div>
        <div id="bannerRows" class="bannerEditorList"></div>
        <input type="hidden" name="banner_items" id="bannerItemsInput"><input type="hidden" name="banner_urls"><input type="hidden" name="banner_url"><input type="hidden" name="store_description" value="">
        <p class="help">Banner gambar dan banner bawaan bisa dicampur dalam satu slider. Gunakan tombol ↑ ↓ untuk mengatur urutan. Rasio banner tetap 2,39:1.</p>
        <div class="field"><label class="label">Kecepatan Pergantian Banner</label><input class="input" type="number" name="banner_interval_seconds" min="3" max="15" step="1" value="5"><p class="help">Banner bergeser otomatis ke kiri setiap 3–15 detik.</p></div>
        <button class="btn lime" type="submit">Simpan Banner Promosi</button>
      </form>
    </div>
  </section>

  <section id="startSettings" class="section">
    <button class="btn yellow backButton" data-tab="settings" type="button">← Kembali ke Pengaturan</button>
    <div class="panel settingsPanel">
      <h2 class="sectionTitle">Media saat user membuka /start</h2>
      <form id="startMediaForm" class="form">
        <div class="row"><div class="field"><label class="label">Jenis Media</label><select class="select" name="start_media_type"><option value="none">Tanpa media</option><option value="photo">Gambar toko</option><option value="sticker">Stiker Telegram</option></select></div><div class="field"><label class="label">URL / File ID</label><input class="input" name="start_media_value" placeholder="URL HTTPS gambar atau file_id stiker"></div></div>
        <div class="field"><label class="label">Caption /start</label><textarea class="textarea" name="start_media_caption" placeholder="Kosongkan untuk menggunakan pesan bawaan bot."></textarea></div>
        <p class="help">Gambar memakai URL HTTPS publik atau file_id Telegram. Stiker memakai file_id stiker Telegram.</p>
        <button class="btn lime" type="submit">Simpan Media /start</button>
      </form>
    </div>
  </section>

  <section id="walletSettings" class="section">
    <button class="btn yellow backButton" data-tab="settings" type="button">← Kembali ke Pengaturan</button>
    <div class="panel walletSettingsPanel">
      <h2 class="sectionTitle">Saldo, Referral & Top Up</h2>
      <p class="help">Saldo Utama berasal dari top up atau penyesuaian admin. Saldo Referral berasal dari undangan. Saat checkout, sistem memakai Saldo Utama terlebih dahulu, lalu Saldo Referral.</p>
      <form id="walletSettingsForm" class="form">
        <div class="walletSettingGrid">
          <div class="walletSettingCard">
            <h3>🔗 Program Referral</h3>
            <div class="field"><label class="label">Status Referral</label><select class="select" name="referral_enabled"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
            <div class="field"><label class="label">Hadiah per Undangan</label><input class="input" type="number" min="0" step="1" name="referral_reward_amount" placeholder="Contoh: 500"><p class="help">Nominal masuk ke Saldo Referral milik pengundang.</p></div>
            <div class="field"><label class="label">Kapan Hadiah Diberikan?</label><select class="select" name="referral_reward_mode"><option value="signup">Langsung saat pengguna baru membuka /start</option><option value="first_purchase">Setelah pengguna baru menyelesaikan pembelian pertama</option></select></div>
            <div class="referralModeHint">Mode <b>langsung</b> tidak mewajibkan orang yang diundang melakukan pembelian. Setiap akun Telegram hanya dapat memberikan satu hadiah referral.</div>
          </div>
          <div class="walletSettingCard">
            <h3>💳 Top Up & Pembayaran Saldo</h3>
            <div class="field"><label class="label">Fitur Top Up</label><select class="select" name="topup_enabled"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
            <div class="field"><label class="label">Bayar Produk dengan Saldo</label><select class="select" name="wallet_payment_enabled"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></div>
            <div class="row"><div class="field"><label class="label">Minimal Top Up</label><input class="input" type="number" min="1000" step="1000" name="topup_min_amount" placeholder="10000"></div><div class="field"><label class="label">Maksimal Top Up</label><input class="input" type="number" min="1000" step="1000" name="topup_max_amount" placeholder="1000000"></div></div>
            <p class="help">Top up dibuat melalui provider pembayaran aktif. Saldo baru bertambah setelah pembayaran tervalidasi.</p>
          </div>
        </div>
        <div class="walletPreview">
          <div class="detailItem"><b>Saldo Utama</b><br><span>Top up dan penyesuaian admin</span></div>
          <div class="detailItem"><b>Saldo Referral</b><br><span>Hadiah dari link undangan</span></div>
          <div class="detailItem"><b>Checkout</b><br><span>Utama → Referral</span></div>
        </div>
        <button class="btn lime" type="submit">Simpan Pengaturan Saldo</button>
      </form>
    </div>
  </section>

  <section id="supplierSettings" class="section">
    <button class="btn yellow backButton" data-tab="settings" type="button">← Kembali ke Pengaturan</button>
    <div class="panel supplierPanel">
      <div class="sectionToolbar compactToolbar"><div><h2 class="sectionTitle">Supplier / Reseller</h2><p class="help">Kelola bot supplier secara ringkas. Saldo diisi manual; stok tiap produk/varian dihitung dari <b>Saldo ÷ Modal Produk</b>, tanpa membaca saldo asli di bot supplier.</p></div><button class="btn lime" id="addResellerSupplier" type="button">+ Tambah Supplier</button></div>
      <div id="resellerSupplierList" class="supplierGrid"></div>
    </div>
    <details class="panel supplierPanel" id="prodsellerOptionalPanel">
      <summary class="sectionTitle" style="cursor:pointer">ProdSeller API (Opsional)</summary>
      <div class="sectionToolbar compactToolbar" style="margin-top:12px"><div><h2 class="sectionTitle">ProdSeller API</h2><p class="help">Saldo supplier tetap berada di akun ProdSeller. iLink hanya memakai API key server untuk membaca katalog, mengecek saldo, dan membeli produk setelah pelanggan membayar.</p></div><button class="btn cyan" id="refreshSupplier" type="button">Refresh Supplier</button></div>
      <div id="supplierConfigWarning" class="supplierConfigWarning hidden"></div>
      <div id="supplierStatus" class="supplierHero"></div>
      <form id="supplierSettingsForm" class="form">
        <div class="row3">
          <div class="field"><label class="label">Kurs 1 USDT → Rupiah</label><input class="input" type="number" min="1" step="1" name="prodseller_usdt_to_idr" placeholder="16500"><p class="help">Dipakai menghitung modal Rupiah dan saran harga jual. Atur manual sesuai kurs yang Anda inginkan.</p></div>
          <div class="field"><label class="label">Markup Default (%)</label><input class="input" type="number" min="0" step="1" name="prodseller_markup_percent" placeholder="25"><p class="help">Hanya untuk saran harga saat memilih produk. Harga jual tetap bisa Anda ubah per produk.</p></div>
          <div class="field"><label class="label">Kategori Default</label><input class="input" name="prodseller_default_category" placeholder="Produk Digital"></div>
        </div>
        <button class="btn lime" type="submit">Simpan Pengaturan Supplier</button>
      </form>
    <div class="panel">
      <div class="sectionToolbar compactToolbar"><div><h2 class="sectionTitle">Pilih Produk yang Mau Direseller</h2><p class="help">Klik <b>Resellerkan</b> pada produk yang ingin dimasukkan ke katalog iLink. Produk yang sudah dipilih dapat di-update harga jualnya dari sini.</p></div></div>
      <div class="supplierToolbar"><input id="supplierSearch" class="input" placeholder="Cari produk ProdSeller..."><span class="chip" id="supplierProductCount">0 produk</span></div>
      <div id="supplierProductList" class="supplierGrid"></div>
    </div>
    <div class="panel">
      <h2 class="sectionTitle">Order Supplier Terakhir</h2>
      <p class="help">Jika pelanggan sudah membayar tetapi supplier gagal karena saldo/stok, cek saldo ProdSeller lalu tekan <b>Retry Supplier</b>. Invoice yang sama dipakai kembali sehingga aman dari double-charge.</p>
      <div id="supplierOrderList" class="supplierOrderList"></div>
    </div>
    </details>
  </section>

  <section id="workflowSettings" class="section">
    <button class="btn yellow backButton" data-tab="settings" type="button">← Kembali ke Pengaturan</button>
    <div class="panel workflowPanel">
      <div class="sectionToolbar compactToolbar"><div><h2 class="sectionTitle">🎙️ Workflow Reseller · Rekam Bot Supplier</h2><p class="help">Ajari sistem seperti Anda order manual: kirim <b>/start</b>, pilih tombol supplier atau kirim teks untuk setiap step. Setelah balasan terakhir berisi produk, tandai sebagai <b>Hasil Produk</b> lalu aktifkan workflow.</p></div><button class="btn cyan" id="workflowRefreshAll" type="button">Refresh</button></div>
      <div id="workflowUserbotStatus" class="workflowStatus"></div>
      <div class="workflowHint"><b>Penting:</b> akun Telegram supplier dijalankan sebagai userbot memakai <code>TG_API_ID</code>, <code>TG_API_HASH</code>, dan <code>TG_STRING_SESSION</code> di Vercel. Satu bot supplier diproses bergantian agar percakapan order tidak saling tertukar.</div>
      <form id="workflowCreateForm" class="form" style="margin-top:12px">
        <div class="row"><div class="field"><label class="label">Produk yang Dituju</label><select class="select" id="workflowTarget" required></select><input type="hidden" id="workflowProduct" name="product_code"><input type="hidden" id="workflowVariant" name="variant_key"><p class="help">Jika produk mempunyai varian, setiap varian tampil sebagai pilihan terpisah.</p></div><div class="field"><label class="label">Supplier</label><select class="select" id="workflowSupplier" name="supplier_id" required></select><input type="hidden" id="workflowTargetUsername" name="target_username"><p class="help">Supplier dibuat dari menu Supplier / Reseller. Bot tujuan mengikuti supplier tersebut.</p></div></div>
        <div class="row4"><div class="field"><label class="label">Nama Workflow</label><input class="input" name="name" placeholder="Contoh: Canva Supplier 1"></div><div class="field"><label class="label">Modal Produk / Item</label><input class="input" type="number" min="0" step="1" name="unit_cost_idr" placeholder="Contoh: 2500"><p class="help">Stok = saldo manual supplier ÷ modal ini.</p></div><div class="field"><label class="label">Jumlah Contoh Saat Rekam</label><input class="input" type="number" min="1" name="sample_quantity" value="1"><p class="help">Step jumlah mengirim angka contoh ini saat rekam.</p></div><div class="field"><label class="label">Default Tunggu Balasan / Step</label><input class="input" type="number" min="1500" max="30000" step="500" name="step_timeout_ms" value="7000"><p class="help">Milidetik. Dipakai bila step tidak mempunyai waktu tunggu khusus.</p></div></div>
        <button class="btn lime" type="submit">🔴 Mulai Rekam Workflow</button>
      </form>
    </div>

    <div class="panel" id="workflowRecorderPanel">
      <div class="sectionToolbar compactToolbar"><div><h2 class="sectionTitle">Recorder</h2><p class="help" id="workflowRecorderTitle">Pilih atau buat workflow untuk mulai merekam.</p></div><select class="select" id="workflowSelect" style="max-width:420px"></select></div>
      <div class="workflowRecorder">
        <div>
          <div class="workflowMessage"><b>Pesan bot supplier yang diterima</b><p class="help">Recorder berjalan terus selama workflow masih <b>MODE REKAM</b> dan balasan step terakhir belum dipilih. Pesan loading/sementara, edit pesan, serta pesan yang kemudian hilang tetap disimpan sebagai riwayat. Jika SATU pesan memiliki beberapa pilihan yang harus diklik berurutan, misalnya Paket → Durasi → Jumlah → Konfirmasi, klik saja semuanya seperti order manual. Bila klik tidak menghasilkan pesan baru, recorder otomatis menyimpan step sebagai Lanjut di Pesan yang Sama dan tetap menampilkan tombol berikutnya. Setelah memilih pesan final, Anda dapat <b>blok/select bagian dinamis produk atau stok</b>.</p><div id="workflowLastMessage"><div class="empty">Belum ada balasan. Pilih kategori teks lalu kirim /start atau perintah lain.</div></div></div>
          <div class="workflowCategoryBox" id="workflowTextCategoryBox" style="margin-top:12px">
            <div class="field"><label class="label">Kategori Step Teks</label><select class="select" id="workflowTextCategory"><option value="other">Teks / Perintah Lainnya</option><option value="quantity">Jumlah Pembelian</option></select></div>
            <div id="workflowQuantityBox" class="hidden"><div class="workflowHint"><b>Jumlah Pembelian:</b> sistem otomatis merekam <code>{quantity}</code>. Saat latihan dikirim sesuai <b>Jumlah Contoh</b>; saat order asli nilainya mengikuti jumlah yang dibeli customer.</div></div>
            <div id="workflowOtherTextBox" class="field" style="margin-top:9px"><label class="label">Teks untuk Step Berikutnya</label><textarea class="textarea" id="workflowTextInput" placeholder="Contoh: /start, Tidak, email, kode, atau perintah lain. Bisa gunakan {invoice}, {username}, {telegram_id}, {custom_input}"></textarea><div class="workflowPlaceholder"><button class="btn small yellow" type="button" data-workflow-insert="/start">/start</button><button class="btn small purple" type="button" data-workflow-insert="{invoice}">{invoice}</button><button class="btn small purple" type="button" data-workflow-insert="{username}">{username}</button><button class="btn small purple" type="button" data-workflow-insert="{custom_input}">{custom_input}</button></div></div>
          </div>
          <div class="actions" style="margin-top:9px"><button class="btn cyan" id="workflowSendText" type="button">✍️ Kirim Teks & Rekam</button><button class="btn yellow" id="workflowRefreshMessage" type="button">🔄 Refresh Pesan Supplier</button><button class="btn lime" id="workflowMarkResult" type="button" title="Blok bagian teks produk pada pesan terpilih">📦 Bagian Terpilih = Produk</button><button class="btn purple" id="workflowMarkStock" type="button" title="Blok nilai stok untuk membuat batas teks sebelum/sesudah">📊 Bagian Terpilih = Stok</button></div><div class="workflowHint" style="margin-top:9px"><b>Untuk stok live:</b> blok nilai stok pada pesan yang muncul <b>sebelum</b> tombol Buy/Konfirmasi. Angka saat rekam hanya contoh; yang disimpan adalah teks sebelum/sesudahnya. Saat customer memilih produk/varian, sistem hanya replay sampai step stok lalu berhenti—tidak menjalankan step pembelian.</div>
        </div>
        <div><h3 style="margin-top:0">Langkah Terekam</h3><div id="workflowStepList" class="workflowSteps"></div><div class="actions" style="margin-top:10px"><button class="btn cyan" id="workflowEdit" type="button">✏️ Edit Workflow</button><button class="btn purple" id="workflowCopy" type="button">📄 Salin Workflow</button><button class="btn yellow" id="workflowUndo" type="button">↩️ Hapus Step Terakhir</button><button class="btn lime" id="workflowActivate" type="button">✅ Selesai & Aktifkan</button><button class="btn red" id="workflowDelete" type="button">🗑️ Hapus Workflow</button></div></div>
      </div>
    </div>

    <div class="panel"><h2 class="sectionTitle">Workflow Tersimpan</h2><div id="workflowList" class="workflowList"></div></div>
    <div class="panel"><h2 class="sectionTitle">Order Workflow Terakhir</h2><p class="help">Status <b>ATTENTION</b> berarti aksi ke supplier mungkin sudah terkirim tetapi balasan tidak terbaca. Jangan restart sembarangan jika bisa menyebabkan pembelian ganda. Periksa chat supplier dahulu.</p><div id="workflowRunList" class="workflowList"></div></div>
  </section>
</div>
<div id="modal" class="modal"><div class="modalBox"><div class="modalHead"><h2 id="modalTitle" class="modalTitle">Modal</h2><button id="modalClose" class="closeBtn">Tutup</button></div><div id="modalBody"></div></div></div>
<div id="toast" class="toast"></div>
<script>
(function(){
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { try { tg.ready(); tg.expand(); } catch(e) {} }
  var initData = tg && tg.initData ? tg.initData : '';
  var state = { stats:{}, products:[], orders:[], poOrders:[], users:[], vouchers:[], polls:[], settings:{}, analytics:{}, maintenance:{}, backups:[], promos:[], deepStats:{}, license:{}, promoTargets:[], supplierStatus:{}, supplierProducts:[], supplierOrders:[], resellerSuppliers:[], supplierLoaded:false, workflowStatus:{}, workflows:[], workflowRuns:[], workflowDetail:null, workflowLoaded:false };
  var workflowRecorderBusy=false, workflowRecorderActionLock=false, workflowRecorderLoopStarted=false, workflowRecorderLoopGeneration=0;
  function rupiah(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)); }
  function displayRef(v){ var original=String(v==null?'':v).trim(); var cleaned=original.replace(/^AUTOGOPAY(?:[-_: ]+)?/i,''); return cleaned||original||'-'; }
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
  function updateSearchCounter(){ var q=searchQuery(); var el=document.getElementById('productCounter'); if(!el) return; if(!q){ el.textContent=''; el.classList.add('hidden'); return; } var pc=state.products.filter(function(p){return productMatches(p,q);}).length; var oc=state.orders.filter(function(o){return orderMatches(o,q);}).length; var uc=state.users.filter(function(u){return userMatches(u,q);}).length; var vc=getUnifiedPromoRows().filter(function(x){return promoMatches(x,q);}).length; el.textContent='Hasil: '+pc+' produk · '+oc+' penjualan · '+uc+' user · '+vc+' promo/voucher'; el.classList.remove('hidden'); }
  function rupiahShort(n){ n=Number(n||0); if(Math.abs(n)>=1000000000) return 'Rp'+(n/1000000000).toFixed(n%1000000000?1:0).replace('.0','')+'M'; if(Math.abs(n)>=1000000) return 'Rp'+(n/1000000).toFixed(n%1000000?1:0).replace('.0','')+'jt'; if(Math.abs(n)>=1000) return 'Rp'+Math.round(n/1000)+'rb'; return 'Rp'+n; }
  function setPromoSub(mode){ mode=mode||'list'; var list=document.getElementById('promoListPanel'); var create=document.getElementById('promoCreatePanel'); var flash=document.getElementById('promoFlashPanel'); if(list) list.classList.toggle('hidden', mode!=='list'); if(create) create.classList.toggle('hidden', mode!=='create'); if(flash) flash.classList.toggle('hidden', mode!=='flash'); document.querySelectorAll('[data-promo-sub]').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.promoSub===mode); }); var target=mode==='create'?create:(mode==='flash'?flash:list); if(target) setTimeout(function(){ target.scrollIntoView({behavior:'smooth',block:'start'}); },20); }
  function switchTab(id, opts){ opts=opts||{}; var settingsToolTabs={storeSettings:1,bannerSettings:1,startSettings:1,walletSettings:1,supplierSettings:1,workflowSettings:1,license:1,maintenance:1,backup:1,deepStats:1}; document.querySelectorAll('.tile[data-tab]').forEach(function(x){x.classList.remove('active'); x.setAttribute('aria-selected','false');}); document.querySelectorAll('.section').forEach(function(x){x.classList.remove('active');}); document.querySelectorAll('.tile[data-tab="'+id+'"]').forEach(function(x){x.classList.add('active'); x.setAttribute('aria-selected','true');}); document.querySelectorAll('.settingsSubBtn').forEach(function(x){x.classList.remove('active');}); if(settingsToolTabs[id]){ document.querySelectorAll('.navTiles .tile[data-tab="settings"]').forEach(function(x){x.classList.add('active'); x.setAttribute('aria-selected','true');}); document.querySelectorAll('.settingsSubBtn[data-tab="'+id+'"]').forEach(function(x){x.classList.add('active');}); } var section=document.getElementById(id); if(section) section.classList.add('active'); try{ localStorage.setItem('admin_active_tab', id); }catch(e){} var target=document.getElementById(opts.scrollTarget||id)||section; if(opts.smooth && target){ setTimeout(function(){ target.scrollIntoView({behavior:'smooth',block:'start'}); },25); } else { window.scrollTo(0,0); } }
  function openModal(title, html){ document.getElementById('modalTitle').textContent=title; document.getElementById('modalBody').innerHTML=html; document.body.classList.add('modalOpen'); document.getElementById('modal').classList.add('show'); }
  function closeModal(){ document.getElementById('modal').classList.remove('show'); document.getElementById('modalBody').innerHTML=''; document.body.classList.remove('modalOpen'); }
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modal').addEventListener('click',function(e){ if(e.target.id==='modal') closeModal(); });
  function bulkToText(rows){ return (rows||[]).map(function(x){return (x.min_qty||x.qty||'')+'|'+(x.price||x.harga||'');}).join('\n'); }
  function variantStock(v){ return Array.isArray(v&&v.stock) ? v.stock : []; }
  function variantActive(v){ return !(v && v.active === false); }
  function variantBulkText(v){ return bulkToText((v&&v.bulk_prices)||[]).replace(/\|/g,':').replace(/\n/g,','); }
  function variantsToText(rows){ return (rows||[]).map(function(x,i){ var stock=variantStock(x).join(','); var bulk=variantBulkText(x); return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||('VAR'+(i+1)),stock,bulk,x.description||x.deskripsi||'',x.snk||x.terms||'',variantActive(x)?'on':'off',x.cost_price||x.cost||0].join('|'); }).join('\n'); }
  function variantHelp(){ return '<div class="ghost">Contoh samar:<br>1 Bulan|10000|BULAN1|akun1,akun2|5:9000,10:8000|Deskripsi khusus 1 bulan|SnK khusus 1 bulan<br>Lifetime|50000|LIFE|kode1,kode2|3:45000|Deskripsi lifetime|SnK lifetime</div>'; }
  function cleanListText(value){ return String(value||'').split(/[\n,]+/).map(function(x){return x.trim();}).filter(Boolean); }
  function parseBulkArray(value){
    return String(value||'').split(/[\n,]+/).map(function(line){
      var parts=String(line||'').split(/[=|:;]/).map(function(x){return x.trim();}).filter(Boolean);
      return {min_qty:Number(String(parts[0]||'').replace(/[^0-9]/g,'')||0), price:Number(String(parts[1]||'').replace(/[^0-9]/g,'')||0)};
    }).filter(function(x){return x.min_qty>0 && x.price>0;});
  }
  function variantMetaToText(rows){ return (rows||[]).map(function(x,i){ return [x.name||x.nama||'',x.price||x.harga||'',x.sku||x.kode||('VAR'+(i+1)),variantBulkText(x),x.description||x.deskripsi||'',x.snk||x.terms||'',variantActive(x)?'on':'off',x.cost_price||x.cost||0].join('|'); }).join('\n'); }
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
      return [parts[0]||'',parts[1]||'',sku,stock,parts[3]||'',parts[4]||'',parts[5]||'',active,parts[7]||old.cost_price||old.cost||0].join('|');
    }).filter(Boolean).join('\n');
  }
  function mergeVariantStockArray(product, mode){
    var existing=product.variants||[];
    return existing.map(function(v,i){
      var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase();
      var el=document.querySelector('[data-stock-field="'+sku.replace(/"/g,'&quot;')+'"]');
      var input=el?cleanListText(el.value):[];
      var isSupplierVariant=isExternalSupplierLink(v); var isWorkflowVariant=isWorkflowSupplierLink(v);
      var stock=isSupplierVariant ? (isWorkflowVariant ? variantStock(v) : []) : (mode==='append' ? variantStock(v).concat(input) : input);
      return {
        name:v.name||v.nama||'',
        price:v.price||v.harga||0,
        cost_price:v.cost_price||v.cost||0,
        sku:sku,
        stock:stock,
        bulk_prices:Array.isArray(v.bulk_prices)?v.bulk_prices:parseBulkArray(variantBulkText(v)),
        description:v.description||v.deskripsi||'',
        snk:v.snk||v.terms||'',
        delivery_mode:isSupplierVariant?'po':(v.delivery_mode||''),
        active:variantActive(v),
        supplier_source:v.supplier_source||'',
        supplier_product_id:v.supplier_product_id||'',
        supplier_price_usdt:v.supplier_price_usdt||0,
        supplier_public_price_usdt:v.supplier_public_price_usdt||0,
        supplier_stock:v.supplier_stock==null?null:v.supplier_stock,
        supplier_synced_at:v.supplier_synced_at||null
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
      '<div class="row4"><div class="field"><label class="label">Nama Varian</label><input class="input" data-vfield="name" placeholder="Contoh: 1 Bulan" value="'+esc(data.name||'')+'"></div><div class="field"><label class="label">Harga Jual Varian</label><input class="input" data-vfield="price" type="number" placeholder="Contoh: 10000" value="'+esc(data.price||'')+'"></div><div class="field"><label class="label">Modal Supplier</label><input class="input" data-vfield="cost" type="number" min="0" placeholder="Contoh: 7000" value="'+esc(data.cost_price||data.cost||'')+'"></div><div class="field"><label class="label">Kode Varian</label><input class="input" data-vfield="sku" placeholder="Contoh: BULAN1" value="'+esc(data.sku||'')+'"></div></div>'+ 
      '<div class="field"><label class="label">Sistem Pengiriman Varian</label><select class="select" data-vfield="delivery"><option value="" '+(!data.delivery_mode?'selected':'')+'>Ikuti pengaturan produk</option><option value="auto" '+(String(data.delivery_mode||'')==='auto'?'selected':'')+'>AUTO · kirim dari stok</option><option value="po" '+(String(data.delivery_mode||'')==='po'?'selected':'')+'>PRE-ORDER · seller kirim manual</option></select><p class="help">Bisa berbeda untuk setiap varian. PRE-ORDER tidak memotong stok saat pembayaran.</p></div>'+ 
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
        cost_price:val('cost'),
        sku:val('sku'),
        stock:cleanListText(val('stock')),
        bulk_prices:parseBulkArray(val('bulk')),
        description:val('description'),
        snk:val('snk'),
        delivery_mode:val('delivery'),
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
    renderFlashSaleForm();
  }
  function defaultNativeBanner(index){
    return {
      type:'native',
      name:'Banner Bawaan '+(Number(index||0)+1),
      kicker:'BELANJA PRODUK DIGITAL',
      title:'Cepat, aman, langsung terkirim',
      description:'Bayar dengan QRIS atau saldo. Produk otomatis dikirim ke Telegram setelah pembayaran berhasil.',
      background_color:'#1769e0',
      background_color_2:'#0d47a1',
      text_color:'#ffffff',
      accent_color:'#ffe15a',
      text_position:'left',
      vertical_position:'center',
      button_text:'Belanja Sekarang',
      button_target:'catalog'
    };
  }
  function parseAdminBannerItems(s){
    var rows=[];
    try{ if(s.banner_items){ var x=typeof s.banner_items==='string'?JSON.parse(s.banner_items):s.banner_items; if(Array.isArray(x)) rows=x; } }catch(e){}
    if(!rows.length){
      var legacy=String(s.banner_urls||s.banner_url||'').split(/\r?\n|;/).map(function(x){return x.trim();}).filter(Boolean);
      rows=legacy.map(function(url,i){return {type:'image',name:'Banner '+(i+1),url:url};});
    }
    return rows.slice(0,12).map(function(x,i){
      x=(x&&typeof x==='object')?x:{url:String(x||'')};
      var type=String(x.type||x.kind||(x.url?'image':'native')).toLowerCase()==='native'?'native':'image';
      if(type==='native'){
        var base=defaultNativeBanner(i);
        Object.keys(base).forEach(function(k){ if(x[k]!==undefined&&x[k]!==null&&String(x[k])!=='') base[k]=String(x[k]); });
        base.type='native';
        base.name=String(x.name||base.name);
        return base;
      }
      return {type:'image',name:String(x.name||('Banner '+(i+1))),url:String(x.url||x.link||x.image_url||'')};
    });
  }
  function bannerPreviewContentHtml(item,index){
    item=item||{};
    var type=String(item.type||item.kind||(item.url?'image':'native')).toLowerCase()==='native'?'native':'image';
    if(type==='image'){
      var url=String(item.url||'').trim();
      return '<div class="bannerAdminPreview image'+(url?' hasImage':'')+'">'+(url?'<img src="'+esc(url)+'" alt="Preview banner '+(index+1)+'" onerror="this.style.display=\'none\';this.parentNode.classList.remove(\'hasImage\')">':'')+'<span class="bannerPreviewEmpty">Masukkan URL gambar melalui tombol Edit</span></div>';
    }
    var position=['left','center','right'].indexOf(String(item.text_position||'left'))>=0?String(item.text_position):'left';
    var vertical=['top','center','bottom'].indexOf(String(item.vertical_position||'center'))>=0?String(item.vertical_position):'center';
    var bg1=String(item.background_color||'#1769e0'), bg2=String(item.background_color_2||'#0d47a1'), text=String(item.text_color||'#ffffff'), accent=String(item.accent_color||'#ffe15a');
    return '<div class="bannerAdminPreview native pos-'+position+' vpos-'+vertical+'" style="--preview-bg1:'+esc(bg1)+';--preview-bg2:'+esc(bg2)+';--preview-text:'+esc(text)+';--preview-accent:'+esc(accent)+'"><span class="bannerPreviewDecor" aria-hidden="true"></span><div class="bannerPreviewContent">'+
      (item.kicker?'<span class="bannerPreviewKicker">'+esc(item.kicker)+'</span>':'')+
      (item.title?'<strong class="bannerPreviewTitle">'+esc(item.title)+'</strong>':'')+
      (item.description?'<span class="bannerPreviewDescription">'+esc(item.description)+'</span>':'')+
      (item.button_target!=='none'&&item.button_text?'<span class="bannerPreviewButton">'+esc(item.button_text)+'</span>':'')+
      '</div></div>';
  }
  function bannerRowData(row,index){
    var type=String((row.querySelector('[data-banner-type]')||{}).value||'image');
    var name=String((row.querySelector('[data-banner-name]')||{}).value||('Banner '+(index+1))).trim();
    if(type==='native'){
      return {type:'native',name:name||('Banner Bawaan '+(index+1)),kicker:String((row.querySelector('[data-banner-kicker]')||{}).value||'').trim(),title:String((row.querySelector('[data-banner-title]')||{}).value||'').trim(),description:String((row.querySelector('[data-banner-description]')||{}).value||'').trim(),background_color:String((row.querySelector('[data-banner-bg]')||{}).value||'#1769e0'),background_color_2:String((row.querySelector('[data-banner-bg2]')||{}).value||'#0d47a1'),text_color:String((row.querySelector('[data-banner-text-color]')||{}).value||'#ffffff'),accent_color:String((row.querySelector('[data-banner-accent]')||{}).value||'#ffe15a'),text_position:String((row.querySelector('[data-banner-position]')||{}).value||'left'),vertical_position:String((row.querySelector('[data-banner-vertical]')||{}).value||'center'),button_text:String((row.querySelector('[data-banner-button-text]')||{}).value||'').trim(),button_target:String((row.querySelector('[data-banner-button-target]')||{}).value||'catalog')};
    }
    return {type:'image',name:name||('Banner Gambar '+(index+1)),url:String((row.querySelector('[data-banner-url]')||{}).value||'').trim()};
  }
  function bannerRowHtml(item,index){
    item=item||{};
    var type=String(item.type||item.kind||(item.url?'image':'native')).toLowerCase()==='native'?'native':'image';
    if(type==='native') item=Object.assign(defaultNativeBanner(index),item,{type:'native'});
    var common='<div class="field"><label class="label">Nama Internal Banner</label><input class="input" data-banner-name placeholder="Contoh: Promo Agustus" value="'+esc(item.name||('Banner '+(index+1)))+'"></div><input type="hidden" data-banner-type value="'+type+'">';
    var editor='';
    if(type==='image'){
      editor=common+'<div class="field"><label class="label">URL Gambar Banner</label><input class="input bannerUrl" data-banner-url placeholder="https://domain.com/banner.jpg atau link Google Drive" value="'+esc(item.url||'')+'"></div><p class="help">Nama hanya untuk dashboard dan tidak ditampilkan di Marketplace.</p>';
    }else{
      editor=common+
        '<div class="row"><div class="field"><label class="label">Teks Kecil</label><input class="input" data-banner-kicker value="'+esc(item.kicker||'')+'" placeholder="BELANJA PRODUK DIGITAL"></div><div class="field"><label class="label">Judul Utama</label><input class="input" data-banner-title value="'+esc(item.title||'')+'" placeholder="Cepat, aman, langsung terkirim"></div></div>'+
        '<div class="field"><label class="label">Deskripsi</label><textarea class="textarea compact" data-banner-description placeholder="Deskripsi singkat banner">'+esc(item.description||'')+'</textarea></div>'+
        '<div class="bannerColorGrid"><label class="colorField"><span>Warna 1</span><input type="color" data-banner-bg value="'+esc(item.background_color||'#1769e0')+'"></label><label class="colorField"><span>Warna 2</span><input type="color" data-banner-bg2 value="'+esc(item.background_color_2||'#0d47a1')+'"></label><label class="colorField"><span>Warna Teks</span><input type="color" data-banner-text-color value="'+esc(item.text_color||'#ffffff')+'"></label><label class="colorField"><span>Warna Aksen</span><input type="color" data-banner-accent value="'+esc(item.accent_color||'#ffe15a')+'"></label></div>'+
        '<div class="row"><div class="field"><label class="label">Posisi Teks</label><select class="select" data-banner-position><option value="left"'+(item.text_position==='left'?' selected':'')+'>Kiri</option><option value="center"'+(item.text_position==='center'?' selected':'')+'>Tengah</option><option value="right"'+(item.text_position==='right'?' selected':'')+'>Kanan</option></select></div><div class="field"><label class="label">Posisi Vertikal</label><select class="select" data-banner-vertical><option value="top"'+(item.vertical_position==='top'?' selected':'')+'>Atas</option><option value="center"'+(item.vertical_position==='center'?' selected':'')+'>Tengah</option><option value="bottom"'+(item.vertical_position==='bottom'?' selected':'')+'>Bawah</option></select></div></div>'+
        '<div class="row"><div class="field"><label class="label">Teks Tombol</label><input class="input" data-banner-button-text value="'+esc(item.button_text||'Belanja Sekarang')+'" placeholder="Belanja Sekarang"></div><div class="field"><label class="label">Aksi Tombol</label><select class="select" data-banner-button-target><option value="catalog"'+(item.button_target==='catalog'?' selected':'')+'>Buka Katalog</option><option value="cara_order"'+(item.button_target==='cara_order'?' selected':'')+'>Cara Order</option><option value="none"'+(item.button_target==='none'?' selected':'')+'>Tanpa Tombol</option></select></div></div>'+
        '<p class="help">Banner bawaan dirender langsung oleh Marketplace, jadi tidak perlu gambar.</p>';
    }
    editor+='<button class="btn red bannerDelete" type="button" data-remove-banner>Hapus Banner</button>';
    return '<div class="bannerEditorCard '+(type==='native'?'nativeBannerEditor':'imageBannerEditor')+'" data-banner-row><div class="bannerPreviewWrap" data-banner-preview-wrap>'+bannerPreviewContentHtml(item,index)+'</div><div class="bannerCardActions"><button class="btn cyan small" type="button" data-banner-edit-toggle>✎ Edit</button><button class="btn yellow small bannerPositionButton" type="button" data-banner-position-toggle>↕ Posisi Banner</button></div><div class="bannerEditPanel">'+editor+'</div><div class="bannerPositionPanel"><div class="bannerPositionInfo"><span class="bannerOrderNumber">'+(index+1)+'</span><span>Posisi banner dalam slider</span></div><div class="bannerOrderTools"><button class="btn small bannerMove" type="button" data-banner-up>← Sebelumnya</button><button class="btn small bannerMove" type="button" data-banner-down>Berikutnya →</button></div></div></div>';
  }
  function syncBannerPreview(row){
    if(!row)return;
    var rows=Array.from(document.querySelectorAll('[data-banner-row]'));
    var index=Math.max(0,rows.indexOf(row));
    var wrap=row.querySelector('[data-banner-preview-wrap]');
    if(wrap)wrap.innerHTML=bannerPreviewContentHtml(bannerRowData(row,index),index);
  }
  function renumberBannerRows(){
    var rows=Array.from(document.querySelectorAll('[data-banner-row]'));
    rows.forEach(function(row,i){
      var n=row.querySelector('.bannerOrderNumber'); if(n)n.textContent=String(i+1);
      var up=row.querySelector('[data-banner-up]'); var down=row.querySelector('[data-banner-down]');
      if(up)up.disabled=i===0; if(down)down.disabled=i===rows.length-1;
      syncBannerPreview(row);
    });
  }
  function wireBannerRows(){
    document.querySelectorAll('[data-banner-edit-toggle]').forEach(function(btn){btn.onclick=function(){var row=btn.closest('[data-banner-row]');if(!row)return;var open=!row.classList.contains('editing');row.classList.toggle('editing',open);row.classList.remove('positioning');btn.textContent=open?'✕ Tutup Edit':'✎ Edit';var pos=row.querySelector('[data-banner-position-toggle]');if(pos)pos.textContent='↕ Posisi Banner';};});
    document.querySelectorAll('[data-banner-position-toggle]').forEach(function(btn){btn.onclick=function(){var row=btn.closest('[data-banner-row]');if(!row)return;var open=!row.classList.contains('positioning');row.classList.toggle('positioning',open);row.classList.remove('editing');btn.textContent=open?'✕ Tutup Posisi':'↕ Posisi Banner';var edit=row.querySelector('[data-banner-edit-toggle]');if(edit)edit.textContent='✎ Edit';};});
    document.querySelectorAll('[data-remove-banner]').forEach(function(btn){btn.onclick=function(){var row=btn.closest('[data-banner-row]');if(row&&confirm('Hapus banner ini?'))row.remove();renumberBannerRows();};});
    document.querySelectorAll('[data-banner-up]').forEach(function(btn){btn.onclick=function(){var row=btn.closest('[data-banner-row]');if(row&&row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);renumberBannerRows();};});
    document.querySelectorAll('[data-banner-down]').forEach(function(btn){btn.onclick=function(){var row=btn.closest('[data-banner-row]');if(row&&row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);renumberBannerRows();};});
    document.querySelectorAll('[data-banner-row] input,[data-banner-row] textarea,[data-banner-row] select').forEach(function(input){var handler=function(){syncBannerPreview(input.closest('[data-banner-row]'));};input.oninput=handler;input.onchange=handler;});
    renumberBannerRows();
  }
  function renderBannerRows(items){
    var box=document.getElementById('bannerRows'); if(!box)return;
    var rows=(items&&items.length?items:[defaultNativeBanner(0)]).slice(0,12);
    box.innerHTML=rows.map(bannerRowHtml).join('');
    wireBannerRows();
  }
  function addBannerRow(type){
    var box=document.getElementById('bannerRows'); if(!box)return;
    var count=box.querySelectorAll('[data-banner-row]').length;
    if(count>=12)return toast('Maksimal 12 banner.',true);
    var empty=document.getElementById('emptyBannerManager'); if(empty)empty.remove();
    var item=type==='native'?defaultNativeBanner(count):{type:'image',name:'Banner Gambar '+(count+1),url:''};
    box.insertAdjacentHTML('beforeend',bannerRowHtml(item,count)); wireBannerRows();
    var rows=box.querySelectorAll('[data-banner-row]'); if(rows.length){var last=rows[rows.length-1];last.classList.add('editing');var edit=last.querySelector('[data-banner-edit-toggle]');if(edit)edit.textContent='✕ Tutup Edit';last.scrollIntoView({behavior:'smooth',block:'nearest'});}
  }
  function collectBannerRows(){
    return Array.from(document.querySelectorAll('[data-banner-row]')).map(function(row,i){return bannerRowData(row,i);}).filter(function(x){return x.type==='native'?(x.title||x.description||x.kicker):x.url;}).slice(0,12);
  }
  function datetimeLocalValue(value){ if(!value)return ''; var text=String(value).trim(); var m=text.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/); if(m)return m[1]; try{var d=new Date(text);if(isNaN(d.getTime()))return '';var pad=function(n){return String(n).padStart(2,'0');};return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());}catch(e){return '';} }
  function renderSettingsForm(){ var s=state.settings||{}; var store=document.getElementById('storeSettingsForm'); var banner=document.getElementById('bannerSettingsForm'); var start=document.getElementById('startMediaForm'); var wallet=document.getElementById('walletSettingsForm'); var supplier=document.getElementById('supplierSettingsForm'); if(store){ ['store_name','logo_url','customer_service_link','group_link','bot_menu_mode','bot_enabled','bot_maintenance_message','show_total_users','join_required_enabled','required_channel_id','required_channel_link','transaction_notifications_enabled','transaction_channel_id'].forEach(function(k){ if(store[k]) store[k].value=s[k]!==undefined&&s[k]!==null?String(s[k]):''; }); if(store.bot_enabled&&!store.bot_enabled.value)store.bot_enabled.value='true'; if(store.show_total_users&&!store.show_total_users.value)store.show_total_users.value='true'; if(store.join_required_enabled&&!store.join_required_enabled.value)store.join_required_enabled.value='false'; if(store.transaction_notifications_enabled&&!store.transaction_notifications_enabled.value)store.transaction_notifications_enabled.value='true'; } if(banner){ if(banner.banner_interval_seconds) banner.banner_interval_seconds.value=s.banner_interval_seconds||'5'; if(banner.store_description) banner.store_description.value=''; if(banner.banner_url) banner.banner_url.value=''; renderBannerRows(parseAdminBannerItems(s)); } if(start){ ['start_media_type','start_media_value','start_media_caption'].forEach(function(k){ if(start[k]) start[k].value=s[k]||(k==='start_media_type'?'none':''); }); } if(wallet){ wallet.referral_enabled.value=String(s.referral_enabled===undefined?'true':s.referral_enabled).toLowerCase()==='false'?'false':'true'; wallet.referral_reward_amount.value=Number(s.referral_reward_amount||500); wallet.referral_reward_mode.value=String(s.referral_reward_mode||'signup')==='first_purchase'?'first_purchase':'signup'; wallet.topup_enabled.value=String(s.topup_enabled===undefined?'true':s.topup_enabled).toLowerCase()==='false'?'false':'true'; wallet.wallet_payment_enabled.value=String(s.wallet_payment_enabled===undefined?'true':s.wallet_payment_enabled).toLowerCase()==='false'?'false':'true'; wallet.topup_min_amount.value=Number(s.topup_min_amount||10000); wallet.topup_max_amount.value=Number(s.topup_max_amount||1000000); } if(supplier){ supplier.prodseller_usdt_to_idr.value=Number(s.prodseller_usdt_to_idr||16500); supplier.prodseller_markup_percent.value=Number(s.prodseller_markup_percent||25); supplier.prodseller_default_category.value=String(s.prodseller_default_category||'Produk Digital'); } }
  function renderFlashSaleForm(){
    var s=state.settings||{}; var f=document.getElementById('flashSaleForm'); if(!f) return;
    f.flash_sale_enabled.value=String(s.flash_sale_enabled||'false').toLowerCase()==='true'?'true':'false';
    f.flash_sale_title.value=s.flash_sale_title||'FLASH SALE';
    f.flash_sale_start_at.value=datetimeLocalValue(s.flash_sale_start_at);
    f.flash_sale_end_at.value=datetimeLocalValue(s.flash_sale_end_at);
    var selected=(state.promos||[]).filter(function(p){return p.flash_sale;});
    var summary=document.getElementById('flashSalePromoSummary');
    if(summary){ summary.innerHTML=selected.length?('<b>Promo masuk Flash Sale:</b> '+selected.map(function(p){return esc(p.name||p.code)+' ('+esc(p.code)+')';}).join(' · ')):'Belum ada promo otomatis yang dipilih untuk Flash Sale. Edit/buat Promo Otomatis lalu aktifkan pilihan “Masukkan target promo ini ke Flash Sale Marketplace”.'; }
  }
  function daysLeftText(n){ n=Number(n); if(!isFinite(n)) return '-'; if(n<0) return 'Expired'; if(n===0) return 'Hari ini'; return n+' hari'; }
  function fmtLicenseDate(v){ if(!v) return '-'; try{return new Date(v).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return String(v);} }
  function renderLicense(){ var l=state.license||{}; var box=document.getElementById('licenseBox'); if(!box) return; var status=(l.enabled===false)?'Belum diaktifkan':(l.active?'Aktif':(l.status||'Tidak aktif')); var rows=[['Status',status],['Kode Aktivasi',l.license_code||l.code||'-'],['Bot','@'+(l.bot_username||'-')],['Paket',l.plan_name||'-'],['Masa Aktif Sampai',fmtLicenseDate(l.expires_at)],['Sisa Durasi',daysLeftText(l.days_left)],['Catatan',l.reason||'-']]; box.innerHTML=rows.map(function(r){return '<div class="detailItem"><b>'+esc(r[0])+'</b><br><span style="font-size:18px">'+esc(r[1])+'</span></div>';}).join(''); }


  function usdt(n){ return '$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}); }
  function supplierMatches(p,q){ return textMatch([p.id,p.name,p.description,p.local_code,p.local_name,p.local_variant_name,p.price,p.publicPrice],q); }
  function supplierById(id){return (state.resellerSuppliers||[]).find(function(x){return String(x.id)===String(id||'');})||null;}
  function workflowSupplierOptionsHtml(selected){return '<option value="">-- Pilih Supplier --</option>'+(state.resellerSuppliers||[]).filter(function(s){return s.active!==false||String(s.id)===String(selected||'');}).map(function(s){return '<option value="'+esc(s.id)+'" '+(String(s.id)===String(selected||'')?'selected':'')+'>'+esc(s.name||'Supplier')+' · '+esc(s.target_username||'-')+' · '+rupiah(s.manual_balance_idr||0)+'</option>';}).join('');}
  function workflowTargetOptionsHtml(selected){var current=String(selected||'');var options=[];(state.products||[]).slice().sort(function(a,b){return String(a.nama||'').localeCompare(String(b.nama||''),'id');}).forEach(function(p){var vars=productVariants(p);if(vars.length){vars.forEach(function(v,i){var key=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase();var val=workflowTargetValue(p.kode,key);options.push('<option value="'+esc(val)+'" '+(val===current?'selected':'')+'>'+esc(String(p.nama||p.kode)+' — '+String(v.name||v.nama||key))+'</option>');});}else{var val=workflowTargetValue(p.kode,'');options.push('<option value="'+esc(val)+'" '+(val===current?'selected':'')+'>'+esc(p.nama||p.kode)+'</option>');}});return options.join('');}
  function openSupplierEdit(id){var s=id?supplierById(id):null;var body='<form id="supplierEditForm" class="form"><input type="hidden" name="id" value="'+esc(s&&s.id||'')+'"><div class="row"><div class="field"><label class="label">Nama Supplier</label><input class="input" name="name" required value="'+esc(s&&s.name||('Supplier '+((state.resellerSuppliers||[]).length+1)))+'" placeholder="Supplier 1"></div><div class="field"><label class="label">Bot Supplier</label><input class="input" name="target_username" required value="'+esc(s&&s.target_username||'')+'" placeholder="@SupplierBot"></div></div><div class="row"><div class="field"><label class="label">Saldo Bot (Manual)</label><input class="input" name="manual_balance_idr" type="number" min="0" step="1" value="'+esc(Number(s&&s.manual_balance_idr||0))+'"><p class="help">Saldo ini tidak dibaca dari bot supplier. Setelah workflow berhasil, modal order otomatis mengurangi saldo manual ini.</p></div><div class="field"><label class="label">Status</label><select class="select" name="active"><option value="true" '+(!s||s.active!==false?'selected':'')+'>Aktif</option><option value="false" '+(s&&s.active===false?'selected':'')+'>Nonaktif</option></select></div></div><div class="field"><label class="label">Catatan</label><textarea class="textarea" name="notes" placeholder="Catatan supplier, info top up, dll.">'+esc(s&&s.notes||'')+'</textarea></div><button class="btn lime" type="submit">Simpan Supplier</button></form>';openModal(s?'Edit Supplier':'Tambah Supplier',body);document.getElementById('supplierEditForm').onsubmit=async function(e){e.preventDefault();var d=formDataRaw(e.target);d.manual_balance_idr=Math.max(0,Number(d.manual_balance_idr||0));d.active=String(d.active)!=='false';try{await api('reseller-supplier-save',d);closeModal();state.supplierLoaded=false;state.workflowLoaded=false;await loadSupplier(true);toast('Supplier disimpan. Stok perkiraan diperbarui.');}catch(err){toast(err.message,true);}};}
  function openSupplierProducts(id){var s=supplierById(id);if(!s)return;var rows=Array.isArray(s.products)?s.products:[];var body='<div class="detailGrid"><div class="detailItem"><b>Saldo Manual</b><br>'+rupiah(s.manual_balance_idr||0)+'</div><div class="detailItem"><b>Jumlah Varian / Produk</b><br>'+esc(rows.length)+'</div></div><div class="workflowList" style="margin-top:12px">'+(rows.map(function(x){return '<div class="workflowCard '+(x.active?'active':'')+'"><b>'+esc(x.product_name)+(x.variant_name?' — '+esc(x.variant_name):'')+'</b><br><span class="subtle">Modal '+rupiah(x.unit_cost_idr||0)+' · Stok perkiraan <b>'+esc(x.estimated_stock||0)+'</b> · '+(x.active?'AKTIF':'DRAFT')+'</span><div class="actions" style="margin-top:7px"><button class="btn small cyan" type="button" data-open-supplier-workflow="'+esc(x.workflow_id)+'">Buka Workflow</button></div></div>';}).join('')||'<div class="empty">Belum ada produk/varian workflow pada supplier ini.</div>')+'</div>';openModal('Produk · '+(s.name||'Supplier'),body);document.querySelectorAll('[data-open-supplier-workflow]').forEach(function(btn){btn.onclick=function(){var wid=btn.dataset.openSupplierWorkflow;closeModal();switchTab('workflowSettings');loadWorkflow(true).then(function(){loadWorkflowDetail(wid);});};});}
  function renderResellerSuppliers(){var box=document.getElementById('resellerSupplierList');if(!box)return;var rows=state.resellerSuppliers||[];box.innerHTML=rows.map(function(s,index){return '<article class="supplierCard"><div class="supplierCardTop"><div class="supplierThumbFallback">'+esc(index+1)+'</div><div><h3>'+esc(s.name||('Supplier '+(index+1)))+' '+(s.active===false?'<span class="chip red">OFF</span>':'<span class="chip green">ON</span>')+'</h3><div class="supplierMeta">'+esc(s.target_username||'-')+'</div></div></div><div class="supplierPriceRow"><div class="detailItem"><b>Saldo</b><br>'+rupiah(s.manual_balance_idr||0)+'</div><div class="detailItem"><b>Jumlah Varian</b><br>'+esc(s.variant_count||0)+'</div></div><div class="supplierMeta">Stok perkiraan total: <b>'+esc(s.estimated_stock_total||0)+'</b> item</div><div class="actions"><button class="btn small cyan" type="button" data-reseller-supplier-products="'+esc(s.id)+'">Produk</button><button class="btn small yellow" type="button" data-reseller-supplier-edit="'+esc(s.id)+'">Edit</button></div></article>';}).join('')||'<div class="empty">Belum ada supplier. Tekan + Tambah Supplier.</div>';document.querySelectorAll('[data-reseller-supplier-edit]').forEach(function(btn){btn.onclick=function(){openSupplierEdit(btn.dataset.resellerSupplierEdit);};});document.querySelectorAll('[data-reseller-supplier-products]').forEach(function(btn){btn.onclick=function(){openSupplierProducts(btn.dataset.resellerSupplierProducts);};});}
  function renderSupplier(){
    renderResellerSuppliers();
    var st=state.supplierStatus||{};
    var warning=document.getElementById('supplierConfigWarning');
    if(warning){
      warning.classList.toggle('hidden',!!st.configured);
      warning.innerHTML=st.configured?'':'<b>API key belum terhubung.</b><br>Tambahkan <code>PRODSELLER_API_KEY</code> pada Vercel → Project Settings → Environment Variables, lalu Redeploy. API key tidak disimpan di browser atau Supabase.';
    }
    var status=document.getElementById('supplierStatus');
    if(status){ status.innerHTML=[
      ['API',st.configured?'TERHUBUNG':'BELUM DIATUR'],
      ['Saldo ProdSeller',st.configured?usdt(st.balance):'-'],
      ['Membership',st.membership||'-'],
      ['Produk / Varian Dipilih',Number(st.selected_count||0)]
    ].map(function(x){return '<div class="supplierStat"><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></div>';}).join(''); }

    var q=String((document.getElementById('supplierSearch')||{}).value||'').trim().toLowerCase();
    var rows=(state.supplierProducts||[]).filter(function(p){return supplierMatches(p,q);});
    var count=document.getElementById('supplierProductCount'); if(count) count.textContent=rows.length+' produk';
    var list=document.getElementById('supplierProductList');
    if(list){
      if(!st.configured) list.innerHTML='<div class="empty">Atur PRODSELLER_API_KEY terlebih dahulu untuk memuat katalog supplier.</div>';
      else list.innerHTML=rows.map(function(p){
        var image=p.imageUrl?'<img class="supplierThumb" src="'+esc(p.imageUrl)+'" alt="">':'<div class="supplierThumbFallback">📦</div>';
        var stock=p.inStock===false?'<span class="chip red">STOK HABIS</span>':'<span class="chip green">TERSEDIA</span>';
        var selected=p.selected?'<span class="supplierApiBadge">SUDAH DIRESELLER</span>':'';
        var sell=Number(p.local_price||p.suggested_price_idr||0);
        var mode=p.link_type==='variant'?'variant':'product';
        var normalProducts=(state.products||[]).filter(function(x){return !isExternalSupplierLink(x);});
        var targetOptions='<option value="">Pilih produk induk...</option>'+normalProducts.map(function(x){return '<option value="'+esc(x.kode)+'" '+(mode==='variant'&&String(p.local_code||'')===String(x.kode||'')?'selected':'')+'>'+esc(x.nama)+' · '+esc(x.kode)+'</option>';}).join('');
        var linked=p.selected?('<div class="help"><b>Terhubung:</b> '+esc(p.local_name||p.name)+(p.link_type==='variant'?' → varian <b>'+esc(p.local_variant_name||'-')+'</b>':' · produk mandiri')+' · '+esc(p.local_code||'-')+'</div>'):'';
        return '<article class="supplierCard '+(p.selected?'selected':'')+'" data-supplier-card="'+esc(p.id)+'"><div class="supplierCardTop">'+image+'<div><h3>'+esc(p.name||'Produk')+'</h3><div class="supplierMeta">ID '+esc(p.id)+'<br>'+stock+' '+selected+'</div></div></div><div class="supplierMeta">'+esc(p.description||'')+'</div><div class="supplierPriceRow"><div class="detailItem"><b>Modal API</b><br>'+usdt(p.price)+'</div><div class="detailItem"><b>Harga Publik</b><br>'+usdt(p.publicPrice)+'</div></div><div class="field"><label class="label">Harga Jual iLink (Rupiah)</label><input class="input" type="number" min="1000" step="500" data-supplier-price value="'+esc(sell)+'"></div><div class="field"><label class="label">Masukkan Sebagai</label><select class="select" data-supplier-mode><option value="product" '+(mode==='product'?'selected':'')+'>Produk baru / produk mandiri</option><option value="variant" '+(mode==='variant'?'selected':'')+'>Varian produk yang sudah ada</option></select></div><div data-supplier-variant-target class="'+(mode==='variant'?'':'hidden')+'"><div class="field"><label class="label">Produk Induk iLink</label><select class="select" data-supplier-target-product>'+targetOptions+'</select></div><div class="field"><label class="label">Nama Varian</label><input class="input" data-supplier-variant-name value="'+esc(p.local_variant_name||p.name||'')+'" placeholder="Contoh: Gemini 18B Pro"></div><p class="help">Jika produk induk belum memiliki varian, pilihan lama otomatis dipertahankan sebagai varian <b>Utama</b>. Varian supplier memakai stok dan saldo ProdSeller secara otomatis.</p></div><button class="btn '+(p.selected?'yellow':'lime')+'" type="button" data-supplier-import="'+esc(p.id)+'">'+(p.selected?'Update Reseller':'Resellerkan Produk')+'</button>'+linked+'</article>';
      }).join('')||'<div class="empty">Produk supplier tidak ditemukan.</div>';
    }
    document.querySelectorAll('[data-supplier-mode]').forEach(function(sel){ sel.onchange=function(){ var card=sel.closest('[data-supplier-card]'); var box=card&&card.querySelector('[data-supplier-variant-target]'); if(box) box.classList.toggle('hidden',sel.value!=='variant'); }; });
    document.querySelectorAll('[data-supplier-import]').forEach(function(btn){btn.onclick=async function(){
      var card=btn.closest('[data-supplier-card]'); var input=card&&card.querySelector('[data-supplier-price]'); var price=Math.max(1000,Number(input&&input.value||0));
      var modeEl=card&&card.querySelector('[data-supplier-mode]'); var mode=modeEl?modeEl.value:'product';
      var targetEl=card&&card.querySelector('[data-supplier-target-product]'); var nameEl=card&&card.querySelector('[data-supplier-variant-name]');
      if(!price) return toast('Isi harga jual Rupiah terlebih dahulu.',true);
      if(mode==='variant' && !(targetEl&&targetEl.value)) return toast('Pilih produk induk untuk varian supplier.',true);
      if(mode==='variant' && !String(nameEl&&nameEl.value||'').trim()) return toast('Isi nama varian supplier.',true);
      btn.disabled=true; var old=btn.textContent; btn.textContent='Memproses...';
      try{ await api('prodseller-import',{product_id:btn.dataset.supplierImport,selling_price:price,target_mode:mode,target_product_code:targetEl&&targetEl.value||'',variant_name:nameEl&&nameEl.value||''}); toast(mode==='variant'?'Produk supplier berhasil dimasukkan sebagai varian.':'Produk supplier berhasil disimpan ke katalog iLink.'); await load(); await loadSupplier(true); }
      catch(e){toast(e.message,true);} finally{btn.disabled=false;btn.textContent=old;}
    };});

    var orderList=document.getElementById('supplierOrderList');
    if(orderList){ orderList.innerHTML=(state.supplierOrders||[]).map(function(o){
      var statusText=String(o.status||'pending').toUpperCase(); var cls=String(o.status||'')==='delivered'?'delivered':(String(o.status||'')==='error'?'error':'');
      return '<div class="supplierOrder '+cls+'"><b>'+esc(displayRef(o.order_ref||'-'))+'</b> · <span class="chip '+(cls==='delivered'?'green':(cls==='error'?'red':'yellow'))+'">'+esc(statusText)+'</span><br>Supplier Order: '+esc(o.supplier_order_id||'-')+' · Qty '+esc(o.quantity||1)+' · '+usdt(o.amount_usdt||0)+(o.error_message?'<br><b>Error:</b> '+esc(o.error_message):'')+(String(o.status||'')!=='delivered'?'<br><button class="btn small cyan" type="button" data-supplier-retry="'+esc(o.order_ref||'')+'">Retry Supplier</button>':'')+'</div>';
    }).join('')||'<div class="empty">Belum ada order supplier.</div>'; }
    document.querySelectorAll('[data-supplier-retry]').forEach(function(btn){btn.onclick=async function(){ btn.disabled=true; var old=btn.textContent; btn.textContent='Retry...'; try{await api('prodseller-retry',{order_ref:btn.dataset.supplierRetry}); toast('Retry supplier berhasil.'); await load(); await loadSupplier(true);}catch(e){toast(e.message,true);}finally{btn.disabled=false;btn.textContent=old;} };});
  }


  async function loadSupplier(force){
    if(state.supplierLoaded && !force){ renderSupplier(); return; }
    var st=await apiSafe('prodseller-status',{configured:false});
    state.supplierStatus=st||{configured:false};
    state.resellerSuppliers=await apiSafe('reseller-suppliers',[]);
    state.supplierOrders=await apiSafe('supplier-orders',[]);
    state.supplierProducts=state.supplierStatus.configured?await apiSafe('prodseller-products',[]):[];
    state.supplierLoaded=true;
    renderSupplier();
  }


  function workflowCurrentId(){ var sel=document.getElementById('workflowSelect'); return String((sel&&sel.value)||(state.workflowDetail&&state.workflowDetail.workflow&&state.workflowDetail.workflow.id)||''); }
  function workflowTargetValue(productCode,variantKey){return String(productCode||'')+'||'+String(variantKey||'');}
  function syncWorkflowTargetHidden(){
    var target=document.getElementById('workflowTarget'); var psel=document.getElementById('workflowProduct'); var vsel=document.getElementById('workflowVariant');
    if(!target||!psel||!vsel)return;
    var parts=String(target.value||'').split('||'); psel.value=String(parts[0]||'').toUpperCase(); vsel.value=String(parts[1]||'').toUpperCase();
  }
  function refreshWorkflowProductOptions(){
    var target=document.getElementById('workflowTarget'); var psel=document.getElementById('workflowProduct'); var vsel=document.getElementById('workflowVariant'); if(!target||!psel||!vsel) return;
    var current=workflowTargetValue(psel.value,vsel.value);
    var products=(state.products||[]).slice().sort(function(a,b){return String(a.nama||'').localeCompare(String(b.nama||''),'id');});
    var options=[];
    products.forEach(function(p){
      var vars=productVariants(p);
      if(vars.length){
        vars.forEach(function(v,i){var key=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); options.push({value:workflowTargetValue(p.kode,key),label:String(p.nama||p.kode)+' — '+String(v.name||v.nama||key)});});
      }else{
        options.push({value:workflowTargetValue(p.kode,''),label:String(p.nama||p.kode)});
      }
    });
    target.innerHTML=options.map(function(o){return '<option value="'+esc(o.value)+'">'+esc(o.label)+'</option>';}).join('')||'<option value="">Belum ada produk</option>';
    if(current&&options.some(function(o){return o.value===current;})) target.value=current;
    syncWorkflowTargetHidden();
  }
  function syncWorkflowSupplierHidden(){
    var select=document.getElementById('workflowSupplier'); var hidden=document.getElementById('workflowTargetUsername');
    if(!select||!hidden)return;
    var supplier=supplierById(select.value); hidden.value=supplier?String(supplier.target_username||''):'';
  }
  function refreshWorkflowSupplierOptions(selected){
    var select=document.getElementById('workflowSupplier'); if(!select)return;
    var current=String(selected!==undefined?selected:select.value||'');
    select.innerHTML=workflowSupplierOptionsHtml(current);
    if(current&&(state.resellerSuppliers||[]).some(function(s){return String(s.id)===current;}))select.value=current;
    else if(!select.value&&state.resellerSuppliers&&state.resellerSuppliers.length)select.value=String(state.resellerSuppliers[0].id||'');
    syncWorkflowSupplierHidden();
  }
  function workflowTargetLabel(productCode,variantKey){
    var p=findProduct(String(productCode||'').toUpperCase()); if(!p)return String(productCode||'-')+(variantKey?' · '+variantKey:'');
    var key=String(variantKey||'').toUpperCase(); if(!key)return String(p.nama||p.kode);
    var v=productVariants(p).find(function(x,i){return String(x.sku||x.kode||('VAR'+(i+1))).toUpperCase()===key;});
    return String(p.nama||p.kode)+' — '+String((v&&(v.name||v.nama))||key);
  }
  async function reloadWorkflowAndSuppliers(selectedWorkflowId){
    state.workflowLoaded=false; state.supplierLoaded=false;
    state.resellerSuppliers=await apiSafe('reseller-suppliers',[]);
    await loadWorkflow(true);
    if(selectedWorkflowId)await loadWorkflowDetail(selectedWorkflowId);
    renderSupplier();
  }
  function targetParts(value){var parts=String(value||'').split('||');return {product_code:String(parts[0]||'').toUpperCase(),variant_key:String(parts[1]||'').toUpperCase()};}
  function openWorkflowEdit(id){
    var w=(state.workflows||[]).find(function(x){return String(x.id)===String(id||'');})||((state.workflowDetail||{}).workflow&&String(state.workflowDetail.workflow.id)===String(id||'')?state.workflowDetail.workflow:null); if(!w)return toast('Workflow tidak ditemukan.',true);
    var target=workflowTargetValue(w.product_code,w.variant_key); var body='<form id="workflowEditForm" class="form"><input type="hidden" name="workflow_id" value="'+esc(w.id)+'"><div class="field"><label class="label">Nama Workflow</label><input class="input" name="name" required value="'+esc(w.name||'')+'"></div><div class="field"><label class="label">Produk yang Dituju</label><select class="select" name="target" required>'+workflowTargetOptionsHtml(target)+'</select><p class="help">Produk yang memiliki varian ditampilkan per varian agar workflow tidak salah target.</p></div><div class="row"><div class="field"><label class="label">Supplier</label><select class="select" name="supplier_id" required>'+workflowSupplierOptionsHtml(w.supplier_id)+'</select></div><div class="field"><label class="label">Modal Produk / Item</label><input class="input" name="unit_cost_idr" type="number" min="0" step="1" required value="'+esc(Number(w.unit_cost_idr||0))+'"><p class="help">Stok = saldo manual supplier ÷ modal ini.</p></div></div><div class="row"><div class="field"><label class="label">Jumlah Contoh Saat Rekam</label><input class="input" name="sample_quantity" type="number" min="1" value="'+esc(Number(w.sample_quantity||1))+'"></div><div class="field"><label class="label">Default Tunggu Balasan / Step (ms)</label><input class="input" name="step_timeout_ms" type="number" min="1500" max="30000" value="'+esc(Number(w.step_timeout_ms||7000))+'"></div></div>'+(w.active?'<div class="workflowSelectionWarning">Workflow sedang aktif. Menyimpan perubahan akan menonaktifkannya terlebih dahulu. Setelah selesai edit, tekan <b>Selesai & Aktifkan</b> lagi.</div>':'')+'<button class="btn cyan" type="submit">Simpan Perubahan Workflow</button></form>';
    openModal('Edit Workflow',body); document.getElementById('workflowEditForm').onsubmit=async function(e){e.preventDefault();var d=formDataRaw(e.target),tp=targetParts(d.target);delete d.target;d.product_code=tp.product_code;d.variant_key=tp.variant_key;d.unit_cost_idr=Math.max(0,Number(d.unit_cost_idr||0));d.sample_quantity=Math.max(1,Number(d.sample_quantity||1));d.step_timeout_ms=Math.max(1500,Math.min(30000,Number(d.step_timeout_ms||7000)));try{var r=await api('workflow-update',d);closeModal();await reloadWorkflowAndSuppliers(w.id);toast('Workflow diperbarui dan disimpan sebagai draft. Periksa step lalu aktifkan kembali.');}catch(err){toast(err.message,true);}};
  }
  function openWorkflowCopy(id){
    var w=(state.workflows||[]).find(function(x){return String(x.id)===String(id||'');})||((state.workflowDetail||{}).workflow&&String(state.workflowDetail.workflow.id)===String(id||'')?state.workflowDetail.workflow:null); if(!w)return toast('Workflow tidak ditemukan.',true);
    var target=workflowTargetValue(w.product_code,w.variant_key); var body='<form id="workflowCopyForm" class="form"><div class="workflowHint">Seluruh step, pilihan tombol/teks, batas stok/produk, dan pola balasan akan disalin. Salinan selalu dibuat sebagai <b>DRAFT</b>. Setelah menyalin ke produk berbeda, buka <b>Edit</b> pada step untuk menyesuaikan penanda balasan serta teks sebelum/sesudah.</div><input type="hidden" name="workflow_id" value="'+esc(w.id)+'"><div class="field"><label class="label">Nama Salinan</label><input class="input" name="name" required value="'+esc((w.name||w.product_code)+' - Salinan')+'"></div><div class="field"><label class="label">Produk yang Dituju</label><select class="select" name="target" required>'+workflowTargetOptionsHtml(target)+'</select></div><div class="row"><div class="field"><label class="label">Supplier</label><select class="select" name="supplier_id" required>'+workflowSupplierOptionsHtml(w.supplier_id)+'</select></div><div class="field"><label class="label">Modal Produk / Item</label><input class="input" name="unit_cost_idr" type="number" min="0" step="1" required value="'+esc(Number(w.unit_cost_idr||0))+'"></div></div><div class="row"><div class="field"><label class="label">Jumlah Contoh</label><input class="input" name="sample_quantity" type="number" min="1" value="'+esc(Number(w.sample_quantity||1))+'"></div><div class="field"><label class="label">Default Tunggu Balasan / Step (ms)</label><input class="input" name="step_timeout_ms" type="number" min="1500" max="30000" value="'+esc(Number(w.step_timeout_ms||7000))+'"></div></div><button class="btn purple" type="submit">📄 Buat Salinan Workflow</button></form>';
    openModal('Salin Workflow',body); document.getElementById('workflowCopyForm').onsubmit=async function(e){e.preventDefault();var d=formDataRaw(e.target),tp=targetParts(d.target);delete d.target;d.product_code=tp.product_code;d.variant_key=tp.variant_key;d.unit_cost_idr=Math.max(0,Number(d.unit_cost_idr||0));try{var r=await api('workflow-copy',d);var newId=r.data&&r.data.workflow&&r.data.workflow.id;closeModal();await reloadWorkflowAndSuppliers(newId);toast('Workflow berhasil disalin. Salinan masih draft agar aman untuk diperiksa.');}catch(err){toast(err.message,true);}};
  }
  function openWorkflowStepEdit(stepId){
    var w=(state.workflowDetail||{}).workflow;
    var step=((state.workflowDetail||{}).steps||[]).find(function(x){return String(x.id)===String(stepId||'');});
    if(!w||!step)return toast('Step tidak ditemukan.',true);
    var type=String(step.action_type||'text');
    var cat=String(step.text_category||'other');
    var responseMode=String(step.response_mode||'wait')==='same_message'?'same_message':'wait';
    var response=step.response_snapshot||{};
    var expectedText=Object.prototype.hasOwnProperty.call(response,'expected_text')?String(response.expected_text||''):String(response.text||'');
    var extraction='';
    if(step.capture_result){
      extraction+='<div class="workflowCategoryBox" style="margin-top:10px"><b>📦 Batas Teks Hasil Produk</b><p class="help">Sistem hanya mengambil isi di antara teks sebelum dan sesudah. Nilai produk saat rekam tidak disimpan sebagai patokan.</p><div class="field"><label class="label">Teks Sebelum Produk</label><textarea class="textarea" name="result_extract_prefix" placeholder="Kosong = mulai dari awal pesan">'+esc(step.result_extract_prefix||'')+'</textarea></div><div class="field"><label class="label">Teks Sesudah Produk</label><textarea class="textarea" name="result_extract_suffix" placeholder="Kosong = ambil sampai akhir pesan">'+esc(step.result_extract_suffix||'')+'</textarea></div></div>';
    }
    if(step.capture_stock){
      extraction+='<div class="workflowCategoryBox quantity" style="margin-top:10px"><b>📊 Batas Teks Stok</b><p class="help">Contoh angka seperti 32 tidak menjadi aturan. Runtime membaca angka yang berada di antara penanda berikut.</p><div class="field"><label class="label">Teks Sebelum Stok</label><textarea class="textarea" name="stock_extract_prefix" placeholder="Contoh: Sisa Stok : ">'+esc(step.stock_extract_prefix||'')+'</textarea></div><div class="field"><label class="label">Teks Sesudah Stok</label><textarea class="textarea" name="stock_extract_suffix" placeholder="Kosong = baca bagian setelah teks sebelum">'+esc(step.stock_extract_suffix||'')+'</textarea></div></div>';
    }
    var body='<form id="workflowStepEditForm" class="form"><input type="hidden" name="workflow_id" value="'+esc(w.id)+'"><input type="hidden" name="step_id" value="'+esc(step.id)+'"><div class="field"><label class="label">Jenis Step</label><select class="select" name="action_type" id="stepEditActionType"><option value="button" '+(type==='button'?'selected':'')+'>🔘 Klik Tombol</option><option value="text" '+(type!=='button'?'selected':'')+'>✍️ Kirim Teks</option></select></div><div class="field" id="stepEditTextCategoryBox"><label class="label">Kategori Teks</label><select class="select" name="text_category" id="stepEditTextCategory"><option value="other" '+(cat!=='quantity'?'selected':'')+'>Teks / Perintah Lainnya</option><option value="quantity" '+(cat==='quantity'?'selected':'')+'>Jumlah Pembelian</option></select></div><div class="field" id="stepEditValueBox"><label class="label" id="stepEditValueLabel">'+(type==='button'?'Teks Tombol':'Teks yang Dikirim')+'</label><input class="input" name="action_value" id="stepEditValue" value="'+esc(step.action_value||'')+'" placeholder="'+(type==='button'?'Contoh: ✅ Konfirmasi':'Contoh: /start atau Tidak')+'"><p class="help" id="stepEditHelp">'+(cat==='quantity'?'Kategori Jumlah Pembelian selalu memakai {quantity} saat order asli.':'Teks/tombol ini yang dicari atau dikirim saat workflow berjalan.')+'</p></div><div class="field"><label class="label">Setelah Step Ini</label><select class="select" name="response_mode"><option value="wait" '+(responseMode==='wait'?'selected':'')+'>Tunggu balasan / perubahan pesan</option><option value="same_message" '+(responseMode==='same_message'?'selected':'')+'>Lanjut pilih tombol di pesan yang sama</option></select><p class="help">Biasanya terdeteksi otomatis saat merekam. Gunakan <b>Lanjut pilih tombol di pesan yang sama</b> jika satu pesan meminta beberapa pilihan tanpa mengirim balasan baru setelah setiap klik.</p></div><div class="field"><label class="label">Waktu Tunggu Step Ini (ms)</label><input class="input" type="number" min="1500" max="120000" step="500" name="wait_timeout_ms" value="'+esc(step.wait_timeout_ms==null?'':Number(step.wait_timeout_ms))+'" placeholder="Kosong = ikut default workflow"><p class="help">Kosong = mengikuti default workflow. 7000 = 7 detik, 30000 = 30 detik, maksimal 120000 = 2 menit. Jika Penanda Teks Balasan diisi, sistem terus menunggu sampai balasan yang cocok muncul atau waktu ini habis.</p></div><div class="field"><label class="label">Penanda Teks Balasan Supplier</label><textarea class="textarea tall" name="response_expected_text" placeholder="Isi bagian teks yang harus muncul pada balasan step ini">'+esc(expectedText)+'</textarea><p class="help">Bisa diedit setelah workflow disalin ke produk lain. Angka akan dianggap dinamis otomatis. Anda juga dapat memakai <code>{number}</code> untuk angka dan <code>{any}</code> untuk bagian bebas. Jika step punya tombol, teks ini tetap wajib cocok setelah disimpan agar pesan produk lain tidak salah terbaca.</p></div>'+extraction+(w.active?'<div class="workflowSelectionWarning">Mengedit step pada workflow aktif akan menonaktifkan workflow agar order baru tidak membaca langkah yang sedang diubah.</div>':'')+'<button class="btn cyan" type="submit">Simpan Step</button></form>';
    openModal('Edit Step '+step.step_order,body);
    var typeEl=document.getElementById('stepEditActionType'),catEl=document.getElementById('stepEditTextCategory'),box=document.getElementById('stepEditTextCategoryBox'),value=document.getElementById('stepEditValue'),label=document.getElementById('stepEditValueLabel'),help=document.getElementById('stepEditHelp');
    function sync(){var t=String(typeEl.value||'text'),c=String(catEl.value||'other');box.classList.toggle('hidden',t==='button');label.textContent=t==='button'?'Teks Tombol':'Teks yang Dikirim';if(t==='text'&&c==='quantity'){value.value='{quantity}';value.readOnly=true;help.textContent='Jumlah diambil otomatis dari quantity order pembeli.';}else{value.readOnly=false;if(value.value==='{quantity}')value.value='';help.textContent=t==='button'?'Masukkan teks tombol supplier persis seperti yang akan diklik.':'Masukkan teks/perintah yang akan dikirim ke supplier.';}}
    typeEl.onchange=sync;catEl.onchange=sync;sync();
    document.getElementById('workflowStepEditForm').onsubmit=async function(e){e.preventDefault();var d=formDataRaw(e.target);try{await api('workflow-step-update',d);closeModal();await reloadWorkflowAndSuppliers(w.id);toast('Step diperbarui. Penanda balasan dan batas teks ikut disimpan. Aktifkan workflow kembali bila sudah benar.');}catch(err){toast(err.message,true);}};
  }
  async function deleteWorkflowStep(stepId){var w=(state.workflowDetail||{}).workflow;if(!w)return;if(!confirm('Hapus step ini? Step setelahnya akan dinomori ulang.'))return;try{await api('workflow-step-delete',{workflow_id:w.id,step_id:stepId});await reloadWorkflowAndSuppliers(w.id);toast('Step dihapus dan urutan dirapikan.');}catch(err){toast(err.message,true);}}
  async function loadWorkflowDetail(id){
    var value=String(id||''); if(!value){state.workflowDetail=null; renderWorkflow(); return;}
    try{ var r=await api('workflow-detail',null,{id:value}); state.workflowDetail=r.data||null; }
    catch(e){ state.workflowDetail=null; toast(e.message,true); }
    renderWorkflow();
  }
  async function loadWorkflow(force){
    if(state.workflowLoaded&&!force){ renderWorkflow(); return; }
    var old=workflowCurrentId();
    state.workflowStatus=await apiSafe('workflow-userbot-status',{configured:false}, {live:1});
    state.resellerSuppliers=await apiSafe('reseller-suppliers',state.resellerSuppliers||[]);
    state.workflows=await apiSafe('workflow-list',[]);
    state.workflowRuns=await apiSafe('workflow-runs',[]);
    state.workflowLoaded=true;
    refreshWorkflowProductOptions();
    var selected=(state.workflows||[]).some(function(w){return String(w.id)===old;})?old:((state.workflows||[])[0]&&state.workflows[0].id)||'';
    if(selected){ try{var detail=await api('workflow-detail',null,{id:selected}); state.workflowDetail=detail.data||null;}catch(e){state.workflowDetail=null;} }
    else state.workflowDetail=null;
    renderWorkflow();
  }
  function renderWorkflow(){
    refreshWorkflowProductOptions();
    refreshWorkflowSupplierOptions();
    var st=state.workflowStatus||{}; var status=document.getElementById('workflowUserbotStatus');
    if(status) status.innerHTML=[
      ['Userbot',st.configured?(st.connected===false?'GAGAL TERHUBUNG':'SIAP'):'BELUM SETUP'],
      ['API ID',st.api_id_configured?'ADA':'KOSONG'],
      ['Session',st.session_configured?'ADA':'KOSONG'],
      ['Akun',st.account?(st.account.username?('@'+st.account.username):(st.account.first_name||st.account.id||'-')):'-']
    ].map(function(x){return '<div class="workflowStat"><small>'+esc(x[0])+'</small><b>'+esc(x[1])+'</b></div>';}).join('')+(st.error?'<div class="workflowDanger" style="grid-column:1/-1"><b>Userbot belum siap:</b> '+esc(st.error)+'</div>':'');

    var select=document.getElementById('workflowSelect'); var current=state.workflowDetail&&state.workflowDetail.workflow;
    if(select){ var currentId=current&&current.id||select.value||''; select.innerHTML='<option value="">-- Pilih Workflow --</option>'+(state.workflows||[]).map(function(w){return '<option value="'+esc(w.id)+'" '+(String(w.id)===String(currentId)?'selected':'')+'>'+esc(w.name||w.product_code)+' · '+esc(w.target_username)+(w.active?' · AKTIF':'')+'</option>';}).join(''); }
    var title=document.getElementById('workflowRecorderTitle'); if(title){var cs=current&&supplierById(current.supplier_id);var balanceStock=(cs&&Number(current.unit_cost_idr||0)>0)?Math.floor(Number(cs.manual_balance_idr||0)/Number(current.unit_cost_idr||1)):0;var hasLive=current&&current.live_stock!==null&&current.live_stock!==undefined&&String(current.live_stock)!=='';var cstock=hasLive?Math.min(balanceStock,Math.max(0,Number(current.live_stock||0))):balanceStock;title.textContent=current?(current.name+' · '+workflowTargetLabel(current.product_code,current.variant_key)+' → '+((cs&&cs.name)||current.target_username)+' · Modal '+rupiah(current.unit_cost_idr||0)+' · Stok '+cstock+(hasLive?' (live supplier)':' (saldo/modal)')+(current.active?' · AKTIF':' · MODE REKAM')):'Pilih atau buat workflow untuk mulai merekam.';}
    var detailSteps=(state.workflowDetail&&state.workflowDetail.steps)||[]; var recorderLastStep=detailSteps[detailSteps.length-1]||{}; var snap=current?(current.last_message_snapshot||{}):{}; var candidates=current&&Array.isArray(current.recent_message_snapshots)?current.recent_message_snapshots.slice():[]; if(!candidates.length&&snap&&snap.id)candidates=[snap]; var sourceSnap=recorderLastStep&&recorderLastStep.source_message_snapshot||{}; if(sourceSnap&&sourceSnap.id&&!candidates.some(function(x){return Number(x&&x.id||0)===Number(sourceSnap.id||0);})){candidates.push(Object.assign({},sourceSnap,{_workflow_source:true,currently_visible:sourceSnap.currently_visible!==false}));} var selectedMessageId=Number(current&&current.last_message_id||0); var msg=document.getElementById('workflowLastMessage');
    if(msg){
      var liveRecording=current&&!current.active&&!selectedMessageId&&(((state.workflowDetail||{}).steps||[]).length>0);
      var warning=liveRecording?'<div class="workflowSelectionWarning">🔴 <b>LIVE RECORDER AKTIF</b> · Sistem terus merekam perubahan chat supplier sampai Anda memilih pesan, menekan tombol/kirim teks untuk step berikutnya, atau Selesai & Aktifkan. Pesan sementara yang hilang tetap dipertahankan di riwayat. Jika tombol berikutnya masih berada pada pesan yang sama, klik langsung tombol tersebut; recorder akan menyimpan rangkaian kliknya.</div>':((candidates.length>1&&!selectedMessageId)?'<div class="workflowSelectionWarning">⚠️ Supplier mengirim '+esc(candidates.length)+' pesan. Pilih pesan yang menjadi patokan, atau langsung klik tombol pada pesan yang ingin dipakai.</div>':'');
      msg.innerHTML=warning+(candidates.length?candidates.map(function(m,index){var selected=Number(m.id||0)===selectedMessageId;var visible=m.currently_visible!==false;var sourceOnly=m._workflow_source===true;var versions=Array.isArray(m.versions)?m.versions:[];var status=selected?'<span class="chip green">DIPILIH / DIREKAM</span>':(sourceOnly?'<span class="chip purple">PESAN AKTIF · PILIH TOMBOL BERIKUTNYA</span>':(visible?'<span class="chip cyan">TEREKAM LIVE</span>':'<span class="chip yellow">TERSIMPAN · SUDAH HILANG/BERUBAH</span>'));var btns=(m.buttons||[]).map(function(b){if(b.kind==='url')return '<button class="btn small" type="button" disabled>🔗 '+esc(b.text)+'</button>';return '<button class="btn small purple" type="button" '+(visible?'':'disabled')+' data-workflow-button="'+encodeURIComponent(String(b.text||''))+'" data-workflow-message-id="'+esc(m.id)+'">🔘 '+esc(b.text)+'</button>';}).join('');var history=versions.length?'<details class="workflowHint" style="margin-top:8px"><summary>Riwayat perubahan pesan ('+esc(versions.length)+' versi)</summary>'+versions.map(function(v,i){return '<div class="stepResponse"><b>Versi '+esc(i+1)+'</b><br>'+esc(v.text||'[tanpa teks]')+'</div>';}).join('')+'</details>':'';return '<div class="workflowMessageChoice '+(selected?'selected':'pending')+'"><div class="messageHead"><b>Pesan '+esc(index+1)+' · ID '+esc(m.id)+'</b><div class="actions">'+status+(!selected&&!sourceOnly?'<button class="btn small yellow" type="button" data-workflow-select-message="'+esc(m.id)+'">Pilih Pesan Ini</button>':'')+'</div></div><textarea class="workflowSelectableText" readonly data-workflow-message-text="'+esc(m.id)+'">'+esc(m.text||'[Pesan tanpa teks]')+'</textarea>'+history+(selected?'<div class="workflowSelectionInfo">Blok teks produk atau angka stok di atas, lalu tekan tombol 📦 / 📊 di bawah recorder.</div>':'')+(btns?'<div class="workflowButtons">'+btns+'</div>':'')+'</div>';}).join(''):'<div class="empty">Belum ada balasan. Live recorder akan menangkap pesan supplier setelah Anda mengirim /start, teks, atau menekan tombol.</div>');
    }
    document.querySelectorAll('[data-workflow-select-message]').forEach(function(btn){btn.onclick=async function(){var id=workflowCurrentId(); if(!id)return toast('Pilih workflow dulu.',true); btn.disabled=true; try{await workflowRecorderExclusive(function(){return api('workflow-select-message',{workflow_id:id,message_id:Number(btn.dataset.workflowSelectMessage||0)});}); state.workflowLoaded=false; await loadWorkflow(true); toast('Pesan dipilih sebagai balasan resmi step.');}catch(e){toast(e.message,true);}finally{btn.disabled=false;}};});
    document.querySelectorAll('[data-workflow-button]').forEach(function(btn){btn.onclick=async function(){var id=workflowCurrentId(); if(!id)return toast('Pilih workflow dulu',true); if(current&&current.active)return toast('Workflow aktif tidak dapat direkam ulang. Buat workflow baru untuk revisi.',true); btn.disabled=true; var old=btn.textContent; btn.textContent='Memproses...'; try{await workflowRecorderExclusive(function(){return api('workflow-action',{workflow_id:id,action_type:'button',action_value:decodeURIComponent(btn.dataset.workflowButton||''),message_id:Number(btn.dataset.workflowMessageId||0)});}); state.workflowLoaded=false; await loadWorkflow(true);}catch(e){toast(e.message,true);}finally{btn.disabled=false;btn.textContent=old;}};});
    var steps=(state.workflowDetail&&state.workflowDetail.steps)||[]; var stepList=document.getElementById('workflowStepList');
    if(stepList) stepList.innerHTML=steps.map(function(step){
      var response=step.response_snapshot||{};
      var responses=Array.isArray(step.response_snapshots)?step.response_snapshots:[];
      var textLabel=step.action_type==='button'?'🔘 KLIK TOMBOL':(String(step.text_category||'')==='quantity'?'🔢 JUMLAH PEMBELIAN':'✍️ TEKS / LAINNYA');
      var selectedIndex=response.id?responses.findIndex(function(x){return Number(x&&x.id||0)===Number(response.id||0);}):-1;
      var resultHasBoundary=Boolean(String(step.result_extract_prefix||'')||String(step.result_extract_suffix||''));
      var stockHasBoundary=Boolean(String(step.stock_extract_prefix||'')||String(step.stock_extract_suffix||''));
      var resultBadge=step.capture_result?' <span class="chip green">HASIL PRODUK · '+(resultHasBoundary?'BATAS TEKS':'FULL PESAN')+'</span>':'';
      var stockBadge=step.capture_stock?' <span class="chip cyan">STOK · '+(stockHasBoundary?'BATAS TEKS':'SELURUH PESAN')+'</span>':'';
      var sameMessageBadge=String(step.response_mode||'wait')==='same_message'?' <span class="chip purple">LANJUT DI PESAN YANG SAMA</span>':'';
      var capturePreview='';
      if(step.capture_result){capturePreview='<div class="stepResponse"><b>Batas produk</b><br>Sebelum: '+esc(step.result_extract_prefix||'[awal pesan]')+'<br>Sesudah: '+esc(step.result_extract_suffix||'[akhir pesan]')+'</div>';}
      if(step.capture_stock){capturePreview+='<div class="stepResponse"><b>Batas stok</b><br>Sebelum: '+esc(step.stock_extract_prefix||'[awal pesan]')+'<br>Sesudah: '+esc(step.stock_extract_suffix||'[akhir pesan]')+'<br><span class="subtle">Angka contoh rekaman tidak dipakai sebagai patokan.</span></div>';}
      var waitPreview=step.wait_timeout_ms!=null?'<div class="stepResponse"><b>Waktu tunggu khusus:</b> '+esc(Number(step.wait_timeout_ms))+' ms ('+esc((Number(step.wait_timeout_ms)/1000).toFixed(Number(step.wait_timeout_ms)%1000?1:0))+' detik)</div>':'';
      var expectedPreview=Object.prototype.hasOwnProperty.call(response,'expected_text')?'<div class="stepResponse"><b>Penanda balasan editable:</b> '+esc(response.expected_text||'[kosong · cocokkan tombol/pilihan pesan]')+'</div>':'';
      return '<div class="workflowStep '+(step.capture_result?'result':'')+'"><div class="messageHead"><b>STEP '+esc(step.step_order)+' · '+textLabel+'</b><div class="actions"><button class="btn small cyan" type="button" data-workflow-step-edit="'+esc(step.id)+'">Edit</button><button class="btn small red" type="button" data-workflow-step-delete="'+esc(step.id)+'">Hapus</button></div></div>'+resultBadge+stockBadge+sameMessageBadge+'<br><code>'+esc(step.action_value)+'</code>'+(step.preview_value&&step.preview_value!==step.action_value?'<br><span class="subtle">Saat rekam dikirim: '+esc(step.preview_value)+'</span>':'')+(responses.length>1?'<br><span class="subtle">Supplier mengirim '+esc(responses.length)+' pesan · '+(selectedIndex>=0?'dipilih Pesan '+esc(selectedIndex+1):'<b>BELUM DIPILIH</b>')+'</span>':'')+waitPreview+capturePreview+expectedPreview+(String(step.response_mode||'wait')==='same_message'?'<div class="stepResponse"><b>Rangkaian tombol satu pesan.</b> Klik ini tidak membutuhkan balasan baru; step berikutnya tetap memakai pesan Telegram yang sama.</div>':(response.id?'<div class="stepResponse">Balasan rekaman asli: '+esc(response.text||'[tanpa teks]')+'</div>':'<div class="stepResponse">'+(responses.length>1?'Pilih salah satu pesan supplier di panel kiri.':'Balasan baru belum terdeteksi.')+'</div>'))+'</div>';
    }).join('')||'<div class="empty">Belum ada step.</div>';
    document.querySelectorAll('[data-workflow-step-edit]').forEach(function(btn){btn.onclick=function(){openWorkflowStepEdit(btn.dataset.workflowStepEdit);};});
    document.querySelectorAll('[data-workflow-step-delete]').forEach(function(btn){btn.onclick=function(){deleteWorkflowStep(btn.dataset.workflowStepDelete);};});

    var list=document.getElementById('workflowList'); if(list) list.innerHTML=(state.workflows||[]).map(function(w){var supplier=supplierById(w.supplier_id);var balanceStock=(supplier&&Number(w.unit_cost_idr||0)>0)?Math.floor(Number(supplier.manual_balance_idr||0)/Number(w.unit_cost_idr||1)):0;var hasLive=w.live_stock!==null&&w.live_stock!==undefined&&String(w.live_stock)!=='';var stock=hasLive?Math.min(balanceStock,Math.max(0,Number(w.live_stock||0))):balanceStock;var source=hasLive?'live supplier':'saldo/modal'; return '<div class="workflowCard '+(w.active?'active':'')+'"><b>'+esc(w.name||w.product_code)+'</b> '+(w.active?'<span class="chip green">AKTIF</span>':'<span class="chip yellow">DRAFT</span>')+'<br><span class="subtle">'+esc(workflowTargetLabel(w.product_code,w.variant_key))+' → '+esc((supplier&&supplier.name)||w.target_username)+'</span><br><span class="subtle">Modal '+rupiah(w.unit_cost_idr||0)+' · Stok '+esc(stock)+' ('+esc(source)+')</span>'+(w.stock_refresh_error?'<div class="workflowSelectionWarning">Cek stok terakhir gagal: '+esc(w.stock_refresh_error)+'</div>':'')+'<div class="actions" style="margin-top:8px"><button class="btn small cyan" type="button" data-workflow-open="'+esc(w.id)+'">Buka</button><button class="btn small cyan" type="button" data-workflow-edit-card="'+esc(w.id)+'">Edit</button><button class="btn small purple" type="button" data-workflow-copy-card="'+esc(w.id)+'">Salin</button>'+(w.active?'<button class="btn small yellow" type="button" data-workflow-deactivate="'+esc(w.id)+'">Nonaktifkan</button>':'')+'</div></div>';}).join('')||'<div class="empty">Belum ada workflow.</div>';
    document.querySelectorAll('[data-workflow-open]').forEach(function(btn){btn.onclick=function(){loadWorkflowDetail(btn.dataset.workflowOpen);};});
    document.querySelectorAll('[data-workflow-edit-card]').forEach(function(btn){btn.onclick=function(){openWorkflowEdit(btn.dataset.workflowEditCard);};});
    document.querySelectorAll('[data-workflow-copy-card]').forEach(function(btn){btn.onclick=function(){openWorkflowCopy(btn.dataset.workflowCopyCard);};});
    document.querySelectorAll('[data-workflow-deactivate]').forEach(function(btn){btn.onclick=async function(){try{await api('workflow-deactivate',{workflow_id:btn.dataset.workflowDeactivate}); state.workflowLoaded=false; await loadWorkflow(true); toast('Workflow dinonaktifkan.');}catch(e){toast(e.message,true);}};});

    var workflowMap={}; (state.workflows||[]).forEach(function(w){workflowMap[w.id]=w;}); var runs=document.getElementById('workflowRunList');
    if(runs) runs.innerHTML=(state.workflowRuns||[]).map(function(run){var w=workflowMap[run.workflow_id]||{}; var cls=String(run.status||''); return '<div class="workflowCard workflowRun '+esc(cls)+'"><b>'+esc(displayRef(run.order_ref||'-'))+'</b> · <span class="chip '+(cls==='delivered'?'green':(cls==='attention'?'red':'yellow'))+'">'+esc(String(run.status||'queued').toUpperCase())+'</span><br><span class="subtle">'+esc(w.name||run.product_code)+' · step '+esc(Number(run.current_step||0))+' / '+esc(((state.workflowDetail&&state.workflowDetail.workflow&&state.workflowDetail.workflow.id===run.workflow_id)?((state.workflowDetail.steps||[]).length):'?'))+'</span>'+(run.error_message?'<div class="workflowDanger" style="margin-top:7px">'+esc(run.error_message)+'</div>':'')+(cls==='queued'?'<div class="actions" style="margin-top:8px"><button class="btn small cyan" type="button" data-workflow-retry="'+esc(run.order_ref)+'">Retry Aman</button></div>':(cls==='attention'?'<div class="workflowHint" style="margin-top:8px">Periksa chat '+esc(w.target_username||'supplier')+' terlebih dahulu. Jika memang belum terbeli, Anda dapat mulai ulang secara manual dari dashboard.</div><div class="actions"><button class="btn small red" type="button" data-workflow-restart="'+esc(run.order_ref)+'">Mulai Ulang (Risiko Double Order)</button></div>':''))+'</div>';}).join('')||'<div class="empty">Belum ada order workflow.</div>';
    document.querySelectorAll('[data-workflow-retry]').forEach(function(btn){btn.onclick=async function(){try{await api('workflow-retry-order',{order_ref:btn.dataset.workflowRetry}); state.workflowLoaded=false; await loadWorkflow(true); toast('Workflow dilanjutkan.');}catch(e){toast(e.message,true);}};});
    document.querySelectorAll('[data-workflow-restart]').forEach(function(btn){btn.onclick=async function(){if(!confirm('Mulai ulang dapat membeli produk supplier dua kali jika order sebelumnya sebenarnya sudah terkirim. Sudah cek chat supplier dan yakin ingin mengulang dari /start?'))return; try{await api('workflow-retry-order',{order_ref:btn.dataset.workflowRestart,force_restart:true}); state.workflowLoaded=false; await loadWorkflow(true); toast('Workflow dimulai ulang.');}catch(e){toast(e.message,true);}};});
  }

  async function workflowRecorderExclusive(task){
    workflowRecorderActionLock=true;
    try{
      var started=Date.now();
      while(workflowRecorderBusy&&Date.now()-started<4200)await new Promise(function(resolve){setTimeout(resolve,120);});
      return await task();
    }finally{workflowRecorderActionLock=false;}
  }
  function workflowLiveRecorderEligible(){
    var detail=state.workflowDetail||{},w=detail.workflow,steps=detail.steps||[];
    if(!w||w.active||!steps.length)return false;
    var last=steps[steps.length-1]||{};
    return !Number((last.response_snapshot||{}).id||0);
  }
  function startWorkflowLiveRecorder(){
    if(workflowRecorderLoopStarted)return;
    workflowRecorderLoopStarted=true;
    var generation=++workflowRecorderLoopGeneration;
    (async function loop(){
      while(generation===workflowRecorderLoopGeneration){
        if(!workflowLiveRecorderEligible()){await new Promise(function(resolve){setTimeout(resolve,700);});continue;}
        var detail=state.workflowDetail||{},w=detail.workflow||{},steps=detail.steps||[],last=steps[steps.length-1]||{};
        var workflowId=String(w.id||''),stepId=String(last.id||'');
        if(!workflowId||!stepId){await new Promise(function(resolve){setTimeout(resolve,700);});continue;}
        if(workflowRecorderActionLock||workflowRecorderBusy){await new Promise(function(resolve){setTimeout(resolve,350);});continue;}
        workflowRecorderBusy=true;
        try{
          var r=await api('workflow-record-poll',{workflow_id:workflowId,duration_ms:2500});
          var data=r.data||{};
          var current=state.workflowDetail||{};
          if(current.workflow&&String(current.workflow.id||'')===workflowId){
            if(data.workflow)current.workflow=data.workflow;
            if(data.step&&Array.isArray(current.steps))current.steps=current.steps.map(function(x){return String(x.id)===String(data.step.id)?data.step:x;});
            else if(Array.isArray(data.responses)&&Array.isArray(current.steps))current.steps=current.steps.map(function(x){if(String(x.id)!==stepId)return x;return Object.assign({},x,{response_snapshots:data.responses});});
            state.workflowDetail=current;
            renderWorkflow();
          }
        }catch(e){console.warn('Live workflow recorder:',e.message||e);await new Promise(function(resolve){setTimeout(resolve,1200);});}
        finally{workflowRecorderBusy=false;}
        await new Promise(function(resolve){setTimeout(resolve,180);});
      }
    })();
  }

  function renderStats(){ var s=state.stats||{}; var daily=(state.analytics&&state.analytics.daily)||[]; var today=(state.analytics&&state.analytics.today_revenue!==undefined)?state.analytics.today_revenue:(daily.length?daily[daily.length-1].revenue:0); var items=[['Omset Hari Ini',rupiah(today)],['Profit Hari Ini',rupiah(s.profitToday||0)],['Order',s.orders||0],['Stok',s.stokTersedia||0]]; var box=document.getElementById('stats'); if(box) box.innerHTML=items.map(function(x){return '<div class="stat"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join(''); }
  function renderCharts(){ var a=state.analytics||{}; var list=a.daily||[]; var max=Math.max.apply(null,list.map(function(d){return Number(d.revenue||0);}).concat([1])); var chart=document.getElementById('revenueChart'); if(chart){ chart.innerHTML=list.map(function(d){var chartHeight=Math.max(118,(chart.clientHeight||300)-96); var h=Math.max(8,Math.round((Number(d.revenue||0)/max)*chartHeight)); return '<div class="barBox"><div class="barValue" title="Omzet '+esc(d.label)+'">'+esc(rupiahShort(d.revenue))+'</div><div class="bar" title="'+esc(d.label)+' - '+rupiah(d.revenue)+'" style="height:'+h+'px"></div><div class="barDate">'+esc(d.label)+'</div></div>';}).join('')||'<div class="empty">Belum ada data.</div>'; } var top=document.getElementById('topProductList'); if(top) top.innerHTML=(a.top_products||[]).map(function(p,i){return '<div class="voucher"><b>'+(i+1)+'. '+esc(p.name)+(p.variant?' - '+esc(p.variant):'')+'</b><br>Qty '+esc(p.quantity)+' | Omzet '+rupiah(p.revenue)+'</div>';}).join('')||'<div class="empty">Belum ada data penjualan.</div>'; }
  function productMatches(p,q){ var vars=productVariants(p).map(function(v){return [v.name||v.nama,v.sku||v.kode,v.description||v.deskripsi,v.snk||v.terms].join(' ');}).join(' '); return textMatch([p.nama,p.kode,p.category,p.deskripsi,p.snk,vars],q); }
  function productInitial(p){ return String((p&&p.nama)||'?').trim().charAt(0).toUpperCase() || '?'; }

  function productColor(p){ var text=String((p&&p.kode)||(p&&p.nama)||'x'); var h=0; for(var i=0;i<text.length;i++) h=(h*31+text.charCodeAt(i))%360; return 'hsl('+h+' 85% 68%)'; }
  function productMediaHtml(p){ if(p.image_url) return '<img class="productImg" src="'+esc(p.image_url)+'" alt="">'; return '<div class="productFallback" style="background:'+productColor(p)+'">'+esc(productInitial(p))+'</div>'; }
  function productVariants(p){ return Array.isArray(p&&p.variants) ? p.variants.filter(function(v){ return (v.name||v.nama||v.sku||v.kode) && Number(v.price||v.harga||0)>0; }) : []; }
  function supplierSourceOf(x){return String(x&&x.supplier_source||'').trim().toLowerCase();}
  function isExternalSupplierLink(x){var src=supplierSourceOf(x);return (src==='prodseller'||src==='telegram_workflow')&&String(x&&x.supplier_product_id||'').trim();}
  function isWorkflowSupplierLink(x){return supplierSourceOf(x)==='telegram_workflow'&&String(x&&x.supplier_product_id||'').trim();}
  function activeProductVariants(p){ return productVariants(p).filter(function(v){ return variantActive(v); }); }
  function productDisplayPrice(p){
    var vars=activeProductVariants(p);
    if(!vars.length) vars=productVariants(p);
    if(!vars.length) return rupiah(p.harga);
    var prices=vars.map(function(v){return Number(v.price||v.harga||0);}).filter(function(n){return n>0;}).sort(function(a,b){return a-b;});
    return prices.length ? rupiah(prices[0]) : rupiah(p.harga);
  }

  function renderProducts(){
    var q=searchQuery();
    var rows=state.products.filter(function(p){return productMatches(p,q);});
    updateSearchCounter();
    document.getElementById('productList').innerHTML=rows.map(function(p){
      var supplierSource=supplierSourceOf(p); var isSupplier=isExternalSupplierLink(p); var isWorkflow=isWorkflowSupplierLink(p);
      var isPo=!isSupplier && String(p.delivery_mode||'auto')==='po';
      var varsArr=productVariants(p);
      var hasSupplierVariants=varsArr.some(isExternalSupplierLink); var hasWorkflowVariants=varsArr.some(isWorkflowSupplierLink);
      var visibleVars=varsArr.slice(0,3);
      var vars=visibleVars.map(function(v){
        var supplierVariant=isExternalSupplierLink(v); var workflowVariant=isWorkflowSupplierLink(v);
        var mode=supplierVariant?(workflowVariant?('WORKFLOW · stok '+Math.max(0,Number(v.supplier_stock||0))):('SUPPLIER · stok '+Math.max(0,Number(v.supplier_stock||0)))):(String(v.delivery_mode||p.delivery_mode||'auto')==='po'?'PO':(variantStock(v).length+' stok'));
        return '<span class="chip '+(variantActive(v)?'purple':'red')+'">'+esc(v.name||v.nama)+' · '+rupiah(v.price||v.harga||p.harga)+' · '+mode+' · '+(variantActive(v)?'ON':'OFF')+'</span>';
      }).join('');
      if(varsArr.length>visibleVars.length) vars+='<span class="chip">+'+(varsArr.length-visibleVars.length)+' varian lain</span>';
      var availability=isSupplier?(isWorkflow?('WORKFLOW RESELLER · STOK '+Math.max(0,Number(p.supplier_stock||0))):'SUPPLIER OTOMATIS'):(hasSupplierVariants?(hasWorkflowVariants?'VARIAN WORKFLOW/SUPPLIER':(isPo?'PRE-ORDER + SUPPLIER':'AUTO + SUPPLIER')):(isPo?'PRE-ORDER':('STOK '+stockCount(p))));
      var hasLocalStock=!isSupplier && (!varsArr.length ? !isPo : varsArr.some(function(v){return !isExternalSupplierLink(v) && String(v.delivery_mode||p.delivery_mode||'auto')!=='po';}));
      var actions='<button class="btn small cyan" data-edit-product="'+esc(p.kode)+'">Edit</button>'+ 
        (hasLocalStock?'<button class="btn small lime" data-stock-product="'+esc(p.kode)+'">Stok</button><button class="btn small yellow" data-manage-product="'+esc(p.kode)+'">Kelola</button>':'')+
        '<button class="btn small red" data-delete-product="'+esc(p.kode)+'">Hapus</button>';
      return '<article class="product '+(isPo?'poProduct ':'')+(p.active===false?'productOff':'')+'">'+
        '<div class="productTop">'+productMediaHtml(p)+'<div class="productInfo"><h3>'+esc(p.nama)+'</h3><div class="subtle">'+esc(p.category||'Produk')+' - '+availability+(varsArr.length?' - '+varsArr.length+' varian':'')+'<br><span class="scopeBadge '+(p.display_scope==='marketplace'?'market':'')+'">'+(p.display_scope==='marketplace'?'MARKETPLACE SAJA':'BOT + MARKETPLACE')+'</span>'+(isSupplier?'<br><span class="deliveryModeBadge">'+(isWorkflow?('WORKFLOW RESELLER · BOT SUPPLIER · STOK '+Math.max(0,Number(p.supplier_stock||0))):'SUPPLIER OTOMATIS · PRODSELLER')+'</span>':(hasSupplierVariants?'<br><span class="deliveryModeBadge">'+(hasWorkflowVariants?'MEMILIKI VARIAN WORKFLOW RESELLER':'MEMILIKI VARIAN SUPPLIER · PRODSELLER')+'</span>':(isPo?'<br><span class="deliveryModeBadge">PRE-ORDER · KIRIM MANUAL</span>':'')))+'</div></div><button class="statusToggle '+(p.active===false?'off':'')+'" data-toggle-product="'+esc(p.kode)+'">'+(p.active===false?'OFF':'ON')+'</button></div>'+ 
        '<div class="price">'+productDisplayPrice(p)+'</div>'+(vars?'<div class="chips">'+vars+'</div>':'')+
        '<div class="actions">'+actions+'</div></article>';
    }).join('')||'<div class="empty">Produk belum ada.</div>';
    wireProductButtons();
  }

  function findProduct(code){ return state.products.find(function(x){return x.kode===code;}); }
  function editVariantCardHtml(v,i, allowRemove){
    v=v||{};
    var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase();
    var supplierVariant=isExternalSupplierLink(v); var workflowVariant=isWorkflowSupplierLink(v);
    var deliveryField=supplierVariant
      ? '<div class="field"><label class="label">Sistem Pengiriman Varian</label><div class="variantMainCompact">'+(workflowVariant?'WORKFLOW RESELLER · BOT SUPPLIER':'SUPPLIER OTOMATIS · PRODSELLER')+'</div><p class="help">Link reseller tetap dipertahankan saat nama, harga, deskripsi, atau SnK varian diedit.</p></div>'
      : '<div class="field"><label class="label">Sistem Pengiriman Varian</label><select class="select" data-evfield="delivery"><option value="" '+(!v.delivery_mode?'selected':'')+'>Ikuti pengaturan produk</option><option value="auto" '+(String(v.delivery_mode||'')==='auto'?'selected':'')+'>AUTO · kirim dari stok</option><option value="po" '+(String(v.delivery_mode||'')==='po'?'selected':'')+'>PRE-ORDER · seller kirim manual</option></select><p class="help">Gunakan PRE-ORDER hanya pada varian yang ingin Anda kirim manual setelah pembayaran.</p></div>';
    return '<div class="addVariantCard" data-edit-variant-card data-old-sku="'+esc(sku)+'">'+
      '<div class="addVariantCardTitle"><b>Varian '+(i+1)+'</b><div><label class="miniSwitch"><input type="checkbox" data-evfield="active" '+(variantActive(v)?'checked':'')+'><span>ON</span></label> '+(supplierVariant?'<span class="chip green">SUPPLIER</span>':'<span class="chip yellow">Stok diatur dari Stok/Kelola</span>')+' '+(allowRemove?'<button class="btn small red" type="button" data-remove-edit-variant>Hapus</button>':'')+'</div></div>'+ 
      '<div class="row4"><div class="field"><label class="label">Nama Varian</label><input class="input" data-evfield="name" placeholder="Contoh: 1 Bulan" value="'+esc(v.name||v.nama||'')+'"></div><div class="field"><label class="label">Harga Jual Varian</label><input class="input" data-evfield="price" type="number" placeholder="Contoh: 10000" value="'+esc(v.price||v.harga||'')+'"></div><div class="field"><label class="label">Modal Supplier</label><input class="input" data-evfield="cost" type="number" min="0" placeholder="Contoh: 7000" value="'+esc(v.cost_price||v.cost||'')+'"></div><div class="field"><label class="label">Kode Varian</label><input class="input" data-evfield="sku" placeholder="Contoh: BULAN1" value="'+esc(sku)+'"></div></div>'+deliveryField+
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
      if(name){ var isSupplierVariant=isExternalSupplierLink(old); var isWorkflowVariant=isWorkflowSupplierLink(old); rows.push({
        name:name,
        price:val('price'),
        cost_price:val('cost'),
        sku:sku,
        stock:isSupplierVariant?(isWorkflowVariant?variantStock(old):[]):variantStock(old),
        bulk_prices:parseBulkArray(val('bulk')),
        description:val('description'),
        snk:val('snk'),
        delivery_mode:isSupplierVariant?'po':val('delivery'),
        active:(function(){ var el=card.querySelector('[data-evfield="active"]'); return !el || el.checked; })(),
        supplier_source:old.supplier_source||'',
        supplier_product_id:old.supplier_product_id||'',
        supplier_price_usdt:old.supplier_price_usdt||0,
        supplier_public_price_usdt:old.supplier_public_price_usdt||0,
        supplier_stock:old.supplier_stock==null?null:old.supplier_stock,
        supplier_synced_at:old.supplier_synced_at||null
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
    var isSupplier=isExternalSupplierLink(p); var isWorkflow=isWorkflowSupplierLink(p);
    var variantCards=(p.variants||[]).map(function(v,i){return editVariantCardHtml(v,i,true);}).join('');
    var deliveryEditor=isSupplier
      ? '<input type="hidden" name="delivery_mode" value="po"><div class="row"><div class="field"><label class="label">Sistem Pengiriman</label><div class="variantMainCompact">'+(isWorkflow?'WORKFLOW RESELLER · alur bot supplier dijalankan otomatis setelah pembayaran':'SUPPLIER OTOMATIS · produk langsung diambil dari ProdSeller setelah pembayaran')+'</div></div><div class="field"><label class="label">Mode Aktif</label><div class="variantMainCompact">'+(isWorkflow?'REKAMAN WORKFLOW AKTIF':'OTOMATIS · stok mengikuti saldo + stok supplier')+'</div></div></div>'
      : '<div class="row"><div class="field"><label class="label">Sistem Pengiriman Default</label><select class="select" name="delivery_mode"><option value="auto" '+(String(p.delivery_mode||'auto')!=='po'?'selected':'')+'>Otomatis dari stok</option><option value="po" '+(String(p.delivery_mode||'auto')==='po'?'selected':'')+'>Pre-Order · kirim manual</option></select><p class="help">Pesanan PRE-ORDER baru dikirim setelah Anda mengisi produk pada menu Pesanan PO.</p></div><div class="field"><label class="label">Mode Aktif</label><div class="variantMainCompact">'+(String(p.delivery_mode||'auto')==='po'?'PRE-ORDER · tidak memotong stok otomatis':'AUTO · produk diambil dari stok setelah pembayaran')+'</div></div></div>';
    return '<form id="modalEditForm" class="form"><input type="hidden" name="kode" value="'+esc(p.kode)+'">'+
      '<div class="row3"><div class="field"><label class="label">Nama Produk</label><input class="input" name="nama" placeholder="Contoh: Canva Pro 1 Bulan" value="'+esc(p.nama||'')+'"></div><div class="field"><label class="label">Kode Produk</label><input class="input" name="kode_baru" placeholder="Contoh: CANVA1B" value="'+esc(p.kode||'')+'"></div><div class="field"><label class="label">Kategori</label><input class="input" name="category" placeholder="Contoh: Akun Premium" value="'+esc(p.category||'')+'"></div></div>'+
      '<div class="row"><div class="field"><label class="label">Link Gambar Produk</label><div class="linkFieldBox"><div class="linkFieldTitle">Gambar Produk</div><input class="input" name="image_url" placeholder="https://domain.com/produk.jpg atau Google Drive" value="'+esc(p.image_url||'')+'"></div></div><div class="field"><label class="label">Tampilkan Produk Di</label><select class="select" name="display_scope"><option value="both" '+(p.display_scope!=='marketplace'?'selected':'')+'>Bot Telegram + Marketplace</option><option value="marketplace" '+(p.display_scope==='marketplace'?'selected':'')+'>Marketplace saja</option></select></div></div>'+ deliveryEditor+
      '<div class="row3 '+(hasVar?'hidden':'')+'" data-hide-when-edit-variant><div class="field"><label class="label">Harga Jual Satuan</label><input class="input" name="harga" type="number" placeholder="Contoh: 13000" value="'+esc(p.harga||'')+'"></div><div class="field"><label class="label">Modal Supplier / Item</label><input class="input" name="cost_price" type="number" min="0" placeholder="Contoh: 9000" value="'+esc(p.cost_price||'')+'"><p class="help">Berlaku untuk checkout berikutnya.</p></div><div class="field"><label class="label">Harga Grosir</label><textarea class="textarea" name="bulk_text" placeholder="Contoh per baris:\n5|5000\n10|9000">'+esc(bulkToText(p.bulk_prices||[]))+'</textarea></div></div>'+
      '<div class="row '+(hasVar?'hidden':'')+'" data-hide-when-edit-variant><div class="field"><label class="label">Deskripsi</label><textarea class="textarea tall" name="deskripsi" placeholder="Contoh:\nCanva EDU 1 tahun.\nLogin via email.">'+esc(p.deskripsi||'')+'</textarea></div><div class="field"><label class="label">Syarat & Ketentuan</label><textarea class="textarea tall" name="snk" placeholder="Contoh:\nGaransi 7 hari.\nDilarang ganti password.">'+esc(p.snk||'')+'</textarea></div></div>'+
      '<div class="switchBox" style="background:#f4e7ff"><label class="switchLabel"><input id="editVariantToggle" type="checkbox" '+(hasVar?'checked':'')+'><span class="toggleTrack"></span><span>Aktifkan / Edit Varian Produk</span></label><p class="help">Jika aktif, harga, grosir, deskripsi, dan SnK utama disembunyikan. Gunakan tombol + Tambah Varian untuk menambah pilihan varian. Stok tetap dikelola dari tombol Stok/Kelola.</p><input type="hidden" name="variants_text" id="editVariantsText"><div id="editVariantBuilder" class="variantBuilder '+(hasVar?'show':'')+'"><div class="variantMainCompact">Mode varian aktif: harga, grosir, deskripsi, dan SnK diatur per varian. Stok tidak ikut diedit di sini.</div><div id="editVariantCards">'+variantCards+'</div><button class="btn purple small" type="button" id="addEditVariantRowBtn">+ Tambah Varian</button></div></div>'+
      '<div class="editSaveDock"><div><b>Simpan perubahan produk?</b><small>Tombol tetap terlihat selama Anda mengedit.</small></div><button class="btn cyan" type="submit">Simpan Perubahan</button></div></form>';
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
          d.cost_price=variants[0].cost_price||0;
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
      html += '<div class="variantList">'+(p.variants||[]).map(function(v,i){ var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); var supplierVariant=isExternalSupplierLink(v); if(supplierVariant) return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+' <span class="chip green">'+(isWorkflowSupplierLink(v)?'WORKFLOW':'SUPPLIER')+'</span></h3><p class="help">Stok varian ini diproses otomatis dari sistem reseller dan tidak diisi manual.</p></div>'; return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+' <span class="chip '+(variantActive(v)?'green':'red')+'">'+(variantActive(v)?'ON':'OFF')+'</span></h3><p class="help">Stok sekarang: '+variantStock(v).length+'</p><label class="label">Tambah Stok Varian</label><textarea class="textarea" data-stock-field="'+esc(sku)+'" placeholder="Satu stok per baris atau pisahkan koma\nakun1:pass1\nakun2:pass2"></textarea></div>'; }).join('')+'</div>';
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
      html += '<div class="variantList">'+(p.variants||[]).map(function(v,i){ var sku=String(v.sku||v.kode||('VAR'+(i+1))).toUpperCase(); var supplierVariant=isExternalSupplierLink(v); if(supplierVariant) return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+' <span class="chip green">'+(isWorkflowSupplierLink(v)?'WORKFLOW':'SUPPLIER')+'</span></h3><p class="help">Harga: '+rupiah(v.price||v.harga||p.harga)+' · pengiriman otomatis dari sistem reseller. Tidak dapat diubah dari Kelola Stok.</p></div>'; return '<div class="variantCard"><h3>'+esc(v.name||v.nama||sku)+' <span class="chip '+(variantActive(v)?'green':'red')+'">'+(variantActive(v)?'ON':'OFF')+'</span></h3><p class="help">Harga: '+rupiah(v.price||v.harga||p.harga)+' | Grosir: '+esc(variantBulkText(v)||'-')+'</p><label class="label">Stok Varian</label><textarea class="textarea tall" data-stock-field="'+esc(sku)+'" placeholder="Satu stok per baris">'+esc(variantStock(v).join('\n'))+'</textarea></div>'; }).join('')+'</div>';
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
  function orderCostKnown(o){ return String((o&&o.cost_source)||'')==='manual' || String((o&&o.cost_source)||'')==='snapshot' || Number((o&&o.cost_total)||0)>0; }
  function orderNetSales(o){ return Math.max(0,Number((o&&o.total_price)||0)-Math.max(0,Number((o&&o.payment_fee)||0))); }
  function orderProfit(o){ return orderCostKnown(o)?Number((o&&o.profit_amount)||0):0; }
  function openOrderCost(ref){
    var o=state.orders.find(function(x){return String(x.order_ref||'')===String(ref||'');});
    if(!o) return;
    var qty=Math.max(1,Number(o.quantity||1));
    var current=orderCostKnown(o)?Number(o.cost_total||0):'';
    var net=orderNetSales(o);
    var body='<form id="orderCostForm" class="form"><div class="detailGrid"><div class="detailItem"><b>Invoice</b><br>'+esc(displayRef(o.order_ref||'-'))+'</div><div class="detailItem"><b>Produk</b><br>'+esc(o.product_name||'-')+(o.variant_name?' - '+esc(o.variant_name):'')+'</div><div class="detailItem"><b>Jumlah</b><br>'+esc(qty)+' item</div><div class="detailItem"><b>Pendapatan Setelah Fee</b><br>'+rupiah(net)+'</div></div><div class="field" style="margin-top:12px"><label class="label">Total Modal Supplier untuk Checkout Ini</label><input class="input" name="cost_total" type="number" min="0" step="1" required value="'+esc(current)+'" placeholder="Contoh: 28000"><p class="help">Isi total uang yang benar-benar dibayar ke supplier untuk seluruh '+esc(qty)+' item pada invoice ini. Nilai ini hanya berlaku untuk checkout tersebut.</p></div><div class="variantMainCompact" id="orderCostPreview">Profit bersih dihitung dari pendapatan setelah fee dikurangi total modal supplier.</div><button class="btn lime" type="submit">Simpan Modal & Hitung Profit Bersih</button></form>';
    openModal('Atur Modal Checkout',body);
    var f=document.getElementById('orderCostForm');
    var input=f&&f.cost_total;
    var preview=document.getElementById('orderCostPreview');
    function updatePreview(){ var cost=Math.max(0,Number((input&&input.value)||0)); var profit=net-cost; if(preview) preview.innerHTML='Modal per item (perkiraan): <b>'+rupiah(Math.round(cost/qty))+'</b> · Profit bersih: <b class="'+(profit<0?'profitNegative':'profitPositive')+'">'+rupiah(profit)+'</b>'; }
    if(input){ input.oninput=updatePreview; updatePreview(); }
    if(f) f.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(f); await post('update-order-cost',{order_ref:o.order_ref,cost_total:d.cost_total}); closeModal(); };
  }
  function orderStatusValue(o){ return String((o&&o.status)||'completed').toLowerCase()==='canceled'?'canceled':'completed'; }
  function orderStatusLabel(o){ return orderStatusValue(o)==='canceled'?'CANCELED':'COMPLETED'; }
  function openOrderStatusConfirm(ref){
    var o=state.orders.find(function(x){return String(x.order_ref||'')===String(ref||'');});
    if(!o) return;
    var current=orderStatusValue(o);
    var next=current==='canceled'?'completed':'canceled';
    var isCancel=next==='canceled';
    var body='<div class="statusConfirm"><div class="statusConfirmIcon '+(isCancel?'danger':'success')+'">'+(isCancel?'✕':'✓')+'</div><h3>'+(isCancel?'Tandai penjualan sebagai dibatalkan?':'Tandai penjualan sebagai selesai?')+'</h3><p>'+(isCancel?'Status transaksi akan diubah menjadi <b>CANCELED</b> untuk pencatatan. Stok, produk yang sudah dikirim, dan dana pembayaran tidak dikembalikan secara otomatis.':'Status transaksi akan dikembalikan menjadi <b>COMPLETED</b> dan tercatat sebagai penjualan selesai.')+'</p><div class="detailItem statusOrderSummary"><b>'+esc(o.product_name||'-')+(o.variant_name?' · '+esc(o.variant_name):'')+'</b><br><span>Invoice '+esc(displayRef(o.order_ref||'-'))+'</span></div><div class="statusConfirmActions"><button class="btn '+(isCancel?'red':'lime')+'" id="confirmOrderStatus" type="button">'+(isCancel?'Ya, Tandai Dibatalkan':'Ya, Tandai Selesai')+'</button><button class="btn" id="cancelOrderStatus" type="button">Kembali</button></div></div>';
    openModal('Konfirmasi Perubahan Status',body);
    document.getElementById('cancelOrderStatus').onclick=closeModal;
    document.getElementById('confirmOrderStatus').onclick=async function(){ await post('update-order-status',{order_ref:o.order_ref,status:next}); closeModal(); };
  }
  function openOrderProducts(ref){
    var o=state.orders.find(function(x){return String(x.order_ref||'')===String(ref||'');});
    if(!o) return;
    var user=o.username?'@'+esc(o.username):esc(o.telegram_id);
    var text=orderProductText(o);
    openModal('Detail Penjualan', '<div class="detailGrid"><div class="detailItem"><b>Invoice</b><br>'+esc(displayRef(o.order_ref||'-'))+'</div><div class="detailItem"><b>User</b><br>'+user+'</div><div class="detailItem"><b>Produk</b><br>'+esc(o.product_name||'-')+(o.variant_name?' - '+esc(o.variant_name):'')+'</div><div class="detailItem"><b>Jumlah</b><br>'+esc(o.quantity||1)+' item</div><div class="detailItem"><b>Total Dibayar</b><br>'+rupiah(o.total_price)+'</div><div class="detailItem"><b>Fee Pembayaran</b><br>'+rupiah(o.payment_fee||0)+'</div><div class="detailItem"><b>Status</b><br>'+esc(orderStatusLabel(o))+'</div><div class="detailItem"><b>Tanggal</b><br>'+new Date(o.created_at).toLocaleString('id-ID')+'</div></div><div class="field" style="margin-top:12px"><label class="label">Produk yang diterima pembeli</label><textarea class="textarea tall" readonly>'+esc(text)+'</textarea></div><button class="btn yellow" type="button" id="editOrderCostFromDetail">Atur / Koreksi Modal Checkout</button>');
    var edit=document.getElementById('editOrderCostFromDetail'); if(edit) edit.onclick=function(){ openOrderCost(o.order_ref); };
  }
  function orderMatches(o,q){ return textMatch([o.order_ref,o.product_name,o.variant_name,o.username,o.telegram_id,o.total_price,o.quantity,o.created_at,o.cost_total,o.profit_amount,o.status,orderProductText(o)],q); }
  function renderOrders(){
    var q=searchQuery(); var rows=state.orders.filter(function(o){return orderMatches(o,q);}); updateSearchCounter();
    document.getElementById('orderList').innerHTML=rows.map(function(o){
      var user=o.username?'@'+esc(o.username):esc(o.telegram_id);
      var rawRef=String(o.order_ref||('INV-'+String(o.created_at||'').replace(/[^0-9]/g,'').slice(-10)));
      var ref=esc(displayRef(rawRef));
      var name=esc(o.product_name)+(o.variant_name?' <span class="chip yellow">'+esc(o.variant_name)+'</span>':'');
      var canceled=orderStatusValue(o)==='canceled';
      return '<article class="orderCard'+(canceled?' orderCanceled':'')+'"><div class="orderRef">'+ref+'</div><div class="orderTitleRow"><b class="orderTitle">'+name+'</b><button class="orderStatusButton '+(canceled?'canceled':'completed')+'" type="button" data-order-status="'+esc(rawRef)+'">'+orderStatusLabel(o)+'</button></div><div class="orderMeta">×'+esc(o.quantity||1)+' · Total <b>'+rupiah(o.total_price)+'</b><br>Fee pembayaran: '+rupiah(o.payment_fee||0)+'<br>👤 '+user+'<br>🗓 '+new Date(o.created_at).toLocaleString('id-ID')+'</div><div class="actions"><button class="btn small purple" type="button" data-order-products="'+esc(rawRef)+'">Detail</button><button class="btn small yellow" type="button" data-order-cost="'+esc(rawRef)+'">Atur Modal</button></div></article>';
    }).join('')||'<div class="empty">Belum ada order.</div>';
    document.querySelectorAll('[data-order-products]').forEach(function(btn){btn.onclick=function(){openOrderProducts(btn.dataset.orderProducts);};});
    document.querySelectorAll('[data-order-cost]').forEach(function(btn){btn.onclick=function(){openOrderCost(btn.dataset.orderCost);};});
    document.querySelectorAll('[data-order-status]').forEach(function(btn){btn.onclick=function(){openOrderStatusConfirm(btn.dataset.orderStatus);};});
  }
  function poMatches(o,q){ return textMatch([o.order_ref,o.product_name,o.product_code,o.variant_name,o.username,o.telegram_id,o.status,o.delivery_text,o.total_price],q); }
  function findPoTextarea(ref){
    var rows=Array.prototype.slice.call(document.querySelectorAll('[data-po-text]'));
    return rows.find(function(el){return String(el.dataset.poText||'')===String(ref||'');})||null;
  }
  function openPoDeliveryConfirm(ref){
    var po=(state.poOrders||[]).find(function(x){return String(x.order_ref||'')===String(ref||'');});
    if(!po) return toast('Pesanan PO tidak ditemukan.',true);
    if(String(po.status||'')!=='waiting_delivery') return toast('Pesanan PO ini tidak sedang menunggu pengiriman.',true);
    var input=findPoTextarea(ref);
    var text=String(input&&input.value||'').trim();
    if(!text) return toast('Masukkan produk/akun yang akan dikirim.',true);
    var preview=text.length>900?text.slice(0,900)+'\n…':text;
    var body='<div class="statusConfirm"><div class="statusConfirmIcon success">➤</div><h3>Kirim produk ke pembeli sekarang?</h3><p>Pastikan akun/produk sudah benar. Setelah Telegram berhasil menerima pesan, status PO akan menjadi <b>TERKIRIM</b>.</p><div class="detailGrid"><div class="detailItem"><b>Invoice</b><br>'+esc(displayRef(po.order_ref||'-'))+'</div><div class="detailItem"><b>Pembeli</b><br>'+(po.username?'@'+esc(po.username):'ID '+esc(po.telegram_id))+'</div><div class="detailItem"><b>Produk</b><br>'+esc(po.product_name||po.product_code||'-')+(po.variant_name?' · '+esc(po.variant_name):'')+'</div><div class="detailItem"><b>Jumlah</b><br>'+esc(po.quantity||1)+' item</div></div><div class="field" style="margin-top:10px"><label class="label">Produk / akun yang akan dikirim</label><pre class="detailItem" style="max-height:220px;overflow:auto;white-space:pre-wrap">'+esc(preview)+'</pre></div><div class="statusConfirmActions"><button class="btn lime" id="confirmPoSend" type="button">Kirim ke Pembeli</button><button class="btn" id="cancelPoSend" type="button">Periksa Lagi</button></div></div>';
    openModal('Konfirmasi Pengiriman PRE-ORDER',body);
    document.getElementById('cancelPoSend').onclick=closeModal;
    document.getElementById('confirmPoSend').onclick=async function(){
      var btn=this; btn.disabled=true; btn.textContent='Mengirim...';
      try{ await post('fulfill-po',{order_ref:po.order_ref,delivery_text:text}); closeModal(); toast('Produk PO berhasil dikirim ke pembeli.'); }
      catch(e){ btn.disabled=false; btn.textContent='Kirim ke Pembeli'; }
    };
  }
  function renderPoOrders(){
    var box=document.getElementById('poOrderList'); if(!box) return;
    var q=searchQuery();
    var rows=(state.poOrders||[]).filter(function(o){return poMatches(o,q);}).slice().sort(function(a,b){
      var aw=String(a.status||'')==='waiting_delivery'?0:1, bw=String(b.status||'')==='waiting_delivery'?0:1;
      return aw-bw || new Date(b.created_at||0)-new Date(a.created_at||0);
    });
    box.innerHTML=rows.map(function(o){
      var status=String(o.status||'waiting_delivery');
      var waiting=status==='waiting_delivery';
      var delivered=status==='delivered';
      var label=waiting?'MENUNGGU DIKIRIM':(delivered?'TERKIRIM':'DIBATALKAN');
      var badgeClass=waiting?'waiting':(delivered?'delivered':'');
      var user=o.username?'@'+esc(o.username):'ID '+esc(o.telegram_id);
      var editor=waiting
        ? '<div class="field"><label class="label">Produk / Akun untuk Pembeli</label><textarea class="textarea poDelivery" data-po-text="'+esc(o.order_ref)+'" placeholder="Tempel akun, password, link, lisensi, atau data produk yang akan diterima pembeli."></textarea><p class="help">Data baru dikirim setelah Anda menekan Kirim dan mengonfirmasi.</p></div><button class="btn lime" type="button" data-po-send="'+esc(o.order_ref)+'">Kirim Produk ke Pembeli</button>'
        : (delivered?'<div class="detailItem"><b>Produk yang sudah dikirim</b><br><pre style="white-space:pre-wrap;margin:7px 0 0">'+esc(o.delivery_text||'-')+'</pre></div>':'<div class="detailItem">Pesanan dibatalkan. Produk tidak dapat dikirim dari menu PO.</div>');
      return '<article class="poCard '+(delivered?'delivered':'')+'"><div class="poHead"><div><h3>'+esc(o.product_name||o.product_code||'-')+'</h3><div class="poMeta">'+(o.variant_name?esc(o.variant_name)+' · ':'')+esc(o.quantity||1)+' item · '+rupiah(o.total_price||0)+'</div></div><span class="poStatus '+badgeClass+'">'+label+'</span></div><div class="poMeta"><b>Invoice:</b> '+esc(displayRef(o.order_ref||'-'))+'<br><b>Pembeli:</b> '+user+'<br><b>Dibayar:</b> '+(o.paid_at?new Date(o.paid_at).toLocaleString('id-ID'):'-')+(o.delivered_at?'<br><b>Dikirim:</b> '+new Date(o.delivered_at).toLocaleString('id-ID'):'')+'</div>'+editor+'</article>';
    }).join('')||'<div class="empty">Belum ada pesanan PRE-ORDER.</div>';
    document.querySelectorAll('[data-po-send]').forEach(function(btn){btn.onclick=function(){openPoDeliveryConfirm(btn.dataset.poSend);};});
  }

  function userMatches(u,q){ return textMatch([u.telegram_id,u.username,u.first_name,u.transaction_count,u.spending,u.balance_main,u.balance_referral,u.referral_code],q); }
  function renderUsers(sortMode){
    if(sortMode) state.userSort=sortMode;
    var q=searchQuery();
    var rows=state.users.filter(function(u){return userMatches(u,q);});
    updateSearchCounter();
    if(state.userSort==='transactions') rows.sort(function(a,b){return Number(b.transaction_count||0)-Number(a.transaction_count||0);});
    else if(state.userSort==='spending') rows.sort(function(a,b){return Number(b.spending||0)-Number(a.spending||0);});
    document.getElementById('userList').innerHTML=rows.map(function(u){
      var display=u.username?'@'+esc(u.username):esc(u.first_name||'Tanpa username');
      var initial=String(u.first_name||u.username||'U').slice(0,1).toUpperCase();
      var main=Number(u.balance_main||0), referral=Number(u.balance_referral||0), total=main+referral;
      return '<article class="userCard walletUserCard"><div class="userIdentity"><div class="userAvatar">'+esc(initial)+'</div><div class="userMain"><b>'+display+'</b><small>ID '+esc(u.telegram_id)+(u.referral_code?' · Ref '+esc(u.referral_code):'')+'</small></div></div><div class="userMetric userTransactions"><span>Transaksi</span><b>'+esc(u.transaction_count||0)+'</b></div><div class="userMetric userSpending"><span>Spending</span><b>'+rupiah(u.spending||0)+'</b></div><div class="userWallet"><span><small>Utama</small><b>'+rupiah(main)+'</b></span><span><small>Referral</small><b>'+rupiah(referral)+'</b></span><span><small>Total</small><b>'+rupiah(total)+'</b></span></div><div class="userActions"><button class="btn cyan userBalanceBtn" data-balance-user="'+esc(u.telegram_id)+'">Atur Saldo</button><button class="btn red userDelete" data-del-user="'+esc(u.telegram_id)+'">Hapus</button></div></article>';
    }).join('')||'<div class="empty">Belum ada user.</div>';
    document.querySelectorAll('[data-balance-user]').forEach(function(btn){btn.onclick=function(){openUserBalance(btn.dataset.balanceUser);};});
    document.querySelectorAll('[data-del-user]').forEach(function(btn){btn.onclick=async function(){ if(confirm('Hapus user '+btn.dataset.delUser+'?')) await post('delete-user',{telegram_id:btn.dataset.delUser});};});
    document.querySelectorAll('[data-user-sort]').forEach(function(btn){btn.onclick=function(){ renderUsers(btn.dataset.userSort); };});
  }
  function openUserBalance(telegramId){
    var u=(state.users||[]).find(function(x){return String(x.telegram_id)===String(telegramId);});
    if(!u) return toast('User tidak ditemukan.',true);
    var display=u.username?'@'+esc(u.username):esc(u.first_name||'Tanpa username');
    var main=Number(u.balance_main||0), referral=Number(u.balance_referral||0);
    var body='<form id="userBalanceForm" class="form"><div class="balanceEditorSummary"><div class="detailItem"><b>User</b><br>'+display+'<br><small>ID '+esc(u.telegram_id)+'</small></div><div class="detailItem"><b>Saldo Saat Ini</b><br>'+rupiah(main+referral)+'</div><div class="detailItem"><b>Kode Referral</b><br>'+esc(u.referral_code||'-')+'</div></div><div class="row"><div class="field"><label class="label">Saldo Utama</label><input class="input" type="number" min="0" step="1" name="balance_main" value="'+esc(main)+'" required><p class="help">Saldo hasil top up atau penyesuaian admin.</p></div><div class="field"><label class="label">Saldo Referral</label><input class="input" type="number" min="0" step="1" name="balance_referral" value="'+esc(referral)+'" required><p class="help">Saldo hadiah dari program referral.</p></div></div><div class="field balanceReason"><label class="label">Catatan Penyesuaian</label><input class="input" name="reason" maxlength="180" value="Penyesuaian saldo dari Reseller Dashboard" placeholder="Contoh: Koreksi top up atau bonus pelanggan"></div><input type="hidden" name="telegram_id" value="'+esc(u.telegram_id)+'"><div class="variantMainCompact" id="balanceEditorPreview">Total saldo baru: '+rupiah(main+referral)+'</div><button class="btn lime" type="submit">Simpan Perubahan Saldo</button></form>';
    openModal('Atur Saldo User',body);
    var f=document.getElementById('userBalanceForm');
    function preview(){ var total=Math.max(0,Number(f.balance_main.value||0))+Math.max(0,Number(f.balance_referral.value||0)); var box=document.getElementById('balanceEditorPreview'); if(box)box.textContent='Total saldo baru: '+rupiah(total); }
    f.balance_main.oninput=preview; f.balance_referral.oninput=preview;
    f.onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(f); if(Number(d.balance_main)<0||Number(d.balance_referral)<0)return toast('Saldo tidak boleh negatif.',true); await post('set-user-balances',d); closeModal();};
  }
  function updateDiscountInputMode(){
    var f=document.getElementById('promoUnifiedForm'); if(!f) return;
    var type=String((f.discount_type&&f.discount_type.value)||'amount');
    var input=f.discount_value; var help=document.getElementById('discountValueHelp');
    if(!input) return;
    if(type==='percent'){
      input.max='100'; input.placeholder='Contoh: 10';
      if(help) help.textContent='Masukkan persentase 1–100. Contoh 10 berarti potongan 10% dari subtotal yang memenuhi syarat.';
    }else{
      input.removeAttribute('max'); input.placeholder='Contoh: 5000';
      if(help) help.textContent='Masukkan nominal potongan dalam rupiah.';
    }
  }
  function updatePromoFlashSaleControl(){ var f=document.getElementById('promoUnifiedForm'); var box=document.getElementById('promoFlashSaleBox'); var check=document.getElementById('promoFlashSale'); if(!f||!box||!check)return; var isAuto=f.promo_kind.value==='auto'; box.classList.toggle('hidden',!isAuto); if(!isAuto) check.checked=false; }
  function promoUnifiedReset(){
    var f=document.getElementById('promoUnifiedForm'); if(!f) return;
    f.reset(); f.current_code.value=''; setPromoTargets([]); updateDiscountInputMode(); var check=document.getElementById('promoFlashSale'); if(check)check.checked=false; updatePromoFlashSaleControl();
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
    f.discount_type.value=item.discount_type || 'amount'; updateDiscountInputMode();
    f.discount_value.value=item.discount_value || item.discount || '';
    f.usage_limit.value=item.usage_limit || item.limit || '';
    f.min_qty.value=item.min_qty || 1;
    f.min_spend.value=item.min_spend || 0;
    setPromoTargets(item.products||[]);
    f.description.value=item.description||'';
    f.start_at.value=toLocalInputValue(item.start_at);
    f.end_at.value=toLocalInputValue(item.end_at || item.expires_at);
    var check=document.getElementById('promoFlashSale'); if(check) check.checked=type==='auto' && item.flash_sale===true; updatePromoFlashSaleControl();
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
  function flashAdminWindow(){ var s=state.settings||{}; var now=Date.now(); var enabled=String(s.flash_sale_enabled||'').toLowerCase()==='true'; var start=s.flash_sale_start_at?new Date(s.flash_sale_start_at).getTime():NaN; var end=s.flash_sale_end_at?new Date(s.flash_sale_end_at).getTime():NaN; var valid=isFinite(start)&&isFinite(end)&&end>start; return {enabled:enabled,valid:valid,scheduled:valid&&start>now,expired:valid&&end<=now,active:enabled&&valid&&start<=now&&end>now}; }
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
    if(type==='auto'&&x.flash_sale){ var fw=flashAdminWindow(); if(!fw.active){ on=false; reason=!fw.enabled?'FLASH SALE OFF':(!fw.valid?'JADWAL FLASH SALE BELUM LENGKAP':(fw.scheduled?'MENUNGGU FLASH SALE':'FLASH SALE SELESAI')); } }
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
      var minQty=Math.max(1,Number(x.min_qty||1));
      var minSpend=Math.max(0,Number(x.min_spend||0));
      var limit=(x.usage_limit?x.usage_limit:'∞');
      var end=x.end_at||x.expires_at||'';
      var statusHtml=st.on?'<span class="chip green">ON</span>':'<span class="chip red">OFF</span>';
      if(!st.on&&st.reason) statusHtml+=' <span class="chip orange">'+esc(st.reason)+'</span>';
      if(item.type==='auto'&&x.flash_sale) statusHtml+=' <span class="chip cyan">⚡ FLASH SALE</span>';
      var dateText=(x.start_at||end)?'<div class="promoCompactDate">'+esc(promoDateText(x.start_at)||'Sekarang')+' — '+esc(promoDateText(end)||'Tanpa batas')+'</div>':'';
      var promoTitle=String(x.name||x.code||'Promo');
      var note=x.description&&String(x.description).trim()!==promoTitle.trim()?'<p class="promoCompactNote">'+esc(x.description)+'</p>':'';
      return '<article class="promoCompactCard '+(item.type==='voucher'?'voucherManual':'promoAuto')+'"><div class="promoCompactHead"><div class="promoIdentity"><span class="promoIcon">'+(item.type==='voucher'?'🎟️':'🏷️')+'</span><div><span class="promoTitle">'+esc(promoTitle)+'</span><small>'+esc(item.label)+' · '+esc(x.code)+'</small></div></div><div class="promoStatusGroup">'+statusHtml+'</div></div><div class="promoCompactBody"><div class="promoDiscountValue"><small>Diskon</small><b>'+esc(unifiedDiscountText(x))+'</b></div><div class="promoFacts"><span title="'+esc(target)+'"><b>Target</b> '+esc(target)+'</span><span><b>Syarat</b> '+esc(minQty)+' item'+(minSpend?' · '+rupiah(minSpend):'')+'</span><span><b>Dipakai</b> '+esc(st.used)+' / '+esc(limit)+'</span></div></div>'+note+dateText+'<div class="promoCompactActions promoBottomActions"><button class="btn small cyan" data-edit-unified="'+esc(item.type)+'|'+esc(x.code)+'">Edit</button><button class="btn small red" data-delete-unified="'+esc(item.type)+'|'+esc(x.code)+'">Hapus</button></div></article>';
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
      ['Voucher Nonaktif/Expired', m.vouchers_inactive_or_expired||0, 'Aman dibersihkan jika tidak dipakai'],
      ['Lock Kedaluwarsa', m.job_locks_expired||0, 'Lock pembayaran/broadcast yang sudah tidak aktif']
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
    var box=document.getElementById('deepStatsBox'); if(box){ var rows=[['Omset Hari Ini',rupiah(d.revenue_today)],['Profit Bersih Hari Ini',rupiah(d.profit_today)],['Omset Bulan Ini',rupiah(d.revenue_month)],['Profit Bersih Bulan Ini',rupiah(d.profit_month)],['Total Omset Semua Waktu',rupiah(d.revenue_total)],['Total Modal Tercatat',rupiah(d.cost_total)],['Total Profit Bersih',rupiah(d.profit_total)],['Rata-rata Nilai Order',rupiah(d.average_order_value)],['Total Item Terjual',d.quantity_sold||0],['Estimasi Checkout Berhasil',(d.conversion_rate||0)+'%'],['Promo Otomatis Aktif',d.active_promos||0],['Pending Order Aktif',d.pending_orders||0]]; box.innerHTML=rows.map(function(r){return '<div class="detailItem"><b>'+esc(r[0])+'</b><br><span style="font-size:22px">'+esc(r[1])+'</span></div>';}).join(''); }
    var low=document.getElementById('lowStockList'); if(low){ low.innerHTML=(d.low_stock||[]).map(function(p){return '<div class="voucher"><b>'+esc(p.name)+'</b><br><span class="chip red">Stok '+esc(p.stock)+'</span></div>';}).join('')||'<div class="empty">Tidak ada stok kritis.</div>'; }
    var tu=document.getElementById('topUsersList'); if(tu){ tu.innerHTML=(d.top_users||[]).map(function(u,i){return '<div class="voucher"><b>'+(i+1)+'. '+(u.username?'@'+esc(u.username):esc(u.first_name||u.telegram_id))+'</b><br>Transaksi '+esc(u.transaction_count||0)+' | Spending '+rupiah(u.spending||0)+'</div>';}).join('')||'<div class="empty">Belum ada user.</div>'; }
    var hr=document.getElementById('hourlyStats'); if(hr){ hr.innerHTML=(d.hourly||[]).filter(function(x){return x.orders>0;}).map(function(x){return '<span class="chip yellow">'+String(x.hour).padStart(2,'0')+'.00: '+x.orders+' order / '+rupiah(x.revenue)+'</span>';}).join(' ')||'<div class="empty">Belum ada data jam ramai.</div>'; }
  }

  async function load(){
    try{
      var all=await Promise.all([
        apiSafe('license-status',{}), apiSafe('stats',{}), apiSafe('products',[]), apiSafe('orders',[]), apiSafe('po-orders',[]), apiSafe('users',[]), apiSafe('vouchers',[]), apiSafe('settings',{}), apiSafe('analytics',{}), apiSafe('polls',[]), apiSafe('maintenance-stats',{}), apiSafe('backup-logs',[]), apiSafe('promos',[]), apiSafe('deep-stats',{})
      ]);
      state.license=all[0]||{}; state.stats=all[1]||{}; state.products=all[2]||[]; state.orders=all[3]||[]; state.poOrders=all[4]||[]; state.users=all[5]||[]; state.vouchers=all[6]||[]; state.settings=all[7]||{}; state.analytics=all[8]||{}; state.polls=all[9]||[]; state.maintenance=all[10]||{}; state.backups=all[11]||[]; state.promos=all[12]||[]; state.deepStats=all[13]||{}; refreshPromoTargetProducts();
      renderHeader(); renderLicense(); renderStats(); renderCharts(); renderProducts(); renderOrders(); renderPoOrders(); renderUsers(); renderVouchers(); renderPolls(); renderMaintenance(); renderBackup(); renderPromos(); renderDeepStats(); updateSearchCounter();
    }catch(e){ toast(e.message,true); renderLicense(); renderStats(); renderProducts(); renderMaintenance(); }
  }
  async function post(action,data){ try{ var r=await api(action,data); toast('Berhasil diproses'); await load(); return r; }catch(e){ toast(e.message,true); throw e; } }
  document.querySelectorAll('[data-tab]').forEach(function(btn){btn.onclick=function(){ switchTab(btn.dataset.tab,{smooth:btn.classList.contains('settingsSubBtn'),scrollTarget:btn.dataset.scrollTarget}); if(btn.dataset.tab==='supplierSettings') loadSupplier(false); if(btn.dataset.tab==='workflowSettings') loadWorkflow(false); };});
  var refreshLicense=document.getElementById('refreshLicense'); if(refreshLicense) refreshLicense.onclick=async function(){ state.license=await apiSafe('license-status',{}); renderLicense(); toast('Status lisensi diperbarui'); }; try{ var lastTab=localStorage.getItem('admin_active_tab'); if(lastTab==='vouchers') lastTab='promos'; if(lastTab && document.getElementById(lastTab)){ switchTab(lastTab); if(lastTab==='supplierSettings') loadSupplier(false); if(lastTab==='workflowSettings') loadWorkflow(false); } }catch(e){}
  document.getElementById('search').oninput=function(){ renderProducts(); renderOrders(); renderPoOrders(); renderUsers(); renderUnifiedPromos(); };
  document.querySelectorAll('[data-promo-sub]').forEach(function(btn){btn.onclick=function(){ if(btn.dataset.promoSub==='create') promoUnifiedReset(); else setPromoSub(btn.dataset.promoSub||'list'); };});
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
        payload.cost_price=variants[0].cost_price||'0';
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
  var addImageBannerRow=document.getElementById('addImageBannerRow'); if(addImageBannerRow) addImageBannerRow.onclick=function(){addBannerRow('image');}; var addNativeBannerRow=document.getElementById('addNativeBannerRow'); if(addNativeBannerRow) addNativeBannerRow.onclick=function(){addBannerRow('native');};
  var storeSettingsForm=document.getElementById('storeSettingsForm'); if(storeSettingsForm) storeSettingsForm.onsubmit=async function(e){e.preventDefault(); var r=await post('save-settings',formDataRaw(e.target)); if(r&&r.bot_name_sync&&r.bot_name_sync.ok===false){toast('Pengaturan tersimpan, tetapi nama tampilan bot Telegram belum tersinkron: '+(r.bot_name_sync.error||'cek BOT_TOKEN'),true);} else if(r&&r.bot_name_sync&&!r.bot_name_sync.skipped){toast('Nama toko dan nama tampilan bot Telegram berhasil diperbarui.');}};
  var testTransactionChannel=document.getElementById('testTransactionChannel'); if(testTransactionChannel) testTransactionChannel.onclick=async function(){ try{var f=document.getElementById('storeSettingsForm'); var d=f?formDataRaw(f):{}; var r=await post('test-transaction-channel',{transaction_channel_id:d.transaction_channel_id||''}); toast('Notifikasi tes terkirim ke '+((r.data&&r.data.target)||'channel'));}catch(e){toast(e.message||'Tes notifikasi gagal',true);} };
  var retryTransactionNotifications=document.getElementById('retryTransactionNotifications'); if(retryTransactionNotifications) retryTransactionNotifications.onclick=async function(){ try{var r=await post('retry-transaction-notifications',{limit:30}); var d=(r&&r.data)||{}; toast('Pemeriksaan '+Number(d.checked||0)+' order selesai. '+Number(d.sent||0)+' notifikasi yang belum terkirim berhasil dikirim.');}catch(e){toast(e.message||'Pemulihan notifikasi gagal',true);} };
  var testRequiredChannel=document.getElementById('testRequiredChannel'); if(testRequiredChannel) testRequiredChannel.onclick=async function(){ try{var f=document.getElementById('storeSettingsForm'); var d=f?formDataRaw(f):{}; var r=await post('test-required-channel',{required_channel_id:d.required_channel_id||''}); toast('Cek member berhasil: '+((r.data&&r.data.status)||'-'));}catch(e){toast(e.message||'Tes cek join gagal',true);} };
  var bannerSettingsForm=document.getElementById('bannerSettingsForm'); if(bannerSettingsForm) bannerSettingsForm.onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(e.target); var banners=collectBannerRows(); var imageBanners=banners.filter(function(x){return x.type==='image'&&x.url;}); d.store_description=''; d.banner_items=JSON.stringify(banners); d.banner_urls=imageBanners.map(function(x){return x.url;}).join('\n'); d.banner_url=imageBanners.length?imageBanners[0].url:''; d.banner_interval_seconds=Math.max(3,Math.min(15,Number(d.banner_interval_seconds||5))); await post('save-settings',d);};
  var startMediaForm=document.getElementById('startMediaForm'); if(startMediaForm) startMediaForm.onsubmit=async function(e){e.preventDefault(); await post('save-settings',formDataRaw(e.target));};
  var walletSettingsForm=document.getElementById('walletSettingsForm'); if(walletSettingsForm) walletSettingsForm.onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(e.target); var min=Math.max(1000,Number(d.topup_min_amount||0)); var max=Math.max(min,Number(d.topup_max_amount||0)); d.topup_min_amount=min; d.topup_max_amount=max; d.referral_reward_amount=Math.max(0,Number(d.referral_reward_amount||0)); await post('save-settings',d);};
  var supplierSettingsForm=document.getElementById('supplierSettingsForm'); if(supplierSettingsForm) supplierSettingsForm.onsubmit=async function(e){e.preventDefault(); var d=formDataRaw(e.target); d.prodseller_usdt_to_idr=Math.max(1,Number(d.prodseller_usdt_to_idr||16500)); d.prodseller_markup_percent=Math.max(0,Number(d.prodseller_markup_percent||25)); await post('save-settings',d); state.supplierLoaded=false; await loadSupplier(true);};
  var refreshSupplier=document.getElementById('refreshSupplier'); if(refreshSupplier) refreshSupplier.onclick=async function(){ refreshSupplier.disabled=true; var old=refreshSupplier.textContent; refreshSupplier.textContent='Memuat...'; try{ state.supplierLoaded=false; await loadSupplier(true); toast('Data ProdSeller diperbarui.'); }finally{ refreshSupplier.disabled=false; refreshSupplier.textContent=old; } };
  var supplierSearch=document.getElementById('supplierSearch'); if(supplierSearch) supplierSearch.oninput=renderSupplier;
  var addResellerSupplier=document.getElementById('addResellerSupplier'); if(addResellerSupplier) addResellerSupplier.onclick=function(){openSupplierEdit(null);};
  function workflowSelectedMessageRange(){
    var current=state.workflowDetail&&state.workflowDetail.workflow;
    if(!current)return null;
    var messageId=Number(current.last_message_id||0);
    if(!messageId)return null;
    var box=document.querySelector('[data-workflow-message-text="'+messageId+'"]');
    if(!box)return {message_id:messageId,selection_start:0,selection_end:0,selected_text:''};
    var start=Number(box.selectionStart||0),end=Number(box.selectionEnd||0);
    return {message_id:messageId,selection_start:start,selection_end:end,selected_text:String(box.value||'').slice(start,end)};
  }
  var workflowTarget=document.getElementById('workflowTarget'); if(workflowTarget) workflowTarget.onchange=syncWorkflowTargetHidden;
  var workflowSupplier=document.getElementById('workflowSupplier'); if(workflowSupplier) workflowSupplier.onchange=syncWorkflowSupplierHidden;
  var workflowSelect=document.getElementById('workflowSelect'); if(workflowSelect) workflowSelect.onchange=function(){loadWorkflowDetail(workflowSelect.value);};
  var workflowRefreshAll=document.getElementById('workflowRefreshAll'); if(workflowRefreshAll) workflowRefreshAll.onclick=async function(){workflowRefreshAll.disabled=true; try{state.workflowLoaded=false; await loadWorkflow(true); toast('Workflow diperbarui.');}finally{workflowRefreshAll.disabled=false;}};
  var workflowCreateForm=document.getElementById('workflowCreateForm'); if(workflowCreateForm) workflowCreateForm.onsubmit=async function(e){e.preventDefault(); syncWorkflowTargetHidden(); syncWorkflowSupplierHidden(); var d=formDataRaw(e.target); if(!d.supplier_id)return toast('Buat/pilih Supplier terlebih dahulu.',true); d.unit_cost_idr=Math.max(0,Number(d.unit_cost_idr||0)); if(d.unit_cost_idr<=0)return toast('Modal produk harus lebih dari Rp0 agar stok dapat dihitung.',true); var btn=e.target.querySelector('button[type="submit"]'); if(btn)btn.disabled=true; try{var r=await api('workflow-create',d); var id=r.data&&r.data.workflow&&r.data.workflow.id; await reloadWorkflowAndSuppliers(id); toast('Mode rekam aktif. Sekarang ketik /start atau pilih aksi berikutnya.');}catch(err){toast(err.message,true);}finally{if(btn)btn.disabled=false;}};
  document.querySelectorAll('[data-workflow-insert]').forEach(function(btn){btn.onclick=function(){var category=document.getElementById('workflowTextCategory'); if(category)category.value='other'; syncWorkflowTextCategory(); var input=document.getElementById('workflowTextInput'); if(!input)return; var value=btn.dataset.workflowInsert||''; if(value==='/start')input.value='/start'; else input.value=(String(input.value||'')+(input.value?' ':'')+value); input.focus();};});
  function syncWorkflowTextCategory(){var category=document.getElementById('workflowTextCategory'); var value=String(category&&category.value||'other'); var qty=document.getElementById('workflowQuantityBox'); var other=document.getElementById('workflowOtherTextBox'); var box=document.getElementById('workflowTextCategoryBox'); var send=document.getElementById('workflowSendText'); if(qty)qty.classList.toggle('hidden',value!=='quantity'); if(other)other.classList.toggle('hidden',value==='quantity'); if(box)box.classList.toggle('quantity',value==='quantity'); if(send)send.textContent=value==='quantity'?'🔢 Kirim Jumlah Pembelian & Rekam':'✍️ Kirim Teks & Rekam';}
  var workflowTextCategory=document.getElementById('workflowTextCategory'); if(workflowTextCategory)workflowTextCategory.onchange=syncWorkflowTextCategory; syncWorkflowTextCategory();
  var workflowSendText=document.getElementById('workflowSendText'); if(workflowSendText) workflowSendText.onclick=async function(){var id=workflowCurrentId(); var input=document.getElementById('workflowTextInput'); var category=String((document.getElementById('workflowTextCategory')||{}).value||'other'); var text=category==='quantity'?'{quantity}':String((input&&input.value)||'').trim(); if(!id)return toast('Pilih workflow dulu.',true); if(category!=='quantity'&&!text)return toast('Isi teks/perintah yang akan dikirim.',true); workflowSendText.disabled=true; var old=workflowSendText.textContent; workflowSendText.textContent=category==='quantity'?'Mengirim jumlah...':'Mengirim...'; try{var r=await workflowRecorderExclusive(function(){return api('workflow-action',{workflow_id:id,action_type:'text',action_value:text,text_category:category});}); if(input&&category!=='quantity')input.value=''; state.workflowLoaded=false; await loadWorkflow(true); if(r.data&&r.data.selection_required)toast('Supplier mengirim beberapa pesan. Pilih pesan yang akan direkam sebelum melanjutkan.');}catch(e){toast(e.message,true);}finally{workflowSendText.disabled=false;syncWorkflowTextCategory();}};
  var workflowRefreshMessage=document.getElementById('workflowRefreshMessage'); if(workflowRefreshMessage) workflowRefreshMessage.onclick=async function(){var id=workflowCurrentId(); if(!id)return toast('Pilih workflow dulu.',true); workflowRefreshMessage.disabled=true; try{var r=await api('workflow-refresh',{workflow_id:id}); state.workflowLoaded=false; await loadWorkflow(true); var count=(r.data&&r.data.responses&&r.data.responses.length)||0; toast(count>1?('Ditemukan '+count+' pesan supplier. Pilih pesan yang benar.'):('Pesan supplier diperbarui.'));}catch(e){toast(e.message,true);}finally{workflowRefreshMessage.disabled=false;}};
  var workflowMarkResult=document.getElementById('workflowMarkResult'); if(workflowMarkResult) workflowMarkResult.onclick=async function(){var id=workflowCurrentId();var range=workflowSelectedMessageRange();if(!id)return toast('Pilih workflow dulu.',true);if(!range||!range.message_id)return toast('Pilih pesan supplier yang berisi produk terlebih dahulu.',true);if(!(range.selection_end>range.selection_start)){if(!confirm('Belum ada bagian teks yang diblok. Gunakan SELURUH pesan ini sebagai produk?'))return;}try{await api('workflow-mark-result',{workflow_id:id,message_id:range.message_id,selection_start:range.selection_start,selection_end:range.selection_end});state.workflowLoaded=false;await loadWorkflow(true);toast(range.selection_end>range.selection_start?'Bagian teks terpilih disimpan sebagai Hasil Produk.':'Seluruh pesan disimpan sebagai Hasil Produk.');}catch(e){toast(e.message,true);}};
  var workflowMarkStock=document.getElementById('workflowMarkStock'); if(workflowMarkStock) workflowMarkStock.onclick=async function(){var id=workflowCurrentId();var range=workflowSelectedMessageRange();if(!id)return toast('Pilih workflow dulu.',true);if(!range||!range.message_id)return toast('Pilih pesan supplier yang menampilkan stok terlebih dahulu.',true);if(!(range.selection_end>range.selection_start))return toast('Blok/select angka stok pada kotak pesan terlebih dahulu.',true);try{var r=await api('workflow-mark-stock',{workflow_id:id,message_id:range.message_id,selection_start:range.selection_start,selection_end:range.selection_end});state.workflowLoaded=false;await load();await loadWorkflow(true);toast('Batas stok tersimpan. Nilai saat rekam terbaca '+((r.data&&r.data.stock)!==undefined?r.data.stock:'-')+', tetapi angka contoh tidak dijadikan patokan.');}catch(e){toast(e.message,true);}};
  var workflowEdit=document.getElementById('workflowEdit'); if(workflowEdit) workflowEdit.onclick=function(){var id=workflowCurrentId();if(!id)return toast('Pilih workflow dulu.',true);openWorkflowEdit(id);};
  var workflowCopy=document.getElementById('workflowCopy'); if(workflowCopy) workflowCopy.onclick=function(){var id=workflowCurrentId();if(!id)return toast('Pilih workflow dulu.',true);openWorkflowCopy(id);};
  var workflowUndo=document.getElementById('workflowUndo'); if(workflowUndo) workflowUndo.onclick=async function(){var id=workflowCurrentId(); if(!id)return toast('Pilih workflow dulu.',true); if(!confirm('Hapus step terakhir dari rekaman? Chat supplier tidak diputar mundur; bila alur sudah jauh, kirim /start lagi untuk menyamakan posisi.'))return; try{await api('workflow-undo',{workflow_id:id}); state.workflowLoaded=false; await loadWorkflow(true);}catch(e){toast(e.message,true);}};
  var workflowActivate=document.getElementById('workflowActivate'); if(workflowActivate) workflowActivate.onclick=async function(){var id=workflowCurrentId(); if(!id)return toast('Pilih workflow dulu.',true); try{await workflowRecorderExclusive(function(){return api('workflow-activate',{workflow_id:id});}); state.workflowLoaded=false; await load(); await loadWorkflow(true); toast('Workflow aktif. Order berbayar untuk produk ini sekarang mengikuti rekaman supplier.');}catch(e){toast(e.message,true);}};
  var workflowDelete=document.getElementById('workflowDelete'); if(workflowDelete) workflowDelete.onclick=async function(){var id=workflowCurrentId(); if(!id)return toast('Pilih workflow dulu.',true); if(!confirm('Hapus workflow ini? Produk tidak akan lagi terhubung ke workflow tersebut.'))return; try{await api('workflow-delete',{workflow_id:id}); state.workflowLoaded=false; state.workflowDetail=null; await load(); await loadWorkflow(true); toast('Workflow dihapus.');}catch(e){toast(e.message,true);}};
  var flashSaleForm=document.getElementById('flashSaleForm'); if(flashSaleForm) flashSaleForm.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(e.target); var selected=(state.promos||[]).filter(function(p){return p.flash_sale;}); if(String(d.flash_sale_enabled)==='true'){ if(!d.flash_sale_start_at||!d.flash_sale_end_at) return toast('Isi waktu mulai dan berakhir Flash Sale.',true); if(new Date(d.flash_sale_end_at).getTime()<=new Date(d.flash_sale_start_at).getTime()) return toast('Waktu berakhir harus setelah waktu mulai.',true); if(!selected.length) return toast('Aktifkan Flash Sale pada minimal satu Promo Otomatis.',true); } await post('save-settings',d); };
  var broadcastOrderEnabled=document.getElementById('broadcastOrderEnabled');
  function syncBroadcastOrderTarget(){ var box=document.getElementById('broadcastOrderTargetBox'); if(box) box.classList.toggle('hidden',!(broadcastOrderEnabled&&broadcastOrderEnabled.checked)); }
  if(broadcastOrderEnabled) broadcastOrderEnabled.onchange=syncBroadcastOrderTarget; syncBroadcastOrderTarget();
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
  var promoUnifiedForm=document.getElementById('promoUnifiedForm'); if(promoUnifiedForm) promoUnifiedForm.onsubmit=async function(e){ e.preventDefault(); var all=document.getElementById('promoAllProducts'); if(all&&!all.checked&&!(state.promoTargets||[]).length) return toast('Tambahkan minimal satu produk atau varian target',true); syncPromoTargetValue(); var d=formDataRaw(e.target); var isAuto=d.promo_kind==='auto'; var flashCheck=document.getElementById('promoFlashSale'); var payload={ code:d.code, kode:d.code, current_code:d.current_code, name:d.name||d.code, discount_type:d.discount_type, discount_value:d.discount_value, potongan:d.discount_value, produk:d.products, products:d.products, min_qty:d.min_qty||1, min_spend:d.min_spend||0, usage_limit:d.usage_limit, limit:d.usage_limit, description:d.description, active:d.active, start_at:d.start_at||null, end_at:d.end_at||null, expires_at:d.end_at||null, flash_sale:isAuto&&flashCheck&&flashCheck.checked }; if(isAuto){ await post('promo-save',payload); } else { await post(d.current_code?'edit-voucher':'add-voucher',payload); } promoUnifiedReset(); setPromoSub('list'); };
  var resetPromoUnified=document.getElementById('resetPromoUnified'); if(resetPromoUnified) resetPromoUnified.onclick=promoUnifiedReset;
  var promoKind=document.querySelector('#promoUnifiedForm [name="promo_kind"]'); if(promoKind) promoKind.onchange=updatePromoFlashSaleControl; var promoDiscountType=document.querySelector('#promoUnifiedForm [name="discount_type"]'); if(promoDiscountType) promoDiscountType.onchange=updateDiscountInputMode; updatePromoFlashSaleControl(); updateDiscountInputMode(); setPromoSub('list');
  var promoAllProducts=document.getElementById('promoAllProducts'); if(promoAllProducts) promoAllProducts.onchange=togglePromoTargetMode;
  var promoTargetProduct=document.getElementById('promoTargetProduct'); if(promoTargetProduct) promoTargetProduct.onchange=refreshPromoTargetVariants;
  var addPromoTarget=document.getElementById('addPromoTarget'); if(addPromoTarget) addPromoTarget.onclick=addSelectedPromoTarget;

  var maintenanceForm=document.getElementById('maintenanceForm'); if(maintenanceForm) maintenanceForm.onsubmit=async function(e){ e.preventDefault(); var d=formDataRaw(e.target); var label=e.target.target.options[e.target.target.selectedIndex].text; var days=d.days||30; var warn='Jalankan maintenance: '+label+'?\n\nUmur data minimal: '+days+' hari.\nData yang dihapus tidak bisa dikembalikan.'; if(d.target==='transactions-old') warn='PERINGATAN: ini akan menghapus detail transaksi lama permanen. Total Transaksi dashboard tetap tersimpan, tapi detail order lama hilang. Pastikan sudah backup/export.\n\n'+warn; if(confirm(warn)){ var r=await post('maintenance-cleanup',d); if(r.data) toast((r.data.message||'Maintenance selesai')+' Terproses: '+(r.data.affected||0)); } };
  startWorkflowLiveRecorder();
  load();
  setInterval(function(){ if(document.getElementById('promos')&&document.getElementById('promos').classList.contains('active')) renderUnifiedPromos(); },30000);
})();
</script>
</body>
</html>`);
};
