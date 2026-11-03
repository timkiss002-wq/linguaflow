/** Shown instead of the app when Supabase env vars are missing. No router/providers needed. */
export default function SetupRequiredPage({ issues }: { issues: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold">LinguaFlow needs configuration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a <code className="rounded bg-muted px-1">.env.local</code> file (copy <code className="rounded bg-muted px-1">.env.example</code>) with your Supabase URL and anon key, then restart the dev server.
        </p>
        <ul className="mt-4 space-y-1 rounded-md bg-muted p-3 font-mono text-xs">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">See README → “Run locally” for step-by-step instructions.</p>
      </div>
    </div>
  );
}
