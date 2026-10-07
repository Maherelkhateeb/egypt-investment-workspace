const { test } = require('node:test');
const assert = require('node:assert/strict');
const NOW = Date.parse('2026-10-07T12:00:00Z');
const KEY = 'server-test-placeholder';
const modulePromise = import('../openai.mjs');

function input(title = 'مبيعات طلعت مصطفى تدعم النشاط العقاري') {
  return {
    market: { session_date: '2026-10-06', assets: {
      TMGH: { name: 'طلعت مصطفى', type: 'stock', close: 88.39, previous_close: 88.90,
        session_date: '2026-10-06', previous_session_date: '2026-10-05', status: 'historical_reference',
        currency: 'EGP', source_url: 'https://sa.marketscreener.com/quote/stock/TALAAT-MOUSTAFA-GROUP-HOL-6500108/' }
    }, indices: {} },
    news: { fetched_at: '2026-10-07T11:00:00Z', items: [
      { source_id: 'borsa', title, published_at: '2026-10-07T10:00:00Z', url: 'https://www.alborsaanews.com/public-test-story' }
    ] }
  };
}
function analysis() {
  return {
    summary: 'تحتاج النظرة الاقتصادية إلى متابعة الإفصاحات المؤكدة.',
    findings: [{ fact: 'مبيعات طلعت مصطفى تدعم النشاط العقاري', possible_implication: 'قد يدعم النشاط الإيرادات إذا تأكد بالأرقام المنشورة.', uncertainty: 'لم يُقرأ نص المقال الكامل.', source_ids: ['N1'] }],
    scenarios: [{ label: 'أساسي', condition: 'إذا تأكد نمو النشاط في الإفصاحات.', possible_effect: 'قد تتحسن النظرة التشغيلية.', source_ids: ['N1'] }],
    questions: [{ question: 'هل تدعم التدفقات النقدية النمو المعلن؟', source_ids: ['N1'] }],
    limitations: ['الأدلة عناوين صحفية وأسعار تاريخية فقط.']
  };
}
function payload(value = analysis()) {
  return { status: 'completed', output: [
    { type: 'reasoning', summary: [] },
    { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(value) }] }
  ] };
}
function response(value = payload(), status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}
async function ready() {
  const O = await modulePromise;
  return O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async () => response() });
}

test('OpenAI request uses verified model, Responses structured output and public evidence only', async () => {
  const O = await modulePromise;
  const A = await import('../ai.mjs');
  const context = A.buildPublicContext(input(), NOW);
  const body = O.makeOpenAIRequest(context);
  assert.equal(body.model, 'gpt-6-luna');
  assert.equal(body.store, false);
  assert.equal(body.reasoning.effort, 'low');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.schema.additionalProperties, false);
  assert.deepEqual(body.text.format.schema.properties.findings.items.properties.source_ids.items.enum, ['N1']);
  assert.deepEqual(body.text.format.schema.required, ['summary', 'findings', 'scenarios', 'questions', 'limitations']);
  assert.equal(body.input[0].role, 'user');
  assert.equal(JSON.stringify(body).includes(KEY), false);
});

test('missing OpenAI key makes no request and reports waiting_key', async () => {
  const O = await modulePromise; let calls = 0;
  const result = await O.generateOpenAI({ ...input(), apiKey: '', now: NOW, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 0);
  assert.equal(result.status, 'waiting_key');
  assert.equal(result.model, 'gpt-6-luna');
  assert.equal(result.analysis, null);
  assert.equal(result.generated_at, null);
  assert.equal(result.last_request_at, null);
});

test('private holdings or credential payloads are rejected before inference', async () => {
  const O = await modulePromise;
  for (const forbidden of [{ holdings: [{ qty: 50 }] }, { OPENAI_API_KEY: 'never-publish-this-value' }, { note: 'sk-' + 'x'.repeat(24) }]) {
    const data = input(); Object.assign(data.market, forbidden); let calls = 0;
    const result = await O.generateOpenAI({ ...data, apiKey: KEY, now: NOW, fetcher: async () => { calls++; return response(); } });
    assert.equal(calls, 0);
    assert.equal(result.error_code, 'invalid_public_input');
    assert.equal(JSON.stringify(result).includes('never-publish-this-value'), false);
  }
});

test('completed output validates citations and returns public model report without key', async () => {
  const O = await modulePromise; let requested;
  const result = await O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async (url, options) => { requested = { url, options }; return response(); } });
  assert.equal(requested.url, 'https://api.openai.com/v1/responses');
  assert.equal(requested.options.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(requested.options.redirect, 'error');
  assert.equal(result.status, 'ready');
  assert.equal(result.generated_at, '2026-10-07T12:00:00.000Z');
  assert.equal(result.last_request_at, result.generated_at);
  assert.deepEqual(result.analysis, analysis());
  assert.equal(result.sources[0].publisher, 'جريدة البورصة');
  assert.equal(result.market_facts[0].change_percent, -0.573678);
  assert.equal(JSON.stringify(result).includes(KEY), false);
});

