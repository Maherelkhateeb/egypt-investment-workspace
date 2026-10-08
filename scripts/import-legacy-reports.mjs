import fs from 'node:fs';
import {reviewSnapshot} from './report-review.mjs';
import Calendar from '../market-calendar.js';
const market=JSON.parse(fs.readFileSync('market.json','utf8')),calendar=Calendar.validate(JSON.parse(fs.readFileSync('market-calendar.json','utf8')));
fs.mkdirSync('daily-reports',{recursive:true});let previous=null;
for(const name of fs.readdirSync('report-sources').filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()){
 const date=name.slice(0,10),file='daily-reports/'+name,source=JSON.parse(fs.readFileSync('report-sources/'+name,'utf8'));
 if(fs.existsSync(file)){const existing=JSON.parse(fs.readFileSync(file,'utf8'));if(existing.audit?.review_version>=4&&!process.argv.includes('--review')){previous=existing;continue;}}
 const report=reviewSnapshot(date,source,previous,market,calendar);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');previous=report;
}
const reports=fs.readdirSync('daily-reports').filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map(file=>{const r=JSON.parse(fs.readFileSync('daily-reports/'+file,'utf8'));return {date:r.date,label:r.title,sessionDay:r.sessionDay,kind:'daily',audited:r.audit?.audited===true,complete:r.coverage?.source_complete||r.report_type==='non_trading_day',report_type:r.report_type,file:'daily-reports/'+file,source_commit:r.generated_from?.commit||null};});
fs.writeFileSync('daily-reports/index.json',JSON.stringify({schema:4,reports},null,2)+'\n');
console.log('Reviewed daily archive:',reports.length,'reports; existing reviewed reports preserved.');
