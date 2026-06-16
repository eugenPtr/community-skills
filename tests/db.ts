import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { InviteRpcClient } from "@/lib/invites/claim";
import type { InviteValidateClient } from "@/lib/invites/validate";
import type { OnboardingDbClient } from "@/lib/onboarding/submit";
import type { ListMembersClient } from "@/lib/community/list";
import type { GetProfileClient, SocialKey } from "@/lib/profile/get";

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
// The member-readable RLS policies (ADR-0006) reference auth.uid(), which pglite
// does not provide, so they are exercised against the real local stack
// (tests/rls-member-readable.test.ts), not here. The list/get *logic* seams
// below run on pglite where RLS is off, which is exactly the boundary we want:
// these tests prove ordering/shape/not-found, the RLS test proves the gate.
// The member-readable RLS migration is deliberately NOT applied here: its
// policy predicate calls auth.uid(), which pglite has no function for, so
// CREATE POLICY would fail. pglite also connects as owner (RLS bypassed), so
// the policies would have no effect anyway.

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

export function pgliteListMembersAdapter(db: PGlite): ListMembersClient {
  return {
    async fetchMemberCards() {
      const result = await db.query<{
        member_id: string;
        name: string;
        skills: string;
        heart_project_description: string | null;
        heart_project_seeking: boolean;
      }>(
        `select member_id, name, skills, heart_project_description, heart_project_seeking
           from profiles`,
      );
      return {
        data: result.rows.map((r) => ({
          id: r.member_id,
          name: r.name,
          skills: r.skills,
          heartProjectDescription: r.heart_project_description,
          heartProjectSeeking: r.heart_project_seeking,
        })),
        error: null,
      };
    },
  };
}

export function pgliteGetProfileAdapter(db: PGlite): GetProfileClient {
  return {
    async fetchProfile(memberId) {
      const result = await db.query<{
        member_id: string;
        name: string;
        location: string;
        skills: string;
        passions: string;
        heart_project_description: string | null;
        heart_project_seeking: boolean;
      }>(
        `select member_id, name, location, skills, passions,
                heart_project_description, heart_project_seeking
           from profiles where member_id = $1`,
        [memberId],
      );
      const row = result.rows[0];
      return {
        data: row
          ? {
              id: row.member_id,
              name: row.name,
              location: row.location,
              skills: row.skills,
              passions: row.passions,
              heartProjectDescription: row.heart_project_description,
              heartProjectSeeking: row.heart_project_seeking,
            }
          : null,
        error: null,
      };
    },
    async fetchSocials(memberId) {
      const result = await db.query<Record<SocialKey, string | null>>(
        `select phone, email, website, linkedin, facebook, instagram, x
           from socials where member_id = $1`,
        [memberId],
      );
      return { data: result.rows[0] ?? null, error: null };
    },
  };
}

// Seed a fully-onboarded Member (auth.users + members + profiles, plus an
// optional socials row) directly, so list/get tests start from a known set of
// Members without driving onboarding. Returns the member id.
export async function seedMember(
  db: PGlite,
  opts: {
    name: string;
    email?: string;
    location?: string;
    skills?: string;
    passions?: string;
    heartProjectDescription?: string | null;
    heartProjectSeeking?: boolean;
    socials?: Partial<Record<SocialKey, string>>;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  const email = opts.email ?? `${id}@example.com`;
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
    id,
    email,
  ]);
  await db.query(`insert into members (id, email) values ($1, $2)`, [id, email]);
  await db.query(
    `insert into profiles
       (member_id, name, location, skills, passions, heart_project_description, heart_project_seeking)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      opts.name,
      opts.location ?? "Bucharest",
      opts.skills ?? "skills",
      opts.passions ?? "passions",
      opts.heartProjectDescription ?? null,
      opts.heartProjectSeeking ?? false,
    ],
  );
  if (opts.socials) {
    const keys: SocialKey[] = [
      "phone",
      "email",
      "website",
      "linkedin",
      "facebook",
      "instagram",
      "x",
    ];
    await db.query(
      `insert into socials (member_id, phone, email, website, linkedin, facebook, instagram, x)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, ...keys.map((k) => opts.socials?.[k] ?? null)],
    );
  }
  return id;
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
