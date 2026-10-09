const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const load=()=>import('../scripts/report-enrichment.mjs');
function fixture(){
 const sessions=Array.from({length:205},(_,i)=>new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10)),close=sessions.map((_,i)=>i+1),date=sessions[199];
 return {date,history:{schema:2,as_of:sessions.at(-1),sessions,stocks:{TEST:{symbol:'TEST.CA',currency:'EGP',url:'https://finance.yahoo.com/quote/TEST.CA/history/',close,adjusted_close:[...close],splits:[],quotes:{[date]:{open:199,high:201,low:198,close:200,volume:10}}}}}};
}
test('technical readings use only closes through the selected date and restore actual dated OHLC',async()=>{
 const {enrichStock}=await load(),{date,history}=fixture(),q=enrichStock({ticker:'TEST',name:'Test',close:199},date,history);
 assert.equal(q.close,200);assert.equal(q.previous_close,199);assert.equal(q.rsi,100);assert.equal(q.sma20,190.5);assert.equal(q.sma200,100.5);assert.equal(q.technical_basis.sessions,200);assert.equal(q.technical_basis.end,date);assert.equal(q.value_traded,null);assert.equal(q.estimated_close_volume_value,2000);
 history.stocks.TEST.adjusted_close[204]=9999999;assert.equal(enrichStock({ticker:'TEST'},date,history).sma200,100.5);
});
test('an inconsistent opening is rejected while valid high, low and closing inputs remain usable',async()=>{
 const {enrichStock}=await load(),{date,history}=fixture();history.stocks.TEST.quotes[date].open=100;
 const q=enrichStock({ticker:'TEST',close:200},date,history);assert.equal(q.open,null);assert.equal(q.high,201);assert.equal(q.low,198);assert.equal(q.ohlc_valid,false);assert.ok(q.analysis.pivot>0);
});
test('declared split reconstructs historical prices and adjusts the comparison without changing ledger quantities',async()=>{
 const {enrichStock}=await load(),{date,history}=fixture();history.stocks.TEST.splits=[{date:history.sessions[200],ratio:2}];
 const q=enrichStock({ticker:'TEST'},date,history);assert.equal(q.close,400);assert.equal(q.previous_close,398);assert.equal(q.sma200,201);assert.equal(q.split_basis.restoration_factor,2);
});
test('mixed provider basis is normalized only when both dated anchors prove the discrepancy',async()=>{
 const {enrichStock}=await load(),{date,history}=fixture(),s=history.stocks.TEST;
 const correction={ratio:2,split_date:date,provider_unadjusted_through:history.sessions[99],anchor_before:{date:history.sessions[99],actual_close:200},anchor_after:{date:history.sessions[100],actual_close:202},source_url:'https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=295043'};
 for(let i=0;i<100;i++){s.close[i]*=2;s.adjusted_close[i]*=2;}
 let q=enrichStock({ticker:'TEST'},date,history,correction);assert.equal(q.sma200,100.5);assert.equal(q.technical_basis.provider_basis_corrected,true);
 correction.anchor_after.actual_close=900;q=enrichStock({ticker:'TEST'},date,history,correction);assert.equal(q.technical_basis.provider_basis_corrected,false);
});
test('NAV completion retains its actual valuation date and never takes a future value',async()=>{
 const {enrichReport}=await load(),{date,history}=fixture(),report={date,report_type:'reviewed_eod',stocks:{TEST:{ticker:'TEST'}},indices:{},funds:[{code:'F',price:1,session_date:history.sessions[190]}],fx_gold:{},portfolio_analysis:[],coverage:{},audit:{}};
 const navs=[{code:'F',price:11,session_date:history.sessions[195]},{code:'F',price:12,session_date:history.sessions[198]},{code:'F',price:999,session_date:history.sessions[201]}];
 const r=enrichReport(report,history,{indices:{},funds:[]},navs);assert.equal(r.funds[0].price,12);assert.equal(r.funds[0].session_date,history.sessions[198]);assert.equal(r.funds[0].previous_close,11);assert.equal(r.funds[0].carried_forward,true);
});
test('public AI section context omits personal inputs and includes them only with explicit sharing',()=>{
 const {compose}=require('../ai-integration.js'),scope={page:'tools',label:'DCA',public:{method:'weighted average'},private:{tool:{inputs:[{field:'qty',value:77}],rendered_result:'12345'}}};
 assert.doesNotMatch(JSON.stringify(compose(scope,false)),/12345|"qty"|77/);assert.equal(compose(scope,true).personal.tool.inputs[0].value,77);
});
test('published market and four reviewed reports have dated sources and independently calculated indicators',()=>{
 C.validateMarket(require('../market.json'));
 for(const d of ['04','05','06','07']){const r=require('../daily-reports/2026-10-'+d+'.json');assert.equal(Object.keys(r.stocks).length,47);assert.equal(r.coverage.rsi,47);assert.equal(r.coverage.sma200,47);assert.equal(r.stocks.ESRS,undefined);assert.ok(r.funds.every(f=>f.session_date<=r.date));assert.ok(r.fx_gold.usd_egp.session_date<=r.date);for(const q of Object.values(r.stocks)){assert.match(q.source,/^https:\/\//);assert.equal(q.technical_basis.end,r.date);assert.ok(q.rsi>=0&&q.rsi<=100);}}
 assert.equal(require('../daily-reports/2026-10-04.json').indices.EGX33.close,6636.61);
 assert.equal(require('../daily-reports/2026-10-06.json').indices.EGX33.close,6584.07);
});
