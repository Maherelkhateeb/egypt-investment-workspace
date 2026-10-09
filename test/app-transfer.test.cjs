const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../core.js'),service='https://egypt-investment-ai.maher-elkhateb1.chatgpt.site',source='https://maherelkhateeb.github.io',token='12345678-1234-1234-1234-123456789abc';
function boot(origin,query='',saved=C.empty()){
 const sent=[],imports=[],listeners=[],opener={postMessage:(data,target)=>sent.push({data,target})},button={},status={};
 const panel={querySelector:selector=>selector==='button'?button:status};
 const context=vm.createContext({URL,crypto:require('node:crypto').webcrypto,location:{origin,href:origin+'/egypt-investment-workspace/'+query},opener,InvestCore:C,repository:{load:()=>saved},importObject:async data=>imports.push(data),addEventListener:(name,fn)=>listeners.push(fn),document:{createElement:()=>panel,getElementById:()=>({before(){}})},open:()=>opener});
 context.window=context;vm.runInContext(fs.readFileSync(require.resolve('../app-transfer.js'),'utf8'),context);
 return {sent,imports,listeners,opener,button};
}
test('source never transfers a portfolio without the intended window, service origin and matching one-time request',()=>{
 const app=boot(source,'?transfer='+token),listener=app.listeners[0];assert.equal(app.sent.length,1);assert.equal(app.sent[0].data.type,'investment-transfer-ready');assert.equal(app.sent[0].data.state,undefined);
 const request={type:'investment-transfer-request',token};
 listener({origin:'https://evil.example',source:app.opener,data:request});listener({origin:service,source:{},data:request});listener({origin:service,source:app.opener,data:{...request,token:'wrong'}});assert.equal(app.sent.length,1);
 listener({origin:service,source:app.opener,data:request});assert.equal(app.sent.length,2);assert.equal(app.sent[1].target,service);assert.deepEqual(app.sent[1].data.state,C.empty());
 listener({origin:service,source:app.opener,data:request});assert.equal(app.sent.length,2);
});
test('opening the old app normally sends no data, and target does not import without a user-initiated transfer',async()=>{
 assert.equal(boot(source).sent.length,0);const app=boot(service);
 for(const fn of app.listeners)await fn({origin:source,source:app.opener,data:{type:'investment-transfer-data',token,state:C.empty()}});
 assert.equal(app.imports.length,0);assert.equal(app.sent.length,0);
});
