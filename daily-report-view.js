/* Daily report presentation parity. Uses only current workspace data/calculations. */
(function(){
'use strict';
let reportSlice='all_sharia';
const esc=window.InvestCore.esc;
const num=(v,d=2)=>v==null||!Number.isFinite(Number(v))?'غير متاح':Number(v).toLocaleString('ar-EG',{minimumFractionDigits:d,maximumFractionDigits:d});
const pc=v=>v==null||!Number.isFinite(Number(v))?'غير متاح':`${Number(v)>=0?'+':''}${num(Number(v),2)}%`;
const cls=v=>v==null?'muted':Number(v)>=0?'good':'bad';
const change=q=>q&&q.previous_close!=null&&q.close!=null?window.InvestCore.change(q.close,q.previous_close):{delta:null,pct:null};
const panel=(title,body,extra='')=>`<section class="panel dr-panel"><div class="dr-panel-head"><h2>${title}</h2>${extra}</div>${body}</section>`;
const reportFilters=()=>`<div class="dr-filters no-print">${[
 ['all_sharia','📊 الكل'],['holdings','💼 محفظتي'],['gainers','📈 الرابحون'],['losers','📉 الخاسرون'],['funds','🏦 الصناديق'],['gold','🥇 الذهب']
].map(([k,l])=>`<button data-dr-filter="${k}" class="${reportSlice===k?'active':''}">${l}</button>`).join('')}</div>`;
function quotesForSlice(){
 let rows=Object.entries(market.assets||{});
 if(reportSlice==='funds') return rows.filter(([,q])=>q.type==='fund');
 if(reportSlice==='gold') return rows.filter(([,q])=>q.type==='gold');
 if(reportSlice==='gainers') return rows.filter(([,q])=>change(q).pct>0);
 if(reportSlice==='losers') return rows.filter(([,q])=>change(q).pct<0);
 if(reportSlice==='holdings'){
   const held=new Set((window.InvestCore.portfolio(state,market).positions||[]).map(p=>p.ticker));
   return rows.filter(([t])=>held.has(t));
 }
 return rows;
}
function reportTable(entries){
 if(!entries.length)return '<div class="empty"><span class="empty-icon">📋</span><h2>لا توجد بيانات في هذه الشريحة</h2><p class="muted">غيّر الفلتر أو حدّث مصدر السوق.</p></div>';
 const sorted=[...entries].sort((a,b)=>(change(b[1]).pct??-999)-(change(a[1]).pct??-999));
 return `<div class="table-wrap"><table class="dr-market-table"><thead><tr><th>الأصل</th><th>السعر / NAV</th><th>الإغلاق السابق</th><th>الفرق</th><th>التغير</th><th>الجلسة</th><th>الحالة</th></tr></thead><tbody>${sorted.map(([t,q])=>{const d=change(q);return `<tr><td><strong>${esc(q.name||t)}</strong><small>${esc(t)}</small></td><td>${num(q.close,4)}</td><td>${num(q.previous_close,4)}</td><td class="${cls(d.delta)}">${d.delta==null?'غير متاح':`${d.delta>=0?'+':''}${num(d.delta,4)}`}</td><td class="${cls(d.pct)}"><b>${pc(d.pct)}</b></td><td>${esc(q.session_date||market.session_date||'—')}</td><td><span class="pill">${q.status==='unverified'?'غير متحقق':'مرجع مؤرخ'}</span></td></tr>`;}).join('')}</tbody></table></div>`;
}
function indexTable(){
 const entries=Object.entries(market.indices||{}); if(!entries.length)return '<p class="muted">لا تتوفر بيانات مؤشرات في المصدر الحالي.</p>';
 return `<div class="dr-index-grid">${entries.map(([t,q])=>{const d=change(q);return `<article class="dr-index-card"><div><span>${esc(q.name||t)}</span><small>${esc(t)}</small></div><strong>${num(q.close,2)}</strong><b class="${cls(d.pct)}">${pc(d.pct)}</b><small>السابق ${num(q.previous_close,2)}</small></article>`;}).join('')}</div>`;
}
function breadth(entries){
 const known=entries.map(([t,q])=>({t,q,d:change(q)})).filter(x=>x.d.pct!=null);const up=known.filter(x=>x.d.pct>0),down=known.filter(x=>x.d.pct<0),flat=known.filter(x=>x.d.pct===0);
 const best=[...known].sort((a,b)=>b.d.pct-a.d.pct)[0],worst=[...known].sort((a,b)=>a.d.pct-b.d.pct)[0];
 return {known,up,down,flat,best,worst};
}
function holdingsSummary(){
 const p=window.InvestCore.portfolio(state,market);if(!p.positions.length)return '<p class="muted">لا توجد حيازات مسجلة في هذه النسخة.</p>';
 const valued=p.positions.filter(x=>x.value!=null);const best=[...valued].filter(x=>x.cost>0&&x.unrealized!=null).sort((a,b)=>(b.unrealized/b.cost)-(a.unrealized/a.cost))[0];
 const worst=[...valued].filter(x=>x.cost>0&&x.unrealized!=null).sort((a,b)=>(a.unrealized/a.cost)-(b.unrealized/b.cost))[0];
 return `<div class="cards dr-mini-cards"><div class="card"><span>قيمة الحيازات</span><strong>${num(p.value)} ج</strong><small>${p.positions.length} أصل</small></div><div class="card"><span>غير المحقق</span><strong class="${cls(p.unrealized)}">${num(p.unrealized)} ج</strong><small>${p.feesComplete?'الرسوم المسجلة مكتملة':'الرسوم غير مكتملة'}</small></div><div class="card"><span>أفضل حيازة</span><strong>${best?esc(best.ticker):'—'}</strong><small>${best?pc(best.unrealized/best.cost*100):'لا بيانات'}</small></div><div class="card"><span>أضعف حيازة</span><strong>${worst?esc(worst.ticker):'—'}</strong><small>${worst?pc(worst.unrealized/worst.cost*100):'لا بيانات'}</small></div></div>`;
}
function fundsGold(){
 const items=Object.entries(market.assets||{}).filter(([,q])=>q.type==='fund'||q.type==='gold');
 if(!items.length)return '<p class="muted">لا توجد بيانات صناديق أو ذهب في المصدر الحالي.</p>';
 return `<div class="dr-assets-grid">${items.map(([t,q])=>{const d=change(q);return `<article class="dr-asset-card"><span>${q.type==='gold'?'🥇':'🏦'} ${esc(q.name||t)}</span><strong>${num(q.close,4)}</strong><b class="${cls(d.pct)}">${pc(d.pct)}</b><small>${q.status==='unverified'?'القيمة غير متحققة من الناشر':'بيانات مؤرخة'} · ${esc(q.session_date||'—')}</small></article>`;}).join('')}</div>`;
}
function sourceQuality(){
 const all=Object.values(market.assets||{}),unverified=all.filter(q=>q.status==='unverified').length,missingPrev=all.filter(q=>q.previous_close==null).length;
 const age=market.fetched_at?new Date(market.fetched_at).toLocaleString('ar-EG'):'غير مسجل';
 return `<div class="dr-quality"><div><span>جلسة البيانات</span><b>${esc(market.session_date||'غير متاحة')}</b></div><div><span>وقت جلب الملف</span><b>${esc(age)}</b></div><div><span>أصول بلا إغلاق سابق</span><b>${missingPrev}</b></div><div><span>قيم غير متحققة</span><b>${unverified}</b></div></div><p class="muted">هذا التقرير يُنشأ من البيانات المتاحة في المشروع الجديد فقط. لا يتم اختلاق سيولة مؤسسية أو أسعار لحظية أو قيم NAV غير موجودة في المصدر.</p>`;
}
dailyView=function(){
 const entries=quotesForSlice(),b=breadth(Object.entries(market.assets||{}));
 const now=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',dateStyle:'medium',timeStyle:'short'}).format(new Date());
 const hero=`<section class="dr-hero"><div><span class="dr-kicker">📋 التقرير اليومي الشامل</span><h1>ملخص جلسة ${esc(market.session_date||'—')}</h1><p>تم إنشاء العرض ${esc(now)} · مقارنة بالإغلاق السابق المتاح</p></div><div class="dr-actions no-print"><button class="primary" data-action="refresh">🔄 إنشاء / تحديث التقرير</button><button data-action="print">📄 PDF / طباعة</button><button data-action="csv">📊 Excel / CSV</button></div></section>`;
 const summary=`<div class="cards dr-summary-cards"><div class="card"><span>صاعد</span><strong class="good">${b.up.length}</strong><small>من ${b.known.length} أصل قابل للمقارنة</small></div><div class="card"><span>هابط</span><strong class="bad">${b.down.length}</strong><small>اتساع السوق داخل العينة</small></div><div class="card"><span>الأفضل</span><strong>${b.best?esc(b.best.t):'—'}</strong><small class="${b.best?cls(b.best.d.pct):'muted'}">${b.best?pc(b.best.d.pct):'لا بيانات'}</small></div><div class="card"><span>الأضعف</span><strong>${b.worst?esc(b.worst.t):'—'}</strong><small class="${b.worst?cls(b.worst.d.pct):'muted'}">${b.worst?pc(b.worst.d.pct):'لا بيانات'}</small></div></div>`;
 const leaders=b.known.length?`<div class="grid"><section class="panel"><h2>📈 أبرز الرابحين</h2>${reportTable(b.known.filter(x=>x.d.pct>0).sort((a,b)=>b.d.pct-a.d.pct).slice(0,5).map(x=>[x.t,x.q]))}</section><section class="panel"><h2>📉 أبرز الخاسرين</h2>${reportTable(b.known.filter(x=>x.d.pct<0).sort((a,b)=>a.d.pct-b.d.pct).slice(0,5).map(x=>[x.t,x.q]))}</section></div>`:'';
 return hero+reportFilters()+summary+panel('📊 مؤشرات السوق العامة',indexTable())+panel('💼 ملخص محفظتي',holdingsSummary(),'<button data-dr-filter="holdings">عرض حيازاتي</button>')+panel('📌 تفاصيل التقرير حسب الشريحة',reportTable(entries),`<span class="pill">${entries.length} أصل</span>`)+leaders+panel('🏦 الصناديق والذهب',fundsGold())+panel('✅ جودة البيانات ومراجع التقرير',sourceQuality())+panel('🧭 قراءة الجلسة',`<p>${b.known.length?`داخل العينة المتاحة، ${b.up.length} أصل صاعد مقابل ${b.down.length} هابط${b.flat.length?` و${b.flat.length} دون تغير`:''}.`: 'لا توجد مقارنات سابقة كافية.'}</p><p class="muted">الصفحة تفصل بين الحقائق العددية وبين التفسير. التغير السعري وحده لا يثبت شراء مؤسسات أو يكوّن توصية استثمارية.</p>`);
};
function bindReportFilters(){document.querySelectorAll('[data-dr-filter]').forEach(btn=>btn.addEventListener('click',()=>{reportSlice=btn.dataset.drFilter;render();}));}
const oldBind=bindView;bindView=function(){oldBind();if(route==='dailyreport')bindReportFilters();};
})();
