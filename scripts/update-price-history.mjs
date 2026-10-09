import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import Calendar from '../market-calendar.js';
import Availability from '../report-availability.js';
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const price=v=>positive(v)?Number(v.toFixed(8)):null;
export function parseHistory(raw,ticker,asOf,start,end){
 const symbol=ticker+'.CA',data=JSON.parse(raw).chart?.result?.[0],meta=data?.meta;
 if(!data||meta.symbol!==symbol||meta.currency!=='EGP'||meta.exchangeName!=='CAI'||!Array.isArray(data.timestamp))throw Error('identity_or_currency_mismatch');
 const quote=data.indicators?.quote?.[0],adjusted=data.indicators?.adjclose?.[0]?.adjclose;
 if(!Array.isArray(quote?.close))throw Error('missing_dated_quotes');
 const points=data.timestamp.map((timestamp,i)=>({date:Calendar.cairoDate(new Date(timestamp*1000)),close:price(quote.close[i]),adjusted:price(adjusted?.[i]),open:price(quote.open?.[i]),high:price(quote.high?.[i]),low:price(quote.low?.[i]),volume:Number.isSafeInteger(quote.volume?.[i])&&quote.volume[i]>=0?quote.volume[i]:null})).filter(q=>q.date<=asOf&&q.close!==null).sort((a,b)=>a.date.localeCompare(b.date)).slice(-280);
 if(!points.length||new Set(points.map(q=>q.date)).size!==points.length||points.at(-1).date!==asOf)throw Error('missing_current_session_or_duplicate_dates');
 const splits=Object.values(data.events?.splits||{}).map(s=>({date:Calendar.cairoDate(new Date(s.date*1000)),ratio:s.numerator/s.denominator})).filter(s=>Calendar.valid(s.date)&&positive(s.ratio)).sort((a,b)=>a.date.localeCompare(b.date));
 return {symbol,currency:'EGP',provider:'Yahoo Finance',url:'https://finance.yahoo.com/quote/'+symbol+'/history/',api_url:'https://query1.finance.yahoo.com/v8/finance/chart/'+symbol+'?interval=1d&range=2y&events=div%2Csplits',response_sha256:createHash('sha256').update(raw).digest('hex'),splits,points,quotes:Object.fromEntries(points.filter(q=>q.date>=start&&q.date<=end).map(q=>[q.date,{open:q.open,high:q.high,low:q.low,close:q.close,volume:q.volume}]))};
}
async function main(){
 const index=JSON.parse(fs.readFileSync('daily-reports/index.json','utf8'));
 const reports=index.reports.filter(m=>m.kind==='daily'&&m.report_type!=='non_trading_day').flatMap(m=>{const r=JSON.parse(fs.readFileSync(m.file,'utf8'));return Availability.eligible(m,r,new Date())?[r]:[];}).sort((a,b)=>a.date.localeCompare(b.date));
 const asOf=reports.at(-1)?.date;if(!asOf)throw Error('No completed market session for historical data');
 const destination='report-sources/price-history.json';let existing;try{existing=JSON.parse(fs.readFileSync(destination,'utf8'));}catch{}
 if(existing?.schema===2&&existing.as_of===asOf&&!process.argv.includes('--refresh')){console.log('Dated history already saved for',asOf);return;}
 const week=Availability.previousWeek(new Date()),selected=reports.filter(r=>r.date>=week.start&&r.date<=week.end);
 const tickers=[...new Set(selected.flatMap(r=>Object.keys(r.stocks||{})))].filter(t=>/^[A-Z0-9]{2,12}$/.test(t)).sort();
 const series={},errors=[];let cursor=0;
 async function load(ticker){
  for(let attempt=0;attempt<3;attempt++)try{
   const api='https://query1.finance.yahoo.com/v8/finance/chart/'+ticker+'.CA?interval=1d&range=2y&events=div%2Csplits';
   const response=await fetch(api,{headers:{'User-Agent':'egypt-investment-workspace/1.0'},redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('http_'+response.status);
   series[ticker]=parseHistory(await response.text(),ticker,asOf,week.start,week.end);return;
  }catch(error){if(attempt===2)errors.push({ticker,code:/^[\w_]+$/.test(error.message)?error.message:'fetch_or_parse_failed'});}
 }
 async function worker(){while(cursor<tickers.length)await load(tickers[cursor++]);}await Promise.all([worker(),worker(),worker()]);
 const sessions=[...new Set(Object.values(series).flatMap(s=>s.points.map(q=>q.date)))].sort(),stocks={};
 for(const ticker of Object.keys(series).sort()){const {points,...metadata}=series[ticker],map=new Map(points.map(q=>[q.date,q]));stocks[ticker]={...metadata,close:sessions.map(d=>map.get(d)?.close??null),adjusted_close:sessions.map(d=>map.get(d)?.adjusted??null)};}
 if(!Object.keys(stocks).length){console.log('Historical source unavailable; dated saved history preserved');return;}
 const result={schema:2,as_of:asOf,retrieved_at:new Date().toISOString(),provider:'Yahoo Finance historical chart data',policy:'Actual dated bars only. Yahoo closes include split adjustment: declared subsequent split factors restore each historical session price. Dividend-adjusted closes are rescaled to each dated close for independent RSI/SMA. Missing sessions stay null.',sessions,stocks,errors};
 fs.writeFileSync(destination,JSON.stringify(result)+'\n');console.log(JSON.stringify({as_of:asOf,requested:tickers.length,available:Object.keys(stocks).length,sessions:sessions.length,errors}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
