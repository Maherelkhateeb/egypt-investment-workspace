import fs from 'node:fs';
import Calendar from '../market-calendar.js';
import Availability from '../report-availability.js';
import {nonSessionReport,reviewSnapshot} from './report-review.mjs';
const calendar=Calendar.validate(JSON.parse(fs.readFileSync('market-calendar.json','utf8'))),today=Calendar.cairoDate(),market=JSON.parse(fs.readFileSync('market.json','utf8')),index=JSON.parse(fs.readFileSync('daily-reports/index.json','utf8'));
const now=new Date();
if(Availability.localTime(now)<today+'T16:00:00'){console.log('Waiting for the actual Cairo daily close time:',today);process.exit(0);}
const file='daily-reports/'+today+'.json',previousMeta=index.reports.filter(m=>m.date<today&&m.report_type!=='non_trading_day').at(-1),previous=previousMeta?JSON.parse(fs.readFileSync(previousMeta.file,'utf8')):null;
if(fs.existsSync(file)){const existing=JSON.parse(fs.readFileSync(file,'utf8'));if(existing.audit?.review_version>=4&&Availability.eligible(Availability.metadata(existing,file),existing,now)){fs.writeFileSync('daily-report.json',JSON.stringify(existing,null,2)+'\n');console.log('Preserving reviewed report',today);process.exit(0);}}
// A stale snapshot can never create a new day's close. Closed days get a dated holiday bulletin.
let report=nonSessionReport(today,calendar,previous);
const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
if(Calendar.status(calendar,today).state==='UNKNOWN'&&hour>=16){
 try{
  const repository='mahereasybakery-web/egypt-sharia-stock-report';
  const response=await fetch('https://api.github.com/repos/'+repository+'/commits?path=market_data.json&per_page=1',{headers:{'User-Agent':'reviewed-egx-report'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('تعذر التحقق من مرجع المصدر');
  const commits=await response.json(),commit=commits[0]?.sha;if(!/^[a-f0-9]{40}$/.test(commit||''))throw Error('مرجع المصدر غير صالح');
  const sourceResponse=await fetch('https://raw.githubusercontent.com/'+repository+'/'+commit+'/market_data.json',{signal:AbortSignal.timeout(15000)});if(!sourceResponse.ok)throw Error('تعذر تحميل المصدر');
  const raw=await sourceResponse.json(),status=raw.market_status,sourceDate=status?.session_date||status?.active_session_date;
  if(Calendar.cairoDate(new Date(raw.updated_at))!==today||sourceDate!==today||status?.is_open!==false||!/CLOSED|مغلقة/.test(status.session_state||''))throw Error('المصدر ليس لقطة إغلاق مؤكدة لليوم');
  const source={commit,snapshot:{updated_at:raw.updated_at,market_status:status,stocks:raw.stocks||{},indices:raw.indices||{},funds:raw.funds||{},fx_gold:raw.fx_gold||{}}};
  const history=index.reports.filter(m=>m.date<today&&m.report_type!=='non_trading_day').map(m=>JSON.parse(fs.readFileSync(m.file,'utf8')));
  report=reviewSnapshot(today,source,previous,market,calendar,history);
  if(!Object.keys(report.stocks).length)throw Error('لقطة الإغلاق لا تحتوي أسعار الأسهم');
  fs.mkdirSync('report-sources',{recursive:true});fs.writeFileSync('report-sources/'+today+'.json',JSON.stringify(source,null,2)+'\n');
 }catch(err){report.audit.notes.push('لم يعتمد إغلاق جديد: '+err.message);}
}
if(Calendar.status(calendar,today).state==='UNKNOWN'&&market.session_date===today)report.audit.notes.push('يوجد ملف سوق لليوم، لكنه لا يحتوي لقطة إغلاق كاملة ذات مراجعة؛ ينتظر التقرير المصدر الموثق.');
if(report.report_type==='pending_session'){console.log('No verified close file; daily report was not published:',today);process.exit(0);}
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');fs.writeFileSync('daily-report.json',JSON.stringify(report,null,2)+'\n');
const meta=Availability.metadata(report,file);
const at=index.reports.findIndex(r=>r.date===today);if(at<0)index.reports.push(meta);else index.reports[at]=meta;
index.schema=4;index.reports.sort((a,b)=>a.date.localeCompare(b.date));fs.writeFileSync('daily-reports/index.json',JSON.stringify(index,null,2)+'\n');
console.log('Generated calendar-aware daily bulletin:',today,report.report_type);
