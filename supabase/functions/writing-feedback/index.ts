// Supabase Edge Function: AI feedback on a learner's text (P6), using the Gemini API.
//
//   POST /functions/v1/writing-feedback   { "submission_id": "<uuid>", "level": 1-6 }
//   Authorization: Bearer <the learner's access token>
//
// Secrets (npx supabase secrets set …): GEMINI_API_KEY (required), GEMINI_MODEL (default gemini-2.5-flash),
// WRITING_FEEDBACK_DAILY_LIMIT (default 5). SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase. GEMINI_BASE_URL only exists for tests. No dependencies: plain fetch to Auth, PostgREST and Gemini.
import { geminiBody, geminiText, parseFeedback, type Feedback, type FeedbackRequest } from '../_shared/writing-feedback.ts';

const env = (k: string, fallback = '') => Deno.env.get(k) ?? fallback;
const SUPABASE_URL = env('SUPABASE_URL');
const ANON_KEY = env('SUPABASE_ANON_KEY');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const MODEL = env('GEMINI_MODEL', 'gemini-2.5-flash');
const DAILY_LIMIT = Number(env('WRITING_FEEDBACK_DAILY_LIMIT', '5')) || 5;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** PostgREST call, either as the learner (RLS applies) or as the service role. */
async function rest(path: string, init: RequestInit & { as: string }) {
  const key = init.as === SERVICE_KEY ? SERVICE_KEY : ANON_KEY;
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${init.as}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method' });
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) return reply(503, { error: 'not_configured' });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } });
  if (!jwt || !user.ok) return reply(401, { error: 'unauthorized' });
  const userId = (await user.json()).id as string;

  let input: { submission_id?: string; level?: number };
  try {
    input = await req.json();
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  if (!/^[0-9a-f-]{36}$/.test(input.submission_id ?? '')) return reply(400, { error: 'bad_request' });
  const level = Number.isInteger(input.level) && input.level! >= 1 && input.level! <= 6 ? input.level! : 3;

  // the text, read as the learner: RLS guarantees it is theirs
  const subRes = await rest(`writing_submissions?id=eq.${input.submission_id}&select=*`, { as: jwt });
  const sub = subRes.ok ? (await subRes.json())[0] : null;
  if (!sub) return reply(404, { error: 'not_found' });

  // already reviewed → return the stored feedback (never pay twice)
  const cached = await (await rest(`writing_feedback?submission_id=eq.${sub.id}&select=feedback`, { as: SERVICE_KEY })).json();
  if (cached[0]) return reply(200, { feedback: cached[0].feedback, cached: true });

  // daily limit per learner (rolling 24 hours)
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const countRes = await rest(`writing_feedback?user_id=eq.${userId}&created_at=gte.${since}&select=submission_id`, { as: SERVICE_KEY, method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const used = Number(countRes.headers.get('content-range')?.split('/')[1] ?? 0);
  if (used >= DAILY_LIMIT) return reply(429, { error: 'limit', limit: DAILY_LIMIT });

  const task = sub.task_id ? (await (await rest(`writing_tasks?id=eq.${sub.task_id}&select=kind,exam,min_length`, { as: SERVICE_KEY })).json())[0] : null;
  const request: FeedbackRequest = {
    language: sub.language,
    title: sub.title,
    prompt: sub.prompt,
    kind: task?.kind ?? 'paragraph',
    exam: task?.exam ?? 'general',
    level,
    minLength: task?.min_length ?? 1,
    targets: sub.target_words ?? [],
    body: sub.body,
  };

  let feedback: Feedback;
  try {
    const ai = await fetch(`${env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com')}/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(geminiBody(request)),
      signal: AbortSignal.timeout(90_000),
    });
    if (ai.status === 429) return reply(503, { error: 'ai_busy' });
    if (!ai.ok) {
      console.error('gemini', ai.status, (await ai.text()).slice(0, 500));
      return reply(502, { error: 'ai_failed' });
    }
    feedback = parseFeedback(geminiText(await ai.json()), request);
  } catch (e) {
    console.error('gemini', e instanceof Error ? e.message : e);
    return reply(502, { error: 'ai_invalid' });
  }

  const saved = await rest('writing_feedback', {
    as: SERVICE_KEY,
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ submission_id: sub.id, user_id: userId, model: MODEL, feedback }),
  });
  if (!saved.ok) console.error('save', saved.status, (await saved.text()).slice(0, 300));
  return reply(200, { feedback, cached: false, remaining: Math.max(0, DAILY_LIMIT - used - 1) });
});
