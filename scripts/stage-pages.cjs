const fs=require('node:fs');
const path=require('node:path');
const Availability=require('../report-availability.js');
fs.rmSync('_site',{recursive:true,force:true});
fs.mkdirSync('_site',{recursive:true});
for(const f of ['market-calendar.js','market-calendar-ui.js','market-calendar.json','report-periods.js','report-availability.js','scanner-ui.js','thndr-fees.js','thndr-fees-ui.js','performance-engine.js','performance-ui.js','app-config.json','interface-tools.js','legacy-actions.js','system-audit.js','system-audit-ui.js','xlsx.full.min.js','XLSX-LICENSE.txt','index.html','chart.umd.js','CHART-LICENSE.md','legacy-charts.js','legacy-interface.css','workspace-interface.css','core.js','app.js','providers.js','market.json','news.json','ai.json','daily-report.json','market-schema-example.json','legacy-templates.js','legacy-holding-card.js','legacy-market-cards.js','legacy-adapter.js','legacy-report-layout.js','daily-report-view.js','ai-view.js','estimated-investment-cost.js','news-notifications-ui.js'])if(fs.existsSync(f))fs.copyFileSync(f,'_site/'+f);
// Cache-bust scheduling rules and load additive UI layers only in the staged site.
const indexPath='_site/index.html';
if(fs.existsSync(indexPath)){
 let html=fs.readFileSync(indexPath,'utf8');
 html=html.replace('report-availability.js?v=2.3.3','report-availability.js?v=2.4.0').replace('report-periods.js?v=2.3.3','report-periods.js?v=2.4.0');
 html=html.replace('</head>','<script src="estimated-investment-cost.js?v=1.0.0" defer></script><script src="news-notifications-ui.js?v=1.0.0" defer></script></head>');
 fs.writeFileSync(indexPath,html);
}
for(const dir of ['daily-reports','period-reports']){
 if(!fs.existsSync(dir+'/index.json'))continue;
 const index=JSON.parse(fs.readFileSync(dir+'/index.json','utf8'));
 const visible=index.reports.filter(meta=>fs.existsSync(meta.file)&&Availability.eligible(meta,JSON.parse(fs.readFileSync(meta.file,'utf8')),new Date()));
 fs.mkdirSync('_site/'+dir,{recursive:true});
 fs.writeFileSync('_site/'+dir+'/index.json',JSON.stringify({...index,reports:visible},null,2)+'\n');
 for(const meta of visible){fs.mkdirSync(path.dirname('_site/'+meta.file),{recursive:true});fs.copyFileSync(meta.file,'_site/'+meta.file);}
 if(dir==='daily-reports'&&visible.length)fs.copyFileSync(visible.at(-1).file,'_site/daily-report.json');
}
fs.writeFileSync('_site/.nojekyll','');
