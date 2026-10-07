import fs from 'node:fs';

const SOURCE='https://raw.githubusercontent.com/mahereasybakery-web/egypt-sharia-stock-report/main/all_three_reports.json';
const TARGET_DATES=new Set(['2026-10-04','2026-10-05','2026-10-06','2026-10-07']);
const res=await fetch(SOURCE,{headers:{'user-agent':'egypt-investment-workspace-report-import'}});
if(!res.ok) throw new Error(`Legacy reports fetch failed: ${res.status}`);
const reports=await res.json();
if(!Array.isArray(reports)) throw new Error('Legacy reports source is not an array');
const selected=reports.filter(r=>TARGET_DATES.has(r?.date));
if(selected.length!==4){
  const found=selected.map(r=>r.date).join(', ');
  throw new Error(`Expected 4 historical reports, found ${selected.length}: ${found}`);
}
fs.mkdirSync('daily-reports',{recursive:true});
const index=[];
for(const report of selected.sort((a,b)=>a.date.localeCompare(b.date))){
  const wrapped={
    schema:1,
    report_type:'historical_import',
    imported_from:'mahereasybakery-web/egypt-sharia-stock-report/all_three_reports.json',
    imported_at:new Date().toISOString(),
    date:report.date,
    sessionDay:report.sessionDay||null,
    label:report.label||report.title||report.date,
    post4pmAudited:Boolean(report.post4pmAudited),
    lastAuditTime:report.lastAuditTime||null,
    report
  };
  fs.writeFileSync(`daily-reports/${report.date}.json`,JSON.stringify(wrapped,null,2)+'\n');
  index.push({date:report.date,label:wrapped.label,sessionDay:wrapped.sessionDay,post4pmAudited:wrapped.post4pmAudited,lastAuditTime:wrapped.lastAuditTime,file:`daily-reports/${report.date}.json`});
}
fs.writeFileSync('daily-reports/index.json',JSON.stringify({schema:1,reports:index},null,2)+'\n');
console.log('Imported historical reports:',index.map(x=>x.date).join(', '));
