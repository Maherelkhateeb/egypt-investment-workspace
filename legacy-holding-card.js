/* Original holding card markup; all amounts supplied by InvestCore positions. */
(function(){
const e=window.InvestCore.esc;const number=(v,d=2)=>v==null||!Number.isFinite(v)?'غير متاح':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fixed=(v,d=2)=>v==null||!Number.isFinite(v)?'غير متاح':v.toFixed(d);
function createHoldingMobileCard(position, weightPct) {
            const h={ticker:e(position.ticker),name:e(position.name),qty:position.qty,buy:position.average,cur:position.price,sector:e(position.quote?.sector||'سوق المال')};
            const isFund=position.assetType==='fund', isP=position.unrealized!=null&&position.unrealized>=0;
            const mVal=position.value,cost=position.cost,pnl=position.unrealized,pnlPct=pnl==null||!cost?null:pnl/cost*100;
            const card=document.createElement('article');
            card.className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl hover:border-emerald-500/50 shadow-sm hover:shadow-md active:scale-[0.99] transition cursor-pointer select-none space-y-3";
            card.dataset.holdingSymbol=position.ticker;
            const isGold = position.assetType==='gold';
            const typeLabel = isFund ? 'وثيقة' : (isGold ? 'جرام' : 'سهم');
            const diffPrice = h.cur==null?null:h.cur-h.buy;
            const wPct = typeof weightPct === 'number' ? weightPct : 0;
            const badgeColor = isFund 
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60';
            const buyDisplay=fixed(h.buy,h.buy<1?4:2);

            card.innerHTML = `
                <!-- Top Row: Identity + Valuation & Returns -->
                <div class="flex items-start justify-between gap-2.5">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-xs sm:text-sm shrink-0 border ${badgeColor}">
                            ${h.ticker}
                        </div>
                        <div class="min-w-0">
                            <div class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate flex items-center gap-1 cursor-pointer group" data-legacy-click="toggleStockBuyPrice('${h.ticker}', event)" title="انقر لعرض سعر الشراء والتكلفة المنفذة">
                                <span class="underline decoration-dotted decoration-amber-500/70 underline-offset-2">${h.name}</span>
                                <span class="text-[10px] text-amber-500 opacity-60 group-hover:opacity-100 transition">ℹ️</span>
                            </div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                <span>${h.sector || (isFund ? 'صناديق وذهب' : 'سوق المال')}</span>
                                <span>•</span>
                                <span class="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                    <span>${position.quote?.status==='unverified'?'سعر غير متحقق':position.mode==='manual'?'تقييم يدوي':'سعر مؤرخ'}</span>
                                    <span>🕌</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="text-left shrink-0">
                        <div class="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            ${number(mVal,0)} <span class="text-[10px] font-normal text-slate-500 dark:text-slate-400">ج</span>
                        </div>
                        <div class="mt-1 flex items-center justify-end gap-1.5 flex-wrap">
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded-lg border text-xs font-bold font-mono ${isP ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'}" title="قيمة الربح بالجنيه">
                                <span>${isP ? '▲ +' : '▼ '}${number(pnl==null?null:Math.abs(pnl),0)} ج</span>
                            </span>
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded-lg border text-xs font-bold font-mono ${isP ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'}" title="نسبة العائد المئوية">
                                <span>${isP ? '+' : ''}${number(pnlPct,1)}%</span>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- سعر الشراء المنفذ داخل البطاقة (يظهر ويختفي بالنقر على السهم) -->
                <div id="buyPriceCard_${h.ticker}" class="stock-buy-price-card hidden py-1.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold flex items-center justify-between shadow-xs">
                    <div class="flex items-center gap-1.5">
                        <span>سعر الشراء المنفذ:</span>
                        <span dir="ltr" class="text-sm font-black text-amber-900 dark:text-amber-200">${buyDisplay} ج.م</span>
                    </div>
                    <span class="text-slate-500 dark:text-slate-400 text-[10.5px] font-normal">إجمالي التكلفة: ${number(cost,0)} ج</span>
                </div>

                <!-- 3 Performance Pillars: Holding Qty | Buy Cost | Current Price -->
                <div class="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
                    <div class="text-right">
                        <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">الكمية المملوكة</span>
                        <div class="flex items-center gap-1 mt-0.5">
                            <b class="font-mono text-slate-900 dark:text-slate-100 text-xs font-bold">${isGold ? h.qty.toFixed(4) : h.qty.toLocaleString('en-US')} <span class="text-[9px] font-normal text-slate-500 dark:text-slate-400">${typeLabel}</span></b>
                            <button type="button" data-legacy-click="event.stopPropagation(); editHoldingDirect('${h.ticker}')" class="text-sky-600 dark:text-sky-400 hover:text-sky-500 p-0.5 text-xs transition" title="تعديل الكمية والتكلفة">✏️</button>
                        </div>
                    </div>
                    <div class="text-center cursor-pointer p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition" data-legacy-click="toggleStockBuyPrice('${h.ticker}', event)" title="انقر لعرض سعر الشراء">
                        <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">سعر الشراء 👆</span>
                        <b class="font-mono text-amber-700 dark:text-amber-400 text-xs mt-0.5 block font-bold">${buyDisplay} ج</b>
                    </div>
                    <div class="text-left">
                        <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">السعر الحالي ⚡</span>
                        <div class="flex items-center justify-end gap-1 mt-0.5">
                            <b class="font-mono text-slate-900 dark:text-white text-xs font-bold">${isFund ? fixed(h.cur,4) : fixed(h.cur,2)} ج</b>
                        </div>
                        <span class="text-[9px] font-mono ${diffPrice >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} block mt-0.5 font-medium">
                            ${diffPrice==null?'':diffPrice >= 0 ? '▲ +' : '▼ '}${isFund ? fixed(diffPrice,4) : fixed(diffPrice,2)}
                        </span>
                    </div>
                </div>

                <!-- Weight Allocation Bar -->
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>الوزن النسبي: <b class="text-emerald-600 dark:text-emerald-400 font-bold">${wPct.toFixed(1)}%</b></span>
                        <span>إجمالي التكلفة: ${number(cost,0)} ج</span>
                    </div>
                    <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div class="${isFund ? 'bg-amber-500' : 'bg-emerald-500'} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(3, wPct))}%"></div>
                    </div>
                </div>

                <!-- Card Footer Actions -->
                <div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <button type="button" data-legacy-click="event.stopPropagation(); openStockChart('${h.ticker}')" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition">
                        <span>📈 الشارت والتحليل الفني</span>
                        <span>👈</span>
                    </button>
                    <button type="button" data-legacy-click="event.stopPropagation(); editHoldingDirect('${h.ticker}')" class="text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 text-[11px] flex items-center gap-1 active:scale-95 transition">
                        <span>✏️ تعديل الرصيد</span>
                    </button>
                </div>
            `;
            if(position.unrealized==null)card.querySelectorAll('[title="قيمة الربح بالجنيه"],[title="نسبة العائد المئوية"]').forEach(x=>{x.className=x.className.replace(/(?:dark:)?(?:bg|border|text)-(?:rose|emerald)-[\w/]+/g,'');x.classList.add('text-slate-400');});
            return card.outerHTML;
        }

        function createHoldingSmartRow(position, weightPct) {
            const h={ticker:e(position.ticker),name:e(position.name),qty:position.qty,buy:position.average,cur:position.price,sector:e(position.quote?.sector||'سوق المال')};
            const mVal=position.value,cost=position.cost,pnl=position.unrealized,pnlPct=pnl==null||!cost?null:pnl/cost*100,isP=pnl!=null&&pnl>=0,isFund=position.assetType==='fund';
            const tr = document.createElement('tr');
            tr.dataset.holdingSymbol=position.ticker;
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/70 active:bg-slate-100 dark:active:bg-slate-800/90 transition text-xs select-none cursor-pointer group";
            tr.title = `انقر لعرض الشارت والتحليل الفني لـ ${h.name}`;
            const diffPrice = h.cur==null?null:h.cur-h.buy;
            const badgeColor = isFund ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700/60';
            const isGold = position.assetType==='gold';
            const buyDisplay = fixed(h.buy,h.buy<1?4:2);
            const curDisplay = isFund ? fixed(h.cur,4) : fixed(h.cur,2);

            tr.innerHTML = `
                <td class="py-2.5 pr-2 sm:pr-3 align-middle overflow-hidden">
                    <div class="space-y-0.5 min-w-0">
                        <div class="flex items-center gap-1 min-w-0">
                            <button type="button" data-legacy-click="event.stopPropagation(); toggleStockBuyPrice('${h.ticker}', event)" class="font-bold text-slate-900 dark:text-white text-xs hover:text-emerald-600 dark:hover:text-emerald-400 transition leading-tight truncate text-right flex items-center gap-1 cursor-pointer group" title="انقر لعرض سعر الشراء والتكلفة">
                                <span class="underline decoration-dotted decoration-amber-500/70 underline-offset-2">${h.name}</span>
                                <span class="text-[9px] text-amber-500 opacity-60 group-hover:opacity-100 transition" title="انقر لعرض سعر الشراء">ℹ️</span>
                            </button>
                            <span class="px-1 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${badgeColor}">${h.ticker}</span>
                        </div>

                        <!-- سعر الشراء يظهر داخل السهم عند الضغط على اسم السهم -->
                        <div id="buyPrice_${h.ticker}" class="stock-buy-price-badge hidden mt-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-[9px] font-mono font-bold whitespace-nowrap shadow-xs">
                            <span>شراء:</span>
                            <span dir="ltr">${buyDisplay} ج</span>
                            <span class="text-slate-400 dark:text-slate-500 text-[7.5px] font-normal mr-0.5">(${number(cost,0)} ج)</span>
                        </div>

                        <div class="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span class="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">${weightPct.toFixed(1)}%</span>
                            <div class="w-8 sm:w-12 bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden inline-block align-middle shrink-0">
                                <div class="${isFund ? 'bg-amber-500' : 'bg-emerald-500'} h-1 rounded-full" style="width: ${Math.min(100, weightPct * 2.5)}%"></div>
                            </div>
                            <span class="hidden sm:inline text-slate-400 text-[9px] truncate">• ${h.sector || 'سوق المال'}</span>
                        </div>
                    </div>
                </td>
                <td class="py-2.5 px-0.5 text-center font-mono align-middle">
                    <div class="flex items-center justify-center gap-0.5 text-[10.5px] font-bold text-slate-900 dark:text-white leading-tight">
                        <span>${isGold ? h.qty.toFixed(4) : h.qty.toLocaleString('en-US')}</span>
                        <button type="button" data-legacy-click="event.stopPropagation(); editHoldingDirect('${h.ticker}')" class="text-sky-600 dark:text-sky-400 hover:text-sky-500 p-0.5 text-[10px] opacity-70 hover:opacity-100 transition" title="تعديل مباشر للكمية والتكلفة">✏️</button>
                    </div>
                    <div class="text-[7.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                        <span>${isFund ? 'وثيقة' : (isGold ? 'جرام' : 'سهم')}</span>
                    </div>
                </td>
                <td class="py-2.5 px-0.5 text-center font-mono align-middle" title="سعر البورصة اللحظي / وثيقة الصندوق: ${curDisplay} ج">
                    <div class="flex items-center justify-center gap-0.5 text-[10.5px] font-bold text-slate-900 dark:text-white leading-tight">
                        <span class="text-amber-500 dark:text-amber-400 text-[9px] animate-pulse">⚡</span>
                        <span>${curDisplay}</span>
                    </div>
                    <div class="text-[8px] ${diffPrice >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} font-medium whitespace-nowrap mt-0.5">
                        <span dir="ltr">${diffPrice >= 0 ? '▲ +' : '▼ '}${isFund ? fixed(diffPrice==null?null:Math.abs(diffPrice),2) : fixed(diffPrice==null?null:Math.abs(diffPrice),1)}</span>
                    </div>
                </td>
                <td class="py-2.5 px-0.5 text-center font-mono align-middle">
                    <div class="text-[10.5px] font-bold text-slate-900 dark:text-white whitespace-nowrap leading-tight">
                        <span dir="ltr">${number(mVal,0)}</span>
                    </div>
                    <div class="text-[7.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                        <span dir="ltr">${number(cost,0)}</span> <span class="opacity-70">تكلفة</span>
                    </div>
                </td>
                <td class="py-2.5 px-0.5 text-center font-mono align-middle">
                    <div class="text-[10.5px] font-bold whitespace-nowrap leading-tight ${isP ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                        <span dir="ltr">${isP ? '+' : '-'}${number(pnl==null?null:Math.abs(pnl),0)}</span>
                    </div>
                    <div class="text-[7.5px] ${isP ? 'text-emerald-600/75 dark:text-emerald-400/75' : 'text-rose-600/75 dark:text-rose-400/75'} whitespace-nowrap mt-0.5">
                        ${isP ? 'ربح ▲' : 'خسارة ▼'}
                    </div>
                </td>
                <td class="py-2.5 pl-1.5 sm:pl-2 text-left font-mono align-middle">
                    <div class="flex justify-end">
                        <span class="inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold ${isP ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'}">
                            <span dir="ltr">${isP ? '+' : ''}${fixed(pnlPct,1)}%</span>
                        </span>
                    </div>
                </td>
            `;
            return tr.outerHTML;
        }
window.LegacyHoldingRow=createHoldingSmartRow;
window.LegacyHoldingCard=createHoldingMobileCard;
})();
