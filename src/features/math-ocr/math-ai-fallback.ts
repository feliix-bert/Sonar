import { generateText, Output } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/provider";
import { isAiConfigured } from "@/lib/env";
import {
  hashLatexFormula,
  normalizeLatexKey,
  saveCachedMathNarration,
} from "@/lib/data/math-cache";
import type { EquationNode } from "./semantic-math-parser";

const aiMathNarrationSchema = z.object({
  narrationId: z.string().describe("Clear, natural Indonesian speech narration for a screen reader or text-to-speech engine."),
  narrationEn: z.string().describe("Clear, natural English speech narration for a screen reader or text-to-speech engine."),
  explanation: z.string().optional().describe("Brief 1-sentence pedagogical explanation of what this equation represents."),
});

export type AiMathNarrationResult = z.infer<typeof aiMathNarrationSchema>;

/**
 * AI Fallback Narration Generator:
 * Uses Gemini to translate complex, exotic, or non-standard LaTeX mathematical formulas
 * into natural, screen-reader friendly Indonesian and English speech without raw LaTeX code.
 */
export async function generateAiMathNarration(
  latex: string,
  options: { contextHint?: string } = {}
): Promise<AiMathNarrationResult | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const cleaned = latex.trim();
  if (!cleaned) return null;

  try {
    const model = getChatModel();
    const result = await generateText({
      model,
      output: Output.object({ schema: aiMathNarrationSchema }),
      temperature: 0.1,
      instructions: [
        "You are an expert mathematical accessibility specialist for blind university students.",
        "Your task is to convert raw LaTeX mathematical equations into natural, spoken mathematical text.",
        "RULES FOR ACCESSIBLE SPEECH:",
        "1. Never read raw LaTeX tags like \\begin, \\end, \\left, \\right, backslash, ampersand (&), or braces.",
        "2. Speak structures naturally. For example:",
        "   - \\binom{n}{k} -> 'kombinasi k dari n' (ID) / 'n choose k' (EN)",
        "   - \\frac{\\partial f}{\\partial x} -> 'turunan parsial f terhadap x' (ID) / 'partial derivative of f with respect to x' (EN)",
        "   - \\iint_D -> 'integral lipat dua pada daerah D' (ID) / 'double integral over region D' (EN)",
        "   - Matrices: explain dimension and read row by row clearly.",
        "3. Ensure words are separated by spaces. Never concatenate variables with subscript numbers.",
        "4. Output both Indonesian ('narrationId') and English ('narrationEn').",
      ].join(" "),
      prompt: [
        `Translate this mathematical equation into accessible speech:${options.contextHint ? ` (Context: ${options.contextHint})` : ""}`,
        `LaTeX: ${cleaned}`,
      ].join("\n"),
    });

    const output = result.output;
    if (output && output.narrationId && output.narrationEn) {
      // Save to cache
      const hash = hashLatexFormula(cleaned);
      const explorationTree: EquationNode[] = [
        {
          label: "Expression (AI Assisted)",
          spokenEn: output.narrationEn,
          spokenId: output.narrationId,
          latex: cleaned,
        },
      ];

      await saveCachedMathNarration({
        latexHash: hash,
        latexNormalized: normalizeLatexKey(cleaned),
        narrationId: output.narrationId,
        narrationEn: output.narrationEn,
        explorationTree,
        source: "ai_fallback",
        verified: false,
      });

      return output;
    }

    return null;
  } catch (err) {
    console.warn("[generateAiMathNarration] AI fallback generation failed:", err);
    return null;
  }
}
