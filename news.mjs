export const SOURCES=[{id:'amwal',name:'أموال الغد',url:'https://amwalalghad.com/feed/',site:'https://amwalalghad.com/'},{id:'borsa',name:'جريدة البورصة',url:'https://www.alborsaanews.com/feed',site:'https://www.alborsaanews.com/'},{id:'dne',name:'Daily News Egypt',url:'https://www.dailynewsegypt.com/feed/',site:'https://www.dailynewsegypt.com/'}];
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,h,d)=>{const n=parseInt(h||d,h?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&apos;|&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
const tag=(item,key)=>item.match(new RegExp('<'+key+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+key+'>','i'))?.[1]||'';
function canonical(url){const u=new URL(url);if(u.protocol!=='https:')throw Error('URL must be HTTPS');u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/.test(key))u.searchParams.delete(key);return u.href;}
export function parseFeed(xml,source,now=Date.now()){
 if(xml.length>1200000||/<!ENTITY|<!DOCTYPE[^>]*SYSTEM/i.test(xml))throw Error('Unsafe or oversized feed');
 const items=(xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[]).slice(0,50),result=[];
 for(const item of items){const title=decode(tag(item,'title')).slice(0,300),rawDate=decode(tag(item,'pubDate')||tag(item,'dc:date')),ms=Date.parse(rawDate);let url;
  try{url=canonical(decode(tag(item,'link')));}catch{continue;}
  if(!title||!Number.isFinite(ms)||ms>now+300000)continue;
  result.push({id:url,title,url,published_at:new Date(ms).toISOString(),publisher:source.name,source_id:source.id,kind:'press',basis:'headline',category:classify(title),symbols:matchSymbols(title)});
 }if(!items.length&&!/<rss\b/i.test(xml))throw Error('Not a supported RSS feed');return result;
}
function classify(title){
 // Operational/public notices are deliberately separated from investment news.
 // Keep this rule conservative: only explicit notice/holiday/schedule language is
 // classified as a notification; company actions and market-moving disclosures
 // remain in their normal stock/fund/economy category.
 if(/إشعار|اشعار|تنويه|تنبيه|تذكير|إجازة|اجازة|عطلة|مواعيد العمل|مواعيد التداول|موعد العمل|موعد التداول|مواعيد البورصة|استئناف العمل|ساعات العمل|working hours|holiday|notice|reminder/i.test(title))return'notice';
 if(/صندوق|صناديق|وثائق/.test(title))return'fund';if(/ذهب|Gold/i.test(title))return'gold';if(/بورصة|سهم|أسهم|شركة|شركات|أرباح|ارباح|بنك|bank|stock|shares|company/i.test(title))return'stock';return'economy';
}
function matchSymbols(title){const terms={TMGH:['طلعت مصطفى','Talaat Moustafa'],ORHD:['أوراسكوم للتنمية','Orascom Development'],EFID:['إيديتا','Edita'],ETEL:['المصرية للاتصالات','Telecom Egypt'],EFIH:['إي فاينانس','إى فاينانس','e-finance'],ADIB:['أبوظبي الإسلامي مصر','أبو ظبى الإسلامى'],EGAL:['مصر للألومنيوم','Egypt Aluminum'],OCDI:['سوديك','SODIC']};return Object.entries(terms).filter(([,names])=>names.some(n=>title.toLowerCase().includes(n.toLowerCase()))).map(([t])=>t);}
export function mergeNews(groups){const seen=new Set(),titles=new Map(),result=[];for(const n of groups.flat().sort((a,b)=>b.published_at.localeCompare(a.published_at))){if(seen.has(n.url))continue;seen.add(n.url);const key=n.title.toLowerCase().replace(/[أإآ]/g,'ا').replace(/[\p{P}\p{S}\s]/gu,'');const prior=titles.get(key);if(prior){prior.alternatives.push({publisher:n.publisher,url:n.url});continue;}const item={...n,alternatives:[]};titles.set(key,item);result.push(item);}return result.slice(0,100);}
let cache=null;
export async function getNews(fetcher=fetch,now=Date.now()){
 if(cache&&now-cache.completed_at<300000)return cache.result;
 const responses=await Promise.all(SOURCES.map(async source=>{try{const r=await fetcher(source.url,{headers:{'User-Agent':'EgyptInvestmentWorkspace/1.0 (+personal news reader)','Accept':'application/rss+xml,application/xml,text/xml'},signal:AbortSignal.timeout(9000),redirect:'follow'});if(!r.ok)throw Error('HTTP '+r.status);const reader=r.body.getReader();let total=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;if(total+value.byteLength>1200000){await reader.cancel();break;}total+=value.byteLength;parts.push(value);}const buffer=new Uint8Array(total);let offset=0;for(const p of parts){buffer.set(p,offset);offset+=p.length;}const items=parseFeed(new TextDecoder().decode(buffer),source,now);if(!items.length)throw Error('Feed has no usable dated headlines within size limit');return{source,items,status:'ok',last_success_at:new Date(now).toISOString()};}catch(error){return{source,items:cache?.result.items.filter(n=>n.source_id===source.id)||[],status:'failed',error:String(error.message).slice(0,160),last_success_at:cache?.result.sources.find(s=>s.id===source.id)?.last_success_at||null};}}));
 const result={fetched_at:new Date(now).toISOString(),items:mergeNews(responses.map(s=>s.items)),sources:responses.map(({source,status,error,last_success_at,items})=>({...source,status,error:error||null,last_success_at,count:items.length})),mode:'publisher-rss-headlines',partial:responses.some(r=>r.status!=='ok')};cache={completed_at:now,result};return result;
}