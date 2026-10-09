import fs from 'node:fs';
import {enrichReport,collectNav} from './report-enrichment.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const facts=read('report-sources/verified-market-facts.json');let history;try{history=read('report-sources/price-history.json');}catch{}
const files=fs.readdirSync('daily-reports').filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort(),reports=files.map(f=>read('daily-reports/'+f));
const snapshots=fs.readdirSync('report-sources').filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f=>read('report-sources/'+f));
const navs=collectNav(reports,snapshots,facts);
const names=Object.fromEntries(reports.flatMap(r=>Object.entries(r.stocks||{}).map(([t,q])=>[t,q.name])));
for(let i=0;i<reports.length;i++){
 const r=reports[i];if(!history?.stocks||r.date<history.sessions[0]||r.date>history.as_of||r.report_type!=='reviewed_eod')continue;
 // Only enrich dates for which a saved dated quote or verified fact exists.
 if(!Object.values(history.stocks).some(s=>s.quotes[r.date]))continue;
 const next=enrichReport(r,history,facts,navs,names);fs.writeFileSync('daily-reports/'+files[i],JSON.stringify(next,null,2)+'\n');
 if(fs.existsSync('daily-report.json')&&read('daily-report.json').date===r.date)fs.writeFileSync('daily-report.json',JSON.stringify(next,null,2)+'\n');
 console.log(r.date,JSON.stringify(next.coverage));
}
