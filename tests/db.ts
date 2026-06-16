import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { InviteRpcClient } from "@/lib/invites/claim";
import type { InviteValidateClient } from "@/lib/invites/validate";
import type { OnboardingDbClient } from "@/lib/onboarding/submit";

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
const PROFILES_MIGRATION = "20260615120200_profiles.sql";
const SOCIALS_MIGRATION = "20260616120000_socials.sql";

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(STUB_AUTH_SCHEMA);
  const schema = readFileSync(join(MIGRATIONS_DIR, SCHEMA_MIGRATION), "utf8");
  await db.exec(schema);
  const profiles = readFileSync(join(MIGRATIONS_DIR, PROFILES_MIGRATION), "utf8");
  await db.exec(profiles);
  const socials = readFileSync(join(MIGRATIONS_DIR, SOCIALS_MIGRATION), "utf8");
  await db.exec(socials);
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

export function pgliteValidateAdapter(db: PGlite): InviteValidateClient {
  return {
    async findInvite(code: string) {
      const result = await db.query<{ claimed_by: string | null }>(
        `select claimed_by from invites where code = $1`,
        [code],
      );
      if (result.rows.length === 0) return null;
      return { claimedBy: result.rows[0].claimed_by };
    },
  };
}

export function pgliteOnboardingAdapter(db: PGlite): OnboardingDbClient {
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
    async insertProfile(data) {
      try {
        await db.query(
          `insert into profiles
             (member_id, name, location, skills, passions, heart_project_description, heart_project_seeking)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            data.memberId,
            data.name,
            data.location,
            data.skills,
            data.passions,
            data.heartProjectDescription,
            data.heartProjectSeeking,
          ],
        );
        return { error: null };
      } catch (err) {
        const e = err as { message?: string };
        return { error: { message: e.message ?? String(err) } };
      }
    },
    async upsertSocials(data) {
      try {
        await db.query(
          `insert into socials
             (member_id, phone, email, website, linkedin, facebook, instagram, x)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           on conflict (member_id) do update set
             phone = excluded.phone,
             email = excluded.email,
             website = excluded.website,
             linkedin = excluded.linkedin,
             facebook = excluded.facebook,
             instagram = excluded.instagram,
             x = excluded.x`,
          [
            data.memberId,
            data.phone,
            data.email,
            data.website,
            data.linkedin,
            data.facebook,
            data.instagram,
            data.x,
          ],
        );
        return { error: null };
      } catch (err) {
        const e = err as { message?: string };
        return { error: { message: e.message ?? String(err) } };
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
