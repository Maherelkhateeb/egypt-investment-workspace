import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const LIVE_FILE='live-prices.json';
const BANK_PAGE='https://ta3weem.com/ar/banks/banque-misr-bm';
const LOCAL_GOLD_PAGE='https://realegp.com/gold/21k';
const SPOT_PAGE='https://gold-api.com/';
const SPOT_API='https://api.gold-api.com/price/XAU';
const CAIRO='Africa/Cairo';
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const round=(v,d=4)=>positive(v)?Number(v.toFixed(d)):null;

function text(html){
 return String(html)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function numberIn(value){
 const match=text(value).replace(/,/g,'').match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
 const result=match?Number(match[1]):NaN;
 return positive(result)?result:null;
}
function offsetMinutes(date,timeZone){
 const label=new Intl.DateTimeFormat('en-US',{timeZone,timeZoneName:'shortOffset'}).formatToParts(date).find(p=>p.type==='timeZoneName')?.value||'GMT';
 const match=label.match(/^GMT(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/);
 if(!match)return 0;
 const sign=match[1]==='-'?-1:1;
 return sign*(Number(match[2]||0)*60+Number(match[3]||0));
}
function localDateTimeToUtc(year,month,day,hour,minute,timeZone){
 const wall=Date.UTC(year,month-1,day,hour,minute);
 let result=new Date(wall);
 for(let i=0;i<3;i++)result=new Date(wall-offsetMinutes(result,timeZone)*60000);
 if(Number.isNaN(result.getTime()))throw Error('invalid_source_timestamp');
 return result;
}
function cairoDate(date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:CAIRO,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return `${values.year}-${values.month}-${values.day}`;
}
function freshness(date,maxAgeMs,now){
 const time=date.getTime();
 if(!Number.isFinite(time)||time>now.getTime()+5*60*1000)throw Error('invalid_source_timestamp');
 return now.getTime()-time<=maxAgeMs?'fresh':'stale';
}
function parseTa3weem(html,now){
 let matchedRow=null;
 for(const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  if(/href=["']https:\/\/ta3weem\.com\/ar\/currency-exchange-rates\/USD-EGP(?:["?#])/i.test(match[1])){matchedRow=match[1];break;}
 }
 if(!matchedRow)throw Error('bank_misr_usd_row_missing');
 const cells=[...matchedRow.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match=>text(match[1]));
 if(cells.length<4)throw Error('bank_misr_usd_cells_missing');
 const buy=numberIn(cells[1]),sell=numberIn(cells[2]);
 if(!positive(buy)||!positive(sell)||sell<buy||sell-buy>buy*.1)throw Error('bank_misr_usd_values_invalid');
 let stamp=cells[3].match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
 if(!stamp){
  const reversed=cells[3].match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if(reversed)stamp=[reversed[0],reversed[4],reversed[5],reversed[1],reversed[2],reversed[3]];
 }
 if(!stamp)throw Error('bank_misr_usd_timestamp_missing');
 const observedAt=localDateTimeToUtc(Number(stamp[5]),Number(stamp[4]),Number(stamp[3]),Number(stamp[1]),Number(stamp[2]),CAIRO);
 const status=freshness(observedAt,36*60*60*1000,now);
 return {buy,sell,average:Number(((buy+sell)/2).toFixed(5)),observedAt:observedAt.toISOString(),sessionDate:cairoDate(observedAt),status};
}
function labelledPrice(html,label){
 const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=String(html).match(new RegExp(`<h2\\b[^>]*>\\s*${escaped}\\s*<\\/h2>[\\s\\S]{0,500}?<span\\b[^>]*>([^<]+)<\\/span>`,'i'));
 const value=numberIn(match?.[1]||'');
 if(!positive(value))throw Error('real_egp_'+(label==='متوسط السعر'?'average':label==='سعر البيع'?'sell':'buy')+'_missing');
 return value;
}
function parseRealEgp(html,now){
 const dateTime=String(html).match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1];
 if(!dateTime)throw Error('real_egp_timestamp_missing');
 const normalized=dateTime.replace(/\s+EET$/i,'+02:00').replace(/\s+EEST$/i,'+03:00');
 const observedAt=new Date(normalized);
 if(Number.isNaN(observedAt.getTime()))throw Error('real_egp_timestamp_invalid');
 const sell=labelledPrice(html,'سعر البيع');
 const average=labelledPrice(html,'متوسط السعر');
 const buy=labelledPrice(html,'سعر الشراء');
 if(average<Math.min(buy,sell)||average>Math.max(buy,sell)||Math.abs(buy-sell)>average*.1)throw Error('real_egp_21k_values_invalid');
 const status=freshness(observedAt,24*60*60*1000,now);
 return {buy,sell,average,observedAt:observedAt.toISOString(),sessionDate:cairoDate(observedAt),status};
}
function parseSpot(payload,now){
 const price=Number(payload?.price),observedAt=new Date(payload?.updatedAt||'');
 if(!positive(price)||Number.isNaN(observedAt.getTime()))throw Error('global_spot_payload_invalid');
 const status=freshness(observedAt,3*60*60*1000,now);
 return {price:round(price,4),observedAt:observedAt.toISOString(),sessionDate:cairoDate(observedAt),status};
}
async function get(url,accept){
 const response=await fetch(url,{headers:{'User-Agent':'egypt-investment-workspace/1.0','Accept':accept},redirect:'follow',signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!response.ok)throw Error('http_'+response.status);
 return response;
}
function errorCode(error){
 const message=String(error?.message||'');
 return /^http_\d{3}$/.test(message)?message:/^[a-z0-9_]+$/i.test(message)?message:'source_fetch_failed';
}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function setSource(next,id,meta,record){
 next.sources[id]={name:meta.name,url:meta.url,status:record.status,observed_at:record.observed_at,last_successful_at:record.observed_at};
 next.fx_gold[id]=record;
}
function failSource(next,id,meta,error){
 const old=next.sources[id]||{};
 next.sources[id]={name:meta.name,url:meta.url,status:'error',observed_at:old.observed_at||null,last_successful_at:old.last_successful_at||null,error_code:errorCode(error)};
 if(next.fx_gold[id])next.fx_gold[id]={...next.fx_gold[id],status:'error'};
 console.warn(`${id} source refresh failed: ${errorCode(error)}`);
}

async function main(){
 const now=new Date(),checkedAt=now.toISOString();
 let previous={schema:1,sources:{},fx_gold:{}};
 try{previous=JSON.parse(fs.readFileSync(LIVE_FILE,'utf8'));}catch{}
 const next={...previous,schema:1,sources:{...(previous.sources||{})},fx_gold:{...(previous.fx_gold||{})}};
 const tasks=[
  ['usd_egp',{name:'Ta3weem — بنك مصر',url:BANK_PAGE},async()=>{
   const data=parseTa3weem(await (await get(BANK_PAGE,'text/html')).text(),now);
   return {name:'الدولار — بنك مصر (متوسط مرجعي)',close:data.average,buy:data.buy,sell:data.sell,average:data.average,unit:'ج / دولار',source:BANK_PAGE,provider:'Ta3weem / Banque Misr',observed_at:data.observedAt,session_date:data.sessionDate,status:data.status,verification:'bank_misr_published_buy_sell_average',note:'متوسط سعر الشراء والبيع لدى بنك مصر؛ راجع السعرين المنفصلين قبل تنفيذ الصرف.'};
  }],
  ['gold_21k_local',{name:'RealEGP — الذهب عيار 21',url:LOCAL_GOLD_PAGE},async()=>{
   const data=parseRealEgp(await (await get(LOCAL_GOLD_PAGE,'text/html')).text(),now);
   return {name:'الذهب عيار 21 — متوسط RealEGP',close:data.average,buy:data.buy,sell:data.sell,average:data.average,unit:'ج / غرام',source:LOCAL_GOLD_PAGE,provider:'RealEGP',observed_at:data.observedAt,session_date:data.sessionDate,status:data.status,verification:'realegp_local_21k_buy_sell_average',note:'استخدم المتوسط المرجعي للآلة الحاسبة؛ لا يشمل المصنعية أو الدمغة. تسميات الشراء والبيع محفوظة كما يعرضها المصدر.'};
  }],
  ['xau_usd_ounce',{name:'Gold-API.com — الذهب العالمي',url:SPOT_PAGE},async()=>{
   const data=parseSpot(await (await get(SPOT_API,'application/json')).json(),now);
   return {name:'سعر الذهب العالمي الفوري',close:data.price,unit:'دولار / أونصة تروي',source:SPOT_PAGE,api_url:SPOT_API,provider:'Gold-API.com',observed_at:data.observedAt,session_date:data.sessionDate,status:data.status,verification:'live_global_spot_reference'};
  }]
 ];
 await Promise.all(tasks.map(async([id,meta,load])=>{
  try{setSource(next,id,meta,await load());}
  catch(error){failSource(next,id,meta,error);}
 }));

 const usd=next.fx_gold.usd_egp,spot=next.fx_gold.xau_usd_ounce;
 if(usd&&spot&&positive(usd.close)&&positive(spot.close)){
  const observedAt=new Date(Math.min(Date.parse(usd.observed_at),Date.parse(spot.observed_at))).toISOString();
  const grams=(karat)=>Number((spot.close*usd.close/31.1034768*karat/24).toFixed(5));
  const status=usd.status==='fresh'&&spot.status==='fresh'?'fresh':'stale';
  next.fx_gold.gold_24k_local={name:'مكافئ عالمي استرشادي لجرام الذهب عيار 24',close:grams(24),unit:'ج / غرام — مكافئ مرجعي',source:SPOT_PAGE,provider:'حساب مرجعي من Gold-API وTa3weem',observed_at:observedAt,session_date:cairoDate(new Date(observedAt)),status,verification:'calculated_global_spot_reference',calc:'XAU USD/troy ounce × Bank Misr USD/EGP midpoint ÷ 31.1034768 × karat/24',inputs:{xau_usd_ounce:spot.close,usd_egp_mid:usd.close,usd_source:BANK_PAGE,spot_source:SPOT_API},note:'مكافئ عالمي استرشادي فقط؛ سعر عيار 21 المحلي المباشر مأخوذ من RealEGP، ولا يشمل هذا المكافئ فرق السوق أو المصنعية.'};
 }
 const observed=Object.values(next.sources).map(s=>Date.parse(s.observed_at||'')).filter(Number.isFinite);
 next.updated_at=observed.length?new Date(Math.max(...observed)).toISOString():previous.updated_at||null;
 const statuses=tasks.map(([id])=>next.sources[id]?.status||'unavailable');
 next.status=statuses.every(s=>s==='fresh')?'fresh':statuses.some(s=>s==='fresh'||s==='stale')?'partial':'unavailable';
 if(!same(previous,next))fs.writeFileSync(LIVE_FILE,JSON.stringify(next,null,2)+'\n');
 console.log(JSON.stringify({status:next.status,checked_at:checkedAt,sources:Object.fromEntries(tasks.map(([id])=>[id,{status:next.sources[id]?.status,observed_at:next.sources[id]?.observed_at,error_code:next.sources[id]?.error_code||null}]))}));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
