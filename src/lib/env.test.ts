import { readEnv } from './env';

describe('readEnv', () => {
  it('accepts a valid configuration', () => {
    const r = readEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'sb_publishable_xxxxxxxxxxxxxxxx' });
    expect(r.ok).toBe(true);
  });

  it('reports every missing variable', () => {
    const r = readEnv({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.join()).toContain('VITE_SUPABASE_URL');
      expect(r.issues.join()).toContain('VITE_SUPABASE_ANON_KEY');
    }
  });

  it('rejects a malformed URL', () => {
    const r = readEnv({ VITE_SUPABASE_URL: 'not a url', VITE_SUPABASE_ANON_KEY: 'sb_publishable_xxxxxxxxxxxxxxxx' });
    expect(r.ok).toBe(false);
  });
});