test('generated numbers, outside citations and URL output fail application validation', async () => {
  const O = await modulePromise;
  const changed = [analysis(), analysis(), analysis()];
  changed[0].summary = 'الهدف المتوقع ٩٩ جنيهاً';
  changed[1].findings[0].source_ids = ['N999'];
  changed[2].summary = 'راجع https://untrusted.example/fake';
  for (const value of changed) {
    const result = await O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async () => response(payload(value)) });
    assert.equal(result.status, 'failed');
    assert.equal(result.error_code, 'invalid_response');
    assert.equal(result.analysis, null);
  }
});

test('refusals and noncompleted Responses are never rendered as ready analysis', async () => {
  const O = await modulePromise;
  const refusal = payload(); refusal.output[1].content = [{ type: 'refusal', refusal: 'refused' }];
  const incomplete = { ...payload(), status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } };
  for (const value of [refusal, incomplete, { status: 'failed', error: { message: 'provider detail' } }, { status: 'completed', output: [] }]) {
    const result = await O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async () => response(value) });
    assert.equal(result.status, 'failed');
    assert.equal(result.error_code, 'blocked_or_incomplete');
    assert.equal(result.analysis, null);
    assert.equal(JSON.stringify(result).includes('provider detail'), false);
  }
});

test('identical evidence reuses existing OpenAI result without consuming another request', async () => {
  const O = await modulePromise; const previous = await ready(); let calls = 0;
  const result = await O.generateOpenAI({ ...input(), apiKey: KEY, previous, now: NOW + 8 * 3600000, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 0);
  assert.equal(result.reuse_reason, 'unchanged_public_evidence');
  assert.equal(result.generated_at, previous.generated_at);
  assert.equal(result.last_request_at, previous.last_request_at);
});

test('changed evidence respects six-hour interval and keeps earlier source dates visible', async () => {
  const O = await modulePromise; const previous = await ready(); let calls = 0;
  const result = await O.generateOpenAI({ ...input('قطاع العقارات يراقب تغير السيولة'), apiKey: KEY, previous, now: NOW + 3600000, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 0);
  assert.equal(result.status, 'stale');
  assert.equal(result.reuse_reason, 'six_hour_interval');
  assert.equal(result.generated_at, previous.generated_at);
  assert.equal(result.sources[0].title, previous.sources[0].title);
});

test('rate-limit failure preserves success, never leaks provider errors and throttles next retry', async () => {
  const O = await modulePromise; const previous = await ready();
  const now = NOW + 7 * 3600000;
  const data = input('قطاع العقارات يراقب تغير السيولة');
  const failed = await O.generateOpenAI({ ...data, apiKey: KEY, previous, now, fetcher: async () => response({ error: { message: KEY } }, 429) });
  assert.equal(failed.status, 'stale');
  assert.equal(failed.error_code, 'http_429');
  assert.equal(failed.generated_at, previous.generated_at);
  assert.equal(failed.last_request_at, new Date(now).toISOString());
  assert.equal(JSON.stringify(failed).includes(KEY), false);
  let calls = 0;
  const retained = await O.generateOpenAI({ ...data, apiKey: KEY, previous: failed, now: now + 1800000, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 0);
  assert.equal(retained.reuse_reason, 'six_hour_interval');
});

test('failed first inference retains a real request timestamp and cannot retry every poll', async () => {
  const O = await modulePromise;
  const failed = await O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async () => response({}, 503) });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.last_request_at, '2026-10-07T12:00:00.000Z');
  let calls = 0;
  const result = await O.generateOpenAI({ ...input(), apiKey: KEY, previous: failed, now: NOW + 1800000, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 0);
  assert.equal(result.error_code, 'http_503');
});

test('Gemini reports are never mistaken for an OpenAI cache hit', async () => {
  const O = await modulePromise; const previous = { ...await ready(), model: 'gemini-3.1-flash-lite' }; let calls = 0;
  const result = await O.generateOpenAI({ ...input(), apiKey: KEY, previous, now: NOW + 3600000, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 1);
  assert.equal(result.model, 'gpt-6-luna');
  assert.equal(result.status, 'ready');
});

test('timeout and oversized response produce bounded safe failure reports', async () => {
  const O = await modulePromise;
  const timeout = await O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async () => { const error = new Error(KEY); error.name = 'TimeoutError'; throw error; } });
  assert.equal(timeout.error_code, 'timeout');
  assert.equal(JSON.stringify(timeout).includes(KEY), false);
  const oversized = await O.generateOpenAI({ ...input(), apiKey: KEY, now: NOW, fetcher: async () => new Response('x'.repeat(100001)) });
  assert.equal(oversized.error_code, 'invalid_response');
  assert.equal(oversized.analysis, null);
});

test('no valid publisher evidence makes no model request', async () => {
  const O = await modulePromise; const data = input(); data.news.items[0].url = 'https://unknown.example/fake'; let calls = 0;
  const result = await O.generateOpenAI({ ...data, apiKey: KEY, now: NOW, fetcher: async () => { calls++; return response(); } });
  assert.equal(calls, 0);
  assert.equal(result.error_code, 'no_valid_public_news');
  assert.equal(result.last_request_at, null);
});

