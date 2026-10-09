(function(root){'use strict';
function compose(scope,share){
 const data={page:scope.page,kind:scope.kind||'section',scope:scope.label,...scope.public};
 if(share&&scope.private)data.personal=scope.private;
 return data;
}
const api={compose};if(typeof module==='object'&&module.exports){module.exports=api;return;}
const C=root.InvestCore,targets=new WeakMap();
function quote(t,q){return {symbol:t,...Object.fromEntries(['name','type','close','previous_close','previous_session_date','session_date','change_pct','open','high','low','volume','rsi','sma20','sma50','sma200','pe','pb','source_url','status','analysis','technical_basis','fundamental_basis'].map(k=>[k,q?.[k]]))};}
function marketContext(){return {session_date:market.session_date,indices:market.indices,assets:Object.entries(market.assets||{}).map(([t,q])=>({symbol:t,...Object.fromEntries(['name','type','close','previous_close','session_date','rsi','sma20','sma50','sma200','source_url','status'].map(k=>[k,q[k]]))}))};}
function personalPortfolio(){const p=C.portfolio(state,market);return {as_of:localDate(),basis:'الحيازات الحالية من دفتر هذا الجهاز',cash:p.cashKnown?p.cash:null,complete:p.complete,fees:p.fees,feesComplete:p.feesComplete,positions:p.positions.map(h=>({symbol:h.ticker,quantity:h.qty,cost:h.cost,value:h.value,unrealized:h.unrealized}))};}
function safeInputs(node){return Array.from(node.querySelectorAll('input,select,textarea')).filter(x=>!['password','file','hidden'].includes(x.type)&&!/(key|token|secret|password)/i.test(x.name+' '+x.id)&&!x.closest('#aiAdvisorDialog')).map(x=>({field:x.name||x.dataset.localId||x.id,label:(x.closest('label')?.textContent||x.getAttribute('aria-label')||x.name||x.id).trim().slice(0,120),value:x.type==='checkbox'?x.checked:x.value}));}
function resultText(node){const copy=node.cloneNode(true);copy.querySelectorAll('button,input,select,textarea,script,style,[data-ai-scope]').forEach(x=>x.remove());return copy.textContent.replace(/\s+/g,' ').trim().slice(0,9000);}
function scopeFor(page=route,node=null,label=''){
 const scope={page,kind:'section',label:label||({portfolio:'المحفظة',performance:'الأداء',radar:'رادار السوق',dailyreport:'التقرير المختار',research:'البحث',news:'الأخبار المصفاة',tools:'الأداة المفتوحة'}[page]||page),public:{calendar:root.MarketCalendarUI?.context()}};
 if(page==='dailyreport'){scope.kind='report';scope.public={report:root.ReportArchive?.context()};scope.key=JSON.stringify([page,scope.public.report?.kind,scope.public.report?.date,scope.public.report?.filter,label]);}
 else if(page==='news'){scope.kind='news';scope.public={items:(root.LegacyActions?.selectNews()||[]).slice(0,15).map(n=>({title:n.title,date:n.published_at||n.date,url:n.url,publisher:n.publisher,category:n.category})),filters:{tab:root.LegacyUI?.ui.newsTab,search:root.LegacyUI?.ui.newsSearch}};}
 else if(page==='radar'){scope.public={market:marketContext(),filters:{sort:root.LegacyUI?.ui.radarSort,sector:root.LegacyUI?.ui.sector,search:root.LegacyUI?.ui.search},method:'أرقام السوق عامة ومؤرخة؛ لا تفترض معرفة حيازات المستخدم.'};}
 else if(page==='research'){scope.public={asset:quote(researchTicker,market.assets[researchTicker]),method:'تحليل الأصل المحدد فقط؛ المدخلات المالية والفرضية الشخصية تحتاج الموافقة.'};}
 else if(page==='performance'){const p=root.PerformanceUI?.result();scope.public={period:p?{start:p.start,end:p.end,complete:p.complete,method:p.method,missingStart:p.missingStart,missingEnd:p.missingEnd}:null,indices:market.indices,method:'الأرباح بعد التدفقات والرسوم؛ الإيداعات والسحوبات ليست ربحًا.'};}
 else if(page==='portfolio'){scope.public={market:marketContext(),method:'دفتر عمليات محلي. لا توجد مبالغ أو كميات حيازات في السياق دون اختيار المشاركة.'};}
 else if(page==='tools')scope.public={method:'اشرح أداة الحساب الحالية وافتراضاتها. المدخلات والنتائج الشخصية لا ترسل قبل اختيار المشاركة.',sources:[{title:'سياسة رسوم ثندر',url:'https://thndr.app/support/'}]};
 if(page==='tools'&&root.LegacyUI?.ui.toolsTab==='audit'&&root.SystemAuditUI?.latest()){scope.kind='audit';scope.public={audit:root.SystemAuditUI.latest(),repairIds:root.SystemAudit.repairIds};}
 const ticker=node?.dataset.reportStock||node?.dataset.reportAsset||node?.dataset.aiSymbol||node?.dataset.ticker||node?.dataset.holdingSymbol;
 if(ticker){scope.kind='asset';scope.label='الأصل '+ticker;if(page==='dailyreport'){const report=scope.public.report,stock=report?.stocks?.find(q=>q.ticker===ticker),fund=report?.funds?.find(q=>q.code===ticker),fx=report?.fx_gold?.[ticker];scope.kind='report';scope.public={report:{title:report?.title,date:report?.date,kind:report?.kind,filter:ticker,period_start:report?.period_start,period_end:report?.period_end,stocks:stock?[stock]:[],funds:fund?[fund]:[],fx_gold:fx?{[ticker]:fx}:{}}};}else scope.public={asset:quote(ticker,market.assets[ticker])};}
 scope.node=node;scope.key=scope.key||JSON.stringify([page,scope.label,ticker||'',scope.public.period?.start,scope.public.period?.end,scope.public.filters,researchTicker]);
 return scope;
}
function capture(scope,share){const next={...scope};if(share){
 next.private={};
 if(['portfolio','performance'].includes(scope.page))next.private.portfolio=personalPortfolio();
 if(scope.page==='performance'){const p=root.PerformanceUI?.result();if(p)next.private.performance={start:p.start,end:p.end,complete:p.complete,gross:p.gross,net:p.net,returnPct:p.returnPct,fees:p.fees,income:p.income,rows:p.rows};}
 if(scope.node&&['tools','research'].includes(scope.page))next.private.tool={inputs:safeInputs(scope.node),rendered_result:resultText(scope.node)};
 if(scope.page==='research')next.private.research=state.research?.[researchTicker]||{};
 }return compose(next,share);}
function prepare(next={}){
 if(next.getContext)return next;
 if(next.kind==='report')return {...next,scopeKey:JSON.stringify(['report',next.report?.kind,next.report?.date,next.report?.filter]),getContext:()=>({page:'reports',kind:'report',report:next.report})};
 if(next.kind==='audit')return {...next,scopeKey:'audit:'+next.audit?.generated_at,getContext:()=>({page:'tools',kind:'audit',audit:next.audit,repairIds:next.repairIds})};
 const scope=scopeFor(route,route==='tools'?document.querySelector('[id^="toolSubView"]:not(.hidden)'):null);
 if(next.kind==='news'){scope.kind='news';scope.public={items:next.items||[]};}
 if(next.kind==='performance'&&next.performance)scope.public.period=next.performance;
 if(next.symbol&&market.assets[next.symbol]){scope.label='الأصل '+next.symbol;scope.public={asset:quote(next.symbol,market.assets[next.symbol])};scope.key='asset:'+next.symbol;}
 return {...next,kind:scope.kind,audit:scope.public.audit,repairIds:scope.public.repairIds,scopeKey:scope.key,label:scope.label,getContext:share=>capture(scope,share)};
}
function add(node,scope,label='🤖 تحليل هذا الجزء'){
 if(!node||node.querySelector(':scope > [data-ai-scope]'))return;
 const b=document.createElement('button');b.type='button';b.dataset.aiScope='';b.className='ai-inline-action text-xs font-bold text-indigo-300 border border-indigo-700 rounded-lg px-3 py-1.5';b.textContent=label;targets.set(b,scope);node.append(b);
}
function decorate(node){
 if(!node||node.id==='aiAdvisorDialog'||node.closest?.('#aiAdvisorDialog'))return;
 if(node.id==='view'){const heading=node.querySelector('h2');if(heading)add(heading.parentElement,scopeFor(route,node),'🤖 تحليل '+scopeFor().label);}
 if(node.matches?.('dialog')&&node.querySelector('form,input,textarea'))add(node,scopeFor(node.dataset.legacyEditor==='research'?'research':'tools',node,node.querySelector('h2')?.textContent||'الأداة المفتوحة'));
 node.querySelectorAll('[data-report-stock],[data-report-asset],[data-ticker],[data-holding-symbol]').forEach(card=>add(card,scopeFor(route,card)));
 node.querySelectorAll('[data-legacy-symbol]').forEach(b=>{const card=b.closest('.glass-card');if(card){card.dataset.aiSymbol=b.dataset.legacySymbol;add(card,scopeFor(route,card));}});
 if(route==='tools'&&node.id==='view')node.querySelectorAll('.glass-card').forEach(card=>{if(card.querySelector('input,select,textarea')&&!Array.from(card.querySelectorAll('.glass-card')).some(n=>n.querySelector('input,select,textarea'))){card.dataset.aiToolPanel='';add(card,scopeFor('tools',card,card.querySelector('h3,h4')?.textContent||'حاسبة'));}});
 node.querySelectorAll('[data-thndr-trade-form],[data-thndr-deposit-form]').forEach(form=>add(form,scopeFor('tools',form,form.hasAttribute('data-thndr-trade-form')?'رسوم التداول':'رسوم الإيداع')));
}
document.addEventListener('click',event=>{const b=event.target.closest('[data-ai-scope]');if(!b)return;const scope=targets.get(b);if(!scope)return;event.preventDefault();root.AIAdvisor.open({scopeKey:scope.key,label:scope.label,kind:scope.kind,audit:scope.public.audit,repairIds:scope.public.repairIds,report:scope.public.report,getContext:share=>capture(scope,share),question:'حلل '+scope.label+' اعتمادًا على بيانات هذا الجزء فقط، واشرح النتائج وما يلزم استكماله.'});});
const oldRender=render;render=function(){oldRender();decorate(document.getElementById('view'));};
const observer=new MutationObserver(records=>{for(const record of records)for(const n of record.addedNodes)if(n.nodeType===1){if(n.matches?.('dialog'))decorate(n);else if(n.closest?.('#view')&&!n.matches?.('[data-ai-scope]')){if(n.matches?.('[data-report-stock],[data-report-asset],[data-ticker],[data-holding-symbol]'))add(n,scopeFor(route,n));}}});observer.observe(document.body,{childList:true,subtree:true});
root.AIIntegration={...api,prepare,decorate,context:share=>capture(scopeFor(route,document.getElementById('view')),share)};decorate(document.getElementById('view'));
})(typeof globalThis==='object'?globalThis:this);
