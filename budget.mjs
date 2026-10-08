export function loadBudget(value,now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10);
 const fresh={day,gemini:0,groq:0,openai:0};
 if(!value||value.day!==day)return fresh;
 const count=provider=>Number.isInteger(value[provider])&&value[provider]>=0?value[provider]:0;
 // Gemini and Groq counts are telemetry only: this application no longer
 // imposes a daily request ceiling on either provider. Provider-side quotas,
 // billing and rate limits remain authoritative.
 return {day,gemini:count('gemini'),groq:count('groq'),openai:Number.isInteger(value.openai)&&value.openai>=0&&value.openai<=4?value.openai:4};
}
export function reserveCall(budget,provider){
 if(!['gemini','groq','openai'].includes(provider))throw Error('invalid_provider');
 if(provider==='openai'&&budget.openai>=4)return false;
 budget[provider]=(Number.isInteger(budget[provider])&&budget[provider]>=0?budget[provider]:0)+1;
 return true;
}
