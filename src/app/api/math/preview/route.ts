import { NextResponse } from "next/server";
import { z } from "zod";
import { latexToMathMl } from "@/features/math-ocr/latex-to-mathml";
import { narrateLatexEquation } from "@/features/math-ocr/math-narration";
import { generateAiMathNarration } from "@/features/math-ocr/math-ai-fallback";
import {
  getCachedMathNarration,
  hashLatexFormula,
  normalizeLatexKey,
  saveCachedMathNarration,
} from "@/lib/data/math-cache";

const previewSchema = z.object({
  latex: z.string().trim().min(1).max(4000),
  aiFallback: z.boolean().optional(),
  contextHint: z.string().max(200).optional(),
});

export async function GET() {
  return NextResponse.json({
    status: "ok",
    route: "/api/math/preview",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a valid LaTeX expression." },
      { status: 400 }
    );
  }

  const { latex, aiFallback, contextHint } = parsed.data;

  // 1. Convert to semantic MathML
  const mml = latexToMathMl(latex);

  // 2. Check cache first for instant response
  const cached = await getCachedMathNarration(latex);
  if (cached) {
    return NextResponse.json({
      mathml: mml.mathml,
      valid: mml.valid,
      error: mml.error ?? null,
      narrationEn: cached.narrationEn,
      narrationId: cached.narrationId,
      supported: true,
      cached: true,
      source: cached.source,
      verified: cached.verified,
      explorationTree: cached.explorationTree ?? null,
    });
  }

  // 3. Run deterministic semantic parser
  let narration = narrateLatexEquation(latex);
  let source: "deterministic" | "ai_fallback" = "deterministic";

  // 4. If unsupported or explicitly requested, run AI fallback
  if ((!narration.supported || aiFallback) && mml.valid) {
    try {
      const aiNarration = await generateAiMathNarration(latex, { contextHint });
      if (aiNarration) {
        narration = {
          narrationEn: aiNarration.narrationEn,
          narrationId: aiNarration.narrationId,
          supported: true,
          unsupportedConstructs: [],
          confidencePenalty: 0,
          explorationTree: [
            {
              label: "Expression (AI Assisted)",
              spokenEn: aiNarration.narrationEn,
              spokenId: aiNarration.narrationId,
              latex,
            },
          ],
        };
        source = "ai_fallback";
      }
    } catch {
      // Keep deterministic result
    }
  }

  // 5. Persist to cache (both memory and DB)
  if (narration.supported) {
    const hash = hashLatexFormula(latex);
    await saveCachedMathNarration({
      latexHash: hash,
      latexNormalized: normalizeLatexKey(latex),
      narrationId: narration.narrationId,
      narrationEn: narration.narrationEn,
      explorationTree: narration.explorationTree,
      source,
      verified: false,
    });
  }

  return NextResponse.json({
    mathml: mml.mathml,
    valid: mml.valid,
    error: mml.error ?? null,
    narrationEn: narration.narrationEn,
    narrationId: narration.narrationId,
    supported: narration.supported,
    cached: false,
    source,
    explorationTree: narration.explorationTree ?? null,
  });
}
