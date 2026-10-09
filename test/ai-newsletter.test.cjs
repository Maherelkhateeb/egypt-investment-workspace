const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../core.js');
const script=fs.readFileSync(require.resolve('../ai-view.js'),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function result(provider,status='ready'){
 const title='الناشر يعلن خبرًا اقتصاديًا';
 return {status,model:provider==='groq'?'openai/gpt-oss-120b':provider,
  generated_at:new Date(Date.now()-3600000).toISOString(),market_session_date:'2026-10-07',market_facts:[],
  sources:[{id:'N1',title,url:'https://www.alborsaanews.com/example',publisher:'جريدة البورصة'}],
  analysis:{summary:'تحليل موثق من '+provider,findings:[{fact:title,possible_implication:'استنتاج مشروط',uncertainty:'حدود المصدر',source_ids:['N1']}],scenarios:[],questions:[],limitations:['العنوان وحده لا يكفي']}};
}
function boot(providers,privateService=false,respond){
 let snapshot={providers};const nodes=new Map(),buttons=[],requests=[];
 function node(){const active=new Set();return {id:'',dataset:{},innerHTML:'',textContent:'',value:'',hidden:false,scrollHeight:0,
  classList:{toggle(name,value){value?active.add(name):active.delete(name);},contains:name=>active.has(name)},
  setAttribute(){},removeAttribute(){},addEventListener(){},insertAdjacentHTML(){},showModal(){this.open=true;},close(){this.open=false;}};}
 function select(selector){const key={'[data-ai-provider]':'aiProvider','[data-chat-provider]':'chatProvider','[data-ai-tab]':'aiTab'}[selector];return key?buttons.filter(b=>key in b.dataset):[];}
 const document={body:{append(el){if(el.id)nodes.set(el.id,el);}},head:{append(){}},getElementById:id=>nodes.get(id)||null,querySelectorAll:select,
  createElement(tag){const el=node();if(tag==='template')el.content={firstElementChild:node()};
   if(tag==='dialog'){
    let html='';Object.defineProperty(el,'innerHTML',{get:()=>html,set(value){html=value;
     for(const [,id] of value.matchAll(/\bid="([^"]+)"/g)){const field=node();field.id=id;nodes.set(id,field);}
     for(const [,kind,choice] of value.matchAll(/\bdata-(ai-provider|chat-provider|ai-tab)="([^"]+)"/g)){const b=node();b.dataset[{'ai-provider':'aiProvider','chat-provider':'chatProvider','ai-tab':'aiTab'}[kind]]=choice;buttons.push(b);}
    }});
    el.querySelector=selector=>nodes.get(selector.slice(1));el.querySelectorAll=select;
   }return el;}};
 class Connection{configured(){return true;}start(){}request(payload){requests.push(structuredClone(payload));return payload.mode==='newsletter'?Promise.resolve({report:result('groq')}):respond?respond(payload):Promise.resolve({provider:'Groq',model:'openai/gpt-oss-120b',reply:'إجابة التقرير المختار'});}}
 const context=vm.createContext({document,InvestCore:C,InvestmentAIConnection:Connection,LegacyTemplates:{advisor:'<button>المستشار</button>'},route:'dailyreport',market:require('../market.json'),externalNews:{items:[{title:'خبر حالي خارج فترة التقرير',url:'https://example.com/current'}]},state:C.empty(),C,localDate:()=> '2026-10-09',MarketCalendarUI:{context:()=>({today:'2026-10-09'})},
  addEventListener(){},AbortSignal,URL,Intl,Date,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,
  fetch:async url=>({ok:true,json:async()=>structuredClone(url==='ai.json'?snapshot:{aiServicePublished:privateService,aiServiceUrl:'https://example.chatgpt.site',newsletterConnection:privateService?'private_service':null})})});
 context.window=context;vm.runInContext(script,context,{filename:'ai-view.js'});
 return {nodes,requests,open:context.AIAdvisor.open,send:()=>nodes.get('aiConversationForm').onsubmit({preventDefault(){}}),html:()=>nodes.get('aiReportArea').innerHTML,select(provider){buttons.find(b=>b.dataset.aiProvider===provider).onclick();},
  update(value){snapshot={providers:value};return nodes.get('refreshAi').onclick();},automatic(){nodes.get('autoAiProvider').onclick();},
  selected:()=>buttons.find(b=>b.dataset.aiProvider&&b.classList.contains('active'))?.dataset.aiProvider};
}

test('newsletter automatically displays validated Groq when Gemini failed',async()=>{
 const app=boot({gemini:{status:'failed',error_code:'http_503'},groq:result('groq')});await settle();
 assert.equal(app.selected(),'groq');assert.match(app.html(),/تحليل موثق من groq/);assert.match(app.html(),/Groq هو المزود الأساسي المثبت/);
});
test('completed Groq is preferred to an old Gemini report without hiding its generation date',async()=>{
 const app=boot({gemini:result('gemini','stale'),groq:result('groq')});await settle();
 assert.equal(app.selected(),'groq');assert.match(app.html(),/توليد:/);
});
test('manual provider choice survives refresh and automatic selection can be restored',async()=>{
 const providers={gemini:{status:'waiting_key',analysis:null},groq:result('groq')};
 const app=boot(providers);await settle();app.select('gemini');await app.update(providers);
 assert.equal(app.selected(),'gemini');assert.match(app.html(),/بانتظار إعداد اتصال/);assert.doesNotMatch(app.html(),/تحليل موثق من groq/);
 app.automatic();assert.equal(app.selected(),'groq');assert.match(app.html(),/تحليل موثق من groq/);
});
test('Groq remains primary while malformed evidence is rejected without silently changing providers',async()=>{
 const bads=[{sources:{}},{analysis:null},{generated_at:new Date(Date.now()+3600000).toISOString()},
  {analysis:{...result('groq').analysis,findings:[{fact:'حقيقة غير موجودة بالمصدر',source_ids:['N1']}]}},
  {analysis:{...result('groq').analysis,findings:[null]}}];
 for(const bad of bads){const app=boot({gemini:{status:'failed'},groq:{...result('groq'),...bad},openai:result('openai')});await settle();
  assert.equal(app.selected(),'groq');assert.match(app.html(),/تعذر توليد تحليل موثق/);assert.doesNotMatch(app.html(),/تحليل موثق من openai/);}
});
test('missing Groq key and an empty ready response never appear as successful generation',async()=>{
 const app=boot({gemini:{status:'failed'},groq:{status:'waiting_key',analysis:null},openai:{status:'ready',analysis:null}});await settle();
 app.select('groq');assert.match(app.html(),/بانتظار إعداد اتصال/);assert.doesNotMatch(app.html(),/تم توليد تحليل من الخدمة/);
 app.select('openai');assert.match(app.html(),/تعذر توليد تحليل موثق/);assert.doesNotMatch(app.html(),/تم توليد تحليل من الخدمة/);
});

test('report questions use only their selected period and clear history when the report changes',async()=>{
 const app=boot({groq:result('groq')},true);await settle();
 const report={kind:'monthly',date:'2026-09-30',period_start:'2026-09-01',period_end:'2026-09-30',filter:'gold',fx_gold:{gold_21k_local:{close:123}}};
 app.open({kind:'report',report});await app.send();
 const first=app.requests.find(payload=>payload.mode==='chat');assert.equal(first.provider,'groq');assert.deepEqual(first.context,{page:'reports',kind:'report',report});assert.equal(first.messages.length,1);assert.match(first.messages[0].content,/2026-09-01.*2026-09-30/);
 app.open({kind:'report',report:{...report,kind:'weekly',date:'2026-10-08',period_start:'2026-10-04',period_end:'2026-10-08'}});await app.send();
 const second=app.requests.filter(payload=>payload.mode==='chat').at(-1);assert.equal(second.messages.length,1);assert.doesNotMatch(JSON.stringify(second),/2026-09-30|خبر حالي خارج/);
 app.open({question:'ما أخبار السوق الحالية؟'});await app.send();const current=app.requests.filter(payload=>payload.mode==='chat').at(-1);assert.equal(current.messages.length,1);assert.equal(current.context.report,undefined);assert.match(JSON.stringify(current.context.news),/خبر حالي خارج/);
});

test('Groq newsletter uses the saved private connection instead of requesting a separate repository key',async()=>{
 const app=boot({groq:{status:'waiting_key',analysis:null}},true);await settle();
 assert.ok(app.requests.some(payload=>payload.mode==='newsletter'&&payload.provider==='groq'));
 assert.match(app.html(),/تحليل موثق من groq/);assert.doesNotMatch(app.html(),/بانتظار إعداد اتصال/);
});

test('late advisor response from an older report never appears in the newly selected report',async()=>{
 let release;const app=boot({groq:result('groq')},true,()=>new Promise(resolve=>release=resolve));await settle();
 app.open({kind:'report',report:{kind:'monthly',date:'2026-09-30',filter:'all',period_start:'2026-09-01',period_end:'2026-09-30'}});
 const waiting=app.send();app.open({kind:'report',report:{kind:'weekly',date:'2026-10-08',filter:'gold',period_start:'2026-10-04',period_end:'2026-10-08'}});
 release({provider:'Groq',model:'openai/gpt-oss-120b',reply:'LATE_WRONG_REPORT_REPLY'});await waiting;
 assert.doesNotMatch(app.nodes.get('aiChatMessages').innerHTML,/LATE_WRONG_REPORT_REPLY|2026-09-30/);
 assert.match(app.nodes.get('aiConversationInput').value,/2026-10-04.*2026-10-08/);assert.equal(app.nodes.get('aiSend').disabled,false);
});

test('a new conversation keeps the selected report and filter while clearing messages and portfolio sharing',async()=>{
 const app=boot({groq:result('groq')},true);await settle();
 const report={kind:'weekly',date:'2026-10-08',period_start:'2026-10-04',period_end:'2026-10-08',filter:'gold',fx_gold:{gold_21k_local:{close:123}}};
 app.open({kind:'report',report,question:'OLD_REPORT_QUESTION'});await app.send();
 app.nodes.get('aiSharePortfolio').checked=true;
 app.nodes.get('aiClear').onclick();
 assert.equal(app.nodes.get('aiSharePortfolio').checked,false);
 assert.equal(app.nodes.get('aiConversationInput').value,'');
 assert.doesNotMatch(app.nodes.get('aiChatMessages').innerHTML,/OLD_REPORT_QUESTION|إجابة التقرير المختار/);
 app.nodes.get('aiConversationInput').value='ما الفترة المحددة لهذا التقرير؟';await app.send();
 const next=app.requests.filter(payload=>payload.mode==='chat').at(-1);
 assert.deepEqual(next.context,{page:'reports',kind:'report',report});
 assert.equal(next.messages.length,1);
 assert.doesNotMatch(JSON.stringify(next),/OLD_REPORT_QUESTION|خبر حالي خارج|portfolio|calendar/);
});

test('a new audit conversation retains the measured audit and its request mode',async()=>{
 const app=boot({groq:result('groq')},true);await settle();
 const audit={generated_at:'2026-10-09T13:00:00Z',findings:[{id:'measured-test',status:'fail',repair:'refresh_market'}]};
 app.open({kind:'audit',audit});await app.send();app.nodes.get('aiClear').onclick();
 app.nodes.get('aiConversationInput').value='اشرح المشكلة المقاسة';await app.send();
 const next=app.requests.filter(payload=>payload.mode==='audit').at(-1);
 assert.deepEqual(next.context.audit,audit);assert.equal(next.context.kind,'audit');assert.equal(next.messages.length,1);
 assert.equal(app.requests.filter(payload=>payload.mode==='chat').length,0);
});
