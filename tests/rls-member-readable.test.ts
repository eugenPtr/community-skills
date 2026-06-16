import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ADR-0006: a Member reads every Member's full profile through RLS SELECT
// policies; an authenticated non-Member (an auth.users row with no members row,
// i.e. mid-onboarding) reads nothing. RLS depends on a real auth.uid() and the
// `authenticated` JWT role, neither of which pglite provides, so this is
// verified against the live local stack (AGENTS.md), not the S1 pglite seam.
//
// Well-known Supabase local defaults; override via env to point elsewhere.
const URL = process.env.SUPABASE_LOCAL_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.SUPABASE_LOCAL_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const PASSWORD = "rls-test-password";
const suffix = crypto.randomUUID().slice(0, 8);
const MEMBER_EMAIL = `rls-member-${suffix}@example.com`;
const NONMEMBER_EMAIL = `rls-nonmember-${suffix}@example.com`;

const auth = { persistSession: false, autoRefreshToken: false } as const;
const service = createClient(URL, SERVICE_KEY, { auth });

let memberId = "";
let nonMemberId = "";

async function signedInClient(email: string): Promise<SupabaseClient> {
  const client = createClient(URL, ANON_KEY, { auth });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return client;
}

describe("member-readable RLS (live local stack)", () => {
  beforeAll(async () => {
    const member = await service.auth.admin.createUser({
      email: MEMBER_EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (member.error) throw member.error;
    memberId = member.data.user.id;

    const nonMember = await service.auth.admin.createUser({
      email: NONMEMBER_EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (nonMember.error) throw nonMember.error;
    nonMemberId = nonMember.data.user.id;

    // Only the Member gets members/profiles/socials rows. The non-Member stays
    // an auth user with no members row -- exactly the mid-onboarding state.
    await service.from("members").insert({ id: memberId, email: MEMBER_EMAIL });
    await service.from("profiles").insert({
      member_id: memberId,
      name: "RLS Member",
      location: "Bucharest",
      skills: "testing",
      passions: "correctness",
      heart_project_description: "A trustworthy network",
      heart_project_seeking: false,
    });
    await service
      .from("socials")
      .insert({ member_id: memberId, website: "https://rls.example.com" });
  });

  afterAll(async () => {
    // Deleting the auth users cascades to members/profiles/socials (FK on
    // delete cascade), leaving the local DB as we found it.
    if (memberId) await service.auth.admin.deleteUser(memberId);
    if (nonMemberId) await service.auth.admin.deleteUser(nonMemberId);
  });

  it("lets a Member read members, profiles and socials", async () => {
    const client = await signedInClient(MEMBER_EMAIL);

    const members = await client.from("members").select("id");
    const profiles = await client.from("profiles").select("member_id");
    const socials = await client.from("socials").select("member_id");

    expect(members.error).toBeNull();
    expect(profiles.error).toBeNull();
    expect(socials.error).toBeNull();
    // At minimum the Member can see their own row in each table.
    expect(members.data?.length ?? 0).toBeGreaterThan(0);
    expect(profiles.data?.length ?? 0).toBeGreaterThan(0);
    expect(socials.data?.length ?? 0).toBeGreaterThan(0);
  });

  it("shows an authenticated non-Member nothing in any table", async () => {
    const client = await signedInClient(NONMEMBER_EMAIL);

    const members = await client.from("members").select("id");
    const profiles = await client.from("profiles").select("member_id");
    const socials = await client.from("socials").select("member_id");

    // RLS denial is silent: no error, zero rows.
    expect(members.data).toEqual([]);
    expect(profiles.data).toEqual([]);
    expect(socials.data).toEqual([]);
  });
});
