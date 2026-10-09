/* Original card markup. Values come exclusively from the independent application. */
(function(){'use strict';
const C=window.InvestCore,e=C.esc,n=(v,d=2)=>v==null||!Number.isFinite(v)?'غير متاح':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}),pc=v=>v==null?'غير متاح':(v>0?'+':'')+n(v)+'%',change=q=>q.previous_close!=null&&q.previous_session_date?C.change(q.close,q.previous_close).pct:null;
function validUrl(url){try{const u=new URL(url);return u.protocol==='https:'?e(u.href):'';}catch{return '';}}
function stockCard(symbol,q){
 const s={ticker:e(symbol),name:e(q.name),close:q.close,chg:change(q),rsi:q.rsi??null,volume:q.volume??null,sector:e(q.sector||'جلسة '+q.session_date),rec:'متابعة'},vd=null,margin=null,dayHigh=q.high??null,dayLow=q.low??null;
 const rangePct=dayHigh!=null&&dayLow!=null&&dayHigh>dayLow&&s.close!=null?Math.round(Math.max(0,Math.min(100,(s.close-dayLow)/(dayHigh-dayLow)*100))):null;
 const history=state.histories[symbol],technical=history?C.indicators(history.candles):null,piv=technical?.pivot??null;
 const isPos=s.chg!=null&&s.chg>0,isNeg=s.chg!=null&&s.chg<0,chgColor=isPos?'text-emerald-400':isNeg?'text-rose-400':'text-slate-300',chgBg=isPos?'bg-emerald-950/70 border-emerald-800':isNeg?'bg-rose-950/70 border-rose-800':'bg-slate-900 border-slate-700';
 const arabicRec='<span class="text-[10px] font-bold text-amber-400">متابعة</span>',arabicPe='',arabicRsi=s.rsi==null?'':'<span class="text-[10px] font-mono text-slate-400">RSI: '+n(s.rsi,1)+'</span>',tagBadges=['<span class="text-[9px] font-mono px-1.5 py-0.2 rounded border bg-slate-900 text-slate-300 border-slate-700">↗️ ارتكاز '+n(piv?.pp)+'</span>'];
 return `<div class="glass-card rounded-2xl p-3 space-y-2 hover:border-slate-600 transition" data-ticker="${s.ticker}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200">${s.ticker}</span>
                            <div>
                                <h4 class="font-bold text-xs text-white">${s.name}</h4>
                                <span class="text-[10px] text-slate-400">${s.sector || 'سوق الأسهم المصري'}</span>
                            </div>
                        </div>
                        <div class="text-left font-mono">
                            <div class="text-xs font-bold text-white flex items-center justify-end gap-1">
                                <span class="w-1.5 h-1.5 rounded-full ${isPos ? 'bg-emerald-400' : (isNeg ? 'bg-rose-400' : 'bg-slate-400')}"></span>
                                <span class="live-stock-price transition px-1 py-0.5 rounded font-bold">${n(s.close)} ج</span>
                            </div>
                            <span class="live-stock-chg inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${chgBg} ${chgColor} mt-0.5">
                                ${pc(s.chg)}
                            </span>
                        </div>
                    </div>


                    <div class="space-y-0.5 pt-0.5">
                        <div class="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>أدنى: ${n(dayLow)}</span>
                            <span>نطاق الجلسة (${rangePct==null?'غير متاح':rangePct+'%'})</span>
                            <span>أعلى: ${n(dayHigh)}</span>
                        </div>
                        <div class="w-full bg-slate-950 rounded-full h-1 relative overflow-hidden border border-slate-800/80">
                            <div class="h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" style="width: 100%"></div>
                            <div class="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow" style="right: ${rangePct??50}%; visibility:${rangePct==null?'hidden':'visible'}; transform: translateX(50%)"></div>
                        </div>
                    </div>


                    <div class="flex items-center gap-1.5 flex-wrap pt-0.5 text-[9.5px] font-mono">
                        <span class="bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                            <span>🎯 عادلة:</span>
                            <b class="text-white">${n(vd?.base,1)} ج</b>
                            <span class="${margin >= 20 ? 'text-emerald-400 font-bold' : 'text-amber-300'}">(${pc(margin)})</span>
                        </span>
                        <span class="bg-sky-950/80 text-sky-300 border border-sky-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                            <span>⚡ RSI:</span>
                            <b class="text-white">${n(s.rsi,0)}</b>
                            <span class="text-slate-400">| S1: ${n(piv?.s1,1)}</span>
                        </span>
                        <span class="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-lg font-sans flex items-center gap-1 font-bold shadow-sm">
                            <span>🕌 ${e(q.status==='unverified'?'سعر غير متحقق':'مرجع مؤرخ')}</span>
                        </span>

                        <span class="bg-slate-900 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded-lg font-mono flex items-center gap-1 shadow-sm text-[10px]">
                            <span>📊 تداول:</span>
                            <b class="text-white">${s.volume==null?'غير متاح':n(s.volume,0)+' سهم'}</b>
                        </span>
                    </div>


                    <div class="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs flex-wrap gap-1.5">
                        <div class="flex items-center gap-2 flex-wrap">
                            ${arabicRec}
                            ${arabicPe}
                            ${arabicRsi}
                            ${tagBadges.join(' ')}
                        </div>
                        <div class="flex items-center gap-1">
                            <button data-legacy-click="openPivotModal('${s.ticker}')" title="الارتكاز من السلسلة المسجلة" class="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                <span>📐</span> <span>الارتكاز</span>
                            </button>
                            <button data-legacy-click="openCustomAlertModal('${s.ticker}')" title="ضبط تنبيه مشروط" class="px-2 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                <span>🔔</span> <span>تنبيه</span>
                            </button>
                            <button data-legacy-click="openStockChart('${s.ticker}')" class="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                <span>📈</span> <span>الشارت</span>
                            </button>
                            <button data-legacy-click="askAiAboutStock('${s.ticker}')" class="px-2 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                <span>🤖</span> <span>تحليل AI</span>
                            </button>
                            <button data-legacy-click="openStockValuation('${s.ticker}')" class="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                <span>🎯</span> <span>التقييم</span>
                            </button>
                        </div>
                    </div>
                 </div>`;
}
function fundCard(symbol,q){
 const s={ticker:e(symbol),name:e(q.name),close:q.close,chg:change(q),type:q.type},isGold=q.type==='gold'||symbol==='AZG',isUsd=false,isPos=s.chg!=null&&s.chg>=0,manager=e('مرجع '+q.session_date),assetDesc=e(q.name)+'؛ سعر مؤرخ من المشروع الجديد.',ytdReturn='غير متاح',liquidityInfo='تحتاج مصدرًا';
 return `
                    <div class="glass-card rounded-2xl p-3.5 space-y-2.5 border ${isUsd ? 'border-emerald-800/60 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/25' : (isGold ? 'border-amber-900/60 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20' : 'border-indigo-900/60 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/20')} hover:border-slate-600 transition">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-950 border ${isUsd ? 'border-emerald-600 text-emerald-300' : (isGold ? 'border-amber-700 text-amber-300' : 'border-indigo-700 text-indigo-300')}">${s.ticker}</span>
                                <div>
                                    <h4 class="font-bold text-xs text-white">${s.name}</h4>
                                    <span class="text-[10px] text-slate-400">${manager}</span>
                                </div>
                            </div>
                            <div class="text-left font-mono">
                                <div class="text-xs font-bold text-white flex items-center justify-end gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full ${isUsd ? 'bg-emerald-400' : (isGold ? 'bg-amber-400' : 'bg-emerald-400')}"></span>
                                    <span class="text-sm font-bold ${isUsd ? 'text-emerald-300' : 'text-amber-300'}">${n(s.close,s.type==='fund'?4:2)} ج</span>
                                </div>
                                <span class="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${isPos ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' : 'bg-rose-950/70 border-rose-800 text-rose-400'} mt-0.5">
                                    ${pc(s.chg)}
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between text-[9.5px] bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800/80 font-sans">
                            <span class="text-slate-400 flex items-center gap-1"><span>📅</span> <span>${e('جلسة '+q.session_date)}</span></span>
                            <span class="text-emerald-400 font-mono font-bold">${e(q.status==='unverified'?'غير متحقق من الناشر':'لقطة مؤرخة')}</span>
                        </div>


                        <div class="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-[10.5px]">
                            <div>
                                <span class="block text-[8.5px] text-slate-500 font-sans">العائد / تحرك الصرف:</span>
                                <b class="text-emerald-400 font-mono font-bold">${ytdReturn}</b>
                            </div>
                            <div>
                                <span class="block text-[8.5px] text-slate-500 font-sans">مواعيد التسييل:</span>
                                <b class="text-slate-300 font-sans text-[10px]">${liquidityInfo}</b>
                            </div>
                            <div>
                                <span class="block text-[8.5px] text-slate-500 font-sans">تصنيف الأصل:</span>
                                <b class="${isUsd ? 'text-emerald-300' : (isGold ? 'text-amber-300' : 'text-sky-300')} font-sans text-[10px]">${isUsd ? 'نقد أجنبي وملاذ 💵' : (isGold ? 'ذهب خالص 🪙' : 'وثائق صندوق 📈')}</b>
                            </div>
                        </div>

                        <p class="text-[10px] text-slate-300 font-sans leading-relaxed">${assetDesc}</p>


                        <div class="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs flex-wrap gap-1.5">
                            <span class="text-[9.5px] text-slate-400 font-sans">${e('مصدر الأسعار بتاريخ '+q.session_date)}</span>
                            <div class="flex items-center gap-1">
                                <button data-legacy-click="openStockChart('${s.ticker}')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                    <span>📈</span> <span>${isUsd ? 'شارت الصرف' : 'الشارت التاريخي'}</span>
                                </button>
                                <button data-legacy-click="askAiAboutStock('${s.ticker}')" class="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-[10px] font-bold transition active:scale-95 flex items-center gap-1">
                                    <span>🤖</span> <span>تحليل AI</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
}
function newsCard(item){
 const symbol=item.symbols?.[0]||item.ticker||'',quote=market.assets[symbol],isOwned=C.portfolio(state,market).positions.some(h=>h.ticker===symbol),curPrice=quote?.close??null,chg=quote?change(quote):null,isPos=false,isNeg=false;
 const n={ticker:e(symbol),stock_name:e(quote?.name||item.publisher||'خبر السوق'),url:validUrl(item.url),title:e(item.title),summary:e(item.publisher||'مصدر مسجل'),time:e((item.published_at||item.date||'').slice(0,10)),impact_label:'خبر صحفي'},number=window.LegacyUI.n,percent=window.LegacyUI.pc;
 return `
                <div data-news-url="${n.url}" class="glass-card rounded-2xl p-3.5 border border-slate-800 hover:border-emerald-600/70 hover:bg-slate-800/40 transition space-y-2 cursor-pointer shadow-md group">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs font-bold text-white group-hover:text-emerald-400 transition">${n.stock_name || n.ticker}</span>
                            <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">${n.ticker}</span>
                            ${isOwned ? '<span class="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded-full font-bold">في محفظتك ✓</span>' : '<span class="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded-full">خبر منشور</span>'}
                            <span class="text-[9px] text-slate-400">${n.time}</span>
                        </div>
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${isPos ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : (isNeg ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800')}">
                            ${n.impact_label}
                        </span>
                    </div>

                    <h4 class="text-xs font-bold text-slate-200 leading-snug group-hover:text-sky-300 transition">${n.title}</h4>
                    <p class="text-[11px] text-slate-400 leading-relaxed">${n.summary}</p>


                    <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] flex-wrap gap-2">
                        <div class="flex items-center gap-2.5 font-mono">
                            ${curPrice > 0 ? `<span>السعر: <b class="text-white">${number(curPrice)} ج</b></span>` : ''}
                            ${curPrice > 0 ? `<span class="${chg >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold">${percent(chg)}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            ${n.url ? `<a href="${n.url || ('https://www.mubasher.info/markets/EGX/stocks/' + n.ticker + '/news')}" target="_blank"  rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-sky-950/90 border border-sky-800 text-sky-300 hover:bg-sky-900 font-bold flex items-center gap-1 font-sans text-[10px] shadow-sm transition active:scale-95" title="فتح مصدر الخبر الأصلي"><span>🔗 فتح المصدر ↗</span></a>` : ''}
                            <button data-legacy-click="event.stopPropagation(); showNewsTechnicalAnalysis('${n.ticker}')" class="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 font-bold flex items-center gap-1 text-[10px] shadow-sm transition active:scale-95">
                                <span>📐 فني</span>
                            </button>
                            <button data-legacy-click="openFloatingAiCopilot()" class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-900 to-purple-900 border border-purple-600 text-purple-200 hover:from-indigo-800 hover:to-purple-800 font-bold flex items-center gap-1 text-[10px] shadow-sm transition active:scale-95">
                                <span>🤖 أثر الخبر بـ Gemini</span>
                            </button>
                        </div>
                    </div>
                </div>`;
}
function researchCard(symbol,q){
 const research=state.research[symbol]||{},r={ticker:e(symbol),name:e(q.name),sector:e(q.sector||'سوق المال'),isOwned:C.portfolio(state,market).positions.some(h=>h.ticker===symbol),cur:q.close,rsi:q.rsi??null,fair:null,safety:null,target1:null,stopLoss:null,actionLabel:'بحث ومتابعة',badgeClass:'bg-amber-950 text-amber-300 border-amber-700/80'},isBuy=false,isDca=false,borderCol='border-amber-600/50 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20';
 return `
                <div class="glass-card rounded-2xl p-4 border ${borderCol} space-y-3 shadow-md transition hover:scale-[1.002]">

                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <div>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <h4 class="text-xs sm:text-sm font-bold text-white">${r.name || r.ticker}</h4>
                                    <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">${r.ticker}</span>
                                    ${r.isOwned ? '<span class="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded-full font-bold">في محفظتك ✓</span>' : ''}
                                </div>
                                <span class="text-[10px] text-slate-400">${r.sector || 'سوق المال'}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full border ${r.badgeClass}">
                            ${r.actionLabel}
                        </span>
                    </div>


                    <div class="space-y-2.5 text-xs text-slate-300">

                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                            <div class="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                                <span class="flex items-center gap-1"><span>🏢</span><span>1. نظرة عامة ونموذج العمل (Business Model):</span></span>
                                <span class="text-[9px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400">ISIN: ${e(q.isin||'غير متاح')}</span>
                            </div>
                            <p class="text-[10.5px] text-slate-300 leading-relaxed">
                                ${e(research.business||'لم يسجل بحث موثق لنموذج عمل الشركة.')}
                            </p>
                        </div>


                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                            <div class="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                                <span class="flex items-center gap-1"><span>📑</span><span>2. النتائج وجودة الأرباح (Quality of Earnings):</span></span>
                                <span class="text-[9.5px] font-mono text-emerald-400">${e(research.ocf==null||research.profit==null?'بيانات غير مكتملة':research.ocf>research.profit?'OCF > Net Income':'راجع جودة الأرباح')}</span>
                            </div>
                            <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-0.5">
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800"><span class="text-slate-400 block">الديون / الأصول</span><b class="text-emerald-400 font-mono">غير متاح</b></div>
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800"><span class="text-slate-400 block">مكرر الربحية (P/E)</span><b class="text-white font-mono">${n(q.pe,1)}</b></div>
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800"><span class="text-slate-400 block">التوزيعات النقدية</span><b class="text-sky-300 font-mono">${n(q.dividend_yield,1)}</b></div>
                            </div>
                        </div>


                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                            <div class="flex items-center justify-between text-[11px] font-bold text-amber-300">
                                <span class="flex items-center gap-1"><span>⚖️</span><span>3. التقييم المالي والسيناريوهات (Valuation & Scenarios):</span></span>
                                <span class="text-[9.5px] font-mono ${r.safety !== null && r.safety >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">هامش الأمان: ${r.safety !== null ? (r.safety >= 0 ? '+' : '') + r.safety.toFixed(1) + '%' : 'غير متاح'}</span>
                            </div>
                            <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-emerald-900/50"><span class="text-emerald-400 block font-bold">🟢 تفاؤلي (Bull)</span><b class="text-white font-mono">${r.fair ? +(r.fair * 1.15).toFixed(2) + ' ج' : '—'}</b></div>
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-amber-900/50"><span class="text-amber-300 block font-bold">🟡 أساسي (Base)</span><b class="text-amber-300 font-mono font-bold">${r.fair ? r.fair.toFixed(2) + ' ج' : '—'}</b></div>
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-rose-900/50"><span class="text-rose-400 block font-bold">🔴 متحفظ (Bear)</span><b class="text-white font-mono">${r.fair ? +(r.fair * 0.85).toFixed(2) + ' ج' : '—'}</b></div>
                            </div>
                        </div>


                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                            <div class="flex items-center justify-between text-[11px] font-bold text-sky-300">
                                <span class="flex items-center gap-1"><span>📐</span><span>4. السعر والسيولة ومخاطر السوق (Price & Technicals):</span></span>
                                <span class="text-[9.5px] font-mono text-sky-400">RSI(14): ${r.rsi ? r.rsi.toFixed(1) : 'غير متاح'}</span>
                            </div>
                            <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800"><span class="text-slate-400 block">السعر المؤرخ</span><b class="text-white font-mono">${r.cur > 0 ? r.cur.toFixed(2) + ' ج' : '—'}</b></div>
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800"><span class="text-slate-400 block">المقاومة المستهدفة</span><b class="text-rose-300 font-mono">${r.target1 ? r.target1 + ' ج' : '—'}</b></div>
                                <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800"><span class="text-slate-400 block">وقف الخسارة</span><b class="text-rose-400 font-mono">${r.stopLoss ? r.stopLoss + ' ج' : '—'}</b></div>
                            </div>
                        </div>


                        <div class="p-2.5 rounded-xl bg-slate-950/90 border border-purple-900/50 space-y-1">
                            <div class="flex items-center justify-between text-[11px] font-bold text-purple-300">
                                <span class="flex items-center gap-1"><span>🎯</span><span>5. الأطروحة والقرار الاستثماري (Thesis & Action):</span></span>
                                <span class="text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${r.badgeClass}">${r.actionLabel}</span>
                            </div>
                            <p class="text-[10.5px] text-slate-300 leading-relaxed">
                                <b>الأطروحة:</b> ${e(research.advantage||'تحتاج الأطروحة إلى مصادر ومدخلات المستخدم؛ لا تُولد توصية شراء تلقائية.')}
                            </p>
                        </div>
                    </div>


                    <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800/90 text-[10.5px] text-slate-300 leading-relaxed space-y-2">
                        <div class="flex items-center justify-between flex-wrap gap-1 border-b border-slate-800 pb-1.5">
                            <span class="flex items-center gap-1 font-bold text-amber-300 text-[11px]">
                                <span>📚</span> <span>رادار المنهجيات الاستثمارية والتحليل المنهجي الأكاديمي:</span>
                            </span>
                            <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400 border border-slate-800 font-bold">
                                معايير AAOIFI + Graham + Weinstein
                            </span>
                        </div>


                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5 text-[9.5px]">
                            <div class="p-1.5 rounded-lg bg-slate-900/90 border border-emerald-900/40">
                                <span class="text-emerald-400 font-bold block">📖 بنجامين جراهام (القيمة):</span>
                                <span class="text-slate-300">هامش أمان غير متاح؛ يحتاج افتراضات موثقة</span>
                            </div>
                            <div class="p-1.5 rounded-lg bg-slate-900/90 border border-sky-900/40">
                                <span class="text-sky-400 font-bold block">📊 أسواث داموداران (DCF):</span>
                                <span class="text-slate-300">لا تتوفر بيانات موثقة كافية لهذا الفحص.</span>
                            </div>
                            <div class="p-1.5 rounded-lg bg-slate-900/90 border border-purple-900/40">
                                <span class="text-purple-400 font-bold block">📈 ستان وينشتاين (المرحلة 2):</span>
                                <span class="text-slate-300">لا تتوفر بيانات موثقة كافية لهذا الفحص.</span>
                            </div>
                            <div class="p-1.5 rounded-lg bg-slate-900/90 border border-indigo-900/40">
                                <span class="text-indigo-400 font-bold block">⚡ مارك مينيرفيني (VCP):</span>
                                <span class="text-slate-300">لا تتوفر بيانات موثقة كافية لهذا الفحص.</span>
                            </div>
                            <div class="p-1.5 rounded-lg bg-slate-900/90 border border-amber-900/40">
                                <span class="text-amber-400 font-bold block">🛡️ د. ألكسندر إيلدر (Triple):</span>
                                <span class="text-slate-300">لا تتوفر بيانات موثقة كافية لهذا الفحص.</span>
                            </div>
                            <div class="p-1.5 rounded-lg bg-slate-900/90 border border-teal-900/40">
                                <span class="text-teal-400 font-bold block">🕌 معايير الأيوفي (AAOIFI):</span>
                                <span class="text-slate-300">لا تتوفر بيانات موثقة كافية لهذا الفحص.</span>
                            </div>
                        </div>


                        <div class="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                            <span class="text-slate-400">💡 <b>الخلاصة المنهجية:</b> ${e(research.risks||'راجع البيانات وتواريخ المصادر قبل اتخاذ القرار.')}</span>
                            <button data-legacy-click="askGeminiRecommendationCheck('${r.ticker}', '${r.name || r.ticker}', '${r.actionLabel}')" class="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center gap-1 shrink-0">
                                <span>🤖 تدقيق المنهجية بـ Gemini ←</span>
                            </button>
                        </div>
                    </div>


                    <div class="pt-1.5 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div class="flex items-center gap-1.5">
                            <button data-legacy-click="openTransactionModal('${r.ticker}', '${isBuy || isDca ? 'buy' : 'sell'}')" class="bg-gradient-to-r ${isBuy ? 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500' : isDca ? 'from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500' : 'from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500'} text-white font-bold text-[10.5px] px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm active:scale-95">
                                <span>➕ تسجيل عملية</span>
                            </button>
                            <button data-legacy-click="switchRecAnalysisSlicer('analysis'); askAiMarketAdvisor('تحليل سهم ${r.ticker}')" class="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-[10.5px] px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 border border-slate-700 active:scale-95">
                                <span>🤖</span>
                                <span>استشارة AI</span>
                            </button>
                        </div>
                        <button data-legacy-click="openStockChartModal('${r.ticker}')" class="text-sky-400 hover:text-sky-300 font-bold text-[10.5px] flex items-center gap-1 transition">
                            <span>📐 الشارت والتحليل الفني</span>
                            <span>←</span>
                        </button>
                    </div>
                </div>`;
}
window.LegacyMarketCards={stock:stockCard,fund:fundCard,news:newsCard,research:researchCard};
})();
