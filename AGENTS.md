<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tooling

Stack is Supabase + Vercel (ADR-0003). Every change to these must go through their CLI so it is reproducible, reviewable, and in git. **No manual dashboard changes** — the dashboard is read-only for inspection.

## Supabase

- Use the Supabase CLI for everything: `supabase start` for the local stack, migrations in `supabase/migrations/`, `supabase functions deploy` for Edge Functions, `supabase gen types` for generated types.
- Schema, RLS policies, triggers, and DB webhooks are defined as migrations — never hand-edited in the dashboard.
- Tests run against the local stack (`supabase start`), not a remote project.

## Vercel

- Use the Vercel CLI for env vars (`vercel env`), project linking, and deploys.
- Environment variables are managed via `vercel env` (and pulled locally with `vercel env pull`) — not added by hand in the dashboard.

# UI feedback

- All transient feedback to the user — errors and confirmations alike — is shown as a **toast** (`sonner`), not inline `<p>` markup. `<Toaster />` is mounted once in `app/layout.tsx`; server actions pass feedback via a redirect query param (`?error=` / `?sent=`) that a client component reads, surfaces as a toast, then strips from the URL. Default duration 5s.
