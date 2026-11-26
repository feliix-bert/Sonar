import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/provider";
import { isAiConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { narrateLatexEquation, narrateMixedText, narrateTableBlock } from "@/features/math-ocr/math-narration";
import type { ExtractedBlockOutput } from "@/features/ocr/ocr-provider";

export const maxDuration = 60;

const translationSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().optional(),
      blockType: z.enum(["heading", "paragraph", "list", "table", "equation", "figure"]),
      headingLevel: z.number().optional(),
      contentText: z.string().default(""),
      latex: z.string().optional(),
      tableHeaders: z.array(z.string()).optional(),
      tableRows: z.array(z.array(z.string())).optional(),
      figureSummary: z
        .object({
          figureLabel: z.string().default("Gambar"),
          figureType: z.string().default("diagram"),
          summary: z.string().default(""),
          axesAndUnits: z.string().optional(),
          trends: z.string().optional(),
          keyPoints: z.array(z.string()).optional(),
          uncertaintyNotes: z.string().optional(),
        })
        .optional(),
      confidence: z.number().optional(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit({
      key: "doc-translate-global",
      limit: 40,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan terjemahan. Silakan coba sesaat lagi." },
        { status: 429 }
      );
    }

    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return NextResponse.json({ error: "Permintaan terjemahan kosong." }, { status: 400 });
    }
    const json = JSON.parse(rawBody) as {
      blocks?: ExtractedBlockOutput[];
      targetLanguage?: string;
    };
    const blocks: ExtractedBlockOutput[] = json.blocks ?? [];
    const targetLanguage: "id" | "en" = json.targetLanguage === "en" ? "en" : "id";

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ blocks: [] });
    }

    if (!isAiConfigured()) {
      // Offline fallback: update narration without mutating text
      const fallback = blocks.map((b) => {
        if (b.blockType === "equation" && b.latex) {
          const narr = narrateLatexEquation(b.latex);
          return {
            ...b,
            spokenText: targetLanguage === "en" ? narr.narrationEn : narr.narrationId,
          };
        }
        return {
          ...b,
          spokenText: narrateMixedText(b.contentText, targetLanguage),
        };
      });
      return NextResponse.json({ blocks: fallback });
    }

    const model = getChatModel();
    const targetName =
      targetLanguage === "id" ? "Bahasa Indonesia" : "English";

    const promptInstructions = [
      `You are an expert academic translator for university textbooks and lecture materials.`,
      `Translate the provided structured document blocks into natural, fluent academic ${targetName}.`,
      `CRITICAL RULES:`,
      `1. Translate all headings, paragraph prose, table headers, table cells, and figure descriptions accurately into ${targetName}.`,
      `2. DO NOT modify, translate, or strip any LaTeX mathematical expressions. Leave all inline formulas (e.g. \\( ... \\), $ ... $) and standalone LaTeX commands (e.g. \\vec{a}, \\frac{a}{b}, \\cap, \\cup, \\sqrt{...}, \\int) EXACTLY intact.`,
      `3. Preserve the exact block types, order, and heading levels.`,
      `4. For 'equation' blocks, leave the 'latex' and 'contentText' formulas identical to the input.`,
    ].join("\n");

    const result = await generateText({
      model,
      maxRetries: 0,
      maxOutputTokens: 8192,
      abortSignal: AbortSignal.timeout(48_000),
      instructions: promptInstructions,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            targetLanguage,
            blocksToTranslate: blocks.map((b) => ({
              blockType: b.blockType,
              headingLevel: b.headingLevel,
              contentText: b.contentText,
              latex: b.latex,
              tableHeaders: b.tableHeaders,
              tableRows: b.tableRows,
              figureSummary: b.figureSummary,
              confidence: b.confidence,
            })),
          }),
        },
      ],
      output: Output.object({
        schema: translationSchema,
        name: "TranslatedDocumentBlocks",
        description: `Translated semantic document blocks in ${targetName}.`,
      }),
    });

    const translatedRaw = result.output.blocks;

    // Merge translated text with original block properties and generate spokenText in targetLanguage
    const finalBlocks: ExtractedBlockOutput[] = translatedRaw.map((b, idx) => {
      const orig = blocks[idx] || {};
      const latex = orig.latex || b.latex;

      let spokenText = "";
      if (b.blockType === "equation" && latex) {
        const narr = narrateLatexEquation(latex);
        spokenText = targetLanguage === "en" ? narr.narrationEn : narr.narrationId;
      } else if (
        b.blockType === "table" &&
        (b.tableHeaders || b.tableRows || orig.tableHeaders || orig.tableRows)
      ) {
        spokenText = narrateTableBlock(
          b.contentText,
          b.tableHeaders ?? orig.tableHeaders,
          b.tableRows ?? orig.tableRows,
          targetLanguage
        );
      } else {
        spokenText = narrateMixedText(b.contentText, targetLanguage);
      }

      return {
        ...orig,
        blockType: b.blockType,
        headingLevel: b.headingLevel ?? orig.headingLevel,
        contentText: b.contentText,
        latex,
        mathMl: orig.mathMl,
        spokenText,
        tableHeaders: b.tableHeaders ?? orig.tableHeaders,
        tableRows: b.tableRows ?? orig.tableRows,
        figureSummary: b.figureSummary ?? orig.figureSummary,
        confidence: orig.confidence ?? b.confidence ?? 0.95,
      };
    });

    return NextResponse.json({ blocks: finalBlocks });
  } catch (err) {
    console.error("[Documents Translate Route] Error during translation:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menerjemahkan dokumen.",
      },
      { status: 500 }
    );
  }
}
