import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { OnboardingInfrastructureError, submitOnboarding } from "@/lib/onboarding/submit";
import { createTestDb, pgliteOnboardingAdapter, seedUnclaimedInvite } from "./db";

const BASE_PROFILE = {
  firstName: "Alice",
  lastName: "Example",
  location: "Bucharest",
  resources: [{ description: "backend systems thinking", classification: "free" as const }],
  passions: "open-source software",
  heartProjectSeeking: false,
  heartProjectDescription: "Building a cooperative network",
  socials: {
    phone: "+40721234567",
    email: "alice.contact@example.com",
  },
};

describe("submitOnboarding (S1 integration seam)", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates members and profiles rows and marks invite claimed on happy path", async () => {
    const seeded = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0001",
      email: "alice@example.com",
    });

    const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: seeded.userId,
      email: seeded.email,
      code: seeded.code,
      ...BASE_PROFILE,
    });

    expect(result).toEqual({ kind: "ok" });

    const members = await db.query<{ id: string }>(
      `select id from members where id = $1`,
      [seeded.userId],
    );
    expect(members.rows).toHaveLength(1);

    const profiles = await db.query<{
      first_name: string;
      last_name: string;
      heart_project_seeking: boolean;
    }>(
      `select first_name, last_name, heart_project_seeking from profiles where member_id = $1`,
      [seeded.userId],
    );
    expect(profiles.rows).toHaveLength(1);
    expect(profiles.rows[0].first_name).toBe("Alice");
    expect(profiles.rows[0].last_name).toBe("Example");
    expect(profiles.rows[0].heart_project_seeking).toBe(false);

    const invite = await db.query<{ claimed_by: string }>(
      `select claimed_by from invites where code = $1`,
      [seeded.code],
    );
    expect(invite.rows[0].claimed_by).toBe(seeded.userId);
  });

  it("stores Contact Details keyed by Member", async () => {
    const seeded = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0004",
      email: "erin@example.com",
    });

    const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: seeded.userId,
      email: seeded.email,
      code: seeded.code,
      ...BASE_PROFILE,
      socials: {
        phone: "+40 700 000 000",
        email: "erin.contact@example.com",
        website: "https://erin.example.com",
        linkedin: "erin-li",
        facebook: "erin-fb",
        instagram: "erin-ig",
        x: "erin-x",
      },
    });

    expect(result).toEqual({ kind: "ok" });

    const socials = await db.query<{
      phone: string;
      email: string;
      website: string;
      x: string;
    }>(`select phone, email, website, x from socials where member_id = $1`, [
      seeded.userId,
    ]);
    expect(socials.rows).toHaveLength(1);
    expect(socials.rows[0].email).toBe("erin.contact@example.com");
    expect(socials.rows[0].x).toBe("erin-x");
  });

  it("requires Direct Contact Details before claiming the Invite", async () => {
    const seeded = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0005",
      email: "frank@example.com",
    });

    for (const socials of [
      { phone: "", email: "frank@example.com" },
      { phone: "+40721234567", email: "   " },
    ]) {
      const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
        userId: seeded.userId,
        email: seeded.email,
        code: seeded.code,
        ...BASE_PROFILE,
        socials,
      });

      expect(result).toEqual({ kind: "missingFields" });
    }

    const members = await db.query(`select id from members where id = $1`, [
      seeded.userId,
    ]);
    expect(members.rows).toHaveLength(0);

    const invite = await db.query<{ claimed_by: string | null }>(
      `select claimed_by from invites where code = $1`,
      [seeded.code],
    );
    expect(invite.rows[0].claimed_by).toBeNull();
  });

  it("stores mandatory Direct Contact Details and leaves Online Links null", async () => {
    const seeded = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0006",
      email: "gina@example.com",
    });

    const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: seeded.userId,
      email: seeded.email,
      code: seeded.code,
      ...BASE_PROFILE,
      socials: {
        phone: "+442079460018",
        email: "gina@example.co.uk",
        linkedin: "gina-li",
      },
    });

    expect(result).toEqual({ kind: "ok" });

    const socials = await db.query<{
      linkedin: string | null;
      phone: string | null;
      email: string | null;
    }>(`select linkedin, phone, email from socials where member_id = $1`, [
      seeded.userId,
    ]);
    expect(socials.rows).toHaveLength(1);
    expect(socials.rows[0].linkedin).toBe("gina-li");
    expect(socials.rows[0].phone).toBe("+442079460018");
    expect(socials.rows[0].email).toBe("gina@example.co.uk");
  });

  it.each([
    ["phone without a country prefix", "0721234567", "alice@example.com"],
    ["phone with an invalid length", "+40123", "alice@example.com"],
    ["malformed Contact Email", "+40721234567", "alice.example.com"],
  ])("rejects %s before claiming the Invite", async (_case, phone, contactEmail) => {
    const seeded = await seedUnclaimedInvite(db, {
      code: `DEV-DDDD-${crypto.randomUUID().slice(0, 4)}`,
      email: "alice@example.com",
    });

    const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: seeded.userId,
      email: seeded.email,
      code: seeded.code,
      ...BASE_PROFILE,
      socials: { phone, email: contactEmail },
    });

    expect(result).toEqual({ kind: "missingFields" });

    const invite = await db.query<{ claimed_by: string | null }>(
      `select claimed_by from invites where code = $1`,
      [seeded.code],
    );
    expect(invite.rows[0].claimed_by).toBeNull();
  });

  it("returns alreadyClaimed and creates no rows when code is already claimed", async () => {
    const first = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0002",
      email: "bob@example.com",
    });
    await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: first.userId,
      email: first.email,
      code: first.code,
      ...BASE_PROFILE,
    });

    const secondUserId = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      secondUserId,
      "carol@example.com",
    ]);

    const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: secondUserId,
      email: "carol@example.com",
      code: first.code,
      ...BASE_PROFILE,
    });

    expect(result).toEqual({ kind: "alreadyClaimed" });

    const members = await db.query(
      `select id from members where id = $1`,
      [secondUserId],
    );
    expect(members.rows).toHaveLength(0);
  });

  it("returns missingFields and does not touch the DB when required fields are blank", async () => {
    const seeded = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0003",
      email: "dave@example.com",
    });

    const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1, 0, 0] }, {
      userId: seeded.userId,
      email: seeded.email,
      code: seeded.code,
      ...BASE_PROFILE,
      firstName: "",
    });

    expect(result).toEqual({ kind: "missingFields" });

    const members = await db.query(
      `select id from members where id = $1`,
      [seeded.userId],
    );
    expect(members.rows).toHaveLength(0);

    const invite = await db.query<{ claimed_by: string | null }>(
      `select claimed_by from invites where code = $1`,
      [seeded.code],
    );
    expect(invite.rows[0].claimed_by).toBeNull();
  });

  it("rejects missing, duplicate, oversized and over-limit Resources before claiming", async () => {
    for (const resources of [
      [],
      [{ description: "Mentorat", classification: "free" as const }, { description: "  MENTORAT  ", classification: "paid" as const }],
      [{ description: "x".repeat(256), classification: "free" as const }],
      Array.from({ length: 11 }, (_, index) => ({ description: `Resource ${index}`, classification: "free" as const })),
    ]) {
      const seeded = await seedUnclaimedInvite(db, { code: `DEV-R-${crypto.randomUUID()}`, email: `${crypto.randomUUID()}@example.com` });
      const result = await submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => [1,0,0] },
        { userId: seeded.userId, email: seeded.email, code: seeded.code, ...BASE_PROFILE, resources });
      expect(result).toEqual({ kind: "missingFields" });
      const invite = await db.query<{ claimed_by: string | null }>("select claimed_by from invites where code=$1", [seeded.code]);
      expect(invite.rows[0].claimed_by).toBeNull();
    }
  });

  it("publishes nothing when synchronous Resource indexing fails", async () => {
    const seeded = await seedUnclaimedInvite(db, { code: "DEV-INDEX-FAIL", email: "index@example.com" });
    await expect(submitOnboarding({ db: pgliteOnboardingAdapter(db), embedder: async () => { throw new Error("gateway unavailable"); } },
      { userId: seeded.userId, email: seeded.email, code: seeded.code, ...BASE_PROFILE })).rejects.toMatchObject({
        name: "OnboardingInfrastructureError",
        stage: "embedding",
      } satisfies Partial<OnboardingInfrastructureError>);
    expect((await db.query("select id from members where id=$1", [seeded.userId])).rows).toEqual([]);
    const invite = await db.query<{ claimed_by: string | null }>("select claimed_by from invites where code=$1", [seeded.code]);
    expect(invite.rows[0].claimed_by).toBeNull();
  });

  it("preserves expected RPC errors and types unexpected database failures", async () => {
    const payload = {
      userId: crypto.randomUUID(), email: "rpc@example.com", code: "DEV-RPC", ...BASE_PROFILE,
    };
    const embedder = async () => [1, 0, 0];
    const dbError = (code: string) => ({
      completeOnboarding: async () => ({ error: { code, message: "database detail" } }),
    });

    await expect(submitOnboarding({ db: dbError("P0001"), embedder }, payload))
      .resolves.toEqual({ kind: "invalidCode" });
    await expect(submitOnboarding({ db: dbError("P0002"), embedder }, payload))
      .resolves.toEqual({ kind: "alreadyClaimed" });
    await expect(submitOnboarding({ db: dbError("23514"), embedder }, payload))
      .rejects.toMatchObject({ stage: "complete-onboarding-rpc", databaseCode: "23514" });
  });
});
