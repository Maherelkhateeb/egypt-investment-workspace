const fs=require('node:fs');
const path=require('node:path');
const Availability=require('../report-availability.js');

fs.rmSync('_site',{recursive:true,force:true});
fs.mkdirSync('_site',{recursive:true});
// The source shell is the deployed shell: assets and versions are defined once.
const html=fs.readFileSync('index.html','utf8');
const assets=[...html.matchAll(/(?:src|href)="([^"?#]+)[^"\n]*"/g)]
 .map(match=>match[1]).filter(file=>/^[\w.-]+\.(?:js|css)$/.test(file));
const files=new Set(['index.html',...assets,'app-config.json','market.json','news.json','ai.json','market-calendar.json','daily-report.json','market-schema-example.json','CHART-LICENSE.md','XLSX-LICENSE.txt']);
for(const file of files){
 if(!fs.existsSync(file))throw Error('Missing published asset: '+file);
 fs.copyFileSync(file,path.join('_site',file));
}
for(const directory of ['daily-reports','period-reports']){
 const indexFile=path.join(directory,'index.json');
 if(!fs.existsSync(indexFile))throw Error('Missing report index: '+indexFile);
 const index=JSON.parse(fs.readFileSync(indexFile,'utf8'));
 const visible=index.reports.filter(meta=>fs.existsSync(meta.file)&&Availability.eligible(meta,JSON.parse(fs.readFileSync(meta.file,'utf8')),new Date()));
 fs.mkdirSync(path.join('_site',directory),{recursive:true});
 fs.writeFileSync(path.join('_site',indexFile),JSON.stringify({...index,reports:visible},null,2)+'\n');
 for(const meta of visible){fs.mkdirSync(path.dirname(path.join('_site',meta.file)),{recursive:true});fs.copyFileSync(meta.file,path.join('_site',meta.file));}
 if(directory==='daily-reports'&&visible.length)fs.copyFileSync(visible.at(-1).file,'_site/daily-report.json');
}
fs.writeFileSync('_site/.nojekyll','');
