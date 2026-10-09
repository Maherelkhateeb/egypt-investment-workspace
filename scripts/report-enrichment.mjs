import C from '../core.js';
import Calendar from '../market-calendar.js';
import {summary,reading} from './report-review.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v),positive=v=>finite(v)&&v>0;
const round=(v,n=5)=>finite(v)?Number(v.toFixed(n)):null;
const pct=(a,b)=>positive(a)&&positive(b)?round((a/b-1)*100,2):null;
const dated=(map,date)=>Object.keys(map||{}).filter(d=>Calendar.valid(d)&&d<=date).sort();
export function splitFactor(series,after,through){return (series.splits||[]).filter(s=>s.date>after&&s.date<=through).reduce((a,s)=>a*s.ratio,1);}
export function enrichStock(original,date,history,correction=null){
 const series=history?.stocks?.[original.ticker],bar=series?.quotes?.[date],i=history?.sessions?.indexOf(date);
 if(history?.schema!==2||!bar||i<0||series.currency!=='EGP'||series.symbol!==original.ticker+'.CA'||!positive(bar.close))return original;
 const factor=splitFactor(series,date,history.as_of),close=round(bar.close*factor,2),q={...original,close,source:series.url,verification:'dated_provider_history',session_date:date};
 const oldSource=original.source,oldClose=original.close;
 if(finite(oldClose)&&Math.abs(close-oldClose)>.015)q.source_correction={previous_value:oldClose,previous_source:oldSource,reason:'Dated historical quote after restoration of declared split basis'};
 const high=round(bar.high*factor,2),low=round(bar.low*factor,2),open=round(bar.open*factor,2),hl=positive(high)&&positive(low)&&high>=close&&low<=close&&high>=low;
 q.high=hl?high:null;q.low=hl?low:null;q.open=hl&&positive(open)&&open>=low&&open<=high?open:null;
 if(q.open===null&&original.ohlc_valid&&Math.abs(oldClose-close)<=.015&&original.high>=close&&original.low<=close){q.open=original.open;q.open_source=oldSource;}
 q.ohlc_valid=hl&&positive(q.open)&&q.open>=q.low&&q.open<=q.high;
 q.ohlc_note=q.ohlc_valid?null:hl?'رفض الافتتاح غير المتسق في المصدر؛ أعلى وأدنى وإغلاق الجلسة متسقة.':'لا توجد شمعة متسقة في المصدر لهذه الجلسة.';
 q.volume=bar.volume;
 // A closing-price times volume estimate is not the exchange's actual turnover.
 q.value_traded=null;q.estimated_close_volume_value=finite(bar.volume)?round(close*bar.volume,2):null;
 let prev=i-1;while(prev>=0&&!positive(series.close[prev]))prev--;
 const prevDate=history.sessions[prev],between=prev>=0?splitFactor(series,prevDate,date):1;
 q.previous_close=prev>=0?round(series.close[prev]*factor,5):null;q.previous_session_date=prevDate||null;
 q.previous_unadjusted_close=positive(q.previous_close)?round(q.previous_close*between,2):null;
 q.previous_close_source=series.url;q.change_pct=pct(close,q.previous_close);q.change_basis=between!==1?'declared_split_adjusted_dated_closes':'dated_closes';
 q.basis_discontinuity=between!==1;q.corporate_actions=(series.splits||[]).filter(s=>s.date>prevDate&&s.date<=date);
 let points=[];
 const anchor=series.adjusted_close[i];
 if(positive(anchor))for(let j=0;j<=i;j++){
  if(!positive(series.adjusted_close[j])){points=[];continue;}
  points.push({date:history.sessions[j],close:series.adjusted_close[j]*close/anchor});
 }
 let normalized=false;
 if(correction&&positive(correction.ratio)){const a=history.sessions.indexOf(correction.anchor_before.date),b=history.sessions.indexOf(correction.anchor_after.date);if(a>=0&&b>=0&&Math.abs(series.close[a]-correction.anchor_before.actual_close)<.015&&Math.abs(series.close[b]*correction.ratio-correction.anchor_after.actual_close)<.05){points=points.map(p=>p.date<=correction.provider_unadjusted_through?{...p,close:p.close/correction.ratio}:p);normalized=true;}}
 const indicators=C.closingIndicators(points);
 for(const field of ['rsi','sma20','sma50','sma200'])q[field]=round(indicators[field]);
 q.technical_basis={method:'Own Wilder RSI(14) and arithmetic SMA(20/50/200); dated dividend/split-adjusted closes rescaled to the actual close of this session',adjusted:positive(anchor),provider_basis_corrected:normalized,correction_source:normalized?correction.source_url:null,sessions:points.length,start:points[0]?.date||null,end:date,source:series.url,response_sha256:series.response_sha256};
 q.split_basis={source:series.url,actions:series.splits||[],restoration_factor:factor};
 q.fundamental_basis=original.fundamental_basis||{source:oldSource,snapshot_date:date,financial_statement_period:null,status:'snapshot_ratios_only'};
 q.analysis=reading(q);
 q.analysis.text+=' التغير '+(q.change_pct>0?'+':'')+q.change_pct+'% عن '+prevDate+'. '+points.length+' إغلاقًا مؤرخًا؛ RSI14 = '+round(q.rsi,2)+'، SMA20 = '+round(q.sma20,2)+'، SMA50 = '+round(q.sma50,2)+'، SMA200 = '+round(q.sma200,2)+'.';
 if(between!==1)q.analysis.text+=' المقارنة معدلة بإجراء عدد الأسهم المعلن؛ لا تُعدّل كميات المحفظة تلقائيًا.';
 if(q.ohlc_note)q.analysis.text+=' '+q.ohlc_note;
 return q;
}
export function collectNav(reports,snapshots,facts){
 const rows=[];
 for(const r of reports)for(const f of r.funds||[])if(Calendar.valid(f.session_date)&&positive(f.price))rows.push({...f,priority:f.verification==='user_verified_snapshot'?2:0});
 for(const s of snapshots){const data=s.snapshot||{},funds=Array.isArray(data.funds)?Object.fromEntries(data.funds.map(f=>[f.code,f])):data.funds||{};
  for(const [code,f]of Object.entries(funds)){const date=f.last_nav_date||f.session_date,price=f.price??f.close??f.nav;if(code==='THNDR_GOLD'||!Calendar.valid(date)||!positive(price))continue;rows.push({code,name:f.name||code,price,session_date:date,manager:f.manager,type:f.type,valuation_cycle:f.valuation_cycle,observed_at:data.updated_at,source:/^https:\/\//.test(f.source||'')?f.source:'https://github.com/mahereasybakery-web/egypt-sharia-stock-report/blob/'+s.commit+'/market_data.json',publisher_label:f.source||null,verification:'dated_nav_snapshot',priority:1});}
 }
 for(const f of facts.funds||[])rows.push({...f,source:f.url,priority:3});
 const map=new Map();for(const f of rows){const key=f.code+':'+f.session_date;if((map.get(key)?.priority??-1)<=f.priority)map.set(key,f);}return [...map.values()];
}
export function enrichReport(report,history,facts,navs=[],names={}){
 const r=structuredClone(report),date=r.date;if(r.report_type!=='reviewed_eod')return r;
 for(const [ticker,s]of Object.entries(history?.stocks||{}))if(s.quotes?.[date]&&!r.stocks[ticker])r.stocks[ticker]={ticker,name:names[ticker]||ticker,close:null,pe:null,pb:null,source:s.url};
 const excluded=(facts.excluded||[]).filter(q=>date>=q.from&&r.stocks[q.ticker]);for(const q of excluded)delete r.stocks[q.ticker];
 for(const [t,q]of Object.entries(r.stocks))r.stocks[t]=enrichStock({...q,ticker:t},date,history,facts.price_basis?.[t]);
 for(const [code,s]of Object.entries(facts.indices||{})){
  const bar=s.quotes?.[date];if(!bar||!r.indices[code])continue;
  const q=r.indices[code],prior=dated(s.quotes,Calendar.add(date,-1)).at(-1),prev=s.quotes[prior]?.close??q.previous_close;
  r.indices[code]={...q,...bar,previous_close:prev,previous_session_date:prior||q.previous_session_date,source:bar.source_url||s.url,verification:'official_dated_index',session_date:date,change_pct:pct(bar.close,prev)};
  r.indices[code].analysis=reading(r.indices[code]);
 }
 for(const f of r.funds||[]){
  const available=navs.filter(q=>q.code===f.code&&q.session_date<=date).sort((a,b)=>a.session_date.localeCompare(b.session_date));const latest=available.at(-1);if(!latest)continue;
  Object.assign(f,latest);delete f.priority;
  const prev=available.filter(q=>q.session_date<f.session_date).at(-1);
  f.previous_close=prev?.price??null;f.previous_session_date=prev?.session_date??null;f.change_pct=pct(f.price,f.previous_close);f.carried_forward=f.session_date!==date;f.comparison_kind='NAV date to prior published NAV date';
 }
 const fxDate=dated(facts.fx?.quotes,date).at(-1),fx=facts.fx?.quotes?.[fxDate],gold=facts.gold?.quotes?.[date];
 if(fx){const prevDate=dated(facts.fx.quotes,Calendar.add(fxDate,-1)).at(-1),prev=facts.fx.quotes[prevDate],mid=round((fx.buy+fx.sell)/2);r.fx_gold.usd_egp={name:'الدولار — متوسط سعر البنك المركزي الرسمي',close:mid,buy:fx.buy,sell:fx.sell,session_date:fxDate,observed_at:facts.reviewed_at,unit:'ج / دولار',source:facts.fx.url,verification:'official_dated_fx',rate_type:facts.fx.type,previous_close:prev?round((prev.buy+prev.sell)/2):null,previous_session_date:prevDate||null,chgPct:prev?pct(mid,(prev.buy+prev.sell)/2):null};}
 if(gold&&fx){
  const dates=dated(facts.gold.quotes,Calendar.add(date,-1)),pDate=dates.at(-1),pGold=facts.gold.quotes[pDate];
  r.fx_gold.xau_usd_ounce={name:'إغلاق الذهب العالمي المرجعي',close:gold.close,session_date:date,unit:'دولار / أونصة تروي',source:gold.url,verification:'dated_global_benchmark',previous_close:pGold?.close??null,previous_session_date:pDate||null,chgPct:pct(gold.close,pGold?.close)};
  const mid=r.fx_gold.usd_egp.close,prevFxDate=pDate?dated(facts.fx.quotes,pDate).at(-1):null,prevFx=facts.fx.quotes[prevFxDate],previous=pGold&&prevFx?pGold.close*((prevFx.buy+prevFx.sell)/2)/31.1034768:null;
  for(const karat of [24,21])r.fx_gold['gold_'+karat+'k_local']={name:'المكافئ العالمي لجرام الذهب عيار '+karat,close:round(gold.close*mid/31.1034768*karat/24),unit:'ج / غرام — مكافئ مرجعي',session_date:date,source:gold.url,fx_source:facts.fx.url,fx_session_date:fxDate,verification:'independently_calculated_reference',calc:'USD/troy ounce × CBE official midpoint ÷ 31.1034768 × karat/24',inputs:{xau_usd_ounce:gold.close,usd_egp_mid:mid,fx_date:fxDate},previous_close:previous?round(previous*karat/24):null,previous_session_date:pDate||null,chgPct:previous?pct(gold.close*mid/31.1034768,previous):null,note:'مكافئ حسابي عالمي؛ لا يتضمن فرق السوق المحلي أو المصنعية أو سعر تنفيذ الوسيط. تاريخ سعر الصرف مستقل عن تاريخ الذهب.'};
 }
 r.portfolio_analysis=(r.portfolio_analysis||[]).map(q=>r.stocks[q.ticker]).filter(Boolean);
 const s=summary(r.stocks,r.indices),quotes=Object.values(r.stocks);
 s.known_turnover=round(quotes.filter(q=>finite(q.value_traded)).reduce((a,q)=>a+q.value_traded,0),2);s.turnover_assets=quotes.filter(q=>finite(q.value_traded)).length;
 s.known_volume=quotes.filter(q=>finite(q.volume)).reduce((a,q)=>a+q.volume,0);s.volume_assets=quotes.filter(q=>finite(q.volume)).length;
 s.estimated_close_volume_value=round(quotes.reduce((a,q)=>a+(q.estimated_close_volume_value||0),0),2);
 r.market_summary=s;
 r.coverage={...r.coverage,stocks:quotes.length,valid_ohlc:quotes.filter(q=>q.ohlc_valid).length,comparisons:s.stocks_with_change,rsi:quotes.filter(q=>finite(q.rsi)).length,sma200:quotes.filter(q=>finite(q.sma200)).length,source_complete:quotes.length>0&&Object.keys(r.indices).length>=2};
 r.session_analysis={...r.session_analysis,headline:'جلسة '+date+' — '+s.index_bias+' داخل التغطية',nature:s.gainers+' سهمًا صاعدًا، '+s.losers+' هابطًا، '+s.flat+' دون تغير من '+quotes.length+' سهمًا. الأسعار والمقارنات والمؤشرات محسوبة من مصادر الجلسات المؤرخة.',liquidity:'إجمالي الحجم للأسهم المغطاة: '+s.known_volume.toLocaleString('en-US')+' سهم في '+s.volume_assets+' شركة. هذا حجم العينة، وليس إجمالي قيمة تداول السوق.',drivers:[s.best?'أعلى تغير ضمن التغطية: '+s.best.ticker+' '+s.best.change_pct+'%.':'لا تتوفر مقارنة مكتملة.',s.worst?'أدنى تغير ضمن التغطية: '+s.worst.ticker+' '+s.worst.change_pct+'%.':'لا تتوفر مقارنة مكتملة.'],risk_notes:['تغطية RSI: '+r.coverage.rsi+'/'+quotes.length+'؛ SMA200: '+r.coverage.sma200+'/'+quotes.length+'.','لا يستنتج صافي شراء المؤسسات أو الأجانب من حركة السعر أو حجم التداول.','الذهب المحلي المعروض مكافئ حسابي عالمي؛ أسعار تنفيذ الوسيط منفصلة.']};
 r.audit={...r.audit,review_version:6,enrichment_version:1,history_as_of:history?.as_of,history_retrieved_at:history?.retrieved_at,primary_facts_reviewed_at:facts.reviewed_at,excluded_entries:[...new Map([...(r.audit?.excluded_entries||[]),...excluded].map(q=>[q.ticker,q])).values()],notes:['قرأت مصادر الأسعار المؤرخة وصُححت أخطاء انتقال قيم المؤشرات بين الأيام.','RSI والمتوسطات حسابات البرنامج من سجل الإغلاقات؛ لا تنقل إشارات البرنامج القديم.','قيمة الإغلاق × الحجم تقدير فقط؛ لا تعرض باعتبارها قيمة التداول الفعلية.','القيم غير المنشورة في المصدر، ومنها تدفقات المستثمرين والفترات المالية لبعض المضاعفات، لا تُملأ بصفر أو أرقام تخمينية.']};
 r.source_links=[{label:'سجل الأسعار والإجراءات',url:'https://github.com/Maherelkhateeb/egypt-investment-workspace/blob/main/report-sources/price-history.json'},{label:'المصادر الرسمية المؤرخة',url:'https://github.com/Maherelkhateeb/egypt-investment-workspace/blob/main/report-sources/verified-market-facts.json'}];
 return r;
}
