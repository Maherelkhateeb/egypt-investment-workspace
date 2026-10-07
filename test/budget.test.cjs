const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../budget.mjs'),now=Date.parse('2026-10-08T12:00:00Z');
test('daily budget reserves failed attempts too and blocks the fifth provider call',async()=>{const B=await load(),b=B.loadBudget(null,now);for(let i=0;i<4;i++)assert.equal(B.reserveCall(b,'gemini'),true);assert.equal(B.reserveCall(b,'gemini'),false);assert.equal(b.gemini,4);assert.equal(b.openai,0);});
test('same-day persisted budget survives reload; next UTC day resets independently',async()=>{const B=await load();assert.equal(B.loadBudget({day:'2026-10-08',gemini:4,openai:1},now).gemini,4);assert.equal(B.loadBudget({day:'2026-10-07',gemini:4,openai:4},now).gemini,0);});
test('corrupt same-day counters fail closed and providers cannot mutate arbitrary fields',async()=>{const B=await load(),b=B.loadBudget({day:'2026-10-08',gemini:-1,openai:'0'},now);assert.equal(B.reserveCall(b,'gemini'),false);assert.equal(B.reserveCall(b,'openai'),false);assert.throws(()=>B.reserveCall(b,'other'));});
test('migration accounts for the three earlier connection-test attempts',async()=>{const B=await load(),b=B.loadBudget(null,Date.parse('2026-10-07T13:00:00Z'));assert.equal(b.gemini,3);assert.equal(B.reserveCall(b,'gemini'),true);assert.equal(B.reserveCall(b,'gemini'),false);});

