import { describe, expect, it } from "vitest";
import { hasRequiredTier } from "./requireTier";

describe("tier compatibility", () => {
  it("keeps legacy workshop subscribers entitled to Academy features", () => {
    expect(hasRequiredTier("workshop", "academy")).toBe(true);
  });
});