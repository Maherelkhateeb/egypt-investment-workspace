const {test}=require('node:test'),a=require('node:assert/strict');
const calendar=require('../market-calendar.json'),market=require('../market.json');
test('missing numbers are never converted into zero, and conflicting OHLC is removed',async()=>{const {reviewSnapshot,finite}=await import('../scripts/report-review.mjs');a.equal(finite(null),false);a.equal(finite(''),false);const report=reviewSnapshot('2026-10-06',{commit:'ref',snapshot:{updated_at:'2026-10-06T17:00:00+03:00',stocks:{X:{close:10,open:9,high:8,low:7,chg:1,rsi:null}}}},null,{assets:{},indices:{}},calendar);a.equal(report.stocks.X.rsi,null);a.equal(report.stocks.X.change_pct,null);a.equal(report.stocks.X.open,null);a.equal(report.stocks.X.analysis.support,null);});
test('holiday snapshots and mismatched snapshot dates are rejected; holiday report has no fake prices',async()=>{const {reviewSnapshot,nonSessionReport}=await import('../scripts/report-review.mjs');a.throws(()=>reviewSnapshot('2026-10-08',{snapshot:{updated_at:'2026-10-08T17:00:00+03:00'}},null,market,calendar));a.throws(()=>reviewSnapshot('2026-10-06',{snapshot:{updated_at:'2026-10-07T17:00:00+03:00'}},null,market,calendar));const r=nonSessionReport('2026-10-08',calendar,{date:'2026-10-07'});a.equal(r.report_type,'non_trading_day');a.deepEqual(r.stocks,{});a.equal(r.last_session_date,'2026-10-07');});
test('stock change uses dated previous closes and discloses source disagreement',async()=>{const {reviewSnapshot}=await import('../scripts/report-review.mjs'),previous={date:'2026-10-05',stocks:{X:{close:100}}};const r=reviewSnapshot('2026-10-06',{commit:'ref',snapshot:{updated_at:'2026-10-06T17:00:00+03:00',stocks:{X:{close:110,chg:2,open:100,high:112,low:99}}}},previous,{assets:{},indices:{}},calendar);a.equal(r.stocks.X.change_pct,10);a.equal(r.stocks.X.reported_change_pct,2);a.equal(r.audit.issues.some(x=>x.code==='reported_change_mismatch'),true);});

test('project computes RSI and averages itself and never accepts technical values from the old provider',async()=>{
 const {reviewSnapshot}=await import('../scripts/report-review.mjs'),Cal=require('../market-calendar.js');
 const dates=Cal.sessions(calendar,'2026-09-08','2026-10-06').slice(-20),date=dates.at(-1);
 const history=dates.slice(0,-1).map((date,i)=>({date,report_type:'reviewed_eod',stocks:{X:{close:100+i}},funds:[]}));
 const r=reviewSnapshot(date,{snapshot:{updated_at:date+'T17:00:00+03:00',stocks:{X:{close:119,rsi:2,sma20:500,sma50:600,sma200:700}}}},history.at(-1),{assets:{},indices:{}},calendar,history);
 a.equal(r.stocks.X.rsi,100);a.equal(r.stocks.X.sma20,109.5);a.equal(r.stocks.X.sma50,null);a.equal(r.stocks.X.sma200,null);a.equal(r.stocks.X.technical_basis.sessions,20);
});
test('a gap or price basis break stops technical calculations and stale fund prices retain their original date',async()=>{
 const {reviewSnapshot}=await import('../scripts/report-review.mjs');
 const prior={date:'2026-10-04',stocks:{X:{close:100}},funds:[{code:'CMS',price:20,session_date:'2026-10-01'}]};
 const r=reviewSnapshot('2026-10-06',{snapshot:{updated_at:'2026-10-06T17:00:00+03:00',stocks:{X:{close:110,rsi:77,sma20:99}}}},prior,{assets:{},indices:{}},calendar,[prior]);
 a.equal(r.stocks.X.rsi,null);a.equal(r.stocks.X.technical_basis.sessions,1);a.equal(r.funds[0].session_date,'2026-10-01');a.equal(r.funds[0].change_pct,null);a.equal(r.funds[0].carried_forward,true);
});
