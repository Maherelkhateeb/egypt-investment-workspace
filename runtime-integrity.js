(function(){'use strict';
const replacements=[
 ['الأسبوعي بعد انتهاء السبت','الأسبوعي بعد إغلاق الخميس 16:00 بتوقيت القاهرة'],
 ['نبض جلسة التداول اللحظي','نبض آخر جلسة مؤرخة'],
 ['تحديث البورصة اللحظي','تحديث لقطة السوق المؤرخة'],
 ['أداء قطاعات البورصة اللحظي','أداء القطاعات — بيانات مؤرخة'],
 ['البورصة المصرية: أسعار حية 100%','البورصة المصرية: أسعار مؤرخة'],
 ['أسعار حية 100%','أسعار مؤرخة'],
 ['أسعار حية','أسعار مؤرخة'],
 ['EGX LIVE','EGX · لقطة مؤرخة'],
 ['متابعة حية','متابعة مؤرخة'],
 ['بيانات لحظية','بيانات مؤرخة'],
 ['أسعار لحظية','أسعار مؤرخة'],
 ['آخر تحديث لحظي','آخر تحديث للمصدر'],
 ['Gemini 3.8 Flash','Gemini'],
 ['متوسط التكلفة شامل الرسوم','متوسط التكلفة المسجل'],
 ['أسهم الشركات الشرعية 33 سهم','أسهم الشركات الشرعية'],
 ['صناديق الاستثمار والذهب والدولار 6 أصول','صناديق الاستثمار والذهب والدولار']
];
const unbound=['p_thndr_stocks_card','p_thndr_stocks_card_egp','p_thndr_stocks_card_pnl','p_thndr_funds_card','p_thndr_funds_card_egp','p_thndr_funds_card_pnl','p_thndr_gold_card','p_thndr_gold_card_egp','p_thndr_gold_card_pnl','stocksSubtotalBadge','stocksTopWeightLabel','stocksFilterAllCount','fundsSubtotalBadge','fundsTopWeightLabel','fundsFilterAllCount','goldSubtotalBadge','macroEgx33Val','macroEgx33Chg','macroEgx30Val','macroEgx30Chg','matrix-price-AZG','matrix-price-THNDR_GOLD','matrix-price-CMS','matrix-price-BWA','matrix-price-NMF'];
let marketSnapshot=null,marketRequested=false;
const num=v=>typeof v==='number'&&Number.isFinite(v),fmt=(v,d=2)=>num(v)?v.toLocaleString('ar-EG-u-nu-latn',{minimumFractionDigits:d,maximumFractionDigits:d}):'--';
function cleanText(root){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){let value=walker.currentNode.textContent,next=value;for(const [from,to]of replacements)if(next.includes(from))next=next.split(from).join(to);if(next!==value)walker.currentNode.textContent=next;}}
function set(id,value,title=''){const el=document.getElementById(id);if(!el)return;el.textContent=value;if(title)el.title=title;}
function pct(q){return num(q?.close)&&num(q?.previous_close)&&q.previous_close>0?(q.close/q.previous_close-1)*100:null;}
function tonePct(value){return num(value)?(value>=0?'+':'')+fmt(value,2)+'%':'--';}
function neutralize(){for(const id of unbound)set(id,'--','لا تعرض هذه الخانة رقمًا قديمًا من القالب؛ يلزم مصدر فعلي.');}
function bindMarket(){if(!marketSnapshot)return;for(const [code,valId,chgId]of [['EGX30','macroEgx30Val','macroEgx30Chg'],['EGX33','macroEgx33Val','macroEgx33Chg']]){const q=marketSnapshot.indices?.[code];if(q&&num(q.close)){set(valId,fmt(q.close,2),'جلسة '+q.session_date);set(chgId,tonePct(pct(q)),'مقارنة '+(q.previous_session_date||'غير متاحة')+' ← '+q.session_date);}}
 for(const symbol of ['AZG','THNDR_GOLD','CMS','BWA','NMF']){const q=marketSnapshot.assets?.[symbol];if(q&&num(q.close))set('matrix-price-'+symbol,fmt(q.close,4)+' ج','قيمة مؤرخة '+q.session_date+(q.status==='unverified'?' · غير متحققة من الناشر':''));}}
function groupData(p,type){const rows=p.positions.filter(h=>h.assetType===type),known=rows.length>0&&rows.every(h=>num(h.value)&&num(h.unrealized));if(!known)return{rows,known:false};const value=rows.reduce((s,h)=>s+h.value,0),pnl=rows.reduce((s,h)=>s+h.unrealized,0),cost=rows.reduce((s,h)=>s+h.cost,0),ret=cost>0?pnl/cost*100:null;return{rows,known:true,value,pnl,ret};}
function topWeights(g){if(!g.known||g.value<=0)return'غير متاح';return [...g.rows].filter(h=>num(h.value)).sort((a,b)=>b.value-a.value).slice(0,2).map(h=>h.ticker+' '+fmt(h.value/g.value*100,1)+'%').join(' • ')||'غير متاح';}
function bindPortfolio(){const C=window.InvestCore;if(!C||!marketSnapshot)return;let state;try{state=C.validateState(JSON.parse(localStorage.getItem('egx_independent_workspace_v1')||'null'));}catch{return;}let p;try{p=C.portfolio(state,marketSnapshot);}catch{return;}const stocks=groupData(p,'stock'),funds=groupData(p,'fund'),gold=groupData(p,'gold');
 const put=(prefix,g)=>{set('p_thndr_'+prefix+'_card',g.known?fmt(g.value)+' ج':'--');set('p_thndr_'+prefix+'_card_egp',g.known?(g.pnl>=0?'+':'')+fmt(g.pnl)+' ج':'--');set('p_thndr_'+prefix+'_card_pnl',g.known?'('+tonePct(g.ret)+')':'--');};put('stocks',stocks);put('funds',funds);put('gold',gold);
 set('stocksFilterAllCount','('+stocks.rows.length+')');set('fundsFilterAllCount','('+funds.rows.length+')');set('stocksTopWeightLabel',topWeights(stocks));set('fundsTopWeightLabel',topWeights(funds));set('stocksSubtotalBadge',stocks.known?fmt(stocks.value)+' ج.م ('+tonePct(stocks.ret)+')':'--');set('fundsSubtotalBadge',funds.known?fmt(funds.value)+' ج.م ('+tonePct(funds.ret)+')':'--');set('goldSubtotalBadge',gold.known?fmt(gold.value)+' ج.م ('+tonePct(gold.ret)+')':'--');}
function addDatedNotice(view){if(!view||view.querySelector('[data-dated-market-notice]'))return;const radar=view.querySelector('#view-radar,#view-market')||((location.hash.includes('radar'))?view.firstElementChild:null);if(!radar)return;const box=document.createElement('div');box.dataset.datedMarketNotice='';box.className='glass-card rounded-2xl p-2.5 border border-sky-900/50 text-[10.5px] text-sky-200';box.textContent='تنبيه البيانات: الأسعار والمؤشرات في هذه النسخة لقطات مؤرخة حسب جلسة المصدر وليست بثًا لحظيًا. لا يُعرض رقم مفقود على أنه صفر أو سعر مباشر.';radar.insertAdjacentElement('afterbegin',box);}
function apply(){const view=document.getElementById('view');if(view){cleanText(view);neutralize();bindMarket();bindPortfolio();addDatedNotice(view);}cleanText(document.getElementById('floatingAiCopilotBtn'));cleanText(document.getElementById('aiAdvisorButton'));cleanText(document.getElementById('aiAdvisorDialog'));document.documentElement.dataset.runtimeIntegrity='2026-10-08-r7';}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply();});}
async function loadMarket(){if(marketRequested)return;marketRequested=true;try{const r=await fetch('market.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)return;const j=await r.json();if(j&&j.assets&&j.indices){marketSnapshot=j;schedule();}}catch{}}
function start(){const view=document.getElementById('view');if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true,characterData:true});new MutationObserver(schedule).observe(document.body,{childList:true,subtree:false});window.addEventListener('hashchange',schedule);window.addEventListener('storage',schedule);apply();loadMarket();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
