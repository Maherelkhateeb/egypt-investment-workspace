const fs=require('node:fs');
fs.mkdirSync('_site',{recursive:true});
for(const f of ['index.html','styles.css','portal-match.css','daily-report-match.css','core.js','app.js','providers.js','market.json','news.json','ai.json','daily-report.json'])if(fs.existsSync(f))fs.copyFileSync(f,'_site/'+f);
for(const f of ['design.js','daily-report-view.js','ai-view.js'])if(fs.existsSync(f))fs.copyFileSync(f,'_site/'+f);
if(fs.existsSync('daily-reports'))fs.cpSync('daily-reports','_site/daily-reports',{recursive:true});
fs.writeFileSync('_site/.nojekyll','');
