import fs from 'node:fs';
import path from 'node:path';

const market=JSON.parse(fs.readFileSync('market.json','utf8'));
const newsRaw=fs.existsSync('news.json')?JSON.parse(fs.readFileSync('news.json','utf8')):[];
const ai=fs.existsSync('ai.json')?JSON.parse(fs.readFileSync('ai.json','utf8')):null;
const cairoNow=new Date();
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(cairoNow);
const get=t=>parts.find(p=>p.type===t)?.value;
const localDate=`${get('year')}-${get('month')}-${get('day')}`;
const localTime=`${get('hour')}:${get('minute')}:${get('second')}`;
const reportDate=market.session_date||localDate;
const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',weekday:'long'}).format(new Date(`${reportDate}T12:00:00Z`));
const dayMap={Sunday:'الأحد',Monday:'الاثنين',Tuesday:'الثلاثاء',Wednesday:'الأربعاء',Thursday:'الخميس',Friday:'الجمعة',Saturday:'السبت'};
const sessionDay=dayMap[weekday]||weekday||'';
const finite=v=>Number.isFinite(Number(v));
const round=(v,d=2)=>finite(v)?Number(Number(v).toFixed(d)):null;
const change=(close,prev)=>finite(close)&&finite(prev)&&Number(prev)!==0?round((Number(close)-Number(prev))/Number(prev)*100,2):null;

if(!market.session_date)throw new Error('market.json has no session_date; refusing to generate an undated daily report');
if(market.session_date>localDate)throw new Error(`market session ${market.session_date} is in the future for Cairo date ${localDate}`);

fs.mkdirSync('daily-reports',{recursive:true});
const reportFile=path.join('daily-reports',`${reportDate}.json`);
if(fs.existsSync(reportFile)){
 try{
  const existing=JSON.parse(fs.readFileSync(reportFile,'utf8'));
  if(existing?.audit?.audited===true){
   console.log(`Preserving audited daily report ${reportDate}; automatic generator will not overwrite it.`);
   process.exit(0);
  }
 }catch{}
}

const stocks={},funds=[],fx_gold={};
for(const [ticker,q] of Object.entries(market.assets||{})){
 const type=q.type||'stock', item={ticker,name:q.name||ticker,open:null,high:null,low:null,close:round(q.close,5),previous_close:round(q.previous_close,5),change_pct:change(q.close,q.previous_close),volume:null,rsi:null,sma20:null,sma50:null,sma200:null,value_traded:null,session_date:q.session_date||reportDate,source:q.source_url||null,status:q.status||null};
 if(type==='stock')stocks[ticker]=item;
 else if(type==='fund')funds.push({code:ticker,name:q.name||ticker,price:round(q.close,5),previous_close:round(q.previous_close,5),change_pct:item.change_pct,session_date:q.session_date||reportDate,source:q.source_url||null,status:q.status||null});
 else fx_gold[ticker]={name:q.name||ticker,close:round(q.close,5),previous_close:round(q.previous_close,5),chgPct:item.change_pct,session_date:q.session_date||reportDate,source:q.source_url||null,status:q.status||null};
}
const indices={};
for(const [ticker,q] of Object.entries(market.indices||{}))indices[ticker]={name:q.name||ticker,open:null,close:round(q.close,2),previous_close:round(q.previous_close,2),change_pct:change(q.close,q.previous_close),session_date:q.session_date||reportDate,source:q.source_url||null,status:q.status||null};
const ranked=Object.values(stocks).filter(s=>finite(s.change_pct)).sort((a,b)=>b.change_pct-a.change_pct);
const gainers=ranked.filter(x=>x.change_pct>0),losers=ranked.filter(x=>x.change_pct<0),flat=ranked.filter(x=>x.change_pct===0);
const idxMoves=Object.values(indices).map(x=>x.change_pct).filter(finite);
const avgIdx=idxMoves.length?round(idxMoves.reduce((a,b)=>a+Number(b),0)/idxMoves.length,2):null;
const bias=avgIdx==null?'غير محسوم':avgIdx>.35?'إيجابي':avgIdx<-.35?'سلبي':'متوازن';
const breadth=gainers.length>losers.length?'اتساع إيجابي':gainers.length<losers.length?'اتساع سلبي':'اتساع متوازن';
const newsItems=Array.isArray(newsRaw)?newsRaw:Array.isArray(newsRaw?.items)?newsRaw.items:[];
const sources=[...new Set([...Object.values(stocks).map(x=>x.source),...funds.map(x=>x.source),...Object.values(indices).map(x=>x.source),...Object.values(fx_gold).map(x=>x.source)].filter(Boolean))];

