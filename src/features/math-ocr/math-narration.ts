import type { ReaderLanguage } from "@/stores/accessibility-store";
import { autoWrapUnescapedMath, normalizeMarkdownText } from "@/lib/math/math-markdown-parser";
import {
  narrateSemanticEquation,
  type EquationNode,
  type SemanticMathResult,
} from "./semantic-math-parser";

export type EquationNarrationResult = SemanticMathResult;
export type { EquationNode };

/**
 * Deterministically translates LaTeX into structured, screen-reader-friendly
 * English and Indonesian speech strings using the semantic AST-like parser.
 */
export function narrateLatexEquation(latex: string): EquationNarrationResult {
  return narrateSemanticEquation(latex);
}

/**
 * Transforms any prose or mixed document text containing embedded LaTeX
 * delimiters (\(...\), \[...\], $...$, $$...$$) into fluent, accessible speech text
 * for screen readers and speech synthesis engines, avoiding reading raw LaTeX code.
 */
export function narrateMixedText(
  text: string,
  lang: ReaderLanguage = "id"
): string {
  if (!text) return "";

  // Normalize markdown text (including OCR vector artifacts) and auto-wrap unescaped LaTeX math formulas
  const preparedText = autoWrapUnescapedMath(normalizeMarkdownText(text));

  // Match:
  // 1. \[ ... \]
  // 2. \( ... \)
  // 3. $$ ... $$
  // 4. $ ... $
  const mathRegex =
    /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^\$\n]+)\$/g;

  let result = preparedText.replace(mathRegex, (_m, disp1, in1, disp2, in2) => {
    const rawFormula = (disp1 || in1 || disp2 || in2 || "").trim();
    if (!rawFormula) return "";
    const narration = narrateLatexEquation(rawFormula);
    const spoken = lang === "id" ? narration.narrationId : narration.narrationEn;
    // Strip parenthetical warnings from spoken text in paragraphs for cleaner listening
    const cleanSpoken = spoken.replace(/\s*\((?:Peringatan|Warning):[^)]+\)/g, "");
    return ` ${cleanSpoken} `;
  });

  // Also replace any stray raw LaTeX symbols that may exist in unescaped prose
  result = result
    .replace(/\\cap\b|\\bigcap\b/g, lang === "id" ? " irisan " : " intersection ")
    .replace(/\\cup\b|\\bigcup\b/g, lang === "id" ? " gabungan " : " union ")
    .replace(/\\setminus\b/g, lang === "id" ? " selisih himpunan " : " set minus ")
    .replace(/\\subset\b/g, lang === "id" ? " himpunan bagian dari " : " subset of ")
    .replace(/\\subseteq\b/g, lang === "id" ? " bagian atau sama dengan " : " subset or equal to ")
    .replace(/\\supset\b/g, lang === "id" ? " himpunan superset dari " : " superset of ")
    .replace(/\\supseteq\b/g, lang === "id" ? " superset atau sama dengan " : " superset or equal to ")
    .replace(/\\in\b/g, lang === "id" ? " anggota dari " : " in ")
    .replace(/\\notin\b/g, lang === "id" ? " bukan anggota dari " : " not in ")
    .replace(/\\emptyset\b|\\varnothing\b/g, lang === "id" ? " himpunan kosong " : " empty set ")
    .replace(/\\leqslant\b|\\leq\b|\\le\b/g, lang === "id" ? " kurang dari atau sama dengan " : " less than or equal to ")
    .replace(/\\geqslant\b|\\geq\b|\\ge\b/g, lang === "id" ? " lebih dari atau sama dengan " : " greater than or equal to ")
    .replace(/\\neq\b|\\ne\b/g, lang === "id" ? " tidak sama dengan " : " is not equal to ")
    .replace(/\\approx\b/g, lang === "id" ? " kira-kira sama dengan " : " is approximately equal to ")
    .replace(/\\equiv\b/g, lang === "id" ? " ekuivalen dengan " : " is equivalent to ")
    .replace(/\\propto\b/g, lang === "id" ? " sebanding dengan " : " is proportional to ")
    .replace(/\\to\b|\\rightarrow\b/g, lang === "id" ? " menuju " : " approaches ")
    .replace(/\\cdot\b/g, " dot ")
    .replace(/\\times\b/g, lang === "id" ? " dikali " : " times ")
    .replace(/\\div\b/g, lang === "id" ? " dibagi " : " divided by ")
    .replace(/\\pm\b/g, lang === "id" ? " plus minus " : " plus or minus ")
    .replace(/\\infty\b/g, lang === "id" ? " tak hingga " : " infinity ")
    .replace(/\\circ\b/g, lang === "id" ? " derajat " : " degrees ")
    .replace(/\\dots\b|\\ldots\b|\\cdots\b/g, lang === "id" ? " titik-titik " : " and so on ")
    // Strip any remaining backslashes before words so speech synthesizer doesn't pronounce "backslash"
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}

