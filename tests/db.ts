import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { InviteRpcClient } from "@/lib/invites/claim";

// The init migration references `auth.users(id)` because in production
// Supabase owns the auth schema. PGlite doesn't ship with auth, so we
// stub the minimum the schema and the function need.
const STUB_AUTH_SCHEMA = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key,
    email text unique
  );
  do $$ begin
    create role anon nologin;
  exception when duplicate_object then null; end $$;
  do $$ begin
    create role authenticated nologin;
  exception when duplicate_object then null; end $$;
  do $$ begin
    create role service_role nologin;
  exception when duplicate_object then null; end $$;
`;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// Only the schema migration runs in pglite — the extensions migration
// (CREATE EXTENSION vector) needs Supabase. pgvector isn't exercised yet
// in this slice; issue #6 adds the column and its own tests.
const SCHEMA_MIGRATION = "20260615120100_init.sql";

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(STUB_AUTH_SCHEMA);
  const sql = readFileSync(join(MIGRATIONS_DIR, SCHEMA_MIGRATION), "utf8");
  await db.exec(sql);
  return db;
}

// Adapt PGlite to the same shape `claimInvite` expects from a Supabase
// client. The server action passes the real `supabase.rpc`; the test
// passes this adapter — both call into the same `claim_invite` function
// over the same SQL, which is the seam the issue calls out.
export function pgliteRpcAdapter(db: PGlite): InviteRpcClient {
  return {
    async rpc(name, args) {
      try {
        const result = await db.query<{ claim_invite: string }>(
          `select claim_invite($1, $2, $3) as claim_invite`,
          [args.p_user_id, args.p_email, args.p_code],
        );
        return { data: result.rows[0].claim_invite, error: null };
      } catch (err) {
        const e = err as { code?: string; message?: string };
        return {
          data: null,
          error: { code: e.code, message: e.message ?? String(err) },
        };
      }
    },
  };
}

// Seed an auth.users row + an unclaimed invite. Returns the user id and
// the code so a test can drive a claim from a known starting state.
export async function seedUnclaimedInvite(
  db: PGlite,
  opts: { code: string; email: string },
): Promise<{ userId: string; email: string; code: string }> {
  const userId = crypto.randomUUID();
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
    userId,
    opts.email,
  ]);
  await db.query(`insert into invites (code) values ($1)`, [opts.code]);
  return { userId, email: opts.email, code: opts.code };
}
