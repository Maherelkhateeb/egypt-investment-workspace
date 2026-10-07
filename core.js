(function(root){
'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const num=(v,label,min=0)=>{if(v===null||v===''||v===undefined||!Number.isFinite(Number(v))||Number(v)<min)throw Error(label+' غير صالح');return Number(v);};
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('تاريخ غير صالح');return v;};
const ticker=v=>{v=String(v||'').trim().toUpperCase();if(!/^[A-Z0-9_]{1,24}$/.test(v))throw Error('رمز الأصل غير صالح');return v;};
const empty=()=>({schema:1,revision:0,transactions:[],valuations:{},research:{},histories:{},news:[],snapshots:[],openingCash:0});
function transaction(t){
 if(!t||typeof t.id!=='string'||!t.id||t.id.length>100)throw Error('معرف العملية غير صالح');
 const x={id:t.id,date:date(t.date),type:t.type,fee:t.fee==null?null:num(t.fee,'الرسوم'),source:String(t.source||'إدخال المستخدم').slice(0,400),currency:'EGP'};
 if(!['opening','buy','sell','deposit','withdraw','dividend','fee'].includes(x.type))throw Error('نوع العملية غير صالح');
 if(['opening','buy','sell'].includes(x.type)){x.ticker=ticker(t.ticker);x.qty=num(t.qty,'الكمية',Number.MIN_VALUE);x.price=num(t.price,'السعر',Number.MIN_VALUE);x.name=String(t.name||x.ticker).slice(0,160);x.assetType=['stock','fund','gold'].includes(t.assetType)?t.assetType:'stock';}
 else {x.amount=num(t.amount,'المبلغ',Number.MIN_VALUE);if(t.ticker)x.ticker=ticker(t.ticker);}
 return x;
}
function validateState(s){
 if(!s||s.schema!==1||!Number.isInteger(s.revision)||s.revision<0||!Array.isArray(s.transactions)||s.transactions.length>100000)throw Error('صيغة النسخة غير صالحة');
 const r=empty();r.revision=s.revision;r.transactions=s.transactions.map(transaction);const ids=new Set();for(const t of r.transactions){if(ids.has(t.id))throw Error('عملية مكررة');ids.add(t.id);}
 for(const [key,v]of Object.entries(s.valuations||{})){ticker(key);if(!v||!['manual','market'].includes(v.mode))throw Error('وضع التقييم غير صالح');r.valuations[key]={mode:v.mode,price:v.mode==='manual'?num(v.price,'التقييم اليدوي',Number.MIN_VALUE):null,date:date(v.date)};}
 r.openingCash=num(s.openingCash??0,'النقد الافتتاحي');
 if(s.importMeta){const m=s.importMeta;if(typeof m!=='object'||Array.isArray(m))throw Error('مصدر الاستيراد غير صالح');r.importMeta={source_label:String(m.source_label||'نسخة مستوردة').slice(0,400),captured_at:m.captured_at?date(m.captured_at):null,holdings_as_of:m.holdings_as_of?date(m.holdings_as_of):null,imported_at:m.imported_at?date(m.imported_at):null,fees_known:m.fees_known===true,cash_known:m.cash_known===true};}
 for(const key of ['research','histories']){if(s[key]&&typeof s[key]!=='object')throw Error('بيانات إضافية غير صالحة');r[key]=clone(s[key]||{});}
 for(const key of ['news','snapshots']){if(s[key]&&!Array.isArray(s[key]))throw Error('سجل إضافي غير صالح');r[key]=clone(s[key]||[]);}
 if(JSON.stringify(r).length>8000000)throw Error('النسخة تتجاوز حد التخزين المحلي');
 ledger(r);return r;
}
function ledger(s,asOf='9999-12-31'){
 const positions=new Map();let cash=s.openingCash||0,realized=0,grossRealized=0,income=0,fees=0,unknownFees=0,deposits=0,withdrawals=0,openingValue=0;
 const ts=s.transactions.map((t,i)=>({...transaction(t),sequence:i})).filter(t=>t.date<=asOf).sort((a,b)=>a.date.localeCompare(b.date)||a.sequence-b.sequence);
 for(const t of ts){const f=t.fee??0;if(t.fee===null&&['opening','buy','sell'].includes(t.type))unknownFees++;fees+=f;
 if(['opening','buy','sell'].includes(t.type)){
   let p=positions.get(t.ticker)||{ticker:t.ticker,name:t.name,assetType:t.assetType,qty:0,cost:0,grossCost:0,realized:0,grossRealized:0};positions.set(t.ticker,p);
   if(t.type==='sell'){
     if(t.qty>p.qty+1e-9)throw Error('البيع يتجاوز الحيازة في '+t.ticker+' بتاريخ '+t.date);
     const ratio=Math.min(1,t.qty/p.qty),cost=p.cost*ratio,gross=p.grossCost*ratio;
     const profit=t.qty*t.price-f-cost,grossProfit=t.qty*t.price-gross;
     realized+=profit;grossRealized+=grossProfit;p.realized+=profit;p.grossRealized+=grossProfit;cash+=t.qty*t.price-f;
     p.qty-=t.qty;p.cost-=cost;p.grossCost-=gross;if(p.qty<1e-9){p.qty=0;p.cost=0;p.grossCost=0;}
   }else {p.qty+=t.qty;p.cost+=t.qty*t.price+f;p.grossCost+=t.qty*t.price;if(t.type==='buy')cash-=t.qty*t.price+f;else openingValue+=t.qty*t.price+f;}
 }else if(t.type==='deposit'){cash+=t.amount;deposits+=t.amount;cash-=f;}
 else if(t.type==='withdraw'){cash-=t.amount+f;withdrawals+=t.amount;}
 else if(t.type==='dividend'){cash+=t.amount-f;income+=t.amount;}
 else if(t.type==='fee'){cash-=t.amount;fees+=t.amount;}
 }
 const otherFees=ts.filter(t=>!['opening','buy','sell'].includes(t.type)).reduce((a,t)=>a+(t.type==='fee'?t.amount:0)+(t.fee??0),0);
 return {positions:[...positions.values()].filter(p=>p.qty>0),cash,realized,grossRealized,income,fees,otherFees,unknownFees,deposits,withdrawals,openingValue};
}
function portfolio(s,market,asOf='9999-12-31'){
 const l=ledger(s,asOf);let value=0,unrealized=0,grossUnrealized=0;const missing=[];
 const positions=l.positions.map(p=>{const v=s.valuations[p.ticker];const q=market.assets?.[p.ticker];
   const manual=v?.mode==='manual'&&v.date<=asOf;const price=manual?v.price:(q&&q.session_date<=asOf&&finite(q.close)&&q.close>0?q.close:null);
   const known=price!==null;if(!known)missing.push(p.ticker);const pv=known?p.qty*price:null;
   if(known){value+=pv;unrealized+=pv-p.cost;grossUnrealized+=pv-p.grossCost;}
   return {...p,price,value:pv,unrealized:known?pv-p.cost:null,mode:manual?'manual':'market',quote:q??null,average:p.cost/p.qty};
 });
 const complete=missing.length===0;
 const net=complete?l.realized+unrealized+l.income-l.otherFees:null;
 const gross=complete?l.grossRealized+grossUnrealized+l.income:null;
 return {...l,positions,value,cashKnown:s.importMeta?.cash_known!==false,totalWealth:s.importMeta?.cash_known===false?null:value+l.cash,unrealized:complete?unrealized:null,gross,net,missing,feesComplete:l.unknownFees===0,complete};
}
function change(current,previous){if(!finite(current)||!finite(previous)||previous<=0)return {delta:null,pct:null};return {delta:current-previous,pct:(current-previous)/previous*100};}
function daily(s,quotes,previous){let delta=0,base=0;const missing=[];const rows=[];
 for(const p of ledger(s,previous.session_date).positions){const a=quotes.assets?.[p.ticker],b=previous.assets?.[p.ticker];const d=change(a?.close,b?.close);
  if(d.delta===null||a?.session_date!==quotes.session_date||b?.session_date!==previous.session_date){missing.push(p.ticker);continue;}delta+=d.delta*p.qty;base+=b.close*p.qty;rows.push({ticker:p.ticker,qty:p.qty,...d,amount:d.delta*p.qty});}
 return {delta:missing.length?null:delta,pct:missing.length||base<=0?null:delta/base*100,coveredDelta:delta,missing,rows,label:'تغير أسعار حيازات إغلاق الجلسة السابقة؛ لا يشمل أثر عمليات الجلسة'};
}
function validateMarket(m){
 if(!m||m.schema!==1||!m.assets||typeof m.assets!=='object'||!Number.isFinite(Date.parse(m.fetched_at)))throw Error('ملف السوق غير صالح');date(m.session_date);
 for(const [symbol,q]of Object.entries(m.assets)){ticker(symbol);if(!q||!finite(q.close)||q.close<=0)throw Error('سعر غير صالح: '+symbol);date(q.session_date);if(q.session_date>m.session_date)throw Error('جلسة أصل أحدث من اللقطة');if(typeof q.source_url!=='string'||!/^https:\/\//.test(q.source_url))throw Error('مصدر السعر غير صالح');if(q.previous_close!=null){if(!finite(q.previous_close)||q.previous_close<=0)throw Error('إغلاق سابق غير صالح');date(q.previous_session_date);if(q.previous_session_date>=q.session_date)throw Error('الإغلاق السابق ليس من جلسة سابقة');}}
 for(const [name,q]of Object.entries(m.indices||{})){if(!q||!finite(q.close)||q.close<=0)throw Error('مؤشر غير صالح: '+name);date(q.session_date);if(q.previous_close!=null){num(q.previous_close,'المؤشر السابق',Number.MIN_VALUE);date(q.previous_session_date);if(q.previous_session_date>=q.session_date)throw Error('جلسة مؤشر سابقة غير صالحة');}if(!/^https:\/\//.test(q.source_url||''))throw Error('مصدر المؤشر غير صالح');}
 return clone(m);
}
function freshness(m,now=Date.now()){const ms=Date.parse(m.fetched_at);return {future:ms>now+300000,old:now-ms>24*3600000,session:m.session_date};}
function marketState(m,now=new Date()){
 const s=m.market_status;const until=Date.parse(s?.valid_until);const authoritative=s&&Number.isFinite(until)&&until>=now.getTime()&&Date.parse(s.observed_at)<=now.getTime()+300000;
 const time=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',dateStyle:'medium',timeStyle:'short'}).format(now);
 return {state:authoritative?s.session_state:'UNKNOWN',label:authoritative?(s.is_open?'السوق مفتوح بحسب المصدر':'السوق مغلق بحسب المصدر'):'حالة الجلسة غير مؤكدة',time};
}
function csv(rows){const field=v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\ufeff'+rows.map(r=>r.map(field).join(',')).join('\r\n');}
function indicators(candles){
 if(!Array.isArray(candles))throw Error('سلسلة غير صالحة');const sorted=[...candles].sort((a,b)=>a.date.localeCompare(b.date)),seen=new Set();
 for(const c of sorted){date(c.date);if(seen.has(c.date))throw Error('جلسة مكررة');seen.add(c.date);for(const k of ['open','high','low','close','volume'])num(c[k],k,k==='volume'?0:Number.MIN_VALUE);if(c.high<Math.max(c.open,c.close,c.low)||c.low>Math.min(c.open,c.close))throw Error('شمعة غير متسقة');}
 const closes=sorted.map(c=>Number(c.close));const sma=n=>closes.length<n?null:closes.slice(-n).reduce((a,b)=>a+b,0)/n;let rsi=null;
 if(closes.length>=15){let gain=0,loss=0;for(let i=1;i<=14;i++){let d=closes[i]-closes[i-1];gain+=Math.max(0,d)/14;loss+=Math.max(0,-d)/14;}for(let i=15;i<closes.length;i++){let d=closes[i]-closes[i-1];gain=(gain*13+Math.max(0,d))/14;loss=(loss*13+Math.max(0,-d))/14;}rsi=loss===0?(gain===0?50:100):100-100/(1+gain/loss);}
 const returns=closes.slice(1).map((v,i)=>Math.log(v/closes[i]));const avg=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
 const vol=returns.length>1?Math.sqrt(returns.reduce((a,b)=>a+(b-avg)**2,0)/(returns.length-1))*Math.sqrt(252)*100:null;
 return {candles:sorted,sma20:sma(20),sma50:sma(50),sma200:sma(200),rsi,volatility:vol,lastDate:sorted.at(-1)?.date??null};
}
function valuation(price,earnings,peLow,peBase,peHigh){price=num(price,'السعر',Number.MIN_VALUE);earnings=num(earnings,'ربحية السهم',Number.MIN_VALUE);const multiples=[peLow,peBase,peHigh].map(v=>num(v,'المضاعف',Number.MIN_VALUE));if(multiples[0]>multiples[1]||multiples[1]>multiples[2])throw Error('رتب مضاعفات السيناريوهات تصاعدياً');return multiples.map(pe=>{const fair=earnings*pe;return{pe,fair,upside:(fair-price)/price*100,margin:(fair-price)/fair*100};});}
function goal(target,current,monthly,annual,months){target=num(target,'الهدف',Number.MIN_VALUE);current=num(current,'الرصيد');monthly=num(monthly,'المساهمة');annual=num(annual,'العائد',-99.99);months=num(months,'الأشهر',1);if(months>1200||annual>100)throw Error('مدخلات خارج نطاق الحساب');let value=current;const rate=(1+annual/100)**(1/12)-1;for(let i=0;i<months;i++)value=value*(1+rate)+monthly;return {value,reached:value>=target,gap:Math.max(0,target-value),assumedReturn:annual};}
function migrateLegacy(input,dateValue){date(dateValue);if(!Array.isArray(input))throw Error('المحفظة السابقة غير صالحة');const s=empty();
 input.forEach((h,i)=>{const qty=num(h.qty_owned??h.qty,'الكمية');if(!qty)return;const symbol=ticker(h.ticker);const cost=num(h.avg_unit_cost??h.buy,'التكلفة',Number.MIN_VALUE);
 s.transactions.push(transaction({id:'legacy-'+symbol+'-'+i,date:dateValue,type:'opening',ticker:symbol,name:h.name,assetType:['stock','fund','gold'].includes(h.assetType)?h.assetType:(symbol==='THNDR_GOLD'||h.isGold?'gold':h.isFund||['CMS','AZG','BWA','NMF'].includes(symbol)?'fund':'stock'),qty,price:cost,fee:null,source:'رصيد افتتاحي مستورد؛ أساس الرسوم يحتاج مراجعة'}));
 if(h.valuation_mode==='manual')s.valuations[symbol]={mode:'manual',price:num(h.manual_valuation_price??h.manual_price??h.cur,'السعر اليدوي',Number.MIN_VALUE),date:dateValue};});return validateState(s);
}
class Repository{
 constructor(storage,key='egx_independent_workspace_v1'){this.storage=storage;this.key=key;this.storageError=null;}
 load(){const raw=this.storage.getItem(this.key);if(raw===null)return empty();try{return validateState(JSON.parse(raw));}catch{throw Error('تعذر قراءة المحفظة؛ احتفظ بالبيانات واستعد نسخة صحيحة');}}
 save(state,expectedRevision,allowRecovery=false){const raw=this.storage.getItem(this.key);let current=0;if(raw!==null){try{current=validateState(JSON.parse(raw)).revision;}catch(error){if(!allowRecovery)throw error;}}if(current!==expectedRevision)throw Error('عدلت المحفظة في تبويب آخر؛ أعد التحميل قبل الحفظ');
 const candidate=validateState({...state,revision:current+1});if(raw!==null)this.storage.setItem(this.key+'_backup',raw);this.storage.setItem(this.key,JSON.stringify(candidate));return candidate;}
}
const api={finite,num,clone,esc,date,ticker,empty,transaction,validateState,ledger,portfolio,change,daily,validateMarket,freshness,marketState,csv,indicators,valuation,goal,migrateLegacy,Repository};
if(typeof module==='object'&&module.exports)module.exports=api;else root.InvestCore=api;
})(typeof globalThis==='object'?globalThis:this);
