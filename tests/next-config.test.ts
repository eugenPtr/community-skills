import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("Next.js Server Action uploads", () => {
  it("allows multipart overhead above the 5 MB profile-photo limit", () => {
    expect(nextConfig.experimental?.serverActions).toMatchObject({
      bodySizeLimit: "6mb",
    });
  });
});
