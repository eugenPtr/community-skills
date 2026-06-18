import { describe, expect, it } from "vitest";
import { buildEmbeddingInput } from "@/lib/people-search/embedding-input";

// Seam A (issue #23): the one source of truth for what text becomes a Member's
// embedding. Why it matters: the embedding must cover Passions and Heart Project,
// not just Skills, so interest-style queries ("who is into travelling") and
// heart-project queries match -- not only skill queries.
describe("buildEmbeddingInput", () => {
  const base = {
    skills: "builds with natural materials, timber framing, lime plaster",
    passions: "most present shaping a wall that breathes",
    heartProjectDescription: "Homes that breathe — built from natural materials",
    heartProjectSeeking: false,
  };

  it("labels and concatenates Skills + Heart Project + Passions", () => {
    const input = buildEmbeddingInput(base);

    expect(input).toBe(
      [
        `Skills: ${base.skills}`,
        `Heart project: ${base.heartProjectDescription}`,
        `Passions: ${base.passions}`,
      ].join("\n"),
    );
  });

  it("covers all three fields so non-skill queries can match", () => {
    const input = buildEmbeddingInput(base);
    // The whole point of the combined vector: passions + heart project are in,
    // alongside skills.
    expect(input).toContain("a wall that breathes");
    expect(input).toContain("Homes that breathe");
    expect(input).toContain("timber framing");
  });

  it("renders the 'seeking' Heart Project variant instead of a description", () => {
    const input = buildEmbeddingInput({
      ...base,
      heartProjectDescription: null,
      heartProjectSeeking: true,
    });

    expect(input).toContain("Heart project: Still seeking a heart project.");
    expect(input).not.toContain("Homes that breathe");
  });
});
