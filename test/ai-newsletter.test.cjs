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
function boot(providers){
 let snapshot={providers};const nodes=new Map(),buttons=[];
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
 const context=vm.createContext({document,InvestCore:C,LegacyTemplates:{advisor:'<button>المستشار</button>'},
  addEventListener(){},AbortSignal,URL,Intl,Date,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,
  fetch:async url=>({ok:true,json:async()=>structuredClone(url==='ai.json'?snapshot:{aiServicePublished:false})})});
 context.window=context;vm.runInContext(script,context,{filename:'ai-view.js'});
 return {nodes,html:()=>nodes.get('aiReportArea').innerHTML,select(provider){buttons.find(b=>b.dataset.aiProvider===provider).onclick();},
  update(value){snapshot={providers:value};return nodes.get('refreshAi').onclick();},automatic(){nodes.get('autoAiProvider').onclick();},
  selected:()=>buttons.find(b=>b.dataset.aiProvider&&b.classList.contains('active'))?.dataset.aiProvider};
}

test('newsletter automatically displays validated Groq when Gemini failed',async()=>{
 const app=boot({gemini:{status:'failed',error_code:'http_503'},groq:result('groq')});await settle();
 assert.equal(app.selected(),'groq');assert.match(app.html(),/تحليل موثق من groq/);assert.match(app.html(),/اختيرت نشرة Groq/);
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
test('unbound or malformed Groq evidence cannot become the automatic fallback',async()=>{
 const bads=[{sources:{}},{analysis:null},{generated_at:new Date(Date.now()+3600000).toISOString()},
  {analysis:{...result('groq').analysis,findings:[{fact:'حقيقة غير موجودة بالمصدر',source_ids:['N1']}]}},
  {analysis:{...result('groq').analysis,findings:[null]}}];
 for(const bad of bads){const app=boot({gemini:{status:'failed'},groq:{...result('groq'),...bad},openai:result('openai')});await settle();
  assert.equal(app.selected(),'openai');assert.match(app.html(),/تحليل موثق من openai/);}
});
test('missing Groq key and an empty ready response never appear as successful generation',async()=>{
 const app=boot({gemini:{status:'failed'},groq:{status:'waiting_key',analysis:null},openai:{status:'ready',analysis:null}});await settle();
 app.select('groq');assert.match(app.html(),/بانتظار إعداد اتصال/);assert.doesNotMatch(app.html(),/تم توليد تحليل من الخدمة/);
 app.select('openai');assert.match(app.html(),/تعذر توليد تحليل موثق/);assert.doesNotMatch(app.html(),/تم توليد تحليل من الخدمة/);
});
