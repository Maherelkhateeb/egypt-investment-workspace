/* A report is published only after its Cairo period ends and a reviewed file exists. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReportAvailability=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
 const pattern=/^\d{4}-\d{2}-\d{2}$/;
 function localTime(value){if(value==null||value==='')return null;const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second;}
 function validDate(date){if(!pattern.test(date||''))return false;const d=new Date(date+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;}
 function nextDay(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
 function releaseTime(meta){
  if(!validDate(meta?.date))return null;
  if(meta.kind==='daily')return meta.date+'T16:00:00';
  if(meta.kind==='weekly'){
   if(!validDate(meta.id)||new Date(meta.id+'T00:00:00Z').getUTCDay()!==0)return null;
   const end=new Date(meta.id+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+4);
   if(end.toISOString().slice(0,10)!==meta.date)return null;
   return meta.date+'T16:00:00';
  }
  if(meta.kind==='monthly'){
   if(!/^\d{4}-\d{2}$/.test(meta.id||''))return null;
   const start=new Date(meta.id+'-01T00:00:00Z');if(!Number.isFinite(start.getTime()))return null;
   const end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0));if(end.toISOString().slice(0,10)!==meta.date)return null;
   return nextDay(meta.date)+'T00:00:00';
  }
  return null;
 }
 function filePath(meta){return meta?.kind==='daily'?'daily-reports/'+meta.date+'.json':meta?.kind==='weekly'?'period-reports/weekly/'+meta.id+'.json':meta?.kind==='monthly'?'period-reports/monthly/'+meta.id+'.json':null;}
 function creationTime(report){return report?.generated_at||report?.audit?.audited_at||(report?.kind!=='daily'?report?.generated_from?.snapshot_updated_at:null);}
 function candidate(meta,now){const current=localTime(now),release=releaseTime(meta),created=localTime(meta?.generated_at);return Boolean(current&&release&&current>=release&&created&&created>=release&&created<=current&&meta.final===true&&meta.audited===true&&meta.file===filePath(meta)&&meta.report_type!=='pending_session');}
 function eligible(meta,report,now){if(!candidate(meta,now)||!report||report.date!==meta.date||(report.id||report.date)!==(meta.id||meta.date)||report.kind!==meta.kind||report.audit?.audited!==true)return false;const created=creationTime(report),stamp=localTime(created),current=localTime(now);if(!stamp||stamp<releaseTime(meta)||stamp>current||Date.parse(created)!==Date.parse(meta.generated_at))return false;if(meta.kind==='daily')return ['reviewed_eod','historical_partial','non_trading_day'].includes(report.report_type);return report.period_final===true&&report.period_end===meta.date&&report.report_type===meta.kind+'_summary'&&Array.isArray(report.components)&&report.components.length>0;}
 function metadata(report,file){const daily=report.kind==='daily';return {id:report.id||report.date,date:report.date,kind:report.kind,label:daily?report.title:report.kind==='weekly'?report.period_start+' — '+report.period_end:report.id,sessionDay:report.sessionDay,file,final:daily?report.report_type!=='pending_session':report.period_final===true,audited:report.audit?.audited===true,complete:daily?report.report_type==='non_trading_day'||report.coverage?.source_complete===true:report.coverage?.complete===true,report_type:report.report_type,source_commit:report.generated_from?.commit||null,generated_at:creationTime(report)||null,available_after_cairo:releaseTime(report)};}
 return {localTime,releaseTime,creationTime,candidate,eligible,metadata};
});
