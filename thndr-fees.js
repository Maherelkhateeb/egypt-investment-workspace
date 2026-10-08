(function(root){'use strict';
const amount=v=>{if(v===''||v==null||!Number.isFinite(Number(v))||Number(v)<=0)throw Error('أدخل مبلغاً موجباً');return Number(v);};
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const sources={orders:'https://support.thndr.app/en/articles/638558-thndr-order-fees',wallet:'https://support.thndr.app/en/articles/640621-top-up-with-e-wallets',instapay:'https://support.thndr.app/en/articles/640596-top-up-with-instapay'};
function trade(value,{sameSession=false,brokerWaived=false,assetType='stock',executions=null,fundCharge=0}={}){
 value=amount(value);if(!['stock','fund'].includes(assetType))throw Error('اختر سهماً أو صندوقاً');
 if(!Number.isFinite(Number(fundCharge))||Number(fundCharge)<0)throw Error('رسوم الصندوق غير صالحة');
 if(assetType==='fund')return {value,broker:0,exchange:0,clearing:0,regulator:0,insurance:0,stamp:0,fund:round(Number(fundCharge)),total:round(Number(fundCharge)),source:sources.orders};
 const fills=executions||[value];if(!Array.isArray(fills)||!fills.length||fills.length>1000)throw Error('قائمة التنفيذات غير صالحة');fills.forEach(amount);
 if(Math.abs(fills.reduce((a,v)=>a+Number(v),0)-value)>.005)throw Error('مجموع التنفيذات يجب أن يساوي قيمة الأمر');
 const broker=brokerWaived?0:2+value*.001,exchange=Math.min(5000,value*.0001),clearing=Math.min(5000,value*.0001),regulator=fills.reduce((a,v)=>a+Math.min(250,Math.max(1,Number(v)*.00005)),0),insurance=Math.min(5000,value*.00005),stamp=value*(sameSession?.00025:.0005);
 return {value,broker:round(broker),exchange:round(exchange),clearing:round(clearing),regulator:round(regulator),insurance:round(insurance),stamp:round(stamp),fund:0,total:round(broker+exchange+clearing+regulator+insurance+stamp),source:sources.orders};
}
function deposit(value,method='wallet',manualFee=0){value=amount(value);if(!['wallet','instapay','bank','cash'].includes(method))throw Error('طريقة الإيداع غير صالحة');
 let fee=method==='wallet'?value*.007:method==='instapay'?Math.min(20,Math.max(.5,value*.001)):Number(manualFee);
 if(!Number.isFinite(fee)||fee<0||fee>value)throw Error('رسوم الإيداع غير صالحة');fee=round(fee);const outsideWallet=method!=='wallet';
 return {value,fee,ledgerFee:outsideWallet?0:fee,credited:round(value-(outsideWallet?0:fee)),outsideWallet,source:method==='wallet'?sources.wallet:method==='instapay'?sources.instapay:null};
}
const api={trade,deposit,sources,verifiedAt:'2026-10-08',round};if(typeof module==='object'&&module.exports)module.exports=api;else root.ThndrFees=api;
})(typeof globalThis==='object'?globalThis:this);
