const fs=require('node:fs');
fs.rmSync('_site',{recursive:true,force:true});
fs.mkdirSync('_site',{recursive:true});
for(const f of ['index.html','legacy-interface.css','workspace-interface.css','core.js','app.js','providers.js','market.json','news.json','ai.json','daily-report.json','market-schema-example.json','legacy-templates.js','legacy-holding-card.js','legacy-market-cards.js','legacy-adapter.js','legacy-report-layout.js','daily-report-view.js','ai-view.js'])if(fs.existsSync(f))fs.copyFileSync(f,'_site/'+f);
if(fs.existsSync('daily-reports'))fs.cpSync('daily-reports','_site/daily-reports',{recursive:true});
fs.writeFileSync('_site/.nojekyll','');
