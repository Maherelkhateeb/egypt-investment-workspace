const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

for(const file of ['market-calendar.js','market-calendar-ui.js','report-periods.js','report-availability.js','scanner-ui.js','performance-engine.js','performance-ui.js','thndr-fees.js','thndr-fees-ui.js','design.js','app.js','daily-report-view.js','legacy-pages.js','ai-view.js','interface-tools.js','legacy-actions.js','legacy-adapter.js','legacy-holding-card.js','legacy-market-cards.js','legacy-report-layout.js','legacy-charts.js','legacy-templates.js','system-audit.js','system-audit-ui.js']){
 test(`${file} parses as a classic browser script`,()=>{
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
 });
}
