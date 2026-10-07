/* Presentation-only page parity helpers. Business logic remains in app.js. */
(function(){
'use strict';
const routeMeta={
 performance:{icon:'📊',kicker:'المحفظة الاستثمارية',badge:'الأداء والمردود'},
 radar:{icon:'⚡',kicker:'رادار السوق',badge:'جلسة السوق'},
 news:{icon:'📰',kicker:'مركز المتابعة',badge:'أخبار ومصادر'},
 research:{icon:'🎯',kicker:'مركز التحليل',badge:'بحث الأسهم'},
 tools:{icon:'🛠️',kicker:'مركز الأدوات',badge:'أدوات المحفظة'}
};
const filterLabels=[['all','📊 الكل'],['stock','📈 الأسهم'],['fund','🏦 الصناديق'],['gold','🥇 الذهب']];
function topTitle(view){return [...view.children].find(x=>x.classList?.contains('title-row'))||null;}
function setButton(btn,label,primary=false){if(!btn)return;btn.textContent=label;btn.classList.toggle('primary',primary);}
function decorateHeader(view){
 const meta=routeMeta[route],title=topTitle(view);if(!meta||!title)return;
 title.classList.add('legacy-page-hero');
 const box=title.firstElementChild;if(box&&!box.querySelector('.legacy-kicker'))box.insertAdjacentHTML('afterbegin',`<span class="legacy-kicker">${meta.icon} ${meta.kicker}</span>`);
 if(!title.querySelector('.legacy-route-badge'))title.insertAdjacentHTML('beforeend',`<span class="legacy-route-badge">${meta.badge}${route==='radar'&&market?.session_date?' · '+e(market.session_date):''}</span>`);
}
function addFilterChips(view){
 if(!['radar','news'].includes(route))return;
 const native=[...view.children].find(x=>x.classList?.contains('filters'));if(!native||view.querySelector('.legacy-chipbar'))return;
 native.classList.add('legacy-native-filter');
 const bar=document.createElement('div');bar.className='legacy-chipbar no-print';bar.setAttribute('aria-label','تصفية نوع الأصل');
 bar.innerHTML=filterLabels.map(([v,l])=>`<button type="button" data-legacy-filter="${v}" class="${filter===v?'active':''}">${l}</button>`).join('');
 native.insertAdjacentElement('afterend',bar);
 bar.querySelectorAll('[data-legacy-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.legacyFilter;render();}));
}
function addSectionNav(view,labels,selector){
 if(view.querySelector('.legacy-section-nav'))return;
 const sections=[...view.querySelectorAll(selector)].slice(0,labels.length);if(!sections.length)return;
 const nav=document.createElement('div');nav.className='legacy-section-nav no-print';
 nav.innerHTML=labels.slice(0,sections.length).map((x,i)=>`<button type="button" data-scroll-section="legacy-section-${route}-${i}">${x}</button>`).join('');
 const anchor=[...view.children].find(x=>x.classList?.contains('filters'))||topTitle(view);anchor?.insertAdjacentElement('afterend',nav);
 sections.forEach((s,i)=>s.id=`legacy-section-${route}-${i}`);
 nav.querySelectorAll('[data-scroll-section]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.scrollSection)?.scrollIntoView({behavior:'smooth',block:'start'})));
}
function decoratePerformance(view){
 const title=topTitle(view);setButton(title?.querySelector('[data-action="csv"]'),'📊 Excel / CSV');setButton(title?.querySelector('[data-action="print"]'),'📄 PDF / طباعة');
 const cards=[...view.children].find(x=>x.classList?.contains('cards'));cards?.classList.add('legacy-performance-summary');
 view.querySelectorAll('.panel').forEach((p,i)=>p.classList.add('legacy-performance-panel','legacy-panel-'+(i+1)));
}
function decorateRadar(view){
 const title=topTitle(view);setButton(title?.querySelector('[data-action="refresh"]'),'🔄 تحديث بيانات السوق',true);
 const cards=[...view.children].find(x=>x.classList?.contains('cards'));cards?.classList.add('legacy-radar-summary');
 const table=view.querySelector('.table-wrap');table?.classList.add('legacy-market-table');
}
function decorateNews(view){
 const refresh=view.querySelector('[data-action="rss"]');setButton(refresh,'🔄 تحديث الأخبار',true);
 const publisherPanel=refresh?.closest('.panel');publisherPanel?.classList.add('legacy-news-feed');
 const form=view.querySelector('#newsForm');form?.closest('.panel')?.classList.add('legacy-news-form');
 view.querySelectorAll(':scope > article.panel').forEach(a=>a.classList.add('legacy-news-card'));
}
function decorateResearch(view){
 const filters=[...view.children].find(x=>x.classList?.contains('filters'));filters?.classList.add('legacy-research-toolbar');
 addSectionNav(view,['🏢 الشركة','📑 النتائج','💰 التقييم','📈 الفني','✅ القرار'],'.panel');
 setButton(view.querySelector('#researchForm button[type="submit"],#researchForm button:not([type])'),'💾 حفظ البحث والقوائم',true);
 setButton(view.querySelector('#valuationForm button'),'🧮 حساب نطاق القيم');
 view.querySelectorAll('.panel').forEach((p,i)=>p.classList.add('legacy-research-panel','legacy-panel-'+(i+1)));
}
function decorateTools(view){
 addSectionNav(view,['🎯 الادخار','✅ فحص النظام','📡 مصدر السوق','💾 النسخ والاستعادة'],':scope > .grid > .panel');
 setButton(view.querySelector('[data-action="audit"]'),'🧪 فحص البيانات الحالية',true);
 setButton(view.querySelector('[data-action="backup"]'),'💾 تنزيل نسخة JSON');
 setButton(view.querySelector('[data-action="import"]'),'📂 استيراد نسخة');
 setButton(view.querySelector('[data-action="restore"]'),'↩️ استعادة النسخة السابقة');
 view.querySelectorAll(':scope > .grid > .panel').forEach((p,i)=>p.classList.add('legacy-tool-panel','legacy-tool-'+(i+1)));
}
function decorate(){
 const view=document.getElementById('view');if(!view)return;
 view.className=`legacy-route legacy-route-${route}`;
 decorateHeader(view);addFilterChips(view);
 if(route==='performance')decoratePerformance(view);
 if(route==='radar')decorateRadar(view);
 if(route==='news')decorateNews(view);
 if(route==='research')decorateResearch(view);
 if(route==='tools')decorateTools(view);
}
const previousRender=render;
render=function(){previousRender();decorate();};
decorate();
if(route==='dailyreport')setTimeout(()=>render(),0);
})();
