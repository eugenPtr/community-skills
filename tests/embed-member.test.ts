import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { embedMember } from "@/lib/people-search/embed-member";
import { buildEmbeddingInput } from "@/lib/people-search/embedding-input";
import { createTestDb, pgliteEmbedMemberAdapter, seedMember } from "./db";

// Seam B (issue #23): embedMember reads a Profile, builds the input, embeds, and
// writes the vector + the exact text + the timestamp. Why it matters: a Profile
// edit must re-embed exactly that one Member's row -- never anyone else's.
describe("embedMember", () => {
  let db: PGlite;
  // Deterministic fake embedder: no network. Encodes the input length so the
  // test can prove the *built input* (not the raw skills) was what got embedded.
  const fakeEmbedder = async (input: string) => [input.length, 1, 0];

  beforeEach(async () => {
    db = await createTestDb();
  });
  afterEach(async () => {
    await db.close();
  });

  it("writes embedding, embedding_input and embedded_at for that member only", async () => {
    const target = await seedMember(db, {
      firstName: "Bob",
      lastName: "Crăciun",
      skills: "natural materials, timber framing",
      passions: "shaping a wall that breathes",
      heartProjectDescription: "Homes that breathe",
      heartProjectSeeking: false,
    });
    const other = await seedMember(db, { firstName: "Ana", lastName: "Dumitrescu" });

    const { embeddingInput } = await embedMember(
      { embedder: fakeEmbedder, db: pgliteEmbedMemberAdapter(db) },
      target,
    );

    // The text embedded is exactly what buildEmbeddingInput produces.
    const expectedInput = buildEmbeddingInput({
      skills: "natural materials, timber framing",
      passions: "shaping a wall that breathes",
      heartProjectDescription: "Homes that breathe",
      heartProjectSeeking: false,
    });
    expect(embeddingInput).toBe(expectedInput);

    const row = await db.query<{
      embedding: number[] | null;
      embedding_input: string | null;
      embedded_at: string | null;
    }>(
      `select embedding, embedding_input, embedded_at from profiles where member_id = $1`,
      [target],
    );
    expect(row.rows[0].embedding).toEqual([expectedInput.length, 1, 0]);
    expect(row.rows[0].embedding_input).toBe(expectedInput);
    expect(row.rows[0].embedded_at).not.toBeNull();

    // The other Member's row is untouched -- re-embed is per-row.
    const untouched = await db.query<{ embedding: number[] | null }>(
      `select embedding from profiles where member_id = $1`,
      [other],
    );
    expect(untouched.rows[0].embedding).toBeNull();
  });
});
