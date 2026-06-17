import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { getProfile } from "@/lib/profile/get";
import { createTestDb, pgliteGetProfileAdapter, seedMember } from "./db";

describe("getProfile (S1 integration seam)", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it("returns every field group, with only the Social Links that were set", async () => {
    const id = await seedMember(db, {
      firstName: "Maria",
      lastName: "Pop",
      location: "Cluj-Napoca",
      skills: "carpentry, masonry",
      passions: "timber framing",
      heartProjectDescription: "A communal workshop",
      heartProjectSeeking: false,
      // Only two links published; the rest must be omitted entirely.
      socials: { website: "https://maria.example.com", instagram: "maria-ig" },
    });

    const profile = await getProfile(pgliteGetProfileAdapter(db), id);

    expect(profile).not.toBeNull();
    expect(profile).toMatchObject({
      id,
      name: "Maria Pop",
      location: "Cluj-Napoca",
      skills: "carpentry, masonry",
      passions: "timber framing",
      heartProjectDescription: "A communal workshop",
      heartProjectSeeking: false,
    });
    // Published links present; unpublished ones absent, not null.
    expect(profile?.socials).toEqual({
      website: "https://maria.example.com",
      instagram: "maria-ig",
    });
  });

  it("returns an empty socials map for a Member who published no Social Links", async () => {
    const id = await seedMember(db, { firstName: "No", lastName: "Links" });

    const profile = await getProfile(pgliteGetProfileAdapter(db), id);

    expect(profile?.socials).toEqual({});
  });

  it("returns null for an unknown id so a stale link fails cleanly", async () => {
    await seedMember(db, { firstName: "Some", lastName: "One" });

    const profile = await getProfile(
      pgliteGetProfileAdapter(db),
      crypto.randomUUID(),
    );

    expect(profile).toBeNull();
  });
});
