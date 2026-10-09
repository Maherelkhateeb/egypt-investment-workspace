const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('../core.js');

function boot(){
 const alerts=[],ui={};
 const context=vm.createContext({InvestCore:C,C,LegacyUI:{ui,n:String},InterfaceTools:{},
  localStorage:{getItem:()=>null,setItem(){}},document:{querySelectorAll:()=>[],addEventListener(){}},
  $:()=>null,route:'portfolio',market:{assets:{}},state:C.empty(),render(){},refreshMarket(){},importObject(){},
  toast:(message,bad)=>alerts.push({message,bad})});
 context.window=context;
 vm.runInContext(fs.readFileSync(require.resolve('../legacy-actions.js'),'utf8'),context);
 return {actions:context.LegacyActions,alerts};
}

test('later UI modules register actions without replacing the common dispatcher',()=>{
 const {actions}=boot(),run=actions.run,calls=[],element={id:'tool'};
 actions.registerHandlers({openThndrScannerModal:args=>calls.push(['scanner',...args]),
  openThndrFeePolicyModal:(args,el)=>calls.push(['fees',el.id,...args]),
  openPeriodPerformanceModal:args=>calls.push(['performance',...args])});
 for(const name of ['openThndrScannerModal','openThndrFeePolicyModal','openPeriodPerformanceModal']){
  assert.ok(actions.handlers.includes(name));assert.equal(actions.run(name+'()',name,['1M'],element),true);
 }
 assert.equal(actions.run,run);
 assert.deepEqual(calls,[['scanner','1M'],['fees','tool','1M'],['performance','1M']]);
 assert.equal(actions.run('unknown()','unknown',[],element),false);
});

test('action failures are reported and invalid handlers are rejected',()=>{
 const {actions,alerts}=boot();
 actions.registerHandlers({brokenTool:()=>{throw Error('تعذر فتح الأداة');}});
 assert.equal(actions.run('brokenTool()','brokenTool',[],null),true);
 assert.deepEqual(alerts,[{message:'تعذر فتح الأداة',bad:true}]);
 assert.throws(()=>actions.registerHandlers({invalidTool:null}),/معالج واجهة غير صالح/);
 assert.ok(!actions.handlers.includes('invalidTool'));
});
