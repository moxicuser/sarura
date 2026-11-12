import { describe, expect, it } from "vitest";

import { safeNext } from "./redirect";

describe("safeNext", () => {
  it("keeps internal paths with their query string", () => {
    expect(safeNext("/products/42?tab=photos")).toBe("/products/42?tab=photos");
  });

  it("falls back for empty, external and protocol-relative values", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
    expect(safeNext("https://example.com")).toBe("/dashboard");
    expect(safeNext("//example.com/steal")).toBe("/dashboard");
  });
});
