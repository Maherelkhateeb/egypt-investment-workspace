/* One-time, user-initiated local portfolio transfer between the two app origins. */
(function(){'use strict';
 const service='https://egypt-investment-ai.maher-elkhateb1.chatgpt.site',source='https://maherelkhateeb.github.io',path='/egypt-investment-workspace/';
 const token=new URL(location.href).searchParams.get('transfer');
 if(location.origin===source&&/^[a-f0-9-]{36}$/.test(token||'')&&window.opener){
  let sent=false;
  window.addEventListener('message',event=>{
   if(sent||event.origin!==service||event.source!==window.opener||event.data?.type!=='investment-transfer-request'||event.data.token!==token)return;
   try{const saved=window.InvestCore.validateState(repository.load());sent=true;event.source.postMessage({type:'investment-transfer-data',token,state:saved},service);}catch{event.source.postMessage({type:'investment-transfer-error',token},service);}
  });
  window.opener.postMessage({type:'investment-transfer-ready',token},service);
  return;
 }
 if(location.origin!==service)return;
 let peer=null,nonce=null;
 const panel=document.createElement('details');panel.className='workspace-ui max-w-4xl mx-auto px-3.5 mt-3';
 panel.innerHTML='<summary>محفظتك المحفوظة في الرابط السابق</summary><p class="muted">يمكنك نسخ العمليات والتقييمات من النسخة السابقة إلى هذا التطبيق المتصل. تظهر مراجعة قبل الاستيراد، وتبقى بيانات النسخة السابقة محفوظة. النقل مباشر بين نافذتي المتصفح.</p><button type="button" class="primary">نقل نسخة من محفظتي السابقة</button><p role="status"></p>';
 document.getElementById('view').before(panel);
 const button=panel.querySelector('button'),status=panel.querySelector('[role="status"]');
 button.onclick=()=>{nonce=crypto.randomUUID();peer=window.open(source+path+'?transfer='+nonce,'investment-local-transfer');status.textContent=peer?'جار قراءة النسخة المحلية السابقة…':'لم يفتح المتصفح نافذة النقل. اسمح بفتحها ثم أعد المحاولة.';};
 window.addEventListener('message',async event=>{
  if(!peer||event.source!==peer||event.origin!==source||event.data?.token!==nonce)return;
  if(event.data.type==='investment-transfer-ready'){peer.postMessage({type:'investment-transfer-request',token:nonce},source);return;}
  if(event.data.type==='investment-transfer-error'){status.textContent='تعذر قراءة البيانات السابقة. استخدم استيراد نسخة احتياطية من أدواتي.';return;}
  if(event.data.type!=='investment-transfer-data')return;
  try{const saved=window.InvestCore.validateState(event.data.state);const finished=peer;peer=null;nonce=null;await importObject({application:'egypt-investment-workspace',state:saved});status.textContent='انتهت مراجعة الاستيراد. يمكنك إغلاق نافذة النسخة السابقة.';finished.close();}catch{status.textContent='بيانات النقل غير صالحة؛ لم تُستبدل محفظة هذا التطبيق.';}
 });
})();
