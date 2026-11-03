import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
});

export type Env = z.infer<typeof envSchema>;

/** Returns the validated env, or the list of problems so the UI can explain how to fix them. */
export function readEnv(source: Record<string, unknown> = import.meta.env):
  | { ok: true; env: Env }
  | { ok: false; issues: string[] } {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}
