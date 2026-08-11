import { describe, expect, it } from "vitest";
import { withPersistedResourceId } from "@/lib/resources/persistence";

describe("withPersistedResourceId", () => {
  it("replaces a transient editor ID with the generated database UUID", () => {
    expect(
      withPersistedResourceId(
        { id: "_R_transient", description: "Consultanță", classification: "free" },
        "992d54a0-c1a3-4a87-b29a-b6330cc1a981",
      ),
    ).toEqual({
      id: "992d54a0-c1a3-4a87-b29a-b6330cc1a981",
      description: "Consultanță",
      classification: "free",
    });
  });
});
