// Supabase Edge Function: automatic keyword pairing for a Passage 3 the learner pasted, using the Gemini API.
//
//   POST /functions/v1/p3-pairs   { "type": "tfng", "passage": "...", "questions": ["...", "..."] }
//   Authorization: Bearer <the learner's access token>
//
// Secrets: GEMINI_API_KEY (required, shared with writing-feedback), GEMINI_MODEL (default gemini-2.5-flash),
// P3_PAIRS_DAILY_LIMIT (default 20). Nothing the learner pasted is stored: only one row per call (user, time) for the limit.
import { MAX_PASSAGE, MAX_QUESTIONS, geminiPairsBody, parsePairs, type AutoPair, type PairRequest } from '../_shared/p3-pairs.ts';

const env = (k: string, fallback = '') => Deno.env.get(k) ?? fallback;
const SUPABASE_URL = env('SUPABASE_URL');
const ANON_KEY = env('SUPABASE_ANON_KEY');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const MODEL = env('GEMINI_MODEL', 'gemini-2.5-flash');
const DAILY_LIMIT = Number(env('P3_PAIRS_DAILY_LIMIT', '20')) || 20;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method' });
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) return reply(503, { error: 'not_configured' });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } });
  if (!jwt || !user.ok) return reply(401, { error: 'unauthorized' });
  const userId = (await user.json()).id as string;

  let input: Partial<PairRequest>;
  try {
    input = await req.json();
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  const type = input.type;
  if (!type || !['tfng', 'ynng', 'mcq', 'gap'].includes(type)) return reply(400, { error: 'bad_request' });
  const passage = typeof input.passage === 'string' ? input.passage.slice(0, MAX_PASSAGE) : '';
  const questions = Array.isArray(input.questions) ? input.questions.filter((q) => typeof q === 'string' && q.trim()).slice(0, MAX_QUESTIONS).map((q) => q.slice(0, 600)) : [];
  if (passage.length < 50 || !questions.length) return reply(400, { error: 'bad_request' });

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const countRes = await rest(`p3_pair_calls?user_id=eq.${userId}&created_at=gte.${since}&select=id`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const used = Number(countRes.headers.get('content-range')?.split('/')[1] ?? 0);
  if (used >= DAILY_LIMIT) return reply(429, { error: 'limit', limit: DAILY_LIMIT });

  const request: PairRequest = { type, passage, questions };
  let pairs: AutoPair[][];
  try {
    const ai = await fetch(`${env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com')}/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(geminiPairsBody(request)),
      signal: AbortSignal.timeout(60_000),
    });
    if (ai.status === 429) return reply(503, { error: 'ai_busy' });
    if (!ai.ok) {
      console.error('gemini', ai.status, (await ai.text()).slice(0, 500));
      return reply(502, { error: 'ai_failed' });
    }
    const body = (await ai.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    pairs = parsePairs(text, request);
  } catch (e) {
    console.error('gemini', e instanceof Error ? e.message : e);
    return reply(502, { error: 'ai_invalid' });
  }

  const logged = await rest('p3_pair_calls', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: userId, model: MODEL }) });
  if (!logged.ok) console.error('log', logged.status, (await logged.text()).slice(0, 300));
  return reply(200, { pairs, remaining: Math.max(0, DAILY_LIMIT - used - 1) });
});
