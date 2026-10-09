/* One-time, user-initiated local portfolio transfer between the two app origins. */
(function(){'use strict';
 const service='https://egypt-investment-ai.maher-elkhateb1.chatgpt.site',source='https://maherelkhateeb.github.io',path='/egypt-investment-workspace/';
 const token=new URL(location.href).searchParams.get('transfer');
 const transferRequested=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(token||'');
 if(location.origin===source&&transferRequested&&window.opener){
  let sent=false;
  window.addEventListener('message',event=>{
   if(sent||event.origin!==service||event.source!==window.opener||event.data?.type!=='investment-transfer-request'||event.data.token!==token)return;
   try{const saved=window.InvestCore.validateState(repository.load()),tools=window.LegacyActions?.extra();sent=true;event.source.postMessage({type:'investment-transfer-data',token,state:saved,...(tools?{tools:window.InvestCore.clone(tools)}:{})},service);}catch{event.source.postMessage({type:'investment-transfer-error',token},service);}
  });
  window.opener.postMessage({type:'investment-transfer-ready',token},service);
  return;
 }
 if(location.origin===source&&transferRequested){
  const panel=document.createElement('div');panel.className='workspace-ui max-w-4xl mx-auto px-3.5 mt-3';
  panel.innerHTML='<p>تعذر النقل المباشر بين نافذتي المتصفح. نزّل نسخة احتياطية من بياناتك السابقة ثم استوردها في التطبيق المتصل.</p><button type="button" class="primary">تنزيل نسخة احتياطية</button>';
  panel.querySelector('button').onclick=()=>backup();document.getElementById('view').before(panel);return;
 }
 if(location.origin!==service)return;
 let peer=null,nonce=null,timer=null;
 const panel=document.createElement('details');panel.className='workspace-ui max-w-4xl mx-auto px-3.5 mt-3';
 panel.innerHTML='<summary>محفظتك المحفوظة في الرابط السابق</summary><p class="muted">يمكنك نسخ المحفظة والتقييمات والتنبيهات والسجلات المحلية إلى هذا التطبيق المتصل. تظهر مراجعة قبل الاستيراد، وتبقى بيانات النسخة السابقة محفوظة.</p><div class="actions"><button type="button" class="primary" data-start-transfer>نقل نسخة من محفظتي السابقة</button><button type="button" data-import-backup>استيراد نسخة احتياطية</button></div><p role="status"></p>';
 document.getElementById('view').before(panel);
 const button=panel.querySelector('[data-start-transfer]'),status=panel.querySelector('[role="status"]');
 const reset=()=>{if(timer)clearTimeout(timer);timer=null;peer=null;nonce=null;button.disabled=false;};
 panel.querySelector('[data-import-backup]').onclick=()=>{reset();document.getElementById('fileInput').click();};
 button.onclick=()=>{reset();nonce=crypto.randomUUID();peer=window.open(source+path+'?transfer='+nonce,'investment-local-transfer');if(!peer){status.textContent='لم يفتح المتصفح نافذة النقل. استخدم نسخة احتياطية أو اسمح بفتح النافذة ثم أعد المحاولة.';reset();return;}button.disabled=true;status.textContent='جار قراءة النسخة المحلية السابقة…';timer=setTimeout(()=>{reset();status.textContent='لم تكتمل استجابة نافذة النقل. نزّل نسخة احتياطية من الرابط السابق ثم استخدم استيراد نسخة احتياطية هنا.';},30000);};
 window.addEventListener('message',async event=>{
  if(!peer||event.source!==peer||event.origin!==source||event.data?.token!==nonce)return;
  if(event.data.type==='investment-transfer-ready'){peer.postMessage({type:'investment-transfer-request',token:nonce},source);return;}
  if(event.data.type==='investment-transfer-error'){reset();status.textContent='تعذر قراءة البيانات السابقة. استخدم استيراد نسخة احتياطية.';return;}
  if(event.data.type!=='investment-transfer-data')return;
  try{const saved=window.InvestCore.validateState(event.data.state),finished=peer;reset();button.disabled=true;const imported=await importObject({application:'egypt-investment-workspace',state:saved,tools:event.data.tools});status.textContent=imported?'تم استيراد النسخة المعتمدة.':'لم يتم اعتماد الاستيراد؛ بيانات هذا التطبيق محفوظة كما هي.';if(imported)finished.close();}catch{reset();status.textContent='بيانات النقل غير صالحة؛ لم تُستبدل محفظة هذا التطبيق.';}finally{button.disabled=false;}
 });
})();
