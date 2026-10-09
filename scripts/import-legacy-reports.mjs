import fs from 'node:fs';
import {reviewSnapshot} from './report-review.mjs';
import Calendar from '../market-calendar.js';
import Availability from '../report-availability.js';
const market=JSON.parse(fs.readFileSync('market.json','utf8')),calendar=Calendar.validate(JSON.parse(fs.readFileSync('market-calendar.json','utf8')));
fs.mkdirSync('daily-reports',{recursive:true});let previous=null;const history=[];
for(const name of fs.readdirSync('report-sources').filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()){
 const date=name.slice(0,10),file='daily-reports/'+name,source=JSON.parse(fs.readFileSync('report-sources/'+name,'utf8'));
 if(fs.existsSync(file)){const existing=JSON.parse(fs.readFileSync(file,'utf8'));if(existing.audit?.review_version>=4&&(existing.audit.review_version>=5||!Availability.inPreviousWeek(existing,new Date()))&&!process.argv.includes('--review')){previous=existing;history.push(existing);continue;}}
 const report=reviewSnapshot(date,source,previous,market,calendar,history);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');previous=report;history.push(report);
}
const now=new Date(),reports=fs.readdirSync('daily-reports').filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().flatMap(file=>{const path='daily-reports/'+file,r=JSON.parse(fs.readFileSync(path,'utf8'));const meta=Availability.metadata(r,path);return Availability.eligible(meta,r,now)?[meta]:[];});
fs.writeFileSync('daily-reports/index.json',JSON.stringify({schema:4,reports},null,2)+'\n');
console.log('Reviewed daily archive:',reports.length,'reports; existing reviewed reports preserved.');
