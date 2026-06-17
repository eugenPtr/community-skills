import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { listMembers } from "@/lib/members/list";
import { createTestDb, pgliteListMembersAdapter, seedMember } from "./db";

describe("listMembers (S1 integration seam)", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it("lists every Member in case-insensitive alphabetical order", async () => {
    // Seeded out of order and with mixed case so a naive ASCII sort (which puts
    // every uppercase letter before every lowercase one) would mis-order them.
    // A shared last name keeps ordering driven by the first name.
    await seedMember(db, { firstName: "bob", lastName: "Member" });
    await seedMember(db, { firstName: "Alice", lastName: "Member" });
    await seedMember(db, { firstName: "charlie", lastName: "Member" });
    await seedMember(db, { firstName: "Bianca", lastName: "Member" });

    const members = await listMembers(pgliteListMembersAdapter(db));

    expect(members.map((m) => m.name)).toEqual([
      "Alice Member",
      "Bianca Member",
      "bob Member",
      "charlie Member",
    ]);
  });

  it("carries the seeking flag so a card can honestly show 'Seeking one'", async () => {
    await seedMember(db, {
      firstName: "Seeker",
      lastName: "One",
      heartProjectSeeking: true,
      heartProjectDescription: null,
    });
    await seedMember(db, {
      firstName: "Devoted",
      lastName: "Two",
      heartProjectSeeking: false,
      heartProjectDescription: "Restoring a watermill",
    });

    const members = await listMembers(pgliteListMembersAdapter(db));
    const byName = Object.fromEntries(members.map((m) => [m.name, m]));

    expect(byName["Seeker One"].heartProjectSeeking).toBe(true);
    expect(byName["Seeker One"].heartProjectDescription).toBeNull();
    expect(byName["Devoted Two"].heartProjectSeeking).toBe(false);
    expect(byName["Devoted Two"].heartProjectDescription).toBe("Restoring a watermill");
  });
});
