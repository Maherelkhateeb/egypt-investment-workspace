import fs from 'node:fs';
import Periods from '../report-periods.js';
import Calendar from '../market-calendar.js';
const calendar=Calendar.validate(JSON.parse(fs.readFileSync('market-calendar.json','utf8'))),today=Calendar.cairoDate(),index=JSON.parse(fs.readFileSync('daily-reports/index.json','utf8')),daily=index.reports.map(m=>JSON.parse(fs.readFileSync(m.file,'utf8'))),weeks=[],metadata=[];
fs.mkdirSync('period-reports/weekly',{recursive:true});fs.mkdirSync('period-reports/monthly',{recursive:true});
for(const start of [...new Set(daily.map(r=>Periods.week(r.date)))].sort()){
 const end=Calendar.add(start,6),report=Periods.aggregate(daily,'weekly',start,end,calendar,today),file='period-reports/weekly/'+start+'.json';
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');weeks.push(report);metadata.push({id:report.id,date:report.date,kind:'weekly',label:start+' — '+end,sessionDay:'الأسبوع',file,final:report.period_final,complete:report.coverage.complete});
}
for(const month of [...new Set(daily.map(r=>r.date.slice(0,7)))].sort()){
 const start=month+'-01',end=Periods.monthEnd(month),report=Periods.fromWeeks(weeks,file=>JSON.parse(fs.readFileSync(file,'utf8')),start,end,calendar,today),file='period-reports/monthly/'+month+'.json';
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');metadata.push({id:report.id,date:report.date,kind:'monthly',label:month,sessionDay:'الشهر',file,final:report.period_final,complete:report.coverage.complete});
}
fs.writeFileSync('period-reports/index.json',JSON.stringify({schema:4,reports:metadata},null,2)+'\n');
console.log('Weekly/monthly reports:',metadata.length);
