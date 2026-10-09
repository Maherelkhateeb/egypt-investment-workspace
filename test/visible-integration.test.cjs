const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');

test('notifications integrate with the legacy news UI the user actually sees',()=>{
 const s=read('news-notifications-ui.js');
 assert.match(s,/newsSubTabStocksBtn/);
 assert.match(s,/newsSubTabFundsBtn/);
 assert.match(s,/newsSubTabNoticesBtn/);
 assert.match(s,/newsSubViewNotices/);
 assert.match(s,/category==='notice'/);
 assert.match(s,/calendarNotices/);
 assert.match(s,/confirmed===true/);
 assert.match(s,/market-calendar\.json/);
 assert.doesNotMatch(s,/querySelector\('#assetFilter'\)/);
});

test('estimated 0.7 percent cost attaches to visible legacy portfolio and stays informational',()=>{
 const s=read('estimated-investment-cost.js');
 assert.match(s,/RATE=0\.007/);
 assert.match(s,/liveUpdateBadge/);
 assert.match(s,/صافي أرصدتها كما هي/);
 assert.match(s,/لا تُخصم مرة أخرى/);
 assert.match(s,/state\.importMeta/);
 assert.match(s,/&quot;/);
});

test('source shell directly loads active integrations and Groq chat with explicit cache versions',()=>{
 const html=read('index.html');
 for(const file of ['ai-view','estimated-investment-cost','news-notifications-ui'])assert.match(html,new RegExp(file+'\\.js\\?v=2\\.9\\.0'));
 assert.match(read('ai-view.js'),/data-ai-provider="groq"/);
 assert.match(read('ai-view.js'),/data-chat-provider="groq"/);
 assert.match(html,/app-build.*2026-10-09-r10/);
 assert.doesNotMatch(html,/runtime-integrity/);
});

test('dated market wording and missing-data policy are defined in the active source',()=>{
 const templates=read('legacy-templates.js'),adapter=read('legacy-adapter.js');
 assert.match(templates+read('daily-report-view.js'),/الأسبوعي بعد إغلاق الخميس 16:00 بتوقيت القاهرة/);
 assert.match(adapter,/الأسعار والمؤشرات.*لقطات مؤرخة/);
 assert.doesNotMatch(templates,/أسعار حية 100%|نبض جلسة التداول اللحظي/);
 for(const id of ['p_thndr_stocks_card','stocksSubtotalBadge','macroEgx30','matrix-price-'])assert.ok(adapter.includes(id.replace('stocksSubtotalBadge','SubtotalBadge'))||templates.includes(id));
});

test('report creation policy itself remains gated by Cairo close and Thursday week end',()=>{
 const daily=read('scripts/generate-daily-report.mjs'),availability=read('report-availability.js'),period=read('scripts/generate-period-reports.mjs');
 assert.match(daily,/today\+'T16:00:00'/);
 assert.match(availability,/end\.setUTCDate\(end\.getUTCDate\(\)\+4\)/);
 assert.match(availability,/return meta\.date\+'T16:00:00'/);
 assert.match(period,/Calendar\.add\(start,4\)/);
});
