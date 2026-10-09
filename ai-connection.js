/* Authenticated bridge; credentials stay on the private service. */
(function(){'use strict';
class InvestmentAIConnection{
 constructor(serviceUrl,onReady,onStatus){
  const url=new URL(serviceUrl);if(url.protocol!=='https:')throw Error('رابط خدمة غير صالح');
  this.url=url.origin;this.direct=window.location?.origin===this.url;this.providers={};this.health=null;this.onReady=onReady;this.onStatus=onStatus;this.frame=null;this.popup=null;
  this.peers=new Map();this.pending=new Map();this.waiters=new Set();
  window.addEventListener('message',event=>this.receive(event));
 }
 start(){
  if(this.direct)return this.checkHealth();
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
 configured(provider){return this.direct?this.providers[provider]?.configured===true:Boolean(this.peer(provider));}
 async checkHealth(){
  if(this.health)return this.health;
  this.health=(async()=>{try{const response=await fetch('/api/health',{credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error(response.status===401?'انتهت جلسة حسابك. أعد تحميل التطبيق لاستعادة الدخول؛ المفتاح محفوظ.':'تعذر فحص الاتصال المحفوظ.');const result=await response.json();this.providers=result.providers||{};this.onReady(this.providers);return this.providers;}catch(error){this.onStatus(error.message);throw error;}finally{this.health=null;}})();return this.health;
 }
 connect(provider='groq'){
  if(this.direct){this.checkHealth().catch(()=>{});return true;}
  this.start();if(this.configured(provider))return true;
  this.onStatus('افتح نسخة التطبيق المتصلة من الرابط داخل المستشار. يعمل AI فيها داخل التطبيق بالمفتاح المحفوظ.');
  return false;
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
  if(this.direct){
   if(!['groq','gemini','openai'].includes(provider))throw Error('مزود غير صالح');
   const mode=payload.mode||'chat';if(!['chat','audit','scan','newsletter'].includes(mode))throw Error('نوع طلب غير صالح');
   const endpoint=mode==='newsletter'?'/api/newsletter':mode==='scan'?'/api/scan':'/api/chat';
   const body=mode==='scan'?{provider,image:payload.image}:{provider,messages:payload.messages,context:payload.context,mode};
   const options={credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(mode==='newsletter'?130000:65000)};
   if(mode!=='newsletter')Object.assign(options,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const response=await fetch(endpoint,options),result=await response.json();
   if(!response.ok)throw Error(response.status===401?'انتهت جلسة حسابك. أعد تحميل التطبيق لاستعادة الدخول؛ المفتاح محفوظ.':result.message||'تعذرت استجابة الخدمة المحفوظة.');
   const valid=mode==='newsletter'?result&&typeof result==='object':mode==='scan'?Array.isArray(result?.draft?.holdings):typeof result?.reply==='string'&&result.reply.trim();
   if(!valid)throw Error('لم تصل إجابة صالحة من الخدمة.');
   return mode==='newsletter'?{provider:'Groq',report:result}:result;
  }
  if(!this.configured(provider)&&!this.connect(provider))throw Error('استخدم نسخة التطبيق المتصلة من الرابط داخل المستشار؛ لا تحتاج إلى إدخال مفتاح.');
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
