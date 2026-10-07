/* Visual layer: original portal layout, independent calculation and storage. */
(function(){
'use strict';
let holdingsMode='cards',holdingsFilter='all';
try{holdingsMode=localStorage.getItem('egx_independent_holdings_view')==='list'?'list':'cards';}catch{}
const groupInfo={stock:{title:'الأسهم',icon:'📈'},fund:{title:'الصناديق الاستثمارية',icon:'🏦'},gold:{title:'الذهب',icon:'🥇'}};
const groupOf=h=>h.assetType==='gold'||h.quote?.type==='gold'?'gold':h.assetType==='fund'||h.quote?.type==='fund'?'fund':'stock';
const subnav=()=>'<div class="section-subnav no-print" aria-label="أقسام المحفظة"><button data-design-route="portfolio" class="'+(route==='portfolio'?'active':'')+'">💼 الحيازات الفعلية</button><button data-design-route="performance" class="'+(route==='performance'?'active':'')+'">📊 الأداء والمردود المالي</button></div>';
const metric=(label,value)=>'<div><span>'+e(label)+'</span><b>'+value+'</b></div>';
function holdingCard(h){
 const type=groupOf(h),profitPct=h.unrealized===null||h.cost<=0?null:h.unrealized/h.cost*100;
 const source=h.mode==='manual'?'تقييم يدوي · '+state.valuations[h.ticker].date:(h.quote?.status==='unverified'?'سعر غير متحقق · ':'مرجع تاريخي · ')+(h.quote?.session_date||'لا سعر');
 return '<article class="holding-card '+type+'"><div class="holding-heading"><div class="holding-title"><span class="asset-avatar" aria-hidden="true">'+groupInfo[type].icon+'</span><div><h3>'+e(h.name)+'</h3><span class="symbol">'+e(h.ticker)+'</span></div></div><div class="holding-change '+tone(h.unrealized)+'">'+(h.unrealized!==null&&h.unrealized>0?'+':'')+format(h.unrealized)+'<small>غير محقق · '+pct(profitPct)+'</small></div></div><div class="holding-metrics">'+metric(type==='stock'?'عدد الأسهم':type==='gold'?'الكمية (جرام)':'عدد الوحدات',format(h.qty,4))+metric('متوسط التكلفة المسجلة',format(h.average,4))+metric('سعر التقييم',format(h.price,4))+'</div><div class="holding-bottom"><span>'+e(source)+'</span><span class="holding-footer-value">'+format(h.value)+' ج</span><button data-action="valuation" data-symbol="'+e(h.ticker)+'">✎ التقييم</button></div></article>';
}
function holdingGroup(type,items){
 if(!items.length)return '';
 const value=items.reduce((sum,h)=>sum+(h.value??0),0),partial=items.some(h=>h.value===null);
 const rows=items.map(h=>row(['<strong>'+e(h.name)+'</strong><small>'+e(h.ticker)+'</small>',format(h.qty,4),format(h.average,4),format(h.price,4),format(h.value),'<span class="'+tone(h.unrealized)+'">'+format(h.unrealized)+'</span>',h.mode==='manual'?'يدوي · '+e(state.valuations[h.ticker].date):(h.quote?.status==='unverified'?'غير متحقق · ':'تاريخي · ')+e(h.quote?.session_date||'لا سعر'),'<button data-action="valuation" data-symbol="'+e(h.ticker)+'">التقييم</button>']));
 return '<section class="holding-group '+type+'" data-holdings-group="'+type+'"'+(holdingsFilter!=='all'&&holdingsFilter!==type?' hidden':'')+'><div class="group-heading"><b>'+groupInfo[type].icon+' '+groupInfo[type].title+' <span class="pill">'+items.length+' أصل</span></b><small>'+format(value)+' ج.م'+(partial?' · تقييم جزئي':'')+'</small></div><div class="holding-cards">'+items.map(holdingCard).join('')+'</div><div class="holding-table">'+table(['الأصل','الكمية','التكلفة المسجلة','سعر التقييم','القيمة','غير المحقق','مرجع التقييم','إجراء'],rows)+'</div></section>';
}
function importNote(){
 const m=state.importMeta;if(!m)return '';
 const lines=['المصدر: '+String(m.source_label||'نسخة مستوردة'),m.holdings_as_of?'الحيازات حتى '+m.holdings_as_of:'تاريخ الحيازات غير موثق',m.fees_known===false?'الرسوم السابقة غير معلومة؛ الربح جزئي':null,m.cash_known===false?'الرصيد النقدي السابق غير موثق':null];
 return '<div class="import-data-note"><b>📥 بيانات المحفظة المستوردة</b><br>'+lines.filter(Boolean).map(e).join(' · ')+(m.captured_at?'<br>تاريخ النسخة المحفوظة '+e(m.captured_at):'')+(m.imported_at?' · تاريخ الاستيراد '+e(m.imported_at):'')+'</div>';
}
portfolioView=function(){
 const p=C.portfolio(state,market),groups={stock:[],fund:[],gold:[]};p.positions.forEach(h=>groups[groupOf(h)].push(h));
 const cashKnown=state.importMeta?.cash_known!==false;
 const summary=Object.entries(groupInfo).map(([t,g])=>{const hs=groups[t],value=hs.reduce((a,h)=>a+(h.value??0),0);return '<div class="summary-tile '+t+'"><span>'+g.icon+' '+g.title+'</span><b>'+format(value)+' ج</b><small>'+hs.length+' أصل'+(hs.some(h=>h.value===null)?' · تغطية جزئية':'')+'</small></div>';}).join('')+'<div class="summary-tile cash"><span>💵 النقد المسجل</span><b>'+(cashKnown?format(p.cash)+' ج':'غير موثق')+'</b><small>'+(!cashKnown?'استكمل الرصيد السابق':p.cash<0?'راجع التدفقات النقدية':'من دفتر العمليات')+'</small></div>';
 const unverified=p.positions.filter(h=>h.mode!=='manual'&&h.quote?.status==='unverified');
 const title=p.complete&&cashKnown?'قيمة المحفظة والحساب النقدي':'قيمة الأصول المشمولة بالتقييم';
 const top=viewHeader('محفظتي','الحيازات الفعلية · حسابات مستقلة من سجل عملياتك');
 const hero='<section class="wealth-hero"><div class="wealth-top"><div><span class="wealth-label">'+title+'</span><strong class="wealth-number">'+format(cashKnown?p.totalWealth:p.value)+' <small>جنيه مصري</small></strong></div><div class="wealth-badge"><span>ربح الحيازات غير المحقق</span><b class="'+tone(p.unrealized)+'">'+(p.unrealized!==null&&p.unrealized>0?'+':'')+format(p.unrealized)+' ج</b><span>'+(!p.feesComplete?'الرسوم غير مكتملة':'شامل رسوم الشراء المسجلة')+'</span></div></div><p class="wealth-note">جلسة الأسعار المرجعية '+e(market.session_date)+' · التقييم اليدوي محفوظ لكل أصل'+(!p.complete?' · أسعار ناقصة: '+e(p.missing.join('، ')):'')+'</p><div class="asset-summary">'+summary+'</div></section>';
 const toolbar='<div class="portfolio-toolbar no-print"><div class="actions"><button class="primary" data-action="add">➕ شراء / بيع</button><button data-design-route="performance">📅 أداء المحفظة</button></div><div class="actions"><button data-action="import" title="نقل نسخة المحفظة">📂 استيراد</button><button data-action="csv" title="تصدير كشف CSV إلى Excel">📊 Excel</button><button data-action="print" title="حفظ كشف PDF أو طباعته">📄 PDF</button></div></div>';
 const controls='<div class="holdings-controls no-print"><div class="holdings-filters">'+[['all','الأصول ('+p.positions.length+')'],['stock','📈 الأسهم'],['fund','🏦 الصناديق'],['gold','🥇 الذهب']].map(([t,label])=>'<button data-holdings-filter="'+t+'" class="'+(holdingsFilter===t?'active':'')+'">'+label+'</button>').join('')+'</div><div class="view-switch" aria-label="طريقة عرض الحيازات"><button data-holdings-mode="cards" class="'+(holdingsMode==='cards'?'active':'')+'">▦ بطاقات</button><button data-holdings-mode="list" class="'+(holdingsMode==='list'?'active':'')+'">☰ جدول</button></div></div>';
 const positions=p.positions.length?'<div id="holdingsGroups" class="holdings-view-'+holdingsMode+'">'+Object.entries(groups).map(([type,items])=>holdingGroup(type,items)).join('')+'</div>':'<div class="empty"><span class="empty-icon" aria-hidden="true">💼</span><h2>أضف حيازاتك إلى المحفظة</h2><p class="muted">استورد بيانات نسختك السابقة، أو سجل رصيداً افتتاحياً. تظهر نتائجك ورسومك الفعلية هنا بعد حفظ العمليات.</p><div class="actions" style="justify-content:center"><button class="primary" data-action="import">📂 استيراد محفظتي</button><button data-action="add">إضافة رصيد افتتاحي</button></div></div>';
 const details='<details class="data-details"><summary>📊 توزيع الأصول واكتمال البيانات</summary><div class="grid"><section class="panel"><h2>توزيع الحيازات الفعلي</h2>'+allocation(p)+'</section><section class="panel"><h2>جودة بيانات المحفظة</h2><ul class="list"><li>'+(!p.complete?'أسعار ناقصة: '+e(p.missing.join('، ')):'التقييم متاح لجميع الحيازات المسجلة.')+'</li><li>'+(!p.feesComplete?'هناك '+p.unknownFees+' عملية برسوم غير معلومة؛ الصافي يحتاج استكمالها.':'رسوم العمليات محددة في السجل.')+'</li><li>الأسعار مؤرخة، وNAV الصناديق غير متحقق من الناشر.</li><li>التقييم اليدوي لا يغير الكمية أو متوسط تكلفة الشراء.</li></ul></section></div></details>';
 const qualityNote=unverified.length?'<p class="warning">التقييم أعلاه تقديري: يتضمن '+unverified.length+' أصول بأسعار غير متحققة من الناشر. الربح المعروض يتأثر بهذه الأسعار وبالرسوم الناقصة.</p>':'';
 return subnav()+top+hero+qualityNote+importNote()+toolbar+controls+positions+details+transactionsView();
};
function updateTicker(){
 const track=document.getElementById('marketTicker');if(!track)return;
 if(!Object.keys(market.assets||{}).length&&!Object.keys(market.indices||{}).length){const loading=typeof marketLoading!=='undefined'&&marketLoading;track.innerHTML='<span class="ticker-item">'+(loading?'جار تحميل لقطة الأسعار المؤرخة…':'لا توجد لقطة أسعار متاحة؛ أعد المزامنة أو استورد ملفًا موثقًا.')+'</span>';const source=document.getElementById('sourceSession');if(source)source.textContent=loading?'جار تحميل الأسعار':'الأسعار غير متاحة';return;}
 const items=[];
 items.push('<span class="ticker-item"><i class="status-dot"></i><span>جلسة '+e(market.session_date)+'</span><small>مرجع تاريخي</small></span>');
 for(const [symbol,q]of Object.entries(market.indices||{})){const d=C.change(q.close,q.previous_close);items.push('<span class="ticker-item"><span>'+e(q.name||symbol)+'</span><b>'+format(q.close)+'</b><span class="'+tone(d.pct)+'">'+pct(d.pct)+'</span><small>'+e(q.session_date)+'</small></span>');}
 for(const [symbol,q]of Object.entries(market.assets||{}).filter(([,q])=>q.type==='stock').slice(0,8)){const d=quoteChange(q);items.push('<span class="ticker-item"><span>'+e(symbol)+'</span><b>'+format(q.close)+' ج</b><span class="'+tone(d.pct)+'">'+pct(d.pct)+'</span><small>'+e(q.session_date)+'</small></span>');}
 const sequence=items.join('');track.innerHTML='<div class="ticker-sequence">'+sequence+'</div><div class="ticker-sequence" aria-hidden="true">'+sequence+'</div>';
 const source=document.getElementById('sourceSession');if(source)source.textContent='جلسة '+market.session_date;
}
function decorate(){
 document.body.dataset.route=route;
 if(typeof marketLoading!=='undefined'&&marketLoading&&!Object.keys(market.assets||{}).length){updateTicker();return;}
 if(route==='performance'){const view=document.getElementById('view');const printHead=view.querySelector('.print-head');if(printHead)printHead.insertAdjacentHTML('afterend',subnav());else view.insertAdjacentHTML('afterbegin',subnav());document.querySelector('nav [data-route="portfolio"]')?.classList.add('active');view.insertAdjacentHTML('beforeend',importNote()+'<p class="warning">الأداء يعتمد على أسعار التقييم المؤرخة، ومنها أسعار غير متحققة للصناديق. عند نقص الرسوم أو سجل التدفقات تكون النتائج جزئية.</p>');}
 document.querySelectorAll('[data-design-route]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.designRoute)));
 document.querySelectorAll('[data-holdings-mode]').forEach(b=>b.addEventListener('click',()=>{holdingsMode=b.dataset.holdingsMode;try{localStorage.setItem('egx_independent_holdings_view',holdingsMode);}catch{}render();}));
 document.querySelectorAll('[data-holdings-filter]').forEach(b=>b.addEventListener('click',()=>{holdingsFilter=b.dataset.holdingsFilter;render();}));
 updateTicker();
}
const baseRender=render;render=function(){baseRender();decorate();};
function setTheme(mode){document.documentElement.dataset.theme=mode;const dark=mode==='dark';document.getElementById('themeIcon').textContent=dark?'🌙':'☀️';document.getElementById('themeLabel').textContent=dark?'ليلي':'نهاري';document.querySelector('meta[name="theme-color"]').content=dark?'#080c14':'#f8fafc';}
try{setTheme(localStorage.getItem('egx_independent_theme_v1')==='light'?'light':'dark');}catch{setTheme('dark');}
document.getElementById('themeToggle').addEventListener('click',()=>{const mode=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(mode);try{localStorage.setItem('egx_independent_theme_v1',mode);}catch{}});
document.getElementById('headerSync').addEventListener('click',async()=>{const button=document.getElementById('headerSync');button.disabled=true;button.textContent='↻ مزامنة…';try{await Promise.allSettled([refreshMarket(),fetchNews()]);}finally{button.disabled=false;button.textContent='🔄 مزامنة';}});
render();
})();
