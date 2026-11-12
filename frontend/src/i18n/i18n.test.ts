import { describe, expect, it } from "vitest";

import { normalizeLanguage } from "./index";

describe("language helpers", () => {
  it("maps regional English tags to English", () => {
    expect(normalizeLanguage("en-US")).toBe("en");
  });

  it("defaults everything else to Kinyarwanda", () => {
    expect(normalizeLanguage("rw")).toBe("rw");
    expect(normalizeLanguage("fr")).toBe("rw");
    expect(normalizeLanguage(undefined)).toBe("rw");
  });
});
