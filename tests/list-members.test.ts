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

  it("carries Passions for the card preview", async () => {
    await seedMember(db, {
      firstName: "Passionate",
      lastName: "Member",
      passions: "Muzică și drumeții",
    });

    const [member] = await listMembers(pgliteListMembersAdapter(db));

    expect(member.passions).toBe("Muzică și drumeții");
  });

  it("returns at most two Resources in free-first persisted order with an accurate total", async () => {
    await seedMember(db, {
      firstName: "Resource",
      lastName: "Owner",
      resources: [
        { description: "Paid second", classification: "paid" },
        { description: "Free first", classification: "free" },
        { description: "Free second", classification: "free" },
      ],
    });

    const [member] = await listMembers(pgliteListMembersAdapter(db));

    expect(member.resources.map((resource) => resource.description)).toEqual([
      "Free first",
      "Free second",
    ]);
    expect(member.resourceCount).toBe(3);
  });
});
