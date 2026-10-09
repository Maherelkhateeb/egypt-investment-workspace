const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const origin='https://private.chatgpt.site';
function boot(){
 const sent=[],listeners={},timers=new Map();let count=0,opened=0;
 const peer={postMessage:(data,target)=>sent.push({data,target}),focus(){},closed:false};
 const frame={contentWindow:peer,setAttribute(){}};
 const context=vm.createContext({URL,crypto:require('node:crypto').webcrypto,
  document:{createElement:()=>frame,body:{append(){}}},addEventListener:(name,fn)=>listeners[name]=fn,
  open:()=>{opened++;return peer;},setTimeout:fn=>{timers.set(++count,fn);return count;},clearTimeout:id=>timers.delete(id)});
 context.window=context;vm.runInContext(fs.readFileSync(require.resolve('../ai-connection.js'),'utf8'),context);
 const connection=new context.InvestmentAIConnection(origin,()=>{},()=>{});
 const emit=(data,source=peer,from=origin)=>listeners.message({data,source,origin:from});
 const ready=()=>emit({type:'investment-ai-ready',providers:{groq:{configured:true,persistent:true}}});
 return {connection,peer,frame,sent,emit,ready,timers,get opened(){return opened;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('stored connection is restored through the authenticated frame without opening or rebinding a popup',async()=>{
 const app=boot();app.connection.start();app.ready();
 const response=app.connection.request({messages:[{role:'user',content:'سؤالي'}]});await tick();
 assert.equal(app.opened,0);assert.equal(app.sent[0].data.payload.provider,'groq');assert.equal(app.sent[0].target,origin);
 app.emit({type:'investment-ai-response',id:app.sent[0].data.id,result:{reply:'إجابة فعلية'}});
 assert.equal((await response).reply,'إجابة فعلية');assert.equal(app.timers.size,0);
});
test('a missing cross-origin browser session never opens another screen on send',async()=>{
 const app=boot();await assert.rejects(app.connection.request({messages:[{role:'user',content:'لا تفقد هذا السؤال'}]}),/نسخة التطبيق المتصلة/);
 assert.equal(app.opened,0);assert.equal(app.sent.length,0);
});
function direct(fetcher){
 let frames=0,opened=0;const calls=[];
 const context=vm.createContext({URL,AbortSignal,location:{origin},crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,addEventListener(){},document:{createElement(){frames++;throw Error('No frame in same-origin mode');}},open(){opened++;throw Error('No navigation in same-origin mode');},fetch:async(url,options)=>{calls.push({url,options});return fetcher(url,options);}});
 context.window=context;vm.runInContext(fs.readFileSync(require.resolve('../ai-connection.js'),'utf8'),context);
 return {connection:new context.InvestmentAIConnection(origin,()=>{},()=>{}),calls,get frames(){return frames;},get opened(){return opened;}};
}
test('same-origin app restores Groq and sends chat directly without frame, popup, or client key',async()=>{
 const app=direct(async url=>Response.json(url==='/api/health'?{providers:{groq:{configured:true,persistent:true}}}:{reply:'رد داخل التطبيق',provider:'Groq'}));
 await app.connection.start();assert.equal(app.connection.configured('groq'),true);
 const result=await app.connection.request({messages:[{role:'user',content:'سؤالي'}],apiKey:'MUST_NOT_SEND'});
 assert.equal(result.reply,'رد داخل التطبيق');assert.equal(app.frames,0);assert.equal(app.opened,0);
 assert.equal(app.calls[1].url,'/api/chat');assert.equal(app.calls[1].options.credentials,'same-origin');assert.equal(app.calls[1].options.redirect,'error');
 assert.equal(JSON.parse(app.calls[1].options.body).provider,'groq');assert.doesNotMatch(app.calls[1].options.body,/apiKey|MUST_NOT_SEND/);
});
test('same-origin first question sends before health completes and preserves newsletter and scan response types',async()=>{
 const app=direct(async url=>Response.json(url==='/api/newsletter'?{status:'ready'}:url==='/api/scan'?{draft:{holdings:[]}}:{reply:'أول رد'}));
 assert.equal((await app.connection.request({messages:[{role:'user',content:'أول سؤال'}]})).reply,'أول رد');
 assert.equal((await app.connection.request({mode:'newsletter'})).report.status,'ready');
 assert.equal((await app.connection.request({mode:'scan',provider:'gemini',image:{mimeType:'image/png',data:'image'}})).draft.holdings.length,0);
 assert.equal(app.calls[1].options.body,undefined);assert.equal(app.opened,0);
});
test('expired account login is reported in place without asking for an API key or navigating',async()=>{
 const app=direct(async()=>Response.json({message:'unauthorized'},{status:401}));
 await assert.rejects(app.connection.request({messages:[]}),/انتهت جلسة حسابك/);
 assert.equal(app.frames,0);assert.equal(app.opened,0);
});
test('untrusted origins and windows cannot establish a connection or answer a pending request',async()=>{
 const app=boot();app.connection.start();const ready={type:'investment-ai-ready',providers:{groq:{configured:true}}};
 app.emit(ready,{},origin);app.emit(ready,app.peer,'https://untrusted.example');assert.equal(app.connection.configured('groq'),false);
 app.ready();const response=app.connection.request({messages:[{role:'user',content:'سؤال'}]});await tick();
 const id=app.sent[0].data.id;app.emit({type:'investment-ai-response',id,result:{reply:'مزور'}},{},origin);
 assert.equal(app.connection.pending.size,1);app.emit({type:'investment-ai-response',id,result:{reply:'موثق'}});
 assert.equal((await response).reply,'موثق');
});
test('newsletter and scan responses retain their own result types',async()=>{
 const app=boot();app.connection.start();app.ready();
 for(const [mode,result]of [['newsletter',{report:{status:'ready',analysis:{summary:'نشرة'}}}],['scan',{draft:{holdings:[]}}]]){
  const response=app.connection.request({mode});await tick();app.emit({type:'investment-ai-response',id:app.sent.at(-1).data.id,result});
  assert.deepEqual(await response,result);
 }
});
