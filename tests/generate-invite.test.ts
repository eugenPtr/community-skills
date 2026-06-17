import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { generateInvite } from "@/lib/invites/generate";
import {
  createTestDb,
  pgliteGenerateInviteAdapter,
  seedInvite,
  seedMember,
} from "./db";

describe("generateInvite (S1 integration seam)", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it("stores a new unclaimed invite attributed to the acting Admin", async () => {
    const admin = await seedMember(db, {
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });

    const code = await generateInvite(pgliteGenerateInviteAdapter(db), {
      adminId: admin,
      makeCode: () => "INV-TEST-0001",
    });

    expect(code).toBe("INV-TEST-0001");

    const rows = await db.query<{
      claimed_by: string | null;
      generated_by: string | null;
    }>(`select claimed_by, generated_by from invites where code = $1`, [code]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].claimed_by).toBeNull();
    expect(rows.rows[0].generated_by).toBe(admin);
  });

  it("retries with a fresh code when the first code collides", async () => {
    const admin = await seedMember(db, {
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });
    // The code makeCode hands out first already exists, forcing the retry.
    await seedInvite(db, { code: "INV-DUP-0001" });

    let calls = 0;
    const makeCode = () =>
      calls++ === 0 ? "INV-DUP-0001" : "INV-NEW-0002";

    const code = await generateInvite(pgliteGenerateInviteAdapter(db), {
      adminId: admin,
      makeCode,
    });

    expect(code).toBe("INV-NEW-0002");

    // The collision didn't duplicate the existing row, and the fresh code is
    // stored and attributed to the Admin.
    const dup = await db.query(
      `select generated_by from invites where code = $1`,
      ["INV-DUP-0001"],
    );
    expect(dup.rows).toHaveLength(1);

    const fresh = await db.query<{ generated_by: string | null }>(
      `select generated_by from invites where code = $1`,
      ["INV-NEW-0002"],
    );
    expect(fresh.rows[0].generated_by).toBe(admin);
  });
});
