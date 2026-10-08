(function(){'use strict';
let current='all',resetting=false;
const labels={all:'الكل',stock:'أخبار الأسهم',fund:'أخبار الصناديق',gold:'الذهب',notice:'إشعارات'};
function route(){return location.hash.replace('#tab-','')||'portfolio';}
function dispatch(select,value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}
function ensureNoticeOption(select){if(!select.querySelector('option[value="notice"]')){const o=document.createElement('option');o.value='notice';o.textContent='إشعارات';select.append(o);}}
function apply(){
 const view=document.getElementById('view');if(!view)return;
 const select=view.querySelector('#assetFilter');
 if(route()!=='news'){
  if(current==='notice'&&select&&!resetting){resetting=true;current='all';dispatch(select,'all');setTimeout(()=>resetting=false,0);}return;
 }
 if(!select)return;
 ensureNoticeOption(select);
 // For normal filters the app itself marks the selected option. Notification is
 // supplied by this compatibility layer, so preserve it across the app re-render.
 if(current!=='notice')current=select.value||'all';else select.value='notice';
 const label=select.closest('label');if(label)label.style.display='none';
 let bar=view.querySelector('[data-news-slicers]');
 if(!bar){
  bar=document.createElement('div');bar.dataset.newsSlicers='';bar.className='filters';bar.setAttribute('role','group');bar.setAttribute('aria-label','تصنيف الأخبار');
  bar.innerHTML=Object.entries(labels).map(([value,text])=>`<button type="button" data-news-filter="${value}">${text}</button>`).join('')+'<span class="muted" data-news-slicer-note></span>';
  const filters=select.closest('.filters');(filters?.parentNode||view).insertBefore(bar,filters||view.firstChild);
  bar.addEventListener('click',event=>{const button=event.target.closest('[data-news-filter]');if(!button)return;current=button.dataset.newsFilter;ensureNoticeOption(select);dispatch(select,current);});
 }
 for(const button of bar.querySelectorAll('[data-news-filter]'))button.classList.toggle('primary',button.dataset.newsFilter===current);
 const note=bar.querySelector('[data-news-slicer-note]');if(note)note.textContent=current==='notice'?'تنبيهات ومعلومات عامة غير مصنفة كإشارة مباشرة لحركة السوق.':'اختر نوع الأخبار المعروضة.';
 const formSelect=view.querySelector('#newsForm select[name="assetType"]');
 if(formSelect&&!formSelect.querySelector('option[value="notice"]')){const o=document.createElement('option');o.value='notice';o.textContent='إشعار / إعلام عام';formSelect.append(o);}
}
function start(){const view=document.getElementById('view');if(!view)return;new MutationObserver(()=>queueMicrotask(apply)).observe(view,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(apply,0));apply();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
