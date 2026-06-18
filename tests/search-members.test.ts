import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  searchMembers,
  type GenerationRequest,
} from "@/lib/people-search/search-members";
import { createTestDb, pgliteSearchMembersAdapter, seedMember } from "./db";

// Seam C (issue #23): the retrieve-then-generate orchestrator. The key guarantee
// it must hold -- the regression guard against the hallucinated-roles/links
// failure -- is that the payload handed to the LLM contains ONLY real, matched
// Members with their real ids. It also self-excludes the searcher, drops anyone
// below the similarity floor, and yields a no-candidates result when nothing
// matches.
describe("searchMembers", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createTestDb();
  });
  afterEach(async () => {
    await db.close();
  });

  // Capture what the orchestrator hands the (faked) LLM.
  function captureGenerate() {
    let captured: GenerationRequest | undefined;
    const generate = (req: GenerationRequest) => {
      captured = req;
      return "ANSWER";
    };
    return { generate, get: () => captured };
  }

  it("hands the LLM only real matched members, self-excluded and floor-filtered, best first", async () => {
    // query vector; the fake embedder returns it for any query string.
    const query = [1, 0, 0];
    const embedder = async () => query;

    const searcher = await seedMember(db, {
      firstName: "Self",
      lastName: "Searcher",
      embedding: [1, 0, 0], // identical to query -> would top results if not excluded
    });
    const bob = await seedMember(db, {
      firstName: "Bob",
      lastName: "Crăciun",
      skills: "natural materials, timber framing",
      embedding: [1, 0.1, 0], // ~0.995
    });
    const joe = await seedMember(db, {
      firstName: "Joe",
      lastName: "Marin",
      skills: "modern materials, steel framing",
      embedding: [0.8, 0.6, 0], // 0.8
    });
    await seedMember(db, {
      firstName: "Pablo",
      lastName: "Painter",
      embedding: [0, 0, 1], // cosine 0 -> below the 0.3 floor, dropped
    });

    const cap = captureGenerate();
    const { candidates, result } = await searchMembers(
      { embedder, db: pgliteSearchMembersAdapter(db), generate: cap.generate },
      { query: "cine construiește case din materiale naturale", searcherId: searcher },
    );

    const ids = candidates.map((c) => c.memberId);
    // Real, matched members only -- in similarity order, searcher and the
    // below-floor painter both absent.
    expect(ids).toEqual([bob, joe]);
    expect(candidates[0].firstName).toBe("Bob");
    expect(candidates[0].lastName).toBe("Crăciun");

    // The generator received exactly those candidates -- nothing invented.
    expect(cap.get()?.candidates.map((c) => c.memberId)).toEqual([bob, joe]);
    expect(cap.get()?.contextBlock).toContain(bob);
    expect(cap.get()?.contextBlock).not.toContain(searcher);
    expect(result).toBe("ANSWER");
  });

  it("yields a no-candidates result when nothing clears the floor", async () => {
    const embedder = async () => [0, 1, 0];
    const searcher = await seedMember(db, { firstName: "Searcher", lastName: "One", embedding: [1, 0, 0] });
    await seedMember(db, { firstName: "Bob", lastName: "Two", embedding: [1, 0, 0] }); // cosine 0 to query
    await seedMember(db, { firstName: "Joe", lastName: "Three", embedding: [1, 0.05, 0] }); // ~0.05, below floor

    const cap = captureGenerate();
    const { candidates } = await searchMembers(
      { embedder, db: pgliteSearchMembersAdapter(db), generate: cap.generate },
      { query: "ceva ce nu există în comunitate", searcherId: searcher },
    );

    expect(candidates).toEqual([]);
    expect(cap.get()?.candidates).toEqual([]);
    expect(cap.get()?.contextBlock).toBe("CANDIDATES: (none)");
  });
});
