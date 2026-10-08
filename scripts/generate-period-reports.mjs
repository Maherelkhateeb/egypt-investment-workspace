import fs from 'node:fs';
import Periods from '../report-periods.js';
import Calendar from '../market-calendar.js';
import Availability from '../report-availability.js';
const calendar=Calendar.validate(JSON.parse(fs.readFileSync('market-calendar.json','utf8'))),today=Calendar.cairoDate(),now=new Date(),index=JSON.parse(fs.readFileSync('daily-reports/index.json','utf8')),daily=index.reports.flatMap(m=>{if(!fs.existsSync(m.file))return [];const r=JSON.parse(fs.readFileSync(m.file,'utf8'));return Availability.eligible(m,r,now)?[r]:[];}),weeks=[],metadata=[];
fs.mkdirSync('period-reports/weekly',{recursive:true});fs.mkdirSync('period-reports/monthly',{recursive:true});
function stable(report){const copy=JSON.parse(JSON.stringify(report));delete copy.generated_at;if(copy.generated_from)delete copy.generated_from.snapshot_updated_at;return JSON.stringify(copy);}
function preserve(file,candidate){
 if(!fs.existsSync(file))return candidate;
 try{const existing=JSON.parse(fs.readFileSync(file,'utf8'));if(stable(existing)===stable(candidate))return existing;}catch{}
 return candidate;
}
for(const start of [...new Set(daily.map(r=>Periods.week(r.date)))].sort()){
 const end=Calendar.add(start,4),candidate=Periods.aggregate(daily,'weekly',start,end,calendar,today),file='period-reports/weekly/'+start+'.json',report=preserve(file,candidate);
 const meta=Availability.metadata(report,file);if(!Availability.eligible(meta,report,now))continue;
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');weeks.push(report);metadata.push(meta);
}
for(const month of [...new Set(daily.map(r=>r.date.slice(0,7)))].sort()){
 const start=month+'-01',end=Periods.monthEnd(month),candidate=Periods.fromWeeks(weeks,file=>JSON.parse(fs.readFileSync(file,'utf8')),start,end,calendar,today),file='period-reports/monthly/'+month+'.json',report=preserve(file,candidate);
 const meta=Availability.metadata(report,file);if(!Availability.eligible(meta,report,now))continue;
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');metadata.push(meta);
}
fs.writeFileSync('period-reports/index.json',JSON.stringify({schema:4,reports:metadata},null,2)+'\n');
console.log('Weekly/monthly reports:',metadata.length);