/**
 * Generates clear, accessible, and structured speech narration for academic tables,
 * including table caption, row/column dimensions, column headers, and each cell's contents
 * with embedded mathematical formula translation.
 */
export function narrateTableBlock(
  caption: string,
  tableHeaders?: string[],
  tableRows?: string[][],
  lang: ReaderLanguage = "id"
): string {
  const parts: string[] = [];
  const cleanCaption = caption.replace(/^Tabel\s*:\s*/i, "").trim();

  if (lang === "id") {
    if (cleanCaption) {
      parts.push(`Tabel: ${narrateMixedText(cleanCaption, "id")}.`);
    } else {
      parts.push("Tabel terstruktur.");
    }

    const rowCount = tableRows?.length ?? 0;
    const colCount = tableHeaders?.length ?? (tableRows?.[0]?.length ?? 0);
    if (colCount > 0) {
      parts.push(`Memiliki ${colCount} kolom${rowCount > 0 ? ` dan ${rowCount} baris` : ""}.`);
    }

    if (tableHeaders && tableHeaders.length > 0) {
      const narratedHeaders = tableHeaders.map((h) => narrateMixedText(h, "id"));
      parts.push(`Judul kolom: ${narratedHeaders.join(", ")}.`);
    }

    if (tableRows && tableRows.length > 0) {
      tableRows.forEach((row, rIdx) => {
        const rowCells = row.map((cell, cIdx) => {
          const headerPrefix = tableHeaders?.[cIdx] ? `${narrateMixedText(tableHeaders[cIdx], "id")}: ` : "";
          return `${headerPrefix}${narrateMixedText(cell, "id")}`;
        });
        parts.push(`Baris ${rIdx + 1}: ${rowCells.join("; ")}.`);
      });
    }
  } else {
    // English narration
    if (cleanCaption) {
      parts.push(`Table: ${narrateMixedText(cleanCaption, "en")}.`);
    } else {
      parts.push("Structured table.");
    }

    const rowCount = tableRows?.length ?? 0;
    const colCount = tableHeaders?.length ?? (tableRows?.[0]?.length ?? 0);
    if (colCount > 0) {
      parts.push(`Has ${colCount} columns${rowCount > 0 ? ` and ${rowCount} rows` : ""}.`);
    }

    if (tableHeaders && tableHeaders.length > 0) {
      const narratedHeaders = tableHeaders.map((h) => narrateMixedText(h, "en"));
      parts.push(`Column headers: ${narratedHeaders.join(", ")}.`);
    }

    if (tableRows && tableRows.length > 0) {
      tableRows.forEach((row, rIdx) => {
        const rowCells = row.map((cell, cIdx) => {
          const headerPrefix = tableHeaders?.[cIdx] ? `${narrateMixedText(tableHeaders[cIdx], "en")}: ` : "";
          return `${headerPrefix}${narrateMixedText(cell, "en")}`;
        });
        parts.push(`Row ${rIdx + 1}: ${rowCells.join("; ")}.`);
      });
    }
  }

  return parts.join(" ");
}
