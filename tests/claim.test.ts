import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { claimInvite } from "@/lib/invites/claim";
import { createTestDb, pgliteRpcAdapter, seedUnclaimedInvite } from "./db";

describe("claimInvite (S1 server-action integration seam)", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates a Member bound to the code on a valid claim", async () => {
    const seeded = await seedUnclaimedInvite(db, {
      code: "DEV-AAAA-0001",
      email: "alice@example.com",
    });

    const result = await claimInvite(pgliteRpcAdapter(db), {
      code: seeded.code,
      userId: seeded.userId,
      email: seeded.email,
    });

    expect(result).toEqual({ kind: "ok", memberId: seeded.userId });

    const members = await db.query<{ id: string; email: string; role: string }>(
      `select id, email, role from members where id = $1`,
      [seeded.userId],
    );
    expect(members.rows).toHaveLength(1);
    expect(members.rows[0].role).toBe("member");

    const invite = await db.query<{ claimed_by: string }>(
      `select claimed_by from invites where code = $1`,
      [seeded.code],
    );
    expect(invite.rows[0].claimed_by).toBe(seeded.userId);
  });

  it("fails with kind:invalid for a code that does not exist", async () => {
    const userId = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      userId,
      "bob@example.com",
    ]);

    const result = await claimInvite(pgliteRpcAdapter(db), {
      code: "DOES-NOT-EXIST",
      userId,
      email: "bob@example.com",
    });

    expect(result).toEqual({ kind: "invalid" });
  });

  it("fails the second claim of the same code with kind:alreadyClaimed", async () => {
    const first = await seedUnclaimedInvite(db, {
      code: "DEV-AAAA-0002",
      email: "carol@example.com",
    });
    const ok = await claimInvite(pgliteRpcAdapter(db), {
      code: first.code,
      userId: first.userId,
      email: first.email,
    });
    expect(ok.kind).toBe("ok");

    const otherUserId = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [
      otherUserId,
      "dave@example.com",
    ]);
    const second = await claimInvite(pgliteRpcAdapter(db), {
      code: first.code,
      userId: otherUserId,
      email: "dave@example.com",
    });

    expect(second).toEqual({ kind: "alreadyClaimed" });
  });
});
