import { createHash } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { EquationNode } from "@/features/math-ocr/semantic-math-parser";

export interface CachedMathNarration {
  latexHash: string;
  latexNormalized: string;
  narrationId: string;
  narrationEn: string;
  explorationTree?: EquationNode[];
  source: "deterministic" | "ai_fallback" | "volunteer_verified";
  verified: boolean;
}

// In-memory fast cache for instant SSR/API responses
const MEMORY_CACHE = new Map<string, CachedMathNarration>();
const MAX_MEMORY_CACHE_ITEMS = 1000;

/**
 * Normalizes LaTeX string by collapsing excess whitespace and trimming.
 */
export function normalizeLatexKey(latex: string): string {
  return latex.trim().replace(/\s+/g, " ");
}

/**
 * Creates a deterministic SHA-256 hash for a normalized LaTeX formula.
 */
export function hashLatexFormula(latex: string): string {
  const normalized = normalizeLatexKey(latex);
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Retrieves a cached mathematical narration by LaTeX string.
 * First checks in-memory cache, then checks Supabase.
 */
export async function getCachedMathNarration(
  latex: string
): Promise<CachedMathNarration | null> {
  const hash = hashLatexFormula(latex);

  // 1. Check in-memory cache
  const memoryHit = MEMORY_CACHE.get(hash);
  if (memoryHit) {
    return memoryHit;
  }

  // 2. Check Supabase database if configured
  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("math_narration_cache")
      .select("latex_hash, latex_normalized, narration_id, narration_en, exploration_tree, source, verified")
      .eq("latex_hash", hash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const cached: CachedMathNarration = {
      latexHash: data.latex_hash,
      latexNormalized: data.latex_normalized,
      narrationId: data.narration_id,
      narrationEn: data.narration_en,
      explorationTree: data.exploration_tree as unknown as EquationNode[] | undefined,
      source: data.source as CachedMathNarration["source"],
      verified: Boolean(data.verified),
    };

    // Store in memory cache for subsequent instant hits
    if (MEMORY_CACHE.size >= MAX_MEMORY_CACHE_ITEMS) {
      const firstKey = MEMORY_CACHE.keys().next().value;
      if (firstKey) MEMORY_CACHE.delete(firstKey);
    }
    MEMORY_CACHE.set(hash, cached);

    return cached;
  } catch {
    // Fail gracefully if database is unreachable or table not yet migrated
    return null;
  }
}

/**
 * Persists a mathematical narration to both in-memory cache and Supabase database.
 */
export async function saveCachedMathNarration(
  entry: CachedMathNarration
): Promise<void> {
  const hash = entry.latexHash;

  // 1. Write to memory cache
  if (MEMORY_CACHE.size >= MAX_MEMORY_CACHE_ITEMS) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    if (firstKey) MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(hash, entry);

  // 2. Persist to Supabase
  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return;

    await supabase.from("math_narration_cache").upsert(
      {
        latex_hash: entry.latexHash,
        latex_normalized: entry.latexNormalized,
        narration_id: entry.narrationId,
        narration_en: entry.narrationEn,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        exploration_tree: (entry.explorationTree as any) ?? null,
        source: entry.source,
        verified: entry.verified,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "latex_hash" }
    );
  } catch {
    // Non-blocking write failure
  }
}
