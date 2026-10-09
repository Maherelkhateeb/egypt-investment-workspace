const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

async function boot(){
 const jobs=[],nodes=new Map(),listeners={};let observe=null,writes=0;
 const changed=()=>{if(observe)jobs.push(observe);};
 function node(id){
  const classes=new Set(),el={id,value:'all',style:{},
   classList:{contains:k=>classes.has(k),toggle(k,on){on?classes.add(k):classes.delete(k);}},
   setAttribute(){},querySelector:()=>null};
  let html='',text='';
  Object.defineProperty(el,'innerHTML',{get:()=>html,set(v){html=v.replace(/'/g,'"');writes++;changed();}});
  Object.defineProperty(el,'textContent',{get:()=>text,set(v){text=String(v);writes++;changed();}});
  nodes.set(id,el);return el;
 }
 for(const id of ['view','newsSubViewStocks','newsSubViewFunds','newsSubViewNotices','newsStocksFeedContainer','newsFundsFeedContainer','newsNoticesFeedContainer',
  'newsStocksCountBadge','newsFundsCountBadge','newsNoticesCountBadge','newsSubTabStocksBtn','newsSubTabFundsBtn','newsSubTabNoticesBtn'])node(id);
 nodes.get('newsSubViewFunds').classList.toggle('hidden',true);
 for(const kind of ['Stocks','Funds']){
  const button=nodes.get('newsSubTab'+kind+'Btn'),label=node('button'+kind);button.querySelector=()=>label;
 }
 for(const id of ['newsSourceFilterSelect','newsStockTickerSelect']){
  const select=node(id),label=node(id+'label');select.closest=()=>({querySelector:()=>label});
 }
 const news={items:[{id:'N1',category:'stock',source_id:'publisher',publisher:'الناشر',title:'خبر اقتصادي',symbols:['TMGH']}]};
 const context=vm.createContext({document:{readyState:'complete',getElementById:id=>nodes.get(id)||null,
   addEventListener:(name,fn)=>{listeners[name]=fn;}},location:{hash:'#tab-news'},
  LegacyMarketCards:{news:item=>"<p class='news'>"+item.title+'</p>'},
  MutationObserver:class{constructor(fn){observe=fn;}observe(){}},
  queueMicrotask:fn=>jobs.push(fn),setTimeout:fn=>jobs.push(fn),addEventListener(){},AbortSignal,URL,
  fetch:async url=>({ok:true,json:async()=>structuredClone(url==='news.json'?news:{events:[]})})});
 context.window=context;
 vm.runInContext(fs.readFileSync(require.resolve('../news-notifications-ui.js'),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 function settle(){let count=0;while(jobs.length){assert.ok(++count<100,'news rendering must settle without a mutation loop');jobs.shift()();}}
 settle();return {nodes,listeners,settle,changed,get writes(){return writes;}};
}

test('news rendering settles after DOM normalization and unrelated mutations',async()=>{
 const app=await boot(),writes=app.writes;
 assert.match(app.nodes.get('newsStocksFeedContainer').innerHTML,/خبر اقتصادي/);
 app.changed();app.settle();assert.equal(app.writes,writes);
});

test('source filter changes update the visible feed without recurring DOM writes',async()=>{
 const app=await boot(),select=app.nodes.get('newsSourceFilterSelect');
 select.value='missing';app.listeners.change({target:select});app.settle();
 assert.doesNotMatch(app.nodes.get('newsStocksFeedContainer').innerHTML,/خبر اقتصادي/);
 select.value='all';app.listeners.change({target:select});app.settle();
 assert.match(app.nodes.get('newsStocksFeedContainer').innerHTML,/خبر اقتصادي/);
 const writes=app.writes;app.changed();app.settle();assert.equal(app.writes,writes);
});
