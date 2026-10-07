import fs from 'node:fs';
import { generateAnalysis, readPrevious, validatePrevious, MODEL as GEMINI_MODEL } from '../ai.mjs';
import { generateOpenAI, MODEL as OPENAI_MODEL } from '../openai.mjs';

const now = Date.now();
const market = JSON.parse(fs.readFileSync('market.json', 'utf8'));
const news = JSON.parse(fs.readFileSync('news.json', 'utf8'));
let local = null;
try { local = JSON.parse(fs.readFileSync('ai.json', 'utf8')); } catch { /* No local snapshot yet. */ }
const models = { gemini: GEMINI_MODEL, openai: OPENAI_MODEL };
const published = await Promise.all(Object.entries(models).map(async ([provider, model]) => [provider, await readPrevious(fetch, now, model, provider)]));
const prior = {};
const latestTime = report => report ? Math.max(Date.parse(report.attempted_at) || 0, Date.parse(report.last_request_at) || 0, Date.parse(report.generated_at) || 0) : 0;
for (const [provider, remote] of published) {
  const saved = validatePrevious(local?.providers?.[provider] || (provider === 'gemini' ? local : null), now, models[provider]);
  prior[provider] = latestTime(remote) >= latestTime(saved) ? remote : saved;
}
const [gemini, openai] = await Promise.all([
  generateAnalysis({ market, news, apiKey: process.env.GEMINI_API_KEY, previous: prior.gemini, now }),
  generateOpenAI({ market, news, apiKey: process.env.OPENAI_API_KEY, previous: prior.openai, now })
]);
const reports = [gemini, openai];
const status = ['ready', 'stale', 'failed', 'waiting_key'].find(value => reports.some(report => report.status === value));
const dates = reports.map(report => report.generated_at).filter(Boolean).sort();
const result = { schema: 1, status, generated_at: dates.at(-1) || null, attempted_at: new Date(now).toISOString(), privacy: 'public_market_and_publisher_headlines_only', providers: { gemini, openai } };
fs.writeFileSync('ai.json', JSON.stringify(result, null, 2) + '\n');
// No key, request headers, raw API errors, prompts, or private state enter workflow logs.
console.log(JSON.stringify({ status: result.status, providers: Object.fromEntries(Object.entries(result.providers).map(([provider, report]) => [provider, { status: report.status, model: report.model, generated_at: report.generated_at, source_count: report.sources.length, error_code: report.error_code, reuse_reason: report.reuse_reason }])) }));
