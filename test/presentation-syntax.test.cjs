const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

for(const file of ['design.js','daily-report-view.js','legacy-pages.js','ai-view.js']){
 test(`${file} parses as a classic browser script`,()=>{
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}));
 });
}
