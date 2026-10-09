const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../core.js');
const market=require('../market.json');
const index=require('../daily-reports/index.json');
const reports=Object.fromEntries(index.reports.map(meta=>[meta.file,JSON.parse(fs.readFileSync(meta.file,'utf8'))]));
function boot(fetcher){
 const downloads=[],messages=[],listeners={};
 const fragment=()=>{const fields=new Map([['drReportContainer',{innerHTML:'OLD_UNRELATED_REPORT'}]]),heading={textContent:'',nextElementSibling:{}};return {dataset:{},fields,querySelector:s=>s==='h2'?heading:{},querySelectorAll:()=>[],get outerHTML(){return JSON.stringify({dataset:this.dataset,content:fields.get('drReportContainer').innerHTML});}};};
 const by=(root,id)=>{if(!root.fields.has(id))root.fields.set(id,{dataset:{},before(){}});return root.fields.get(id);};
 const context=vm.createContext({InvestCore:C,ReportAvailability:require('../report-availability.js'),performance:{now:()=>0},setInterval(){},market,state:C.empty(),location:{href:'https://example.github.io/app/#tab-dailyreport'},LegacyUI:{fragment,by,put(root,id,value){by(root,id).textContent=value;},html(root,id,value){by(root,id).innerHTML=value;},exportMenu(){}},route:'dailyreport',render(){},bindView(){},exportCSV(){throw Error('Current-market export must not be used for an archive');},document:{addEventListener(type,fn){(listeners[type]||=[]).push(fn);},querySelectorAll(){return [];},createElement(){return {}; }},fetch:async function(url){const response=fetcher?await fetcher(url):{ok:true,json:async()=>C.clone(url==='daily-reports/index.json'?index:reports[url]||JSON.parse(fs.readFileSync(url,'utf8')))};response.headers={get:()=>new Date('2026-10-09T23:59:00Z').toUTCString()};return response;},download(...args){downloads.push(args);},toast(...args){messages.push(args);},URL,setTimeout(){}});
 context.window=context;vm.runInContext(fs.readFileSync('legacy-report-layout.js','utf8'),context);vm.runInContext(fs.readFileSync('daily-report-view.js','utf8'),context);
 return {context,downloads,messages,filter(value){const button={dataset:{legacyClick:"setDailyReportFilter('"+value+"')"},closest:()=>true};for(const fn of listeners.click||[])fn({target:{closest:s=>s==='[data-legacy-click]'?button:null}});}};
}
test('all archived sessions render original report sections and preserve their own dates and missing previous closes',()=>{const {context}=boot();for(const report of Object.values(reports)){const html=context.LegacyReportLayout.top(report,null)+context.LegacyReportLayout.main(report);assert.match(html,new RegExp(report.date));assert.match(html,/drSec3CardsContainer/);assert.match(html,/أبرز الفرص والأسهم النشطة/);if(Object.values(report.indices).some(q=>q.previous_close==null))assert.match(html,/إغلاق الجلسة السابقة:.*\n.*غير متاح/);assert.doesNotMatch(html,/صافي شراء 🟢|315\.4|52\.24|السيناريو الإيجابي الصاعد هو الراجح/);}});
test('archive CSV follows the selected session and includes funds, FX and provenance',async()=>{const app=boot();await app.context.ReportArchive.loadIndex();await app.context.ReportArchive.select('2026-10-04');app.context.exportCSV();const [name,content]=app.downloads[0];assert.equal(name,'dailyreport-2026-10-04.csv');assert.match(content,/"الجلسة","2026-10-04"/);assert.match(content,/"الصندوق","الاسم"/);assert.match(content,/usd_egp/);assert.match(content,/Commit المصدر/);assert.doesNotMatch(content,/"جلسة المصدر","2026-10-07"/);});
test('slow older report cannot overwrite a newer selection, and export is disabled while loading',async()=>{let hold=false,finish;const app=boot(async url=>{if(hold&&url==='daily-reports/2026-10-04.json')await new Promise(resolve=>{finish=resolve;});return {ok:true,json:async()=>C.clone(url==='daily-reports/index.json'?index:reports[url])};});await app.context.ReportArchive.loadIndex();hold=true;const older=app.context.ReportArchive.select('2026-10-04');assert.equal(app.context.ReportArchive.status().reportDate,null);app.context.exportCSV();assert.equal(app.downloads.length,0);await app.context.ReportArchive.select('2026-10-07');finish();await older;assert.equal(app.context.ReportArchive.status().reportDate,'2026-10-07');app.context.exportCSV();assert.equal(app.downloads[0][0],'dailyreport-2026-10-07.csv');});
test('wrong-session response is excluded from the verified list and cannot be selected or exported',async()=>{const app=boot(async url=>({ok:true,json:async()=>url==='daily-reports/index.json'?C.clone(index):url==='daily-reports/2026-10-07.json'?{...C.clone(reports[url]),date:'2026-10-01'}:C.clone(reports[url])}));await app.context.ReportArchive.loadIndex();assert.equal(app.context.ReportArchive.status().reportDate,'2026-10-06');await app.context.ReportArchive.select('2026-10-07');assert.equal(app.context.ReportArchive.status().reportDate,null);assert.match(app.context.ReportArchive.status().error,/غير موجود/);app.context.exportCSV();assert.equal(app.downloads.length,0);});


