const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../groq.mjs');
const wireAnalysis=()=>({...analysis,findings:analysis.findings.map(({possible_implication,uncertainty,source_ids})=>({possible_implication,uncertainty,source_id:source_ids[0]}))});
const source={id:'N1',title:'البورصة تعلن استئناف التداول الأحد',url:'https://www.alborsaanews.com/example',publisher:'جريدة البورصة',published_at:'2026-10-08T10:00:00Z',basis:'headline'};
const analysis={summary:'قراءة نوعية للمصدر',findings:[{fact:source.title,possible_implication:'قد يدعم وضوح توقيت الجلسة',uncertainty:'لا يثبت اتجاه الأسعار',source_ids:['N1']}],scenarios:[],questions:[{question:'هل ظهرت إفصاحات جديدة',source_ids:['N1']}],limitations:['العنوان وحده لا يكفي للحكم الاستثماري']};
test('Groq uses GPT-OSS 120B Responses API with strict JSON schema',async()=>{const G=await load();assert.equal(G.MODEL,'openai/gpt-oss-120b');assert.equal(G.ENDPOINT,'https://api.groq.com/openai/v1/responses');const r=G.makeGroqRequest({market_session_date:'2026-10-07',sources:[source],limitations:['بيانات مؤرخة']});assert.equal(r.model,G.MODEL);assert.equal(r.reasoning.effort,'low');assert.equal(r.text.format.type,'json_schema');assert.equal(r.text.format.strict,true);assert.equal(r.text.format.schema.properties.findings.items.properties.source_id.enum[0],source.id);assert.equal(r.text.format.schema.properties.findings.items.properties.fact,undefined);});
test('Groq completed structured response is validated before publication',async()=>{const G=await load();const payload={status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(wireAnalysis())}]}]};assert.deepEqual(G.extractGroqAnalysis(payload,[source]),analysis);assert.throws(()=>G.extractGroqAnalysis({...payload,status:'failed'},[source]));});
test('missing Groq secret makes no network request',async()=>{const G=await load();let calls=0;const market={session_date:'2026-10-07',assets:{},indices:{}},news={fetched_at:'2026-10-08T10:00:00Z',items:[]};const out=await G.generateGroq({market,news,apiKey:'',fetchImpl:async()=>{calls++;throw Error('should not call');},now:Date.parse('2026-10-08T12:00:00Z')});assert.equal(calls,0);assert.equal(out.status,'waiting_key');assert.equal(out.model,G.MODEL);});

const now=Date.parse('2026-10-08T12:00:00Z');
const input=()=>({market:{session_date:'2026-10-07',assets:{},indices:{}},news:{fetched_at:source.published_at,items:[{...source,source_id:'borsa'}]},now,apiKey:'test-only-groq-key'});
const response=()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(wireAnalysis())}]}]}));

test('Groq request succeeds only with validated output and never publishes its credential',async()=>{
 const G=await load();let request;
 const out=await G.generateGroq({...input(),fetchImpl:async(url,options)=>{request={url,options};return response();}});
 assert.equal(out.status,'ready');assert.deepEqual(out.analysis,analysis);assert.equal(request.url,G.ENDPOINT);
 assert.equal(request.options.headers.Authorization,'Bearer test-only-groq-key');
 assert.equal(JSON.stringify(JSON.parse(request.options.body)).includes('test-only-groq-key'),false);
 assert.equal(JSON.stringify(out).includes('test-only-groq-key'),false);
});
test('Groq credentials in public input are rejected before any request',async()=>{
 const G=await load(),fake='gsk_'+('TEST_ONLY_NOT_A_REAL_KEY_').repeat(2);
 for(const field of ['GROQ_API_KEY','groq_api_key','title']){
  const data=input();if(field==='title')data.news.items[0].title=fake;else data.news[field]=fake;
  let calls=0;const out=await G.generateGroq({...data,fetchImpl:async()=>{calls++;return response();}});
  assert.equal(out.status,'failed');assert.equal(out.error_code,'invalid_public_input');assert.equal(calls,0);
  assert.equal(JSON.stringify(out).includes(fake),false);
 }
});
test('reused Groq analysis is explicitly stale after six hours and consumes no request',async()=>{
 const G=await load();const previous=await G.generateGroq({...input(),fetchImpl:response});let calls=0;
 const out=await G.generateGroq({...input(),previous,now:now+7*3600000,fetchImpl:async()=>{calls++;return response();}});
 assert.equal(out.status,'stale');assert.equal(out.generated_at,previous.generated_at);assert.equal(out.reuse_reason,'unchanged_public_evidence');assert.equal(calls,0);
});
test('provider failure retains the last Groq evidence and excludes raw errors',async()=>{
 const G=await load();const previous=await G.generateGroq({...input(),fetchImpl:response});const data=input();data.news.items[0].title='خبر اقتصادي جديد';
 const out=await G.generateGroq({...data,previous,now:now+7*3600000,fetchImpl:async()=>new Response(JSON.stringify({error:{message:'test-only-groq-key'}}),{status:503})});
 assert.equal(out.status,'stale');assert.equal(out.error_code,'http_503');assert.equal(out.generated_at,previous.generated_at);
 assert.deepEqual(out.analysis,analysis);assert.equal(JSON.stringify(out).includes('test-only-groq-key'),false);
});
test('Groq headline is bound on the server to its selected source ID, including publisher numbers',async()=>{
 const G=await load(),sources=[source,{...source,id:'N2',title:'الشركة تعلن نمو الإيرادات بنسبة 12%'}];
 const wire=wireAnalysis();wire.findings[0].source_id='N2';
 const payload=()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(wire)}]}]});
 assert.equal(G.extractGroqAnalysis(payload(),sources).findings[0].fact,sources[1].title);
 wire.findings[0].source_id='N99';assert.throws(()=>G.extractGroqAnalysis(payload(),sources));
 wire.findings[0].source_id='N2';wire.findings[0].possible_implication='قد يزيد السعر بنسبة 12%';assert.throws(()=>G.extractGroqAnalysis(payload(),sources));
 wire.findings[0].possible_implication='تفسير احتمالي';wire.findings[0].fact='عنوان مختلف';assert.throws(()=>G.extractGroqAnalysis(payload(),sources));
});
