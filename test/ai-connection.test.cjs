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
test('first question waits for automatic reconnection and is sent once without another submit',async()=>{
 const app=boot(),response=app.connection.request({messages:[{role:'user',content:'لا تفقد هذا السؤال'}]});
 assert.equal(app.opened,1);assert.equal(app.sent.length,0);app.ready();await tick();
 assert.equal(app.sent.length,1);assert.equal(app.sent[0].data.payload.messages[0].content,'لا تفقد هذا السؤال');
 app.emit({type:'investment-ai-response',id:app.sent[0].data.id,result:{reply:'وصل السؤال'}});
 assert.equal((await response).reply,'وصل السؤال');
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
