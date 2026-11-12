import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const marketFile='market.json';
const CBE_PAGE='https://www.cbe.org.eg/en/economic-research/statistics/cbe-exchange-rates';
const GOLD_PAGE='https://gold-api.com/';
const CBE_MIRROR='https://raw.githubusercontent.com/AllRates-Today/central-bank-exchange-rates/main/data/cbe/latest.json';
const GOLD_API='https://api.gold-api.com/price/XAU';
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const dateInZone=(value,timeZone)=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
const strip=s=>String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const numeric=s=>{const m=String(s).replace(/,/g,'').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):null;};
async function get(url,accept){const r=await fetch(url,{headers:{'User-Agent':'egypt-investment-workspace/1.0','Accept':accept},redirect:'error',signal:AbortSignal.timeout(20000),cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status+' from '+new URL(url).hostname);return r;}
function parseCbe(html){
 const plain=strip(html);
 const dm=plain.match(/Rates\s+for\s+Date\s*:\s*(\d{1,2})[/.](\d{1,2})[/.](\d{4})/i);
 if(!dm)throw Error('CBE publication date not found');
 const sessionDate=dm[3]+'-'+dm[2].padStart(2,'0')+'-'+dm[1].padStart(2,'0');
 let buy=null,sell=null;
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  if(!/US\s*Dollar/i.test(strip(row[1])))continue;
  const cells=[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>strip(m[1]));
  const at=cells.findIndex(c=>/US\s*Dollar/i.test(c));
  const values=(at>=0?cells.slice(at+1):cells.join(' ').match(/\d[\d,.]*/g)||[]).map(numeric).filter(positive);
  if(values.length>=2){[buy,sell]=values;break;}
 }
 if(!positive(buy)||!positive(sell)){
  const line=plain.match(/US\s*Dollar.{0,100}/i)?.[0]||'';
  const values=(line.match(/\d[\d,.]*/g)||[]).map(numeric).filter(positive);
  if(values.length>=2)[buy,sell]=values;
 }
 if(!positive(buy)||!positive(sell)||sell<buy)throw Error('CBE USD buy/sell row could not be validated');
 const parsed=Date.parse(sessionDate+'T00:00:00Z'),today=Date.now();
 if(!Number.isFinite(parsed)||parsed>today+86400000||today-parsed>7*86400000)throw Error('CBE rate date is invalid or stale');
 return {sessionDate,buy,sell};
}
function parseCbeMirror(payload){
 if(payload?.source!=='cbe'||payload?.name!=='Central Bank of Egypt'||!Array.isArray(payload?.rates))throw Error('CBE mirror payload is invalid');
 const buy=Number(payload.rates.find(x=>x.base==='USD'&&x.quote==='EGP'&&x.type==='buy')?.value);
 const sell=Number(payload.rates.find(x=>x.base==='USD'&&x.quote==='EGP'&&x.type==='sell')?.value);
 const sessionDate=String(payload.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)||!positive(buy)||!positive(sell)||sell<buy)throw Error('CBE mirror USD rates are invalid');
 const parsed=Date.parse(sessionDate+'T00:00:00Z'),today=Date.now();
 if(!Number.isFinite(parsed)||parsed>today+86400000||today-parsed>7*86400000)throw Error('CBE mirror rate date is invalid or stale');
 return {sessionDate,buy,sell};
}
async function main(){
 const market=JSON.parse(fs.readFileSync(marketFile,'utf8'));
 const now=new Date(),checkedAt=now.toISOString();
 let fx,fxVia='official_cbe_page';
 try{
  const cbeResponse=await get(CBE_PAGE,'text/html');
  fx=parseCbe(await cbeResponse.text());
 }catch(primaryError){
  console.warn('Official CBE page could not be parsed; trying dated CBE mirror:',primaryError.message);
  const mirrorResponse=await get(CBE_MIRROR,'application/json');
  fx=parseCbeMirror(await mirrorResponse.json());
  fxVia='cbe_official_data_mirror';
 }
 const goldResponse=await get(GOLD_API,'application/json');
 const payload=await goldResponse.json();
 const xau=Number(payload?.price),goldObserved=new Date(payload?.updatedAt||'');
 if(!positive(xau)||Number.isNaN(goldObserved.getTime()))throw Error('Gold-API.com spot payload is invalid');
 if(Number.isNaN(goldObserved.getTime())||goldObserved>new Date(Date.now()+5*60*1000)||Date.now()-goldObserved.getTime()>5*86400000)throw Error('Gold-API.com spot timestamp is invalid or stale');
 const goldDate=dateInZone(goldObserved,'America/New_York');
 const midpoint=Number(((fx.buy+fx.sell)/2).toFixed(6));
 const fxRecord={name:'الدولار الرسمي — البنك المركزي المصري',close:midpoint,buy:fx.buy,sell:fx.sell,session_date:fx.sessionDate,observed_at:checkedAt,unit:'ج / دولار',source:CBE_PAGE,verification:fxVia,rate_type:'CBE official dated buying/selling rates; midpoint shown as reference',mirror:fxVia==='cbe_official_data_mirror'?{name:'AllRatesToday mirror',url:CBE_MIRROR,license:'CC BY-NC 4.0'}:undefined};
 const xauRecord={name:'سعر الذهب العالمي الفوري — Gold-API.com',close:Number(xau.toFixed(4)),session_date:goldDate,observed_at:goldObserved.toISOString(),unit:'دولار / أونصة تروي',source:GOLD_PAGE,api_url:GOLD_API,verification:'live_global_spot_reference'};
 const gram=(karat)=>Number((xau*midpoint/31.1034768*karat/24).toFixed(5));
 const goldRecord=(karat)=>({name:'مكافئ عالمي استرشادي لجرام الذهب عيار '+karat,close:gram(karat),session_date:goldDate,observed_at:goldObserved.toISOString(),unit:'ج / غرام — مكافئ مرجعي',source:GOLD_PAGE,api_url:GOLD_API,fx_source:CBE_PAGE,fx_session_date:fx.sessionDate,verification:'calculated_global_spot_reference',calc:'XAU USD/troy ounce × CBE USD/EGP midpoint ÷ 31.1034768 × karat/24',inputs:{xau_usd_ounce:xau,usd_egp_mid:midpoint,fx_date:fx.sessionDate},note:'مكافئ عالمي استرشادي، وليس سعر بيع محلياً؛ لا يشمل فرق السوق أو المصنعية.'});
 market.fx_gold={...(market.fx_gold||{}),usd_egp:fxRecord,xau_usd_ounce:xauRecord,gold_24k_local:goldRecord(24),gold_21k_local:goldRecord(21)};
 market.quotes_updated_at=checkedAt;
 market.quote_sources={fx:{name:'البنك المركزي المصري',url:CBE_PAGE,session_date:fx.sessionDate,checked_at:checkedAt,delivery:fxVia==='cbe_official_data_mirror'?'mirror':'direct',mirror_url:fxVia==='cbe_official_data_mirror'?CBE_MIRROR:undefined},gold:{name:'GoldPrice.org',url:GOLD_PAGE,observed_at:goldObserved.toISOString(),checked_at:checkedAt}};
 fs.writeFileSync(marketFile,JSON.stringify(market,null,2)+'\n');
 console.log(JSON.stringify({quotes_updated_at:checkedAt,fx_date:fx.sessionDate,gold_observed_at:goldObserved.toISOString(),usd_egp_mid:midpoint,xau_usd_ounce:xau,gold_21k_egp_per_gram:gram(21)}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
