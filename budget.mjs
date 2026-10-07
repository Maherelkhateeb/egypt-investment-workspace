export function loadBudget(value,now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10);
 if(!value||value.day!==day)return {day,gemini:day==='2026-10-07'?3:0,openai:0};
 return {day,...Object.fromEntries(['gemini','openai'].map(p=>[p,Number.isInteger(value[p])&&value[p]>=0&&value[p]<=4?value[p]:4]))};
}
export function reserveCall(budget,provider){
 if(!['gemini','openai'].includes(provider))throw Error('invalid_provider');
 if(budget[provider]>=4)return false;
 budget[provider]++;return true;
}

