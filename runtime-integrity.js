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
 ['Gemini 3.8 Flash','Gemini']
];
function cleanText(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){let value=walker.currentNode.textContent,next=value;for(const [from,to]of replacements)if(next.includes(from))next=next.split(from).join(to);if(next!==value)walker.currentNode.textContent=next;}}
function addDatedNotice(view){if(!view||view.querySelector('[data-dated-market-notice]'))return;const radar=view.querySelector('#view-radar,#view-market')||((location.hash.includes('radar'))?view.firstElementChild:null);if(!radar)return;const box=document.createElement('div');box.dataset.datedMarketNotice='';box.className='glass-card rounded-2xl p-2.5 border border-sky-900/50 text-[10.5px] text-sky-200';box.textContent='تنبيه البيانات: الأسعار والمؤشرات في هذه النسخة لقطات مؤرخة حسب جلسة المصدر وليست بثًا لحظيًا. لا يُعرض رقم مفقود على أنه صفر أو سعر مباشر.';radar.insertAdjacentElement('afterbegin',box);}
function apply(){const view=document.getElementById('view');if(view){cleanText(view);addDatedNotice(view);}const floating=document.getElementById('floatingAiCopilotBtn');if(floating)cleanText(floating);document.documentElement.dataset.runtimeIntegrity='2026-10-08-r4';}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply();});}
function start(){const view=document.getElementById('view');if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true,characterData:true});window.addEventListener('hashchange',schedule);apply();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
