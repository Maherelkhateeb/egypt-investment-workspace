import fs from 'node:fs';
import { generateAnalysis, readPrevious, validatePrevious, MODEL as GEMINI_MODEL } from '../ai.mjs';
import { generateGroq, MODEL as GROQ_MODEL } from '../groq.mjs';
import { generateOpenAI, MODEL as OPENAI_MODEL } from '../openai.mjs';
import {loadBudget,reserveCall} from '../budget.mjs';

const now = Date.now();
let savedBudget=null;try{savedBudget=JSON.parse(fs.readFileSync('ai-budget.json','utf8'));}catch{}
const budget=loadBudget(savedBudget,now),limited={};
const countedFetch=provider=>async(...args)=>{
 if(!reserveCall(budget,provider)){limited[provider]=true;throw Error('daily_call_limit');}
 fs.writeFileSync('ai-budget.json',JSON.stringify(budget));
 return fetch(...args);
};
const market = JSON.parse(fs.readFileSync('market.json', 'utf8'));
const news = JSON.parse(fs.readFileSync('news.json', 'utf8'));
// Notifications are operational/general information for the news page. They are
// intentionally excluded from investment AI context so a holiday, reminder or
// general notice cannot be treated as a market-moving signal.
const analysisNews={...news,items:(Array.isArray(news.items)?news.items:[]).filter(item=>item.category!=='notice')};
let local = null;
try { local = JSON.parse(fs.readFileSync('ai.json', 'utf8')); } catch { /* No local snapshot yet. */ }
const models = { gemini: GEMINI_MODEL, groq: GROQ_MODEL, openai: OPENAI_MODEL };
const published = await Promise.all(Object.entries(models).map(async ([provider, model]) => [provider, await readPrevious(fetch, now, model, provider)]));
const prior = {};
const latestTime = report => report ? Math.max(Date.parse(report.attempted_at) || 0, Date.parse(report.last_request_at) || 0, Date.parse(report.generated_at) || 0) : 0;
for (const [provider, remote] of published) {
  const saved = validatePrevious(local?.providers?.[provider] || (provider === 'gemini' ? local : null), now, models[provider]);
  prior[provider] = latestTime(remote) >= latestTime(saved) ? remote : saved;
}
// The old four-calls/day application gate was removed for Gemini. Old
// daily_call_limit snapshots therefore must not keep Gemini locked for six hours.
// Timeouts and HTTP 503 are transient too, so retry them on the next scheduled run.
const retryableGeminiFailure = report => report && !report.analysis && ['timeout', 'http_503', 'daily_call_limit'].includes(report.error_code);
const geminiPrevious = retryableGeminiFailure(prior.gemini) ? null : prior.gemini;
const [gemini, groq, openai] = await Promise.all([
  generateAnalysis({ market, news:analysisNews, apiKey: process.env.GEMINI_API_KEY, previous: geminiPrevious, now, fetchImpl:countedFetch('gemini') }),
  generateGroq({ market, news:analysisNews, apiKey: process.env.GROQ_API_KEY, previous: prior.groq, now, fetchImpl:countedFetch('groq') }),
  generateOpenAI({ market, news:analysisNews, apiKey: process.env.OPENAI_API_KEY, previous: prior.openai, now, fetchImpl:countedFetch('openai') })
]);
if(limited.openai)openai.error_code='daily_call_limit';
fs.writeFileSync('ai-budget.json',JSON.stringify(budget));
const reports = [gemini, groq, openai];
const status = ['ready', 'stale', 'failed', 'waiting_key'].find(value => reports.some(report => report.status === value));
const dates = reports.map(report => report.generated_at).filter(Boolean).sort();
const result = { schema: 1, status, generated_at: dates.at(-1) || null, attempted_at: new Date(now).toISOString(), privacy: 'public_market_and_publisher_headlines_only', usage:budget, providers: { gemini, groq, openai } };
fs.writeFileSync('ai.json', JSON.stringify(result, null, 2) + '\n');
// No key, request headers, raw API errors, prompts, or private state enter workflow logs.
console.log(JSON.stringify({ status: result.status, providers: Object.fromEntries(Object.entries(result.providers).map(([provider, report]) => [provider, { status: report.status, model: report.model, generated_at: report.generated_at, source_count: report.sources.length, error_code: report.error_code, reuse_reason: report.reuse_reason }])) }));
