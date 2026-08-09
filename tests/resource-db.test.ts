import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, seedMember } from "./db";

describe("Resource database invariants", () => {
  let db: PGlite;
  beforeEach(async () => { db = await createTestDb(); });
  afterEach(async () => { await db.close(); });

  it("enforces normalized descriptions, classification, positions and cascade ownership", async () => {
    const id = await seedMember(db, { firstName: "Ana", lastName: "Pop" });
    const insert = (description: string, classification: string, position: number) => db.query(
      `insert into resources(member_id,description,classification,position,embedding,embedding_input) values($1,$2,$3,$4,$5,$2)`,
      [id, description, classification, position, [1,0,0]],
    );
    await expect(insert(" padded ", "free", 1)).rejects.toThrow();
    await expect(insert("x".repeat(256), "free", 1)).rejects.toThrow();
    await expect(insert("invalid", "other", 1)).rejects.toThrow();
    await expect(insert("negative", "free", -1)).rejects.toThrow();
    await db.query("delete from members where id=$1", [id]);
    expect((await db.query("select id from resources where member_id=$1", [id])).rows).toEqual([]);
  });

  it("allows no more than ten Resources per classification", async () => {
    const id = await seedMember(db, { firstName: "Ana", lastName: "Pop" });
    for (let position = 1; position < 10; position++) {
      await db.query(`insert into resources(member_id,description,classification,position,embedding,embedding_input) values($1,$2,'free',$3,$4,$2)`,
        [id, `Resource ${position}`, position, [1,0,0]]);
    }
    await expect(db.query(`insert into resources(member_id,description,classification,position,embedding,embedding_input) values($1,'Eleven','free',10,$2,'Eleven')`, [id,[1,0,0]])).rejects.toThrow(/resource_category_limit/);
  });
});
