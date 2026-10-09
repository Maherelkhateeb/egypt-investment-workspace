const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../report-availability.js');
test('the report window is the last closed Sunday–Thursday week, including Friday and the following Sunday',()=>{
 for(const now of ['2026-10-09T07:00:00Z','2026-10-11T12:00:00Z','2026-10-15T12:59:59Z'])assert.deepEqual(A.previousWeek(now),{start:'2026-10-04',end:'2026-10-08'});
 assert.deepEqual(A.previousWeek('2026-10-15T13:00:00Z'),{start:'2026-10-11',end:'2026-10-15'});
 assert.deepEqual(A.previousWeek('2026-11-05T13:59:59Z'),{start:'2026-10-25',end:'2026-10-29'});
 assert.deepEqual(A.previousWeek('2026-11-05T14:00:00Z'),{start:'2026-11-01',end:'2026-11-05'});
 assert.equal(A.previousWeek(null),null);
});
test('old sessions, monthly reports, holidays and empty reports are hidden even when valid archive files exist',()=>{
 const now='2026-10-09T07:00:00Z';
 assert.equal(A.inPreviousWeek({kind:'daily',date:'2026-10-01'},now),false);
 assert.equal(A.inPreviousWeek({kind:'monthly',id:'2026-09',date:'2026-09-30'},now),false);
 assert.equal(A.inPreviousWeek({kind:'daily',date:'2026-10-08',report_type:'non_trading_day'},now),false);
 assert.equal(A.inPreviousWeek({kind:'weekly',id:'2026-10-04',date:'2026-10-08'},now),true);
 assert.equal(A.hasContent({stocks:{},indices:{},funds:[]}),false);
 assert.equal(A.hasContent({stocks:{X:{close:0}},indices:{}}),false);
});
function daily(overrides={}){return {id:'2026-10-08',date:'2026-10-08',kind:'daily',generated_at:'2026-10-08T13:05:00Z',report_type:'reviewed_eod',audit:{audited:true},...overrides};}
function eligible(report,now){return A.eligible(A.metadata(report,report.kind==='daily'?'daily-reports/'+report.date+'.json':report.kind==='weekly'?'period-reports/weekly/'+report.id+'.json':'period-reports/monthly/'+report.id+'.json'),report,new Date(now));}
test('daily close is hidden until 16:00 Cairo and until its file was actually created',()=>{const r=daily();assert.equal(eligible(r,'2026-10-08T12:59:59Z'),false);assert.equal(eligible(r,'2026-10-08T13:04:59Z'),false);assert.equal(eligible(r,'2026-10-08T13:05:00Z'),true);});
test('a draft generated before close never becomes a final report merely as time passes',()=>{assert.equal(eligible(daily({generated_at:'2026-10-08T12:00:00Z'}),'2026-10-08T20:00:00Z'),false);assert.equal(eligible(daily({report_type:'pending_session'}),'2026-10-08T20:00:00Z'),false);});
test('Cairo winter offset changes the close boundary correctly',()=>{const r=daily({id:'2026-11-01',date:'2026-11-01',generated_at:'2026-11-01T14:01:00Z'});assert.equal(eligible(r,'2026-11-01T13:59:59Z'),false);assert.equal(eligible(r,'2026-11-01T14:01:00Z'),true);});
test('weekly summary waits for Thursday 16:00 Cairo and actual generation',()=>{const r={id:'2026-10-04',date:'2026-10-08',period_end:'2026-10-08',kind:'weekly',period_final:true,report_type:'weekly_summary',generated_at:'2026-10-08T13:03:00Z',audit:{audited:true},components:[{date:'2026-10-07'}]};assert.equal(eligible(r,'2026-10-08T12:59:59Z'),false);assert.equal(eligible(r,'2026-10-08T13:02:59Z'),false);assert.equal(eligible(r,'2026-10-08T13:03:00Z'),true);assert.equal(eligible({...r,period_final:false},'2026-10-08T18:00:00Z'),false);});
test('monthly summary cannot appear before the month ends',()=>{const r={id:'2026-09',date:'2026-09-30',period_end:'2026-09-30',kind:'monthly',period_final:true,report_type:'monthly_summary',generated_at:'2026-09-30T21:02:00Z',audit:{audited:true},components:[{date:'2026-09-30'}]};assert.equal(eligible(r,'2026-09-30T20:59:59Z'),false);assert.equal(eligible(r,'2026-09-30T21:02:00Z'),true);});
test('an index entry alone, missing file, mismatched timestamp, or unreviewed file cannot publish a report',()=>{const r=daily(),meta=A.metadata(r,'daily-reports/2026-10-08.json'),now=new Date('2026-10-08T14:00:00Z');assert.equal(A.eligible(meta,null,now),false);assert.equal(A.eligible({...meta,generated_at:'2026-10-08T13:06:00Z'},r,now),false);assert.equal(A.eligible(meta,{...r,audit:{audited:false}},now),false);assert.equal(A.eligible({...meta,file:'daily-reports/2026-10-07.json'},r,now),false);assert.equal(A.eligible(meta,r,null),false);});
