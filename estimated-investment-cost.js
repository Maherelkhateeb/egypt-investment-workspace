(function(){'use strict';
const RATE=0.007,KEY='egx_independent_workspace_v1';
const fmt=v=>Number(v).toLocaleString('ar-EG-u-nu-latn',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Imported holdings are already the user's net balances. Do not deduct a fee a
// second time. Mark imported opening rows with zero applied fee and show the
// requested 0.7% only as a separate estimated investment-cost layer.
function installImportPolicy(){
 const C=window.InvestCore;if(!C||C.__netImportPolicyInstalled||typeof C.migrateLegacy!=='function')return;
 const original=C.migrateLegacy.bind(C);
 C.migrateLegacy=(input,dateValue)=>{
  const state=original(input,dateValue);
  for(const t of state.transactions||[]){if(t.type==='opening'&&String(t.source||'').includes('رصيد افتتاحي مستورد')){t.fee=0;t.source='رصيد افتتاحي مستورد صافي؛ لا خصم رسوم إضافي. تقدير 0.7% يعرض منفصلاً لحساب التكلفة الاستثمارية فقط.';}}
  return C.validateState(state);
 };
 C.__netImportPolicyInstalled=true;
}
function importedOpeningRows(){
 let state;try{state=JSON.parse(localStorage.getItem(KEY)||'null');}catch{return [];}
 if(!state?.transactions||!Array.isArray(state.transactions))return [];
 return state.transactions.filter(t=>t?.type==='opening'&&Number(t.qty)>0&&Number(t.price)>0&&String(t.source||'').includes('رصيد افتتاحي مستورد')).map(t=>{
  const base=Number(t.qty)*Number(t.price),estimatedFee=base*RATE;
  return {ticker:t.ticker||'',name:t.name||t.ticker||'',base,estimatedFee,total:base+estimatedFee};
 });
}
function panel(rows){
 const base=rows.reduce((s,r)=>s+r.base,0),fee=rows.reduce((s,r)=>s+r.estimatedFee,0),total=base+fee;
 const body=rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong><small>${esc(r.ticker)}</small></td><td>${fmt(r.base)}</td><td>${fmt(r.estimatedFee)}</td><td>${fmt(r.total)}</td></tr>`).join('');
 return `<section class="panel" data-estimated-investment-cost><div class="title-row"><div><h2>التكلفة الاستثمارية الفعلية — تقديرية</h2><span class="muted">الرسوم التقديرية ٧ في الألف منفصلة عن صافي المحفظة ولا تُخصم مرة أخرى من الرصيد أو الربح.</span></div></div><div class="cards"><div class="card"><span>قيمة الاستثمار الأساسية</span><strong>${fmt(base)}</strong><small>جنيه مصري · كما وردت في الأرصدة المستوردة</small></div><div class="card"><span>رسوم تقديرية 0.7%</span><strong>${fmt(fee)}</strong><small>بند معلوماتي فقط</small></div><div class="card"><span>التكلفة الاستثمارية الفعلية التقديرية</span><strong>${fmt(total)}</strong><small>الأساس + الرسوم التقديرية</small></div></div><div class="table-wrap"><table><thead><tr><th>الأصل</th><th>الأساس</th><th>رسوم 0.7%</th><th>التكلفة التقديرية</th></tr></thead><tbody>${body}</tbody></table></div><p class="muted">هذا التقدير لا يغير الكميات أو متوسطات التكلفة المحفوظة، ولا يُعامل كرسوم مدفوعة فعلية في حساب الربح والخسارة.</p></section>`;
}
function render(){
 installImportPolicy();
 const view=document.getElementById('view');if(!view||view.querySelector('[data-estimated-investment-cost]'))return;
 const route=(location.hash.replace('#tab-','')||'portfolio');if(!['portfolio','performance'].includes(route))return;
 const rows=importedOpeningRows();if(!rows.length)return;
 const target=view.querySelector('.cards');if(!target)return;
 target.insertAdjacentHTML('afterend',panel(rows));
}
function schedule(){setTimeout(render,0);}
installImportPolicy();window.addEventListener('hashchange',schedule);window.addEventListener('storage',schedule);window.addEventListener('load',schedule);
const start=()=>{installImportPolicy();const view=document.getElementById('view');if(!view)return;new MutationObserver(schedule).observe(view,{childList:true,subtree:false});schedule();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
