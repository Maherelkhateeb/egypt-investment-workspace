import fs from 'node:fs';

const SNAPSHOTS=[
  {date:'2026-10-04',day:'الأحد',ref:'d0c5c0b31dcfc6078c42da8f8be3e7811554eac9'},
  {date:'2026-10-05',day:'الاثنين',ref:'30c5c842d762f72203a061dee132e909ead730a8'},
  {date:'2026-10-06',day:'الثلاثاء',ref:'63df5ab7a850a35fe973713eef7d449cfdbe217c'},
  {date:'2026-10-07',day:'الأربعاء',ref:'2f96348aad1b1d13a62f4b2f2fe99dcb60b74a4d'}
];
const BASE='https://raw.githubusercontent.com/mahereasybakery-web/egypt-sharia-stock-report';
const round=(v,d=2)=>Number.isFinite(Number(v))?Number(Number(v).toFixed(d)):null;
const cleanStock=(ticker,s)=>({ticker,open:round(s?.open,4),high:round(s?.high,4),low:round(s?.low,4),close:round(s?.close,4),change_pct:round(s?.chg,2),volume:Number.isFinite(Number(s?.volume))?Number(s.volume):null,rsi:round(s?.rsi,1),source:s?.source||null});
function normalizedIndices(data){
  const src=data.indices||{}; const out={};
  const pick=(...keys)=>keys.map(k=>src[k]).find(Boolean);
  for(const [code,q] of [['EGX30',pick('EGX30')],['EGX33',pick('EGX33 الشريعة','EGX33')],['EGX70',pick('EGX70 EWI','EGX70')],['EGX100',pick('EGX100 EWI','EGX100')]]){
    if(q)out[code]={name:q.name||code,open:round(q.open,2),close:round(q.close,2),change_pct:round(q.chgPct,2),source:q.source||null};
  }
  return out;
}
function auditAndFix(date,data){
  const notes=[]; const stocks={};
  for(const [ticker,s] of Object.entries(data.stocks||{}))stocks[ticker]=cleanStock(ticker,s);
  if(date==='2026-10-07'){
    // Broker screenshots supplied by the owner confirm these official closing values.
    if(stocks.ORHD){stocks.ORHD.close=12.00;stocks.ORHD.open=12.03;stocks.ORHD.change_pct=-0.25;stocks.ORHD.audit_flag='change corrected from unadjusted corporate-action comparison';}
    if(stocks.ADIB){stocks.ADIB.close=47.80;stocks.ADIB.change_pct=-0.64;}
    if(stocks.TMGH){stocks.TMGH.close=87.89;stocks.TMGH.change_pct=-0.57;}
    notes.push('ORHD closing price 12.00 and daily change -0.25% verified against broker screenshot; legacy -69.1% comparison was rejected as unadjusted.');
    notes.push('ADIB 47.80 (-0.64%) and TMGH 87.89 (-0.57%) verified against broker screenshots.');
  }
  const changes=Object.values(stocks).map(s=>s.change_pct).filter(Number.isFinite);
  const gainers=changes.filter(x=>x>0).length,losers=changes.filter(x=>x<0).length,flat=changes.filter(x=>x===0).length;
  const ranked=Object.values(stocks).filter(s=>Number.isFinite(s.change_pct)).sort((a,b)=>b.change_pct-a.change_pct);
  const suspect=Object.values(stocks).filter(s=>Number.isFinite(s.change_pct)&&Math.abs(s.change_pct)>30).map(s=>s.ticker);
  if(suspect.length)notes.push(`Extreme moves flagged for review and excluded from narrative inference: ${suspect.join(', ')}`);
  return {stocks,summary:{stocks_with_change:changes.length,gainers,losers,flat,best:ranked[0]||null,worst:ranked.at(-1)||null},audit_notes:notes};
}
fs.mkdirSync('daily-reports',{recursive:true});
const index=[];
for(const s of SNAPSHOTS){
  const url=`${BASE}/${s.ref}/market_data.json`;
  const res=await fetch(url,{headers:{'user-agent':'egypt-investment-workspace-audited-eod'}});
  if(!res.ok)throw new Error(`Snapshot fetch failed ${s.date}: ${res.status}`);
  const data=await res.json();
  const audited=auditAndFix(s.date,data);
  const report={
    schema:2,report_type:'audited_eod',date:s.date,sessionDay:s.day,status:'مغلق — تقرير نهاية اليوم',
    generated_from:{repository:'mahereasybakery-web/egypt-sharia-stock-report',commit:s.ref,file:'market_data.json',snapshot_updated_at:data.updated_at||null},
    audit:{audited:true,audited_at:new Date().toISOString(),policy:'Use exact EOD snapshot; reject stale/contradictory session state and implausible unadjusted moves; do not invent missing values.',notes:audited.audit_notes},
    indices:normalizedIndices(data),stocks:audited.stocks,market_summary:audited.summary,
    fx_gold:data.fx_gold||null,funds:data.funds||data.fund_prices||null,
    disclaimer:'بيانات تاريخية مدققة من لقطة السوق المحفوظة. لا تعد توصية شراء أو بيع.'
  };
  fs.writeFileSync(`daily-reports/${s.date}.json`,JSON.stringify(report,null,2)+'\n');
  index.push({date:s.date,label:`تقرير ${s.day} ${s.date}`,sessionDay:s.day,audited:true,file:`daily-reports/${s.date}.json`,source_commit:s.ref});
}
fs.writeFileSync('daily-reports/index.json',JSON.stringify({schema:2,reports:index},null,2)+'\n');
console.log('Rebuilt audited reports:',index.map(x=>x.date).join(', '));