test('switching from a slow weekly index back to daily cannot restore the older selection',async()=>{const periods=require('../period-reports/index.json');let calls=0,release;const app=boot(async url=>{if(url==='period-reports/index.json'){if(++calls===1)await new Promise(resolve=>release=resolve);return {ok:true,json:async()=>C.clone(periods)};}return {ok:true,json:async()=>C.clone(url==='daily-reports/index.json'?index:reports[url]||JSON.parse(fs.readFileSync(url,'utf8')))};});await app.context.ReportArchive.loadIndex();const older=app.context.ReportArchive.selectPeriod('weekly');await app.context.ReportArchive.selectPeriod('daily');release();await older;assert.equal(app.context.ReportArchive.status().kind,'daily');assert.equal(app.context.ReportArchive.status().selectedDate,'2026-10-07');assert.equal(app.context.ReportArchive.status().reportDate,'2026-10-07');});

test('period portfolio movers render known amounts without inventing missing percentages or quantities',()=>{const {context}=boot();const report={...require('../period-reports/weekly/2026-09-27.json'),kind:'weekly'};const html=context.LegacyReportLayout.top(report,{delta:null,pct:null,label:'حدود التقييم ناقصة',rows:[{ticker:'ETEL',qty:10,amount:25,pct:null},{ticker:'CMS',qty:5,amount:-3,pct:null},{ticker:'ORHD',qty:20,amount:null,pct:null}]});assert.match(html,/\+25\.00 ج/);assert.match(html,/-3\.00 ج/);assert.match(html,/ETEL - 10 سهم/);assert.match(html,/غير متاح/);assert.doesNotMatch(html,/NaN|undefined|Infinity|ORHD -/);});

test('a weekly report inside the daily index is never selectable as a daily session',async()=>{
 const periods=require('../period-reports/index.json');
 const app=boot(async url=>({ok:true,json:async()=>url==='daily-reports/index.json'?{...C.clone(index),reports:[C.clone(index.reports.find(row=>row.date==='2026-10-07')),C.clone(periods.reports.at(-2))]}:C.clone(reports[url]||JSON.parse(fs.readFileSync(url,'utf8')))}));
 await app.context.ReportArchive.loadIndex();
 assert.equal(app.context.ReportArchive.context().kind,'daily');
 assert.equal(app.context.ReportArchive.context().date,'2026-10-07');
 await app.context.ReportArchive.select('2026-10-04');assert.equal(app.context.ReportArchive.context(),null);assert.match(app.context.ReportArchive.status().error,/غير موجود/);
});

