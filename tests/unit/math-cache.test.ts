import { describe, expect, it } from "vitest";
import {
  hashLatexFormula,
  normalizeLatexKey,
  getCachedMathNarration,
  saveCachedMathNarration,
} from "@/lib/data/math-cache";

describe("Math Narration Caching Layer", () => {
  it("normalizes and produces deterministic hash for equivalent formulas", () => {
    const f1 = "\\vec{u} \\times \\vec{v} = 0";
    const f2 = "  \\vec{u}   \\times   \\vec{v}   =   0  ";
    expect(normalizeLatexKey(f1)).toBe(normalizeLatexKey(f2));
    expect(hashLatexFormula(f1)).toBe(hashLatexFormula(f2));
  });

  it("stores and retrieves mathematical narrations in fast in-memory cache", async () => {
    const latex = "\\binom{10}{3} = 120";
    const hash = hashLatexFormula(latex);

    await saveCachedMathNarration({
      latexHash: hash,
      latexNormalized: normalizeLatexKey(latex),
      narrationId: "kombinasi tiga dari sepuluh sama dengan seratus dua puluh",
      narrationEn: "10 choose 3 equals 120",
      source: "deterministic",
      verified: true,
    });

    const cached = await getCachedMathNarration(latex);
    expect(cached).not.toBeNull();
    expect(cached?.narrationId).toContain("kombinasi tiga dari sepuluh");
    expect(cached?.narrationEn).toContain("10 choose 3");
    expect(cached?.verified).toBe(true);
  });
});
