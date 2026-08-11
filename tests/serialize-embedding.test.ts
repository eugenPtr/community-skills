import { describe, expect, it } from "vitest";
import { serializeEmbedding } from "@/lib/people-search/serialize-embedding";

describe("serializeEmbedding", () => {
  it("serializes a newly generated numeric embedding", () => {
    expect(serializeEmbedding([0.25, -0.5])).toBe("[0.25,-0.5]");
  });

  it("does not double-encode an existing database vector", () => {
    expect(serializeEmbedding("[0.25,-0.5]")).toBe("[0.25,-0.5]");
  });
});
