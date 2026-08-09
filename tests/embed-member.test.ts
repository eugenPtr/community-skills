import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { embedProfileContext, embedResource } from "@/lib/people-search/embed-member";
import { createTestDb, pgliteEmbedResourceAdapter, seedMember } from "./db";

describe("embedResource", () => {
  let db: PGlite;
  beforeEach(async () => { db = await createTestDb(); });
  afterEach(async () => { await db.close(); });

  it("writes the exact Resource embedding without changing another Resource", async () => {
    const memberId = await seedMember(db, { firstName: "Ana", lastName: "Pop",
      resources: [{ description: "Mentorat tehnic", classification: "free" }, { description: "Audit software", classification: "paid" }] });
    const rows = await db.query<{ id: string; description: string }>("select id, description from resources where member_id=$1 order by position", [memberId]);
    const target = rows.rows[0];
    await embedResource({ embedder: async (input) => [input.length, 1, 0], db: pgliteEmbedResourceAdapter(db) }, target.id);
    const saved = await db.query<{ embedding_input: string }>("select embedding_input from resources where id=$1", [target.id]);
    expect(saved.rows[0].embedding_input).toBe("Mentorat tehnic");
  });
});

describe("embedProfileContext", () => {
  it("updates only the per-Member Profile-context vector", async () => {
    let write: { id: string; embeddingInput: string } | undefined;
    const result = await embedProfileContext({
      embedder: async (input) => [input.length, 0, 0],
      db: {
        getProfileContext: async () => ({ data: {
          passions: "permacultură", heartProjectDescription: "grădini comunitare", heartProjectSeeking: false,
        }, error: null }),
        writeProfileContextEmbedding: async (data) => {
          write = { id: data.id, embeddingInput: data.embeddingInput };
          return { error: null };
        },
      },
    }, "member-1");
    expect(result.embeddingInput).toContain("Pasiuni: permacultură");
    expect(write).toEqual({ id: "member-1", embeddingInput: result.embeddingInput });
  });
});
