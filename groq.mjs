// Server/scheduled code only. Never import this module from the browser.
// GROQ_API_KEY is supplied by the scheduled runner's protected environment.
import {
  MIN_INTERVAL_MS, SYSTEM_INSTRUCTION, buildPublicContext, outputSchema,
  validateAnalysis, validatePrevious, emptyResult, failedResult, readPrevious
} from './ai.mjs';

export const MODEL = 'openai/gpt-oss-120b';
export const ENDPOINT = 'https://api.groq.com/openai/v1/responses';
const MAX_RESPONSE_BYTES = 100000;
const ERROR_CODES = new Set(['rate_limit_exceeded','invalid_api_key','authentication_error','permission_denied','insufficient_quota']);

function groqOutputSchema(sources){
  const schema=outputSchema(sources.map(source=>source.id));
  const finding=schema.properties.findings.items.properties;
  finding.fact={type:'string',enum:[...new Set(sources.map(source=>source.title))]};
  finding.source_ids={...finding.source_ids,maxItems:1};
  return schema;
}

export function makeGroqRequest(context){
  return {
    model:MODEL,
    store:false,
    reasoning:{effort:'low'},
    max_output_tokens:4000,
    instructions:SYSTEM_INSTRUCTION,
    input:[{role:'user',content:JSON.stringify({market_session_date:context.market_session_date,sources:context.sources,limitations:context.limitations})}],
    text:{format:{type:'json_schema',name:'public_economic_analysis',strict:true,schema:groqOutputSchema(context.sources)}}
  };
}

async function readPayload(response){
  if(Number(response.headers?.get?.('content-length'))>MAX_RESPONSE_BYTES)throw Error('invalid_response');
  if(!response.body?.getReader){const raw=await response.text();if(new TextEncoder().encode(raw).byteLength>MAX_RESPONSE_BYTES)throw Error('invalid_response');return JSON.parse(raw);}
  const reader=response.body.getReader(),chunks=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_RESPONSE_BYTES){await reader.cancel();throw Error('invalid_response');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}

async function classifyFailedResponse(response){
  const fallback=`http_${[400,401,403,429,500,503].includes(response.status)?response.status:'error'}`;
  try{const payload=await readPayload(response),error=payload?.error;if(!error||typeof error!=='object'||Array.isArray(error))return fallback;for(const code of [error.code,error.type]){if(ERROR_CODES.has(code))return code;if(code==='rate_limit_error')return'rate_limit_exceeded';}}catch{}
  return response.status===429?'rate_limit_exceeded':fallback;
}

export function extractGroqAnalysis(payload,sources){
  if(!payload||payload.status!=='completed'||payload.error||!Array.isArray(payload.output))throw Error('blocked_or_incomplete');
  const messages=payload.output.filter(item=>item?.type==='message'&&item.role==='assistant');
  if(!messages.length||messages.some(item=>item.status&&item.status!=='completed'))throw Error('blocked_or_incomplete');
  const content=messages.flatMap(item=>Array.isArray(item.content)?item.content:[]);
  if(content.some(item=>item?.type==='refusal'))throw Error('blocked_or_incomplete');
  const text=content.filter(item=>item?.type==='output_text'&&typeof item.text==='string').map(item=>item.text).join('');
  if(!text||text.length>50000)throw Error('invalid_response');
  const analysis=validateAnalysis(JSON.parse(text),sources);
  if(analysis.findings.some(finding=>finding.source_ids.length!==1))throw Error('invalid_response');
  return analysis;
}

export async function generateGroq({market,news,apiKey=process.env.GROQ_API_KEY,previous=null,fetcher=fetch,fetchImpl,now=Date.now()}){
  const request=fetchImpl||fetcher,retained=validatePrevious(previous,now,MODEL);let context;
  try{context=buildPublicContext({market,news},now);}catch{return failedResult(retained,null,now,'invalid_public_input',null,MODEL);}
  if(typeof apiKey!=='string'||!apiKey.trim())return failedResult(retained,context,now,'missing_key',null,MODEL);
  if(retained?.analysis&&retained.input_hash===context.input_hash)return{...retained,attempted_at:new Date(now).toISOString(),reuse_reason:'unchanged_public_evidence'};
  const lastAttempt=retained?.last_request_at||retained?.generated_at;
  if(lastAttempt&&now-Date.parse(lastAttempt)<MIN_INTERVAL_MS)return{...retained,status:retained.analysis?'stale':retained.status,attempted_at:new Date(now).toISOString(),reuse_reason:'six_hour_interval',error_code:retained.analysis?'new_evidence_waiting_interval':retained.error_code};
  if(!context.sources.length)return failedResult(retained,context,now,'no_valid_public_news',null,MODEL);
  const requestedAt=new Date(now).toISOString();
  try{
    const response=await request(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey.trim()}`},body:JSON.stringify(makeGroqRequest(context)),signal:AbortSignal.timeout(45000),redirect:'error'});
    if(!response.ok)return failedResult(retained,context,now,await classifyFailedResponse(response),requestedAt,MODEL);
    const analysis=extractGroqAnalysis(await readPayload(response),context.sources);
    return{...emptyResult('ready',now,null,MODEL),generated_at:requestedAt,last_request_at:requestedAt,input_hash:context.input_hash,market_session_date:context.market_session_date,news_fetched_at:context.news_fetched_at,sources:context.sources,market_facts:context.market_facts,analysis};
  }catch(error){const reason=['TimeoutError','AbortError'].includes(error?.name)?'timeout':error?.message==='blocked_or_incomplete'?'blocked_or_incomplete':'invalid_response';return failedResult(retained,context,now,reason,requestedAt,MODEL);}
}

export async function readPreviousGroq(fetcher=fetch,now=Date.now()){return readPrevious(fetcher,now,MODEL,'groq');}
