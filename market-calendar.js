(function(root){'use strict';
const DAY=86400000,valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
function cairoDate(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),get=t=>p.find(x=>x.type===t).value;return get('year')+'-'+get('month')+'-'+get('day');}
function add(date,days){if(!valid(date))throw Error('تاريخ التقويم غير صالح');return new Date(Date.parse(date+'T12:00:00Z')+days*DAY).toISOString().slice(0,10);}
function validate(data){if(data?.schema!==1||data.timezone!=='Africa/Cairo'||!Array.isArray(data.events))throw Error('ملف تقويم السوق غير صالح');for(const x of data.events){if(!valid(x.date)||!['closure','schedule','event','suspension'].includes(x.type)||typeof x.title!=='string'||!Array.isArray(x.sources)||x.sources.some(s=>!/^https:\/\//.test(s.url||'')))throw Error('حدث تقويم غير صالح');if(x.type==='closure'&&x.confirmed&&!x.sources.length)throw Error('إغلاق مؤكد بلا مصدر');}return data;}
function status(data,date=cairoDate()){
 const events=(data?.events||[]).filter(x=>x.date===date),closure=events.find(x=>x.type==='closure'&&x.confirmed&&(!x.scope||x.scope==='EGX'));
 if(closure)return {date,state:'OFFICIAL_HOLIDAY',is_open:false,label:'عطلة البورصة — '+closure.title,event:closure,events,confirmed:true};
 if([5,6].includes(new Date(date+'T12:00:00Z').getUTCDay()))return {date,state:'WEEKEND',is_open:false,label:'عطلة نهاية الأسبوع',events,confirmed:true};
 return {date,state:'UNKNOWN',is_open:null,label:'يوم عمل معتاد؛ حالة التداول تحتاج مصدرًا مباشرًا',events,confirmed:false};
}
function sessions(data,start,end){if(!valid(start)||!valid(end)||start>end)throw Error('فترة التقويم غير صالحة');const out=[];for(let d=start,count=0;d<=end;d=add(d,1)){if(++count>730)throw Error('فترة التقويم طويلة');if(!['OFFICIAL_HOLIDAY','WEEKEND'].includes(status(data,d).state))out.push(d);}return out;}
function nextSession(data,date){for(let i=1;i<=30;i++){const next=add(date,i);if(status(data,next).state==='UNKNOWN')return next;}return null;}
function candidates(items){return (items||[]).filter(x=>/(البورصة|سوق المال|EGX|تداول)/i.test(x.title||'')&&/(إجازة|اجازة|تعطيل|تعليق|وقف|توقف|استئناف|أوقات|مواعيد|اجتماع.*المركزي|فائدة)/i.test(x.title||'')&&/^https:\/\//.test(x.url||'')).map(x=>({id:x.id||x.url,title:x.title,published_at:x.published_at||null,url:x.url,publisher:x.publisher||'المصدر',confirmed:false,type:'event'}));}
const api={cairoDate,add,validate,status,sessions,nextSession,candidates,valid};if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketCalendar=api;
})(typeof globalThis==='object'?globalThis:this);
