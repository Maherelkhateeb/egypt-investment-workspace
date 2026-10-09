const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../core.js'),service='https://egypt-investment-ai.maher-elkhateb1.chatgpt.site',source='https://maherelkhateeb.github.io',token='12345678-1234-1234-1234-123456789abc';
function boot(origin,query='',saved=C.empty(),options={}){
 const sent=[],imports=[],listeners=[],opened=[],timers=new Map();let count=0,backups=0,fileChoices=0,current=C.empty();
 const peer={postMessage:(data,target)=>sent.push({data,target}),closed:false,close(){this.closed=true;}},button={},backupButton={},status={};
 const panel={querySelector:selector=>selector==='[role="status"]'?status:selector==='[data-import-backup]'?backupButton:button};
 const context=vm.createContext({URL,crypto:require('node:crypto').webcrypto,location:{origin,href:origin+'/egypt-investment-workspace/'+query},opener:options.noOpener?null:peer,InvestCore:C,LegacyActions:{extra:()=>options.tools},repository:{load:()=>saved},backup:()=>backups++,importObject:async data=>{imports.push(data);if(options.approve===false)return false;current=C.validateState(data.state);return true;},addEventListener:(name,fn)=>listeners.push(fn),setTimeout:fn=>{timers.set(++count,fn);return count;},clearTimeout:id=>timers.delete(id),document:{createElement:()=>panel,getElementById:id=>id==='fileInput'?{click:()=>fileChoices++}:{before(){}}},open:(url,name)=>{opened.push({url,name});return options.blockPopup?null:peer;}});
 context.window=context;vm.runInContext(fs.readFileSync(require.resolve('../app-transfer.js'),'utf8'),context);
 return {sent,imports,listeners,opener:peer,button,backupButton,status,opened,timers,get backups(){return backups;},get fileChoices(){return fileChoices;},get current(){return current;},async emit(data,from=source,sender=peer){for(const fn of listeners)await fn({origin:from,source:sender,data});}};
}
test('source transfers data only to the intended window, service origin and matching one-time request',async()=>{
 const tools={alerts:[],journal:[{notes:'TEST_LOCAL_NOTE'}],activity:[]},app=boot(source,'?transfer='+token,C.empty(),{tools});assert.equal(app.sent.length,1);assert.equal(app.sent[0].data.type,'investment-transfer-ready');assert.equal(app.sent[0].data.state,undefined);
 const request={type:'investment-transfer-request',token};
 await app.emit(request,'https://evil.example');await app.emit(request,service,{});await app.emit({...request,token:'wrong'},service);assert.equal(app.sent.length,1);
 await app.emit(request,service);assert.equal(app.sent.length,2);assert.equal(app.sent[1].target,service);assert.deepEqual(app.sent[1].data.state,C.empty());assert.deepEqual(app.sent[1].data.tools,tools);
 await app.emit(request,service);assert.equal(app.sent.length,2);
});
test('opening normally or receiving an unsolicited message never imports or sends portfolio data',async()=>{
 assert.equal(boot(source).sent.length,0);const app=boot(service);await app.emit({type:'investment-transfer-data',token,state:C.empty()});assert.equal(app.imports.length,0);assert.equal(app.sent.length,0);
});
test('approved transfer preserves state and tool records, completes once and clears the timeout',async()=>{
 const saved={...C.empty(),openingCash:123},tools={alerts:[],journal:[],activity:[{text:'TEST'}]},app=boot(service);app.button.onclick();const nonce=new URL(app.opened[0].url).searchParams.get('transfer');assert.equal(app.button.disabled,true);
 await app.emit({type:'investment-transfer-ready',token:nonce});assert.equal(app.sent[0].data.type,'investment-transfer-request');
 await app.emit({type:'investment-transfer-data',token:nonce,state:saved,tools});assert.equal(app.imports.length,1);assert.deepEqual(app.imports[0].tools,tools);assert.deepEqual(app.current,saved);assert.equal(app.opener.closed,true);assert.equal(app.timers.size,0);assert.equal(app.button.disabled,false);assert.match(app.status.textContent,/تم استيراد/);
 await app.emit({type:'investment-transfer-data',token:nonce,state:saved,tools});assert.equal(app.imports.length,1);
});
test('cancelled import leaves the current state and source window intact',async()=>{
 const app=boot(service,'',C.empty(),{approve:false});app.button.onclick();const nonce=new URL(app.opened[0].url).searchParams.get('transfer');await app.emit({type:'investment-transfer-data',token:nonce,state:{...C.empty(),openingCash:123}});
 assert.deepEqual(app.current,C.empty());assert.equal(app.opener.closed,false);assert.equal(app.timers.size,0);assert.match(app.status.textContent,/لم يتم اعتماد/);
});
test('blocked windows and unanswered transfers show the backup fallback and reject late replies',async()=>{
 const blocked=boot(service,'',C.empty(),{blockPopup:true});blocked.button.onclick();assert.equal(blocked.timers.size,0);assert.match(blocked.status.textContent,/نسخة احتياطية/);blocked.backupButton.onclick();assert.equal(blocked.fileChoices,1);
 const slow=boot(service);slow.button.onclick();const nonce=new URL(slow.opened[0].url).searchParams.get('transfer');[...slow.timers.values()][0]();assert.equal(slow.button.disabled,false);assert.equal(slow.timers.size,0);assert.match(slow.status.textContent,/لم تكتمل/);await slow.emit({type:'investment-transfer-data',token:nonce,state:C.empty()});assert.equal(slow.imports.length,0);
});
test('a source window without its opener offers a local backup without sending data',()=>{
 const app=boot(source,'?transfer='+token,C.empty(),{noOpener:true});assert.equal(app.sent.length,0);app.button.onclick();assert.equal(app.backups,1);
});
