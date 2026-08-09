import { describe, expect, it, vi } from "vitest";
import {
  saveResources,
  type SaveResourcesClient,
  type StoredResource,
} from "@/lib/resources/save";

const existing: StoredResource[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    description: "Mentorat",
    classification: "free",
    position: 0,
    embedding: [1, 0],
    embeddingInput: "Mentorat",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    description: "Audit",
    classification: "paid",
    position: 0,
    embedding: [0, 1],
    embeddingInput: "Audit",
  },
];

function client(replace = vi.fn().mockResolvedValue({ error: null })) {
  return {
    loadResources: vi.fn().mockResolvedValue({ data: existing, error: null }),
    replaceResources: replace,
  } satisfies SaveResourcesClient;
}

describe("saveResources", () => {
  it("reuses vectors for classification/order-only changes and persists once", async () => {
    const db = client();
    const embedder = vi.fn();
    await expect(saveResources({ db, embedder }, {
      memberId: "member-1",
      resources: [
        { id: existing[1].id, description: "Audit", classification: "free" },
        { id: existing[0].id, description: "Mentorat", classification: "free" },
      ],
    })).resolves.toEqual({ kind: "ok" });

    expect(embedder).not.toHaveBeenCalled();
    expect(db.replaceResources).toHaveBeenCalledTimes(1);
    expect(db.replaceResources).toHaveBeenCalledWith("member-1", [
      expect.objectContaining({ id: existing[1].id, position: 0, embedding: [0, 1] }),
      expect.objectContaining({ id: existing[0].id, position: 1, embedding: [1, 0] }),
    ]);
  });

  it("embeds new and description-changed rows while retaining an existing id", async () => {
    const db = client();
    const embedder = vi.fn(async (description: string) => description === "Coaching" ? [2, 0] : [3, 0]);
    await saveResources({ db, embedder }, {
      memberId: "member-1",
      resources: [
        { id: existing[0].id, description: "Coaching", classification: "free" },
        { id: "temporary-client-id", description: "Atelier", classification: "paid" },
      ],
    });

    const saved = vi.mocked(db.replaceResources).mock.calls[0][1];
    expect(saved[0]).toMatchObject({ id: existing[0].id, embedding: [2, 0] });
    expect(saved[1].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved[1]).toMatchObject({ embedding: [3, 0], position: 0 });
  });

  it("does not touch persistence when any required embedding fails", async () => {
    const db = client();
    const embedder = vi.fn().mockRejectedValue(new Error("Gateway unavailable"));
    await expect(saveResources({ db, embedder }, {
      memberId: "member-1",
      resources: [{ id: existing[0].id, description: "Schimbat", classification: "free" }],
    })).rejects.toThrow("Gateway unavailable");
    expect(db.replaceResources).not.toHaveBeenCalled();
  });

  it("rejects an empty set before loading or persisting", async () => {
    const db = client();
    await expect(saveResources({ db, embedder: vi.fn() }, {
      memberId: "member-1",
      resources: [],
    })).resolves.toEqual({ kind: "invalid" });
    expect(db.loadResources).not.toHaveBeenCalled();
    expect(db.replaceResources).not.toHaveBeenCalled();
  });
});
