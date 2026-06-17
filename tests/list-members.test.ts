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
    await seedMember(db, { name: "bob" });
    await seedMember(db, { name: "Alice" });
    await seedMember(db, { name: "charlie" });
    await seedMember(db, { name: "Bianca" });

    const members = await listMembers(pgliteListMembersAdapter(db));

    expect(members.map((m) => m.name)).toEqual([
      "Alice",
      "Bianca",
      "bob",
      "charlie",
    ]);
  });

  it("carries the seeking flag so a card can honestly show 'Seeking one'", async () => {
    await seedMember(db, {
      name: "Seeker",
      heartProjectSeeking: true,
      heartProjectDescription: null,
    });
    await seedMember(db, {
      name: "Devoted",
      heartProjectSeeking: false,
      heartProjectDescription: "Restoring a watermill",
    });

    const members = await listMembers(pgliteListMembersAdapter(db));
    const byName = Object.fromEntries(members.map((m) => [m.name, m]));

    expect(byName["Seeker"].heartProjectSeeking).toBe(true);
    expect(byName["Seeker"].heartProjectDescription).toBeNull();
    expect(byName["Devoted"].heartProjectSeeking).toBe(false);
    expect(byName["Devoted"].heartProjectDescription).toBe("Restoring a watermill");
  });
});