const report={schema:3,report_type:'complete_eod',date:reportDate,sessionDay,status:'مغلق — تقرير نهاية اليوم بعد 4:00 م',title:`التقرير اليومي الشامل — ${sessionDay} ${reportDate}`,subtitle:'تقرير نهاية اليوم من البيانات الموثقة المتاحة في المشروع',generated_at_cairo:`${localDate}T${localTime}`,generated_from:{repository:'Maherelkhateeb/egypt-investment-workspace',file:'market.json',snapshot_updated_at:market.fetched_at||null},audit:{audited:false,audited_at:new Date().toISOString(),policy:'لا تُخترع قيم OHLC أو RSI أو حجم أو تدفقات غير موجودة في لقطة المصدر.',notes:['القيم غير المتاحة تبقى ظاهرة كغير متاحة حتى يوفّرها مصدر موثق.','بيانات المحفظة الخاصة لا تُرفع للمستودع؛ ملخصها يظهر محليًا داخل التطبيق فقط.']},session_analysis:{headline:`جلسة ${sessionDay}: قراءة ${bias} للمؤشرات و${breadth}`,nature:`داخل الأسهم ذات المقارنة المتاحة: ${gainers.length} صاعدًا مقابل ${losers.length} هابطًا و${flat.length} دون تغير.`,liquidity:'لا يتم وصف شراء مؤسسات أو تدفقات أجنبية دون بيانات موثقة.',tomorrow:'تتم متابعة الجلسة التالية من السعر والحجم والمستويات الموثقة؛ لا يتم توليد دعم أو مقاومة من بيانات ناقصة.'},indices,market_summary:{stocks_with_change:ranked.length,gainers:gainers.length,losers:losers.length,flat:flat.length,best:ranked[0]||null,worst:ranked.at(-1)||null,index_bias:bias,average_index_change:avgIdx,top_gainers:gainers.slice(0,10),top_losers:[...losers].sort((a,b)=>a.change_pct-b.change_pct).slice(0,10)},portfolio_analysis:[],stocks,funds,fx_gold,news_snapshot:newsItems.slice(0,30),ai_snapshot:ai,sources,disclaimer:'تحليل معلوماتي تاريخي وليس توصية شراء أو بيع.'};

fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('daily-report.json',JSON.stringify(report,null,2)+'\n');
const indexFile=path.join('daily-reports','index.json');
let index={schema:3,reports:[]};
if(fs.existsSync(indexFile)){try{index=JSON.parse(fs.readFileSync(indexFile,'utf8'));}catch{}}
index.schema=3;index.reports=Array.isArray(index.reports)?index.reports:[];
const meta={date:reportDate,label:`تقرير ${sessionDay} ${reportDate}`,sessionDay,audited:false,complete:true,file:`daily-reports/${reportDate}.json`,source_commit:null};
const at=index.reports.findIndex(x=>x.date===reportDate);if(at>=0)index.reports[at]=meta;else index.reports.push(meta);
index.reports.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
fs.writeFileSync(indexFile,JSON.stringify(index,null,2)+'\n');
console.log(`Daily report generated for session ${reportDate} at ${localTime} Africa/Cairo; archive index updated`);
