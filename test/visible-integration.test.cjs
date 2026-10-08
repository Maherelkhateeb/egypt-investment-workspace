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
 assert.match(s,/box\.innerHTML!==next/);
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

test('deployed shell loads fresh integration layers and Groq newsletter fallback',()=>{
 const s=read('scripts/stage-pages.cjs');
 assert.match(s,/news-notifications-ui\.js\?v=1\.4\.0/);
 assert.match(s,/estimated-investment-cost\.js\?v=1\.3\.0/);
 assert.match(s,/runtime-integrity\.js\?v=1\.1\.0/);
 assert.match(s,/ai-view\.js\?v=2\.7\.0/);
 assert.match(s,/data-ai-provider="groq"/);
 assert.match(s,/Groq · GPT-OSS 120B/);
 assert.match(s,/app-build.*2026-10-08-r8/);
});

test('visible report copy and market wording match actual dated-data policy',()=>{
 const s=read('runtime-integrity.js');
 assert.match(s,/الأسبوعي بعد إغلاق الخميس 16:00 بتوقيت القاهرة/);
 assert.match(s,/الأسعار والمؤشرات.*لقطات مؤرخة/);
 assert.doesNotMatch(s,/البورصة المصرية: أسعار حية 100%.*البورصة المصرية: أسعار حية 100%/);
});

test('unbound legacy financial numbers are replaced by verified market or portfolio data',()=>{
 const s=read('runtime-integrity.js');
 for(const id of ['p_thndr_stocks_card','p_thndr_funds_card','stocksSubtotalBadge','fundsSubtotalBadge','macroEgx30Val','macroEgx33Val','matrix-price-CMS','matrix-price-AZG'])assert.match(s,new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(s,/fetch\('market\.json'/);
 assert.match(s,/InvestCore/);
 assert.match(s,/لا تعرض هذه الخانة رقمًا قديمًا من القالب/);
});

test('report creation policy itself remains gated by Cairo close and Thursday week end',()=>{
 const daily=read('scripts/generate-daily-report.mjs'),availability=read('report-availability.js'),period=read('scripts/generate-period-reports.mjs');
 assert.match(daily,/today\+'T16:00:00'/);
 assert.match(availability,/end\.setUTCDate\(end\.getUTCDate\(\)\+4\)/);
 assert.match(availability,/return meta\.date\+'T16:00:00'/);
 assert.match(period,/Calendar\.add\(start,4\)/);
});
