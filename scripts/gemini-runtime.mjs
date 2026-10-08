// Server-only runtime guard for scheduled AI generation.
// Gemini 3.8 Flash can legitimately need more than the previous 45s ceiling
// when constrained JSON output is requested. Keep short infrastructure reads
// unchanged and extend only the provider-generation timeout used by the app.
const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
AbortSignal.timeout = milliseconds => nativeTimeout(milliseconds === 45000 ? 120000 : milliseconds);