test('switching report periods replaces stale template content with loading and blocks advisor context',async()=>{
 let release;const app=boot(async url=>{if(url==='period-reports/index.json')await new Promise(resolve=>release=resolve);return {ok:true,json:async()=>C.clone(url==='daily-reports/index.json'?index:reports[url]||JSON.parse(fs.readFileSync(url,'utf8')))};});
 await app.context.ReportArchive.loadIndex();
 const waiting=app.context.ReportArchive.selectPeriod('weekly');
 assert.equal(app.context.ReportArchive.context(),null);
 const html=app.context.dailyView();assert.match(html,/جار تحميل التقرير المختار/);assert.doesNotMatch(html,/OLD_UNRELATED_REPORT|2026-10-08/);
 release();await waiting;assert.equal(app.context.ReportArchive.context().kind,'weekly');
});

test('advisor context follows selected period and asset filter without unrelated market sections',async()=>{
 const app=boot();await app.context.ReportArchive.loadIndex();await app.context.ReportArchive.selectPeriod('weekly');
 let data=app.context.ReportArchive.context();assert.equal(data.kind,'weekly');assert.equal(data.period_start,'2026-10-04');assert.equal(data.period_end,'2026-10-08');
 assert.ok(data.stocks.length>0);assert.ok(JSON.stringify(data).length<40000);
 app.filter('gold');data=app.context.ReportArchive.context();assert.equal(data.filter,'gold');assert.equal(data.stocks.length,0);assert.equal(data.indices,undefined);assert.ok(data.funds.every(q=>q.code==='AZG'||q.type==='gold_bullion'));assert.equal(data.session_analysis,undefined);
 assert.ok(Object.keys(data.fx_gold).every(key=>/gold|xau/i.test(key)));
 app.filter('usd');data=app.context.ReportArchive.context();assert.ok(Object.keys(data.fx_gold).every(key=>!/gold|xau/i.test(key)));
 app.filter('funds');data=app.context.ReportArchive.context();assert.ok(data.funds.length>0);assert.equal(Object.keys(data.fx_gold).length,0);assert.equal(data.stocks.length,0);
});

test('visible archive contains exactly the four previous-week trading days and one weekly summary',async()=>{
 const app=boot();await app.context.ReportArchive.loadIndex();
 assert.deepEqual(Array.from(app.context.ReportArchive.status().dates),['2026-10-04','2026-10-05','2026-10-06','2026-10-07']);
 assert.equal(app.context.ReportArchive.status().reportDate,'2026-10-07');
 const html=app.context.dailyView();assert.match(html,/SMA20|صناديق الذهب/);assert.doesNotMatch(html,/data-report-kind=\\"monthly|OLD_UNRELATED_REPORT/);
 for(const date of ['2026-10-01','2026-10-08']){await app.context.ReportArchive.select(date);assert.equal(app.context.ReportArchive.context(),null);}
 await app.context.ReportArchive.selectPeriod('weekly');assert.deepEqual(Array.from(app.context.ReportArchive.status().dates),['2026-10-04']);
 assert.equal(app.context.ReportArchive.context().period_start,'2026-10-04');
 await app.context.ReportArchive.selectPeriod('monthly');assert.equal(app.context.ReportArchive.status().kind,'weekly');
});

test('first visible day retains its actual prior close internally without exposing an older report button',async()=>{
 const calls=[];const app=boot(async url=>{calls.push(url);return {ok:true,json:async()=>C.clone(url==='daily-reports/index.json'?index:reports[url]||JSON.parse(fs.readFileSync(url,'utf8')))};});
 await app.context.ReportArchive.loadIndex();await app.context.ReportArchive.select('2026-10-04');
 assert.ok(calls.includes('daily-reports/2026-10-01.json'));assert.equal(app.context.ReportArchive.status().dates.includes('2026-10-01'),false);
 assert.equal(app.context.ReportArchive.context().date,'2026-10-04');
});
