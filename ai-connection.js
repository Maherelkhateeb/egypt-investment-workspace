/* Authenticated bridge; credentials stay on the private service. */
(function(){'use strict';
class InvestmentAIConnection{
 constructor(serviceUrl,onReady,onStatus){
  const url=new URL(serviceUrl);if(url.protocol!=='https:')throw Error('رابط خدمة غير صالح');
  this.url=url.origin;this.onReady=onReady;this.onStatus=onStatus;this.frame=null;this.popup=null;
  this.peers=new Map();this.pending=new Map();this.waiters=new Set();
  window.addEventListener('message',event=>this.receive(event));
 }
 start(){
  if(this.frame)return;
  const frame=document.createElement('iframe');frame.hidden=true;frame.title='خدمة المساعد الخاصة';
  frame.src=this.url+'/bridge';frame.setAttribute('sandbox','allow-scripts allow-same-origin');
  document.body.append(frame);this.frame=frame;
 }
 peer(provider){
  for(const [source,providers]of this.peers){
   if(source===this.popup&&this.popup.closed){this.peers.delete(source);continue;}
   if(providers[provider]?.configured===true)return source;
  }
  return null;
 }
 configured(provider){return Boolean(this.peer(provider));}
 connect(provider='groq'){
  this.start();if(this.configured(provider))return true;
  if(this.popup&&!this.popup.closed){this.popup.focus();return true;}
  this.popup=window.open(this.url,'investment-ai-service','popup,width=760,height=820');
  this.onStatus(this.popup?'جار استعادة الاتصال المحفوظ. إذا ظهرت شاشة تسجيل الدخول، استخدم حساب مالك التطبيق.':'تعذر فتح الخدمة الخاصة. افتح المساعد للسماح باستعادة جلسة الدخول.');
  return Boolean(this.popup);
 }
 waitForReady(provider){
  const source=this.peer(provider);if(source)return Promise.resolve(source);
  return new Promise((resolve,reject)=>{
   const waiting={provider,resolve,reject,timer:null};
   waiting.timer=setTimeout(()=>{this.waiters.delete(waiting);reject(Error('لم تُستعد جلسة الخدمة الخاصة. افتح المساعد وتحقق من تسجيل الدخول؛ مفتاح Groq محفوظ على الخادم.'));},45000);
   this.waiters.add(waiting);
  });
 }
 async request(payload){
  const provider=payload.provider||'groq';
  if(!this.configured(provider)&&!this.connect(provider))throw Error('تعذر فتح الخدمة الخاصة لاستعادة الاتصال.');
  const source=await this.waitForReady(provider),id=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('لم تصل إجابة مكتملة من الخدمة. يمكنك إعادة المحاولة دون إعادة إدخال المفتاح.'));},payload.mode==='newsletter'?135000:65000);
   this.pending.set(id,{source,mode:payload.mode,resolve,reject,timer});
   source.postMessage({type:'investment-ai-request',id,payload:{...payload,provider}},this.url);
  });
 }
 receive(event){
  if(event.origin!==this.url||!event.source||event.source!==this.popup&&event.source!==this.frame?.contentWindow)return;
  const data=event.data;if(!data||typeof data!=='object')return;
  if(data.type==='investment-ai-ready'){
   const providers=data.providers;if(!providers||typeof providers!=='object'||Array.isArray(providers))return;
   this.peers.set(event.source,providers);this.onReady(providers);
   for(const waiting of this.waiters){const source=this.peer(waiting.provider);if(source){clearTimeout(waiting.timer);this.waiters.delete(waiting);waiting.resolve(source);}}
   return;
  }
  if(data.type!=='investment-ai-response')return;
  const request=this.pending.get(data.id);if(!request||event.source!==request.source)return;
  this.pending.delete(data.id);clearTimeout(request.timer);
  if(data.error)return request.reject(Error(String(data.error).slice(0,600)));
  const result=data.result;
  const valid=request.mode==='newsletter'?result?.report&&typeof result.report==='object':request.mode==='scan'?Array.isArray(result?.draft?.holdings):typeof result?.reply==='string'&&result.reply.trim();
  if(!valid)return request.reject(Error('لم تصل إجابة صالحة من الخدمة.'));
  request.resolve(result);
 }
}
window.InvestmentAIConnection=InvestmentAIConnection;
})();
