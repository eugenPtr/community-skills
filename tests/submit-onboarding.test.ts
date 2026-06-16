import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { submitOnboarding } from "@/lib/onboarding/submit";
import { createTestDb, pgliteOnboardingAdapter, seedUnclaimedInvite } from "./db";

const BASE_PROFILE = {
  name: "Alice Example",
  location: "Bucharest",
  skills: "backend, systems thinking",
  passions: "open-source software",
  heartProjectSeeking: false,
  heartProjectDescription: "Building a cooperative network",
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

    const result = await submitOnboarding(pgliteOnboardingAdapter(db), {
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

    const profiles = await db.query<{ name: string; heart_project_seeking: boolean }>(
      `select name, heart_project_seeking from profiles where member_id = $1`,
      [seeded.userId],
    );
    expect(profiles.rows).toHaveLength(1);
    expect(profiles.rows[0].name).toBe("Alice Example");
    expect(profiles.rows[0].heart_project_seeking).toBe(false);

    const invite = await db.query<{ claimed_by: string }>(
      `select claimed_by from invites where code = $1`,
      [seeded.code],
    );
    expect(invite.rows[0].claimed_by).toBe(seeded.userId);
  });

  it("returns alreadyClaimed and creates no rows when code is already claimed", async () => {
    const first = await seedUnclaimedInvite(db, {
      code: "DEV-CCCC-0002",
      email: "bob@example.com",
    });
    await submitOnboarding(pgliteOnboardingAdapter(db), {
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

    const result = await submitOnboarding(pgliteOnboardingAdapter(db), {
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

    const result = await submitOnboarding(pgliteOnboardingAdapter(db), {
      userId: seeded.userId,
      email: seeded.email,
      code: seeded.code,
      ...BASE_PROFILE,
      name: "",
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
});
