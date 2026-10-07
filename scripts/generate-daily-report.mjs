import fs from 'node:fs';
import path from 'node:path';

const market=JSON.parse(fs.readFileSync('market.json','utf8'));
const news=fs.existsSync('news.json')?JSON.parse(fs.readFileSync('news.json','utf8')):[];
const ai=fs.existsSync('ai.json')?JSON.parse(fs.readFileSync('ai.json','utf8')):null;

const cairoNow=new Date();
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(cairoNow);
const get=t=>parts.find(p=>p.type===t)?.value;
const localDate=`${get('year')}-${get('month')}-${get('day')}`;
const localTime=`${get('hour')}:${get('minute')}:${get('second')}`;

const assets=Object.entries(market.assets||{}).map(([ticker,q])=>{
  const close=Number.isFinite(Number(q.close))?Number(q.close):null;
  const prev=Number.isFinite(Number(q.previous_close))?Number(q.previous_close):null;
  const delta=close!=null&&prev!=null?close-prev:null;
  const pct=delta!=null&&prev!==0?delta/prev*100:null;
  return {ticker,name:q.name||ticker,type:q.type||'stock',close,previous_close:prev,delta,pct,session_date:q.session_date||market.session_date||null,status:q.status||null,source_url:q.source_url||null};
});
const comparable=assets.filter(x=>x.pct!=null);
const sorted=[...comparable].sort((a,b)=>b.pct-a.pct);
const indices=Object.entries(market.indices||{}).map(([ticker,q])=>{
  const close=Number.isFinite(Number(q.close))?Number(q.close):null;
  const prev=Number.isFinite(Number(q.previous_close))?Number(q.previous_close):null;
  const delta=close!=null&&prev!=null?close-prev:null;
  const pct=delta!=null&&prev!==0?delta/prev*100:null;
  return {ticker,name:q.name||ticker,close,previous_close:prev,delta,pct,session_date:q.session_date||market.session_date||null,status:q.status||null,source_url:q.source_url||null};
});

const report={
  schema:1,
  report_type:'daily_close',
  generated_for_date:localDate,
  generated_at_cairo:`${localDate}T${localTime}`,
  scheduled_time:'16:00 Africa/Cairo',
  market_session_date:market.session_date||null,
  market_fetched_at:market.fetched_at||null,
  summary:{
    assets_total:assets.length,
    comparable_assets:comparable.length,
    gainers:comparable.filter(x=>x.pct>0).length,
    losers:comparable.filter(x=>x.pct<0).length,
    unchanged:comparable.filter(x=>x.pct===0).length,
    best:sorted[0]||null,
    worst:sorted.length?sorted.at(-1):null,
    funds:assets.filter(x=>x.type==='fund').length,
    gold:assets.filter(x=>x.type==='gold').length,
    unverified:assets.filter(x=>x.status==='unverified').length
  },
  indices,
  assets,
  top_gainers:sorted.filter(x=>x.pct>0).slice(0,10),
  top_losers:[...sorted].reverse().filter(x=>x.pct<0).slice(0,10),
  funds_and_gold:assets.filter(x=>x.type==='fund'||x.type==='gold'),
  news_snapshot:Array.isArray(news)?news.slice(0,30):news,
  ai_snapshot:ai,
  notes:'تقرير آلي محفوظ في نهاية اليوم من البيانات المتاحة في المشروع. لا يتم اختلاق بيانات غير موجودة، والقيم غير المتحققة تبقى موسومة بذلك.'
};

fs.writeFileSync('daily-report.json',JSON.stringify(report,null,2)+'\n');
fs.mkdirSync('daily-reports',{recursive:true});
fs.writeFileSync(path.join('daily-reports',`${localDate}.json`),JSON.stringify(report,null,2)+'\n');
console.log(`Daily report generated for ${localDate} at ${localTime} Africa/Cairo`);
