/* Original daily-report presentation; the independent archive supplies every value. */
(function(){'use strict';
const C=window.InvestCore,e=C.esc,fmtPrice=(v,d=2)=>v==null||!Number.isFinite(v)?'غير متاح':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}),fmtPct=v=>v==null?'غير متاح':(v>0?'+':'')+fmtPrice(v)+'%',signed=(v,d=2)=>v==null?'غير متاح':(v>0?'+':'')+fmtPrice(v,d);
function pctBadge(v){return '<span class="text-xs font-bold px-2 py-0.5 rounded-lg '+(v==null?'text-slate-400 bg-slate-900 border border-slate-700':v>=0?'text-emerald-400 bg-emerald-950/80 border border-emerald-800':'text-rose-400 bg-rose-950/80 border border-rose-800')+'">'+fmtPct(v)+'</span>';}
function signalBadge(sig){return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-800 text-slate-300 border-slate-700">⚪ '+e(sig||'متابعة')+'</span>';}
function dto(r){const stock=q=>({code:e(q.ticker),name:e(q.name||q.ticker),close:q.close,change:q.change_pct,signal:q.analysis?.state||'متابعة',signalType:'hold'});const sourceLink={url:e(new URL(r.kind==='weekly'?'period-reports/weekly/'+r.id+'.json':r.kind==='monthly'?'period-reports/monthly/'+r.id+'.json':'daily-reports/'+r.date+'.json',location.href).href),label:'لقطة التقرير'};return {sourceLink,rpt:{title:e(r.title),subtitle:e(r.subtitle),preparedBy:e(r.prepared_by||'Codex'),headline:e(r.session_analysis?.headline||r.title),intro:e(r.session_analysis?.nature||''),date:r.date,disclaimer:e(r.disclaimer||''),tomorrowText:e(r.session_analysis?.tomorrow||'لا توجد توقعات موثقة في هذه اللقطة.'),sessionReading:{nature:e(r.session_analysis?.nature||''),liquidityDirection:e(r.session_analysis?.liquidity||'غير متاح'),investorBehavior:'تدفقات فئات المستثمرين غير متاحة في الملف؛ لا تُستنتج من حركة الأسعار.',catalysts:(r.audit?.notes||[]).map(e)},indicesSection:{items:Object.entries(r.indices||{}).map(([code,q])=>({code,name:e(q.name||code),icon:'📊',close:q.close,prevClose:q.previous_close??null,change:q.change_pct,pointsChange:q.previous_close==null||q.close==null?null:q.close-q.previous_close,desc:e(q.source||'مصدر غير محدد')})),funds:(r.funds||[]).map(f=>({name:e(f.name),note:e(f.source||''),price:f.price,change:f.change_pct}))},marketOpportunities:{topGainers:(r.market_summary?.top_gainers||[]).map(stock),topLosers:(r.market_summary?.top_losers||[]).map(stock),activeVolume:Object.values(r.stocks||{}).filter(q=>q.volume!=null).sort((a,b)=>b.volume-a.volume).slice(0,4).map(q=>({name:e(q.name||q.ticker),code:e(q.ticker),note:'حجم الجلسة المسجل',val:fmtPrice(q.volume,0)+' سهم'}))},indexTargets:{EGX30:{name:'مؤشر EGX30',resistance:'غير متاح',support:'غير متاح',note:'لم تتوفر مستويات فنية موثقة للمؤشر.'},EGX33:{name:'مؤشر الشريعة EGX33',resistance:'غير متاح',support:'غير متاح',note:'لم تتوفر مستويات فنية موثقة للمؤشر.'}},riskManagement:{tips:(r.audit?.notes||[]).map(e),disclaimer:e(r.disclaimer||'')}}};}
function renderTop(r,daily){const {rpt}=dto(r),dailyLabel=e(daily?.label||'لا تتوفر مقارنة مكتملة لحيازات إغلاق الجلسة السابقة.'),emptyMovers=daily?.rows?.length?'لا توجد أصول متراجعة ضمن الحيازات المغطاة.':'لا تتوفر حيازات ذات مقارنة تاريخية مكتملة.',posTotal=daily?.delta!=null&&daily.delta>=0,totalDayChangeVal=daily?.delta??null,totalDayChangePct=daily?.pct??null;
 const movers=(daily?.rows||[]).map(m=>({...m,name:e(m.ticker),ticker:e(m.ticker),isFund:market.assets[m.ticker]?.type==='fund',isGold:market.assets[m.ticker]?.type==='gold',changePct:m.pct,dayGain:m.amount})),gainersList=movers.filter(m=>Number.isFinite(m.amount)&&m.amount>0),declinersList=movers.filter(m=>Number.isFinite(m.amount)&&m.amount<=0),gainersCountStocks=gainersList.filter(m=>!m.isFund&&!m.isGold).length,gainersCountFunds=gainersList.length-gainersCountStocks;
 const totalTurnover='غير متاح',instNetVal='غير متاح',instNote='لا تتوفر بيانات تدفقات موثقة لفئات المستثمرين في المصدر.',retailNetVal='غير متاح',retailNote=instNote,egArabNetVal='غير متاح',egArabNote=instNote,foreignersNetVal='غير متاح',targetTomorrow='الجلسة التالية',marketGainHeadline='غير متاح',marketGainIsPos=false;
 const item=code=>{const q=r.indices?.[code];return q?{close:q.close,change:q.change_pct}:null;},egx30Item=item('EGX30'),egx33Item=item('EGX33'),goldItem=r.fx_gold?.gold_24k_local?{close:r.fx_gold.gold_24k_local.close,change:r.fx_gold.gold_24k_local.chgPct}:null,usdItem=r.fx_gold?.usd_egp?{close:r.fx_gold.usd_egp.close,change:r.fx_gold.usd_egp.chgPct}:null,egx30ChangePts=r.indices?.EGX30?.previous_close==null?null:r.indices.EGX30.close-r.indices.EGX30.previous_close,egx33ChangePts=r.indices?.EGX33?.previous_close==null?null:r.indices.EGX33.close-r.indices.EGX33.previous_close,egx30IsPos=egx30Item?.change>=0,egx33IsPos=egx33Item?.change>=0,goldIsPos=goldItem?.change>=0;
 const eodAuditBadgeHtml='<div class="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 border border-emerald-600/70 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-md mb-2"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><div><b class="text-white">🔒 تقرير '+(r.kind==='weekly'?'أسبوعي':r.kind==='monthly'?'شهري':r.report_type==='non_trading_day'?'عطلة البورصة':'نهاية اليوم')+' المؤرخ:</b> <span class="text-[11px] text-emerald-300/90">'+e(r.audit?.policy||'لقطة مستقلة لهذه الجلسة.')+'</span></div></div><span class="shrink-0 text-[10px] font-mono bg-emerald-900/90 text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-700 font-bold">'+e(r.period_start?r.period_start+' — '+r.period_end:r.date)+'</span></div>';
 const reportMode=r.kind==='weekly'?'أسبوعي':r.kind==='monthly'?'شهري':r.report_type==='non_trading_day'?'عطلة البورصة':'نهاية اليوم';
 return `
                ${eodAuditBadgeHtml}

                <div class="rounded-2xl border border-slate-700/80 overflow-hidden shadow-xl" style="background:linear-gradient(135deg,#0a101d 0%,#0f172a 100%)">
                    <div class="px-4 py-3.5 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2" style="background:linear-gradient(90deg,rgba(16,185,129,0.15),transparent)">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-lg">📌</span>
                                <span class="text-xs font-bold text-emerald-400">${rpt.title}</span>
                            </div>
                            <div class="flex items-center gap-2 flex-wrap mt-1"><p class="text-[10px] text-slate-400">${rpt.subtitle} • مصدر: ${rpt.preparedBy}</p><span class="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1"><span>🔒</span><span>تقرير ${reportMode} مستقل مؤرخ</span></span></div>
                        </div>
                        <button data-legacy-click="askGeminiDailyReportSummary()" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95">
                            <span>🤖</span>
                            <span>تحليل التقرير المحدد بـ Groq</span>
                        </button>
                    </div>
                    <div class="p-4 space-y-3">
                        <div class="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                            <h3 class="text-xs sm:text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                                <span>🚀</span>
                                <span>${rpt.headline}</span>
                            </h3>
                            <p class="text-xs text-slate-300 leading-relaxed">${rpt.intro}</p>
                        </div>
                    </div>
                </div>


                <div class="rounded-2xl border border-emerald-800/80 p-4 shadow-xl space-y-3" style="background:linear-gradient(135deg,#061a14 0%,#0c251d 100%)">
                    <div class="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-800/50 pb-2.5">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">💼</span>
                            <div>
                                <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                    <span>أثر حركة البورصة ${r.kind!=='daily'&&r.kind?'خلال الفترة':'اليوم'} على محفظتك الاستثمارية</span>
                                    <span class="text-[9.5px] bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1"><span>🔒</span><span>${r.kind!=='daily'&&r.kind?'نتيجة دفتر العمليات للفترة':'حيازات الجلسة السابقة من دفتر العمليات'}</span></span>
                                </h3>
                                <p class="text-[10px] text-emerald-300/80">${dailyLabel}</p>
                            </div>
                        </div>
                        <div class="text-left font-mono">
                            <span class="text-[10px] text-slate-400 block font-sans">صافي التغير الإجمالي ${r.kind!=='daily'&&r.kind?'خلال الفترة':'اليوم'}:</span>
                            <span class="text-sm sm:text-base font-bold ${posTotal ? 'text-emerald-400' : 'text-rose-400'} font-mono">${signed(totalDayChangeVal)} ج.م (${fmtPct(totalDayChangePct)})</span>
                        </div>
                    </div>


                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">

                        <div class="p-3 rounded-xl bg-slate-900/90 border border-emerald-900/60 space-y-2">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-1">
                                <span class="font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span>🟢</span>
                                    <span>الأسهم والصناديق الأكثر صعوداً بمحفظتك ${r.kind!=='daily'&&r.kind?'خلال الفترة':'اليوم'}:</span>
                                </span>
                                <span class="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded">${gainersCountStocks} أسهم + ${gainersCountFunds} صناديق/ذهب</span>
                            </div>
                            <div class="space-y-1.5 font-mono text-[11px]">
                                ${gainersList.map(m => `
                                <div class="flex justify-between items-center bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span class="font-bold text-white">${m.name} (${m.ticker} - ${fmtPrice(m.qty,m.qty<1?4:0)} ${m.isFund ? 'وثيقة' : (m.isGold ? 'جرام' : 'سهم')})</span>
                                    <span class="text-emerald-400 font-bold">${fmtPct(m.changePct)} (${signed(m.dayGain)} ج)</span>
                                </div>`).join('')}
                            </div>
                        </div>


                        <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-1">
                                <span class="font-bold text-slate-300 flex items-center gap-1.5">
                                    <span>⚖️</span>
                                    <span>الأصول المتراجعة أو المتحوطة بمحفظتك:</span>
                                </span>
                                <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">تحوط واستقرار (${declinersList.length})</span>
                            </div>
                            <div class="space-y-1.5 font-mono text-[11px]">
                                ${declinersList.length > 0 ? declinersList.map(m => `
                                <div class="flex justify-between items-center bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                                    <span class="text-slate-300">${m.name} (${m.ticker} - ${fmtPrice(m.qty,m.qty<1?4:0)} ${m.isFund ? 'وثيقة' : (m.isGold ? 'جرام' : 'سهم')})</span>
                                    <span class="${m.dayGain < -0.001 ? 'text-rose-400' : 'text-slate-300'} font-bold">${fmtPct(m.changePct)} (${signed(m.dayGain)} ج)</span>
                                </div>`).join('') : `
                                <div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 text-center">
                                    ${emptyMovers}
                                </div>`}
                                <div class="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[10.5px] font-sans text-slate-300 leading-relaxed">
                                    💡 <b>ملاحظة المدقق المالي:</b> ${dailyLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div class="rounded-2xl border border-sky-800/80 p-4 shadow-xl space-y-3" style="background:linear-gradient(135deg,#061324 0%,#091d36 100%)">
                    <div class="flex items-center justify-between flex-wrap gap-2 border-b border-sky-800/50 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">📊</span>
                            <div>
                                <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                    <span>خريطة المتعاملين وأحجام التداول (Volume & Participants)</span>
                                    <span class="text-[9.5px] bg-sky-950 text-sky-300 border border-sky-700 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1"><span>📊</span><span>قراءة المصدر المؤرخ</span></span>
                                </h3>
                                <p class="text-[10px] text-sky-300/80">تصنيف فئات المستثمرين (أفراد مقابل مؤسسات) وصافي التدفقات المالية بالبورصة المصرية</p>
                            </div>
                        </div>
                        <div class="text-xs bg-sky-950/80 text-sky-300 border border-sky-700 px-3 py-1 rounded-xl font-mono font-bold">
                            إجمالي قيمة التداول: ${totalTurnover}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        <div class="p-3 rounded-xl bg-slate-900/90 border border-emerald-800/60 space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-emerald-400">المؤسسات</span>
                                <span class="text-[9.5px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono">غير متاح</span>
                            </div>
                            <div class="text-sm font-bold text-emerald-300 font-mono">${instNetVal}</div>
                            <p class="text-[10px] text-slate-300">${instNote}</p>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-900/90 border border-rose-800/60 space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-rose-400">الأفراد</span>
                                <span class="text-[9.5px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded font-mono">غير متاح</span>
                            </div>
                            <div class="text-sm font-bold text-rose-300 font-mono">${retailNetVal}</div>
                            <p class="text-[10px] text-slate-300">${retailNote}</p>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-900/90 border border-sky-800/60 space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-sky-300">المصريون والعرب</span>
                                <span class="text-[9.5px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded font-mono">غير متاح</span>
                            </div>
                            <div class="text-sm font-bold text-white font-mono">${egArabNetVal}</div>
                            <p class="text-[10px] text-slate-300">${egArabNote}</p>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-900/90 border border-amber-800/60 space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-amber-300">الأجانب</span>
                                <span class="text-[9.5px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono">غير متاح</span>
                            </div>
                            <div class="text-sm font-bold text-amber-200 font-mono">${foreignersNetVal}</div>
                            <p class="text-[10px] text-slate-300">${instNote}</p>
                        </div>
                    </div>
                </div>


                <div class="rounded-2xl border border-purple-800/80 p-4 shadow-xl space-y-3" style="background:linear-gradient(135deg,#120924 0%,#1e1038 100%)">
                    <div class="flex items-center justify-between flex-wrap gap-2 border-b border-purple-800/50 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🔮</span>
                            <div>
                                <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                    <span>توقعات حركة جلسة الغد والتوصيات التنفيذية المقترحة (${targetTomorrow})</span>
                                    <span class="text-[9.5px] bg-purple-950 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-full font-bold">خطة التداول</span>
                                </h3>
                                <p class="text-[10px] text-purple-300/80">سيناريو التحركات الفنية للمؤشرات والأسهم القيادية وإجراءات إدارة المحفظة</p>
                            </div>
                        </div>
                        <span class="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-xl font-bold">متابعة مشروطة بالبيانات</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div class="p-3 rounded-xl bg-slate-900/90 border border-purple-900/60 space-y-1.5">
                            <span class="font-bold text-purple-300 flex items-center gap-1"><span>📈</span><span>مؤشر الشريعة EGX33:</span></span>
                            <div class="text-slate-300 text-[11px] leading-relaxed">
                                ${rpt.tomorrowText}
                            </div>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-900/90 border border-purple-900/60 space-y-1.5"><span class="font-bold text-emerald-300 flex items-center gap-1"><span>🎯</span><span>متابعة الأسهم والصناديق:</span></span><div class="text-slate-300 text-[11px] leading-relaxed">${rpt.tomorrowText}</div></div>
                        <div class="p-3 rounded-xl bg-slate-900/90 border border-purple-900/60 space-y-1.5">
                            <span class="font-bold text-amber-300 flex items-center gap-1"><span>🛡️</span><span>إدارة السيولة والمخاطر:</span></span>
                            <div class="text-slate-300 text-[11px] leading-relaxed">
                                ${rpt.disclaimer}
                            </div>
                        </div>
                    </div>
                </div>


                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
                        <div class="text-[10px] text-slate-400 font-medium">حركة رأس المال السوقي</div>
                        <div class="text-xs font-bold ${marketGainIsPos ? 'text-emerald-400' : 'text-rose-400'} font-mono">${marketGainHeadline}</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
                        <div class="text-[10px] text-slate-400 font-medium">مؤشر EGX30</div>
                        <div class="text-xs font-bold ${egx30IsPos ? 'text-emerald-400' : 'text-rose-400'} font-mono">
                            ${egx30Item ? fmtPrice(egx30Item.close,1) + ' (' + fmtPct(egx30Item.change) + ')' : '—'}
                        </div>
                        <div class="text-[9.5px] font-mono ${egx30IsPos ? 'text-emerald-400' : 'text-rose-400'}">
                            ${signed(egx30ChangePts,1)} نقطة
                        </div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border ${egx33IsPos ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-rose-900/50 bg-rose-950/20'} text-center space-y-1">
                        <div class="text-[10px] ${egx33IsPos ? 'text-emerald-400' : 'text-rose-400'} font-bold">EGX33 الشريعة ${egx33IsPos ? '🚀' : '⚖️'}</div>
                        <div class="text-xs font-bold ${egx33IsPos ? 'text-emerald-300' : 'text-rose-300'} font-mono">
                            ${egx33Item ? fmtPrice(egx33Item.close) + ' (' + fmtPct(egx33Item.change) + ')' : '—'}
                        </div>
                        <div class="text-[9.5px] font-mono ${egx33IsPos ? 'text-emerald-400' : 'text-rose-400'}">
                            ${signed(egx33ChangePts)} نقطة
                        </div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
                        <div class="text-[10px] text-slate-400 font-medium">شراء المؤسسات</div>
                        <div class="text-xs font-bold text-sky-400 font-mono">${instNetVal}</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
                        <div class="text-[10px] text-slate-400 font-medium">ذهب عيار 24</div>
                        <div class="text-xs font-bold ${goldIsPos ? 'text-amber-400' : 'text-rose-400'} font-mono">
                            ${goldItem ? fmtPrice(goldItem.close) + ' ج (' + fmtPct(goldItem.change) + ')' : '—'}
                        </div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-1">
                        <div class="text-[10px] text-slate-400 font-medium">الدولار (USD/EGP)</div>
                        <div class="text-xs font-bold text-white font-mono">${usdItem?fmtPrice(usdItem.close)+' ج ('+fmtPct(usdItem.change)+')':'غير متاح'}</div>
                    </div>
                </div>`;
}
function renderMain(r){const {rpt,sourceLink}=dto(r);return `
                <div class="space-y-4">


                    <div class="rounded-2xl border border-slate-800 p-4 space-y-3 shadow-lg" style="background:rgba(10,15,28,0.96)">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 class="text-xs font-bold text-white flex items-center gap-2">
                                <span>📝</span>
                                <span>1. قراءة عامة للجلسة وسلوك السيولة</span>
                            </h3>
                            <span class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">قراءة العينة المؤرخة</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                                <span class="text-[10.5px] font-bold text-emerald-400">طابع الجلسة:</span>
                                <p class="leading-relaxed text-slate-300">${rpt.sessionReading.nature}</p>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                                <span class="text-[10.5px] font-bold text-sky-400">اتجاه السيولة:</span>
                                <p class="leading-relaxed text-slate-300">${rpt.sessionReading.liquidityDirection}</p>
                            </div>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                            <span class="text-[10.5px] font-bold text-amber-300 flex items-center gap-1.5">
                                <span>⚡</span>
                                <span>محفزات السوق الرئيسية:</span>
                            </span>
                            <div class="space-y-2">
                                ${rpt.sessionReading.catalysts.map(c => {
                                    const linkInfo = sourceLink;
                                    return `
                                    <div class="flex items-start justify-between gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 hover:border-slate-700 transition">
                                        <div class="flex items-start gap-2">
                                            <span class="text-emerald-400 mt-0.5 shrink-0">✔</span>
                                            <span class="leading-relaxed text-slate-200">${c}</span>
                                        </div>
                                        <a href="${linkInfo.url}" target="_blank" rel="noopener noreferrer" class="shrink-0 px-2 py-1 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-700/80 text-sky-300 font-bold text-[10px] flex items-center gap-1 transition shadow-sm" title="فتح الخبر الأصلي كاملاً من المصدر الرسمي مباشرة">
                                            <span>🔗</span>
                                            <span>${linkInfo.label} ↗</span>
                                        </a>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                        <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
                            <span class="text-[10.5px] font-bold text-purple-400">سلوك المتعاملين:</span>
                            <p class="leading-relaxed text-slate-300">${rpt.sessionReading.investorBehavior}</p>
                        </div>
                    </div>


                    <div class="rounded-2xl border border-slate-800 p-4 space-y-3 shadow-lg" style="background:rgba(10,15,28,0.96)">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 class="text-xs font-bold text-white flex items-center gap-2">
                                <span>📊</span>
                                <span>2. حركة المؤشرات الرئيسية والعملات</span>
                            </h3>
                            <span class="text-[10px] text-slate-400">إغلاق مؤرخ</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            ${rpt.indicesSection.items.map(idx => {
                                const isPos = idx.change >= 0;
                                const pts = idx.pointsChange;
                                return `
                                <div class="p-3 rounded-xl bg-slate-900/80 border ${isPos ? 'border-slate-800 hover:border-emerald-700/60' : 'border-slate-800 hover:border-rose-700/60'} space-y-2 shadow-sm transition">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold text-white flex items-center gap-1.5">
                                            <span>${idx.icon}</span>
                                            <span>${idx.name}</span>
                                        </span>
                                        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${isPos ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-rose-950/80 text-rose-300 border-rose-800'}">
                                            ${fmtPct(idx.change)}
                                        </span>
                                    </div>
                                    <div class="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1 font-mono text-xs">
                                        <div class="flex items-center justify-between">
                                            <span class="text-slate-400 text-[11px]">الإغلاق:</span>
                                            <b class="text-white text-xs">${fmtPrice(idx.close)}</b>
                                        </div>
                                        <div class="flex items-center justify-between">
                                            <span class="text-slate-400 text-[11px]">إغلاق الجلسة السابقة:</span>
                                            <span class="text-slate-300 text-xs">${fmtPrice(idx.prevClose)}</span>
                                        </div>
                                        <div class="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                                            <span class="text-slate-400">التغير بالنقاط:</span>
                                            <b class="${isPos ? 'text-emerald-400' : 'text-rose-400'} font-bold">${signed(pts)} نقطة</b>
                                        </div>
                                    </div>
                                    <p class="text-[10.5px] text-slate-300 leading-relaxed pt-1 border-t border-slate-800/80">${idx.desc}</p>
                                </div>`;
                            }).join('')}
                        </div>


                        <div class="pt-2">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <span>🏛️</span>
                                    <span>صناديق الاستثمار الإسلامية والذهب (Thndr / Funds):</span>
                                </span>
                                <span class="text-[10px] text-slate-400">أسعار الوثائق</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                ${rpt.indicesSection.funds.map(f => `
                                <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                                    <div>
                                        <div class="font-bold text-white text-[11px]">${f.name}</div>
                                        <div class="text-[10px] text-slate-400">${f.note}</div>
                                    </div>
                                    <div class="text-left font-mono">
                                        <div class="font-bold text-amber-300">${fmtPrice(f.price)} ج</div>
                                        <div class="text-[10px] ${f.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${fmtPct(f.change)}</div>
                                    </div>
                                </div>`).join('')}
                            </div>
                        </div>
                    </div>


                    <div class="rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-lg" style="background:rgba(10,15,28,0.96)">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
                            <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                <span id="drSec3Icon">💼</span>
                                <span id="drSec3Title">3. أسهم المحفظة (التحليل التفصيلي والقرارات)</span>
                            </h3>

                            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                                <button id="drSec3SlicerHoldings" data-legacy-click="setDrSection3Slicer('holdings')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow ring-1 ring-emerald-400">
                                    <span>💼</span>
                                    <span>أصول المحفظة في التقرير</span>
                                </button>
                                <button id="drSec3SlicerAll" data-legacy-click="setDrSection3Slicer('all_sharia')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                                    <span>🕌</span>
                                    <span>كل أسهم اللقطة</span>
                                </button>
                            </div>
                        </div>


                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-bold text-white">📊 نسب التغير اليومية (%)</span>
                                    <span id="drSec3ChartSub1" class="text-[9.5px] text-slate-400">أسهم المحفظة (جلسة اليوم)</span>
                                </div>
                                <div style="height:160px"><canvas id="drChartChanges"></canvas></div>
                            </div>
                            <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-bold text-white">⚡ مؤشر القوة النسبية RSI(14)</span>
                                    <span id="drSec3ChartSub2" class="text-[9.5px] text-slate-400">مناطق الزخم</span>
                                </div>
                                <div style="height:160px"><canvas id="drChartRSI"></canvas></div>
                            </div>
                        </div>


                        <div id="drSec3CardsContainer" class="space-y-3">

                        </div>
                    </div>


                    <div class="rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-lg" style="background:rgba(10,15,28,0.96)">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                <span>🚀</span>
                                <span>4. أبرز الفرص والأسهم النشطة بالسوق</span>
                            </h3>
                            <span class="text-[10px] text-slate-400">لقطة مؤرخة</span>
                        </div>


                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    <span>🟢</span>
                                    <span>أعلى الأسهم صعوداً (Top Gainers):</span>
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">مصدر اللقطة</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                ${rpt.marketOpportunities.topGainers.map(s => {
                                    const linkInfo = sourceLink;
                                    return `
                                    <div class="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                                        <div>
                                            <div class="font-bold text-white text-[11px] flex items-center gap-1">
                                                <span>${s.name}</span>
                                                <a href="${linkInfo.url}" target="_blank" rel="noopener noreferrer" class="text-[9.5px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 font-bold" title="عرض الإفصاح الرسمي">🔗 مصدر ↗</a>
                                            </div>
                                            <div class="text-[10px] text-slate-400 font-mono">${s.code} | إغلاق: ${fmtPrice(s.close)} ج</div>
                                        </div>
                                        <div class="text-left font-mono">
                                            ${pctBadge(s.change)}
                                            <div class="mt-1">${signalBadge(s.signal, s.signalType)}</div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>


                        ${(rpt.marketOpportunities.topLosers && rpt.marketOpportunities.topLosers.length > 0) ? `
                        <div class="space-y-2 pt-2 border-t border-slate-800">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                    <span>🔴</span>
                                    <span>الأسهم الأكثر تراجعاً وجني أرباح (Top Decliners):</span>
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">فرص ارتداد وتبريد</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                ${rpt.marketOpportunities.topLosers.map(s => {
                                    const linkInfo = sourceLink;
                                    return `
                                    <div class="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                                        <div>
                                            <div class="font-bold text-white text-[11px] flex items-center gap-1">
                                                <span>${s.name}</span>
                                                <a href="${linkInfo.url}" target="_blank" rel="noopener noreferrer" class="text-[9.5px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 font-bold" title="عرض الإفصاح الرسمي">🔗 مصدر ↗</a>
                                            </div>
                                            <div class="text-[10px] text-slate-400 font-mono">${s.code} | إغلاق: ${fmtPrice(s.close)} ج</div>
                                        </div>
                                        <div class="text-left font-mono">
                                            ${pctBadge(s.change)}
                                            <div class="mt-1">${signalBadge(s.signal, s.signalType)}</div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>` : ''}


                        <div class="space-y-2 pt-2 border-t border-slate-800">
                            <span class="text-xs font-bold text-sky-400">الأسهم الأكثر نشاطاً من حيث حجم التداول:</span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                ${rpt.marketOpportunities.activeVolume.map(v => `
                                <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                                    <div>
                                        <div class="font-bold text-white text-[11px]">${v.name} (${v.code})</div>
                                        <div class="text-[10px] text-slate-400">${v.note}</div>
                                    </div>
                                    <div class="font-bold text-emerald-400 font-mono text-[11px]">${v.val}</div>
                                </div>`).join('')}
                            </div>
                        </div>
                    </div>


                    ${(() => {const tmrwDay='الجلسة التالية',tmrwOutlook=rpt.tomorrowText,egx30Target=rpt.indexTargets.EGX30,egx33Target=rpt.indexTargets.EGX33,riskMgmt=rpt.riskManagement;
return `
                        <div class="rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-lg" style="background:rgba(10,15,28,0.96)">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                    <span>🔮</span>
                                    <span>5. سيناريو حركة المؤشرات وتوقعات جلسة الغد (${tmrwDay})</span>
                                </h3>
                                <span class="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full font-bold">قراءة مشروطة</span>
                            </div>

                            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
                                <span class="font-bold text-sky-400">التوقع العام:</span>
                                <p class="text-slate-300 leading-relaxed">${tmrwOutlook}</p>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                                    <div class="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <span>📈</span>
                                        <span>${egx30Target.name}:</span>
                                    </div>
                                    <div class="text-slate-300">
                                        <div>🔴 مستويات المقاومة: <b class="text-rose-300 font-mono">${egx30Target.resistance}</b></div>
                                        <div>🔵 مستويات الدعم: <b class="text-sky-300 font-mono">${egx30Target.support}</b></div>
                                    </div>
                                    <p class="text-[10.5px] text-slate-400 italic">${egx30Target.note}</p>
                                </div>

                                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                                    <div class="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <span>☪️</span>
                                        <span>${egx33Target.name}:</span>
                                    </div>
                                    <div class="text-slate-300">
                                        <div>🔴 مستويات المقاومة: <b class="text-rose-300 font-mono">${egx33Target.resistance}</b></div>
                                        <div>🔵 مستويات الدعم: <b class="text-sky-300 font-mono">${egx33Target.support}</b></div>
                                    </div>
                                    <p class="text-[10.5px] text-slate-400 italic">${egx33Target.note}</p>
                                </div>
                            </div>
                        </div>


                        <div class="rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-lg" style="background:rgba(10,15,28,0.96)">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                    <span>💡</span>
                                    <span>6. نصائح إدارة المخاطر وتوجيهات التداول</span>
                                </h3>
                                <span class="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">قواعد الأمان المالي</span>
                            </div>

                            <div class="space-y-2">
                                ${(riskMgmt.tips || []).map((tip, i) => `
                                <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                                    <span class="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">${i+1}</span>
                                    <p class="leading-relaxed">${tip}</p>
                                </div>`).join('')}
                            </div>

                            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10.5px] text-slate-400 leading-relaxed italic">
                                ${riskMgmt.disclaimer || ''}
                            </div>
                        </div>`;
                    })()}

                </div>`;
}
window.LegacyReportLayout={top:renderTop,main:renderMain,pctBadge,signalBadge,fmtPrice,fmtPct};
})();
