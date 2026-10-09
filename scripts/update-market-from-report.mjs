import fs from 'node:fs';

const marketFile='market.json',reportFile='daily-report.json';
if(!fs.existsSync(marketFile)||!fs.existsSync(reportFile))process.exit(0);
const current=JSON.parse(fs.readFileSync(marketFile,'utf8'));
let report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
if(report.report_type!=='reviewed_eod'&&fs.existsSync('daily-reports/index.json')){const rows=JSON.parse(fs.readFileSync('daily-reports/index.json','utf8')).reports.filter(r=>r.report_type==='reviewed_eod').sort((a,b)=>a.date.localeCompare(b.date));if(rows.length)report=JSON.parse(fs.readFileSync(rows.at(-1).file,'utf8'));}
if(report?.kind!=='daily'||report?.report_type!=='reviewed_eod'||report?.audit?.audited!==true){
 console.log('Market snapshot preserved: no reviewed trading-day close.');
 process.exit(0);
}
if(current.session_date&&report.date<current.session_date){
 console.log('Market snapshot preserved: reviewed report is older than current market file.');
 process.exit(0);
}
const source=report.generated_from||{};
const sourceUrl=/^[\w.-]+\/[\w.-]+$/.test(source.repository||'')&&/^[a-f0-9]{40}$/.test(source.commit||'')
 ?`https://github.com/${source.repository}/blob/${source.commit}/${source.file||'market_data.json'}`
 :`https://github.com/Maherelkhateeb/egypt-investment-workspace/blob/main/daily-reports/${report.date}.json`;
const assets={...(current.assets||{})};
for(const [symbol,q] of Object.entries(report.stocks||{})){
 if(!Number.isFinite(q.close)||q.close<=0)continue;
 assets[symbol]={
  ...Object.fromEntries(['open','high','low','volume','rsi','sma20','sma50','sma200','pe','pb','change_pct','analysis','technical_basis','fundamental_basis','basis_discontinuity','corporate_actions'].map(k=>[k,q[k]])),name:q.name||symbol,type:'stock',close:q.close,
  previous_close:Number.isFinite(q.previous_close)&&q.previous_close>0?q.previous_close:null,
  previous_session_date:q.previous_session_date||((current.indices?.[symbol]?.session_date===report.date&&Math.abs(current.indices[symbol].previous_close-q.previous_close)<.00001)?current.indices[symbol].previous_session_date:null),
  session_date:q.session_date||report.date,source_url:/^https:\/\//.test(q.source||'')?q.source:sourceUrl,status:'historical_reference',currency:'EGP'
 };
 if(assets[symbol].previous_close===null)delete assets[symbol].previous_session_date;
}
for(const f of report.funds||[])if(f.session_date&&f.price>0){assets[f.code]={...assets[f.code],...f,name:f.name||assets[f.code]?.name||f.code,type:'fund',close:f.price,previous_close:f.previous_close??null,source_url:/^https:\/\//.test(f.source||'')?f.source:sourceUrl,status:'historical_reference',currency:'EGP'};}
const indices={...(current.indices||{})};
for(const [symbol,q] of Object.entries(report.indices||{})){
 if(!Number.isFinite(q.close)||q.close<=0)continue;
 indices[symbol]={
  ...q,name:q.name||symbol,close:q.close,
  previous_close:Number.isFinite(q.previous_close)&&q.previous_close>0?q.previous_close:null,
  previous_session_date:q.previous_session_date||((current.indices?.[symbol]?.session_date===report.date&&Math.abs(current.indices[symbol].previous_close-q.previous_close)<.00001)?current.indices[symbol].previous_session_date:null),
  session_date:q.session_date||report.date,source_url:/^https:\/\//.test(q.source||'')?q.source:sourceUrl,status:'historical_reference'
 };
 if(!indices[symbol].previous_session_date){indices[symbol].previous_close=null;delete indices[symbol].previous_session_date;}
}
const next={...current,schema:1,session_date:report.date,fetched_at:report.audit?.history_retrieved_at||report.generated_at||new Date().toISOString(),assets,indices,fx_gold:report.fx_gold,
 market_status:{is_open:false,session_state:'CLOSED',observed_at:report.generated_at||new Date().toISOString(),valid_until:report.generated_at||new Date().toISOString()},
 notes:`لقطة إغلاق مراجعة لجلسة ${report.date}. الأسهم والمؤشرات مأخوذة من التقرير اليومي المدقق ومصدره المؤرخ؛ الصناديق والذهب تحتفظ كل قيمة بتاريخها المستقل حتى يتوفر تحديث موثق.`};
fs.writeFileSync(marketFile,JSON.stringify(next,null,2)+'\n');
console.log('Market snapshot updated from reviewed report:',report.date,Object.keys(report.stocks||{}).length,'stocks');
