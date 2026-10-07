const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../core.js');
const snapshot=require('../market.json');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const marketKey='egx_independent_market_v1';
const portfolioKey='egx_independent_workspace_v1';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function boot({cache,fetchMarket,hash='#tab-performance'}={}){
 const state=C.empty();
 state.transactions=[C.transaction({id:'startup-fixture',type:'opening',date:'2026-10-05',ticker:'TMGH',qty:2,price:80,fee:0})];
 const store=new Map([[portfolioKey,JSON.stringify(state)]]);
 if(cache!==undefined)store.set(marketKey,cache);
 const writes=[];
 const elements=new Map(['view','notice','symbols','toast','entryForm','closeEntry','fileInput','backup','import'].map(id=>[id,{innerHTML:'',textContent:'',style:{},hidden:true,addEventListener(){}}]));
 let portfolioCalls=0,marketRequests=0;
 const context=vm.createContext({
  InvestCore:{...C,portfolio(...args){portfolioCalls++;return C.portfolio(...args);}},
  localStorage:{getItem:key=>store.get(key)??null,setItem(key,value){writes.push([key,value]);store.set(key,value);}},
  document:{getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[]},
  location:{hash,hostname:'example.github.io'},navigator:{},
  addEventListener(){},setTimeout(){return 0;},AbortSignal,URL,
  fetch:async url=>{if(url==='market.json'){marketRequests++;return fetchMarket?fetchMarket():{ok:true,json:async()=>C.clone(snapshot)};}return {ok:true,json:async()=>({items:[],sources:[],fetched_at:snapshot.fetched_at})};}
 });
 context.window=context;
 vm.runInContext(source,context,{filename:'app.js'});
 return {context,elements,store,writes,get portfolioCalls(){return portfolioCalls;},get marketRequests(){return marketRequests;},read:expression=>vm.runInContext(expression,context)};
}

test('pending initial prices show loading and preserve the performance deep link without evaluating zero',async()=>{
 let finish;
 const app=boot({fetchMarket:()=>new Promise(resolve=>{finish=resolve;})});
 app.read('render()');
 assert.equal(app.read('route'),'performance');
 assert.equal(app.read('market.session_date'),'');
 assert.equal(app.portfolioCalls,0);
 assert.match(app.elements.get('view').innerHTML,/جار تحميل الأسعار/);
 assert.match(app.elements.get('notice').textContent,/جار تحميل الأسعار/);
 finish({ok:true,json:async()=>C.clone(snapshot)});
 await settle();
 assert.equal(app.read('marketLoading'),false);
 assert.equal(app.read('route'),'performance');
 assert.match(app.elements.get('view').innerHTML,/تحليل الأداء والمردود المالي/);
 assert.equal(app.read('C.portfolio(state,market).positions[0].price'),snapshot.assets.TMGH.close);
 assert.equal(app.writes.length,0);
});

test('corrupt cached market does not block loading a valid published snapshot or alter the saved portfolio',async()=>{
 for(const cache of ['{broken',JSON.stringify({schema:1,assets:{},session_date:'bad',fetched_at:'bad'})]){
  const app=boot({cache});
  const saved=app.store.get(portfolioKey);
  await settle();
  assert.equal(app.marketRequests,1);
  assert.equal(app.read('hasMarketPrices()'),true);
  assert.equal(app.read('market.assets.TMGH.close'),snapshot.assets.TMGH.close);
  assert.equal(app.read('marketLoadError'),null);
  assert.equal(app.store.get(portfolioKey),saved);
  assert.equal(app.store.get(marketKey),cache);
  assert.equal(app.writes.length,0);
 }
});

test('newer validated cache survives an older published source',async()=>{
 const newer=C.clone(snapshot);newer.session_date='2026-10-08';newer.fetched_at='2026-10-08T10:00:00Z';
 for(const q of Object.values(newer.assets)){if(q.session_date==='2026-10-07'){q.session_date='2026-10-08';if(q.previous_session_date)q.previous_session_date='2026-10-07';}}
 for(const q of Object.values(newer.indices)){if(q.session_date==='2026-10-07'){q.session_date='2026-10-08';if(q.previous_session_date)q.previous_session_date='2026-10-07';}}
 newer.assets.TMGH.close=99;
 const app=boot({cache:JSON.stringify(newer)});
 await settle();
 assert.equal(app.read('market.session_date'),'2026-10-08');
 assert.equal(app.read('market.assets.TMGH.close'),99);
 assert.equal(app.writes.length,0);
});

test('failed source response is explicit and preserves validated cached prices',async()=>{
 const app=boot({cache:JSON.stringify(snapshot),fetchMarket:async()=>({ok:false,status:503})});
 await settle();
 assert.equal(app.read('marketLoading'),false);
 assert.match(app.read('marketLoadError'),/تعذر تحميل المصدر/);
 assert.equal(app.read('market.assets.TMGH.close'),snapshot.assets.TMGH.close);
 assert.match(app.elements.get('notice').textContent,/احتُفظ باللقطة المتاحة/);
 assert.equal(app.writes.length,0);
});

test('failed source with no valid cache reports unavailable prices instead of a fabricated snapshot date',async()=>{
 const app=boot({fetchMarket:async()=>({ok:false,status:503})});
 await settle();
 assert.equal(app.read('marketLoading'),false);
 assert.equal(app.read('hasMarketPrices()'),false);
 assert.equal(app.read('market.session_date'),'');
 assert.match(app.elements.get('notice').textContent,/تعذر تحميل الأسعار المرجعية/);
 assert.equal(app.writes.length,0);
});
