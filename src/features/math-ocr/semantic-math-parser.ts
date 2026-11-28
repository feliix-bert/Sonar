import type { ReaderLanguage } from "@/stores/accessibility-store";
import {
  FUNCTION_RULES,
  GREEK_RULES,
  OPERATOR_RULES,
  SUPPORTED_ENVIRONMENTS,
} from "./rules/math-speech-rules";

export interface EquationNode {
  label: string;
  spokenEn: string;
  spokenId: string;
  latex: string;
  children?: EquationNode[];
}

export interface SemanticMathResult {
  narrationEn: string;
  narrationId: string;
  supported: boolean;
  unsupportedConstructs: string[];
  confidencePenalty: number;
  explorationTree: EquationNode[];
}

export function readBracedGroup(
  src: string,
  startIdx: number
): { content: string; nextIdx: number } {
  let idx = startIdx;
  while (idx < src.length && src[idx] === " ") idx++;
  if (idx >= src.length) return { content: "", nextIdx: idx };

  if (src[idx] !== "{") {
    return { content: src[idx], nextIdx: idx + 1 };
  }

  let depth = 0;
  const begin = idx + 1;
  for (; idx < src.length; idx++) {
    if (src[idx] === "{") depth++;
    else if (src[idx] === "}") {
      depth--;
      if (depth === 0) {
        return { content: src.slice(begin, idx), nextIdx: idx + 1 };
      }
    }
  }
  return { content: src.slice(begin), nextIdx: src.length };
}

export function readEnvironment(
  src: string,
  startIdx: number
): {
  envName: string;
  cleanEnv: string;
  body: string;
  nextIdx: number;
} {
  const envGroup = readBracedGroup(src, startIdx + 6);
  const envName = envGroup.content.trim();
  const cleanEnv = envName.replace(/\*$/, "");

  let bodyStart = envGroup.nextIdx;
  while (bodyStart < src.length && src[bodyStart] === " ") bodyStart++;
  if (cleanEnv === "array" && src[bodyStart] === "{") {
    const colSpec = readBracedGroup(src, bodyStart);
    bodyStart = colSpec.nextIdx;
  }

  const escapedEnv = envName.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
  const openRegex = new RegExp(`^\\\\begin\\s*\\{${escapedEnv}\\}`);
  const closeRegex = new RegExp(`^\\\\end\\s*\\{${escapedEnv}\\}`);

  let depth = 1;
  let searchIdx = bodyStart;
  let bodyEnd = -1;
  let closeLen = 0;

  while (searchIdx < src.length) {
    const slice = src.slice(searchIdx);
    const openMatch = slice.match(openRegex);
    if (openMatch) {
      depth++;
      searchIdx += openMatch[0].length;
      continue;
    }
    const closeMatch = slice.match(closeRegex);
    if (closeMatch) {
      depth--;
      if (depth === 0) {
        bodyEnd = searchIdx;
        closeLen = closeMatch[0].length;
        break;
      }
      searchIdx += closeMatch[0].length;
      continue;
    }
    searchIdx++;
  }

  let nextIdx = src.length;
  if (bodyEnd !== -1) {
    nextIdx = bodyEnd + closeLen;
  } else {
    bodyEnd = src.length;
  }

  const body = src.slice(bodyStart, bodyEnd).trim();
  return { envName, cleanEnv, body, nextIdx };
}

/**
 * Translates low-level tokens, basic operators, subscripts and superscripts into natural speech.
 */
export function translateSimpleTokens(
  expr: string,
  lang: ReaderLanguage
): string {
  let out = expr
    .replace(/\\,|\\;|\\:|\\!/g, " ")
    .replace(/\\left\s*\\\{|\\\{/g, lang === "id" ? " himpunan " : " set of ")
    .replace(/\\right\s*\\\}|\\\}/g, " ")
    .replace(/\\left\s*\(|\\right\s*\)/g, " ")
    .replace(/\\left\s*\[|\\right\s*\]/g, " ")
    .replace(/\\left\s*\|/g, "|")
    .replace(/\\right\s*\|/g, "|")
    .replace(/([A-Za-z0-9\)])\s*\/\s*([A-Za-z0-9\(])/g, (_m, a, b) =>
      lang === "id" ? `${a} per ${b}` : `${a} over ${b}`
    )
    .replace(/\^\{\\circ\}|\^\\circ/g, lang === "id" ? " derajat " : " degrees ");

  // Set operations & relations
  const isSetContext =
    /\\(?:cup|cap|setminus|subset|subseteq|supset|supseteq|emptyset|varnothing)\b|[A-Za-z0-9\)]\s*=\s*[A-Za-z0-9\(]*\s*\\(?:setminus|cup|cap)\b|P\s*\(/.test(
      expr
    );

  if (isSetContext) {
    out = out.replace(
      /\\(?:bar|overline)\{([^{}]+)\}/g,
      lang === "id" ? " komplemen $1 " : " complement of $1 "
    );
  } else {
    out = out.replace(
      /\\(?:bar|vec|mathbf)\{([^{}]+)\}/g,
      lang === "id" ? " vektor $1 " : " vector $1 "
    );
  }

  out = out
    .replace(
      /\\overline\{([^{}]+)\}/g,
      lang === "id" ? " komplemen $1 " : " complement of $1 "
    )
    .replace(
      /([A-Za-z0-9\)])\s*\^\s*\{?c\}?/g,
      lang === "id" ? " komplemen $1 " : " complement of $1 "
    )
    .replace(/\\?\|([^|]+)\\?\|/g, (_m, inner) =>
      lang === "id" ? ` panjang vektor ${inner} ` : ` magnitude of ${inner} `
    )
    .replace(/\\mathbb\{R\}\s*\^?\s*\{?([0-9a-zA-Z]*)\}?/g, (_m, dim) =>
      dim
        ? lang === "id"
          ? ` ruang R ${dim} `
          : ` R ${dim} space `
        : lang === "id"
        ? " ruang bilangan riil "
        : " real numbers "
    )
    .replace(/\\mathbb\{([A-Za-z])\}/g, "$1")
    .replace(
      /\\(?:text|mathrm|mathbf|mathit|textbf|operatorname)\s*\{([^}]+)\}/g,
      "$1"
    )
    .replace(/\\(?:quad|qquad|hspace|vspace)\*?(?:\{[^}]*\})?/g, " ");

  // Replace functions & operators from rules registry (longest keys first to prevent partial prefix collisions like \cdots -> \cdot + s)
  const sortedFunctions = Object.entries(FUNCTION_RULES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [macro, labels] of sortedFunctions) {
    out = out.replaceAll(macro, ` ${labels[lang]} `);
  }
  const sortedGreek = Object.entries(GREEK_RULES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [macro, labels] of sortedGreek) {
    out = out.replaceAll(macro, ` ${labels[lang]} `);
  }
  const sortedOperators = Object.entries(OPERATOR_RULES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [macro, labels] of sortedOperators) {
    out = out.replaceAll(macro, ` ${labels[lang]} `);
  }

  // Handle superscripts and subscripts with word boundaries to prevent gluing
  out = out.replace(
    /\^\{([^}]+)\}|\^(\d+|[A-Za-z]+)/g,
    (_m, braced, unbraced) => {
      const exp = (braced ?? unbraced ?? "").trim();
      if (exp === "2") return lang === "id" ? " kuadrat " : " squared ";
      if (exp === "3") return lang === "id" ? " pangkat tiga " : " cubed ";
      const translatedExp = translateSemanticExpression(exp, lang);
      return lang === "id"
        ? ` pangkat ${translatedExp} `
        : ` to the power of ${translatedExp} `;
    }
  );

  out = out.replace(
    /_\{([^}]+)\}|_(\d+|[A-Za-z]+)/g,
    (_m, braced, unbraced) => {
      const sub = (braced ?? unbraced ?? "").trim();
      const translatedSub = translateSemanticExpression(sub, lang);
      return lang === "id" ? ` indeks ${translatedSub} ` : ` sub ${translatedSub} `;
    }
  );

  // Handle differentials like dx, dt
  out = out.replace(/\bd([xyztn])\b/g, (_m, v) =>
    lang === "id" ? ` terhadap ${v}` : ` d ${v}`
  );

  // Spoken operators
  out = out
    .replace(/&/g, " ")
    .replace(/<=/g, lang === "id" ? " kurang dari atau sama dengan " : " less than or equal to ")
    .replace(/>=/g, lang === "id" ? " lebih dari atau sama dengan " : " greater than or equal to ")
    .replace(/!=/g, lang === "id" ? " tidak sama dengan " : " is not equal to ")
    .replace(/</g, lang === "id" ? " kurang dari " : " less than ")
    .replace(/>/g, lang === "id" ? " lebih dari " : " greater than ")
    .replace(/=/g, lang === "id" ? " sama dengan " : " equals ")
    .replace(/\+/g, lang === "id" ? " tambah " : " plus ")
    .replace(/(^|\s)-(\s|[A-Za-z0-9])/g, (_m, a, b) =>
      lang === "id" ? `${a}kurang ${b}` : `${a}minus ${b}`
    )
    .replace(/[{}]/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (lang === "id") {
    out = out
      .replace(/\b0\b/g, "nol")
      .replace(/\b1\b/g, "satu")
      .replace(/\b2\b/g, "dua")
      .replace(/\b3\b/g, "tiga")
      .replace(/\b4\b/g, "empat")
      .replace(/\b5\b/g, "lima")
      .replace(/\b6\b/g, "enam")
      .replace(/\b7\b/g, "tujuh")
      .replace(/\b8\b/g, "delapan")
      .replace(/\b9\b/g, "sembilan")
      .replace(/\b10\b/g, "sepuluh");
  }

  return out;
}

/**
 * Main recursive parser that walks mathematical expressions and translates
 * complex higher-level structures (partials, binomials, integrals, roots, matrices).
 */
export function translateSemanticExpression(
  rawLatex: string,
  lang: ReaderLanguage,
  nodes?: EquationNode[]
): string {
  const src = rawLatex.trim();
  if (!src) return "";

  let i = 0;
  let buffer = "";
  const parts: string[] = [];

  const flushBuffer = () => {
    if (buffer.trim()) {
      parts.push(translateSimpleTokens(buffer, lang));
      buffer = "";
    }
  };

  while (i < src.length) {
    // 1. Matrix & Environments
    if (src.startsWith("\\begin", i)) {
      flushBuffer();
      const { envName, cleanEnv, body, nextIdx } = readEnvironment(src, i);

      const matrixEnvs = new Set([
        "matrix",
        "pmatrix",
        "bmatrix",
        "Bmatrix",
        "vmatrix",
        "Vmatrix",
        "array",
      ]);

      if (matrixEnvs.has(cleanEnv)) {
        const rawRows = body
          .split(/\\\\(?:\s*\[[^\]]*\])?|\\cr/)
          .map((r) => r.replace(/\\hline|\\vline/g, " ").trim())
          .filter((r) => r.length > 0);

        const matrix = rawRows.map((r) =>
          r.split("&").map((cell) => cell.trim())
        );
        const rowCount = matrix.length;
        const colCount =
          matrix.length > 0 ? Math.max(...matrix.map((r) => r.length)) : 0;

        let typeNameId = "matriks";
        let typeNameEn = "matrix";

        if (cleanEnv === "vmatrix") {
          typeNameId = "determinan matriks";
          typeNameEn = "determinant of a";
        } else if (cleanEnv === "Vmatrix") {
          typeNameId = "norm matriks";
          typeNameEn = "norm of a";
        }

        if (lang === "id") {
          const rowNarrations = matrix.map((rowCells, rIdx) => {
            const cells = rowCells
              .map((c) => translateSemanticExpression(c, "id"))
              .filter(Boolean);
            return `baris ${rIdx + 1}: ${cells.join(", ")}`;
          });
          parts.push(
            `${typeNameId} ${rowCount} kali ${colCount}: ${rowNarrations.join("; ")}`
          );
        } else {
          const prefix =
            cleanEnv === "vmatrix" || cleanEnv === "Vmatrix"
              ? `${typeNameEn} ${rowCount} by ${colCount} matrix: `
              : `${rowCount} by ${colCount} matrix: `;
          const rowNarrations = matrix.map((rowCells, rIdx) => {
            const cells = rowCells
              .map((c) => translateSemanticExpression(c, "en"))
              .filter(Boolean);
            return `row ${rIdx + 1}: ${cells.join(", ")}`;
          });
          parts.push(`${prefix}${rowNarrations.join("; ")}`);
        }

        nodes?.push({
          label:
            lang === "id"
              ? cleanEnv === "vmatrix"
                ? "Determinan Matriks"
                : "Matriks"
              : cleanEnv === "vmatrix"
              ? "Matrix Determinant"
              : "Matrix",
          spokenEn: `${cleanEnv === "vmatrix" ? "determinant of a " : ""}${rowCount} by ${colCount} matrix`,
          spokenId: `${typeNameId} ${rowCount} kali ${colCount}`,
          latex: src.slice(i, nextIdx),
          children: matrix.map((rowCells, rIdx) => ({
            label: lang === "id" ? `Baris ${rIdx + 1}` : `Row ${rIdx + 1}`,
            spokenEn: `row ${rIdx + 1}: ${rowCells.map((c) => translateSemanticExpression(c, "en")).join(", ")}`,
            spokenId: `baris ${rIdx + 1}: ${rowCells.map((c) => translateSemanticExpression(c, "id")).join(", ")}`,
            latex: rowCells.join(" & "),
          })),
        });
      } else if (cleanEnv === "cases") {
        const rawCases = body
          .split(/\\\\(?:\s*\[[^\]]*\])?|\\cr/)
          .map((r) => r.trim())
          .filter((r) => r.length > 0);

        if (lang === "id") {
          const caseNarrations = rawCases.map((row, idx) => {
            const rowParts = row
              .split("&")
              .map((c) => translateSemanticExpression(c.trim(), "id"))
              .filter(Boolean);
            return `kondisi ${idx + 1}: ${rowParts.join(", ")}`;
          });
          parts.push(
            `fungsi dengan ${rawCases.length} kondisi: ${caseNarrations.join("; ")}`
          );
        } else {
          const caseNarrations = rawCases.map((row, idx) => {
            const rowParts = row
              .split("&")
              .map((c) => translateSemanticExpression(c.trim(), "en"))
              .filter(Boolean);
            return `case ${idx + 1}: ${rowParts.join(", ")}`;
          });
          parts.push(
            `piecewise function with ${rawCases.length} cases: ${caseNarrations.join("; ")}`
          );
        }
      } else if (["aligned", "align", "gather"].includes(cleanEnv)) {
        const lines = body
          .split(/\\\\(?:\s*\[[^\]]*\])?|\\cr/)
          .map((r) => r.trim())
          .filter((r) => r.length > 0);
        const narratedLines = lines.map((line) =>
          translateSemanticExpression(line.replace(/&/g, " "), lang)
        );
        parts.push(narratedLines.join(", "));
      } else {
        parts.push(translateSemanticExpression(body, lang));
      }

      i = nextIdx;
      continue;
    }

    // 2. Binomial coefficient \binom{n}{k}
    if (src.startsWith("\\binom", i) || src.startsWith("\\dbinom", i) || src.startsWith("\\tbinom", i)) {
      flushBuffer();
      const skipLen = src.startsWith("\\binom", i) ? 6 : 7;
      const nGroup = readBracedGroup(src, i + skipLen);
      const kGroup = readBracedGroup(src, nGroup.nextIdx);
      const nSpoken = translateSemanticExpression(nGroup.content, lang);
      const kSpoken = translateSemanticExpression(kGroup.content, lang);
      const spoken =
        lang === "id"
          ? `kombinasi ${kSpoken} dari ${nSpoken}`
          : `${nSpoken} choose ${kSpoken}`;
      parts.push(spoken);
      nodes?.push({
        label: lang === "id" ? "Kombinasi" : "Binomial Coefficient",
        spokenEn: `${translateSemanticExpression(nGroup.content, "en")} choose ${translateSemanticExpression(kGroup.content, "en")}`,
        spokenId: `kombinasi ${translateSemanticExpression(kGroup.content, "id")} dari ${translateSemanticExpression(nGroup.content, "id")}`,
        latex: src.slice(i, kGroup.nextIdx),
      });
      i = kGroup.nextIdx;
      continue;
    }

    // 3. Partial derivative patterns inside fractions: \frac{\partial f}{\partial x} or \frac{\partial^2 f}{\partial x^2}
    if (src.startsWith("\\frac", i) || src.startsWith("\\dfrac", i) || src.startsWith("\\tfrac", i)) {
      flushBuffer();
      const skipLen = src.startsWith("\\frac", i) ? 5 : 6;
      const num = readBracedGroup(src, i + skipLen);
      const den = readBracedGroup(src, num.nextIdx);

      // Detect if this is a partial derivative fraction
      if (num.content.includes("\\partial") && den.content.includes("\\partial")) {
        const orderMatch = num.content.match(/\\partial\s*\^?\s*\{?(\d+)\}?/);
        const order = orderMatch ? orderMatch[1] : "1";
        const targetMatch = num.content.replace(/\\partial\s*\^?\s*\{?\d*\}?/, "").trim();
        const denVarMatch = den.content.replace(/\\partial\s*\^?\s*\{?\d*\}?/, "").trim();

        const targetSpoken = translateSemanticExpression(targetMatch, lang);
        const varSpoken = translateSemanticExpression(denVarMatch, lang);

        let spoken = "";
        if (order === "1") {
          spoken =
            lang === "id"
              ? `turunan parsial ${targetSpoken || "fungsi"} terhadap ${varSpoken}`
              : `the partial derivative of ${targetSpoken || "f"} with respect to ${varSpoken}`;
        } else {
          const ordId = order === "2" ? "kedua" : order === "3" ? "ketiga" : `ke-${order}`;
          const ordEn = order === "2" ? "second" : order === "3" ? "third" : `${order}th`;
          spoken =
            lang === "id"
              ? `turunan parsial ${ordId} ${targetSpoken || "fungsi"} terhadap ${varSpoken}`
              : `the ${ordEn} partial derivative of ${targetSpoken || "f"} with respect to ${varSpoken}`;
        }

        parts.push(spoken);
        nodes?.push({
          label: lang === "id" ? "Turunan Parsial" : "Partial Derivative",
          spokenEn: spoken,
          spokenId: spoken,
          latex: `\\frac{${num.content}}{${den.content}}`,
        });
        i = den.nextIdx;
        continue;
      }

      // Standard fraction
      const numSpoken = translateSemanticExpression(num.content, lang);
      const denSpoken = translateSemanticExpression(den.content, lang);
      const spoken =
        lang === "id"
          ? `pecahan dengan pembilang ${numSpoken}, dan penyebut ${denSpoken}`
          : `fraction with numerator ${numSpoken}, over denominator ${denSpoken}`;
      parts.push(spoken);
      nodes?.push({
        label: lang === "id" ? "Pecahan" : "Fraction",
        spokenEn: `fraction with numerator ${translateSemanticExpression(num.content, "en")}, over denominator ${translateSemanticExpression(den.content, "en")}`,
        spokenId: `pecahan dengan pembilang ${translateSemanticExpression(num.content, "id")}, dan penyebut ${translateSemanticExpression(den.content, "id")}`,
        latex: `\\frac{${num.content}}{${den.content}}`,
        children: [
          {
            label: lang === "id" ? "Pembilang" : "Numerator",
            spokenEn: translateSemanticExpression(num.content, "en"),
            spokenId: translateSemanticExpression(num.content, "id"),
            latex: num.content,
          },
          {
            label: lang === "id" ? "Penyebut" : "Denominator",
            spokenEn: translateSemanticExpression(den.content, "en"),
            spokenId: translateSemanticExpression(den.content, "id"),
            latex: den.content,
          },
        ],
      });
      i = den.nextIdx;
      continue;
    }

    // 4. Roots \sqrt[n]{x}
    if (src.startsWith("\\sqrt", i)) {
      flushBuffer();
      let idx = i + 5;
      while (idx < src.length && src[idx] === " ") idx++;
      let rootDegree = "";
      if (src[idx] === "[") {
        const endBracket = src.indexOf("]", idx);
        if (endBracket !== -1) {
          rootDegree = src.slice(idx + 1, endBracket);
          idx = endBracket + 1;
        }
      }
      const radicand = readBracedGroup(src, idx);
      const inner = translateSemanticExpression(radicand.content, lang);
      if (rootDegree) {
        parts.push(
          lang === "id"
            ? `akar pangkat ${translateSemanticExpression(rootDegree, lang)} dari ${inner}`
            : `the ${translateSemanticExpression(rootDegree, lang)} root of ${inner}`
        );
      } else {
        parts.push(
          lang === "id"
            ? `akar kuadrat dari ${inner}`
            : `square root of ${inner}`
        );
      }
      i = radicand.nextIdx;
      continue;
    }

    // 5. Vectors and Unit Vectors
    if (src.startsWith("\\vec", i)) {
      flushBuffer();
      const target = readBracedGroup(src, i + 4);
      const inner = translateSemanticExpression(target.content, lang);
      parts.push(lang === "id" ? `vektor ${inner}` : `vector ${inner}`);
      i = target.nextIdx;
      continue;
    }

    if (src.startsWith("\\hat", i)) {
      flushBuffer();
      const target = readBracedGroup(src, i + 4);
      const inner = translateSemanticExpression(target.content, lang);
      parts.push(lang === "id" ? `vektor satuan ${inner}` : `unit vector ${inner}`);
      i = target.nextIdx;
      continue;
    }

    // 6. Vector Norms \|x\| or \Vert x \Vert
    if (src.startsWith("\\|", i) || src.startsWith("\\Vert", i)) {
      flushBuffer();
      const skipLen = src.startsWith("\\Vert", i) ? 5 : 2;
      const endIdx = src.indexOf("\\|", i + skipLen);
      const endVertIdx = src.indexOf("\\Vert", i + skipLen);
      const closingIdx = endIdx !== -1 ? endIdx : endVertIdx;
      if (closingIdx !== -1) {
        const innerContent = src.slice(i + skipLen, closingIdx);
        const inner = translateSemanticExpression(innerContent, lang);
        parts.push(lang === "id" ? `panjang ${inner}` : `norm of ${inner}`);
        i = closingIdx + (endIdx !== -1 ? 2 : 5);
        continue;
      }
    }

    // 7. Integrals (\int, \iint, \iiint, \oint)
    if (
      src.startsWith("\\int", i) ||
      src.startsWith("\\iint", i) ||
      src.startsWith("\\iiint", i) ||
      src.startsWith("\\oint", i)
    ) {
      flushBuffer();
      let intType = "single";
      let skipLen = 4;
      if (src.startsWith("\\iint", i)) {
        intType = "double";
        skipLen = 5;
      } else if (src.startsWith("\\iiint", i)) {
        intType = "triple";
        skipLen = 6;
      } else if (src.startsWith("\\oint", i)) {
        intType = "contour";
        skipLen = 5;
      }

      let idx = i + skipLen;
      let lower = "";
      let upper = "";
      while (idx < src.length && src[idx] === " ") idx++;
      if (src[idx] === "_") {
        const g = readBracedGroup(src, idx + 1);
        lower = g.content;
        idx = g.nextIdx;
        while (idx < src.length && src[idx] === " ") idx++;
      }
      if (src[idx] === "^") {
        const g = readBracedGroup(src, idx + 1);
        upper = g.content;
        idx = g.nextIdx;
      }
      const rest = src.slice(idx).trim();
      const integrandSpoken = translateSemanticExpression(rest, lang);

      const typePrefixId =
        intType === "double"
          ? "integral lipat dua"
          : intType === "triple"
          ? "integral lipat tiga"
          : intType === "contour"
          ? "integral lintasan tertutup"
          : "integral";

      const typePrefixEn =
        intType === "double"
          ? "double integral"
          : intType === "triple"
          ? "triple integral"
          : intType === "contour"
          ? "contour integral"
          : "integral";

      if (lower || upper) {
        const lo = translateSemanticExpression(lower, lang);
        const hi = translateSemanticExpression(upper, lang);
        parts.push(
          lang === "id"
            ? `${typePrefixId} dari ${lo} sampai ${hi}, dari ${integrandSpoken}`
            : `the ${typePrefixEn} from ${lo} to ${hi} of ${integrandSpoken}`
        );
      } else {
        parts.push(
          lang === "id"
            ? `${typePrefixId} tak tentu dari ${integrandSpoken}`
            : `the ${typePrefixEn} of ${integrandSpoken}`
        );
      }
      i = src.length;
      continue;
    }

    // 8. Summations (\sum) and Products (\prod)
    if (src.startsWith("\\sum", i) || src.startsWith("\\prod", i)) {
      flushBuffer();
      const isSum = src.startsWith("\\sum", i);
      let idx = i + (isSum ? 4 : 5);
      let lower = "";
      let upper = "";
      while (idx < src.length && src[idx] === " ") idx++;
      if (src[idx] === "_") {
        const g = readBracedGroup(src, idx + 1);
        lower = g.content;
        idx = g.nextIdx;
        while (idx < src.length && src[idx] === " ") idx++;
      }
      if (src[idx] === "^") {
        const g = readBracedGroup(src, idx + 1);
        upper = g.content;
        idx = g.nextIdx;
      }
      const rest = src.slice(idx).trim();
      const body = translateSemanticExpression(rest, lang);

      const opNameId = isSum ? "sigma penjumlahan" : "notasi perkalian pi";
      const opNameEn = isSum ? "summation" : "product";

      parts.push(
        lang === "id"
          ? `${opNameId} dari ${translateSemanticExpression(lower, lang)} sampai ${translateSemanticExpression(upper, lang)}, dari ${body}`
          : `${opNameEn} from ${translateSemanticExpression(lower, lang)} to ${translateSemanticExpression(upper, lang)} of ${body}`
      );
      i = src.length;
      continue;
    }

    // 9. Limits (\lim)
    if (src.startsWith("\\lim", i)) {
      flushBuffer();
      let idx = i + 4;
      let sub = "";
      while (idx < src.length && src[idx] === " ") idx++;
      if (src[idx] === "_") {
        const g = readBracedGroup(src, idx + 1);
        sub = g.content;
        idx = g.nextIdx;
      }
      const rest = src.slice(idx).trim();
      parts.push(
        lang === "id"
          ? `limit untuk ${translateSemanticExpression(sub, lang)}, dari ${translateSemanticExpression(rest, lang)}`
          : `the limit as ${translateSemanticExpression(sub, lang)} of ${translateSemanticExpression(rest, lang)}`
      );
      i = src.length;
      continue;
    }

    buffer += src[i];
    i++;
  }

  flushBuffer();
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Deterministically translates LaTeX into structured, accessible English and Indonesian speech.
 */
export function narrateSemanticEquation(latex: string): SemanticMathResult {
  const cleaned = latex.trim();
  const unsupported: string[] = [];

  const knownCommands = new Set([
    "\\begin",
    "\\end",
    "\\cr",
    "\\hline",
    "\\vline",
    "\\frac",
    "\\dfrac",
    "\\tfrac",
    "\\binom",
    "\\dbinom",
    "\\tbinom",
    "\\sqrt",
    "\\int",
    "\\iint",
    "\\iiint",
    "\\oint",
    "\\sum",
    "\\prod",
    "\\lim",
    "\\left",
    "\\right",
    "\\vec",
    "\\bar",
    "\\overline",
    "\\hat",
    "\\tilde",
    "\\dot",
    "\\ddot",
    "\\Vert",
    "\\mathbb",
    "\\mathcal",
    "\\bm",
    "\\boldsymbol",
    "\\text",
    "\\mathrm",
    "\\mathbf",
    "\\mathit",
    "\\textbf",
    "\\operatorname",
    "\\quad",
    "\\qquad",
    "\\hspace",
    "\\vspace",
    ...Object.keys(GREEK_RULES),
    ...Object.keys(FUNCTION_RULES),
    ...Object.keys(OPERATOR_RULES),
  ]);

  const commandMatches = cleaned.match(/\\[A-Za-z]+/g) ?? [];
  for (const cmd of commandMatches) {
    if (!knownCommands.has(cmd) && !unsupported.includes(cmd)) {
      unsupported.push(cmd);
    }
  }

  const envMatches = cleaned.matchAll(/\\begin\{([^}]+)\}/g);
  for (const match of envMatches) {
    const envName = match[1].trim();
    const cleanEnv = envName.replace(/\*$/, "");
    if (!SUPPORTED_ENVIRONMENTS.has(cleanEnv)) {
      const macro = `\\begin{${envName}}`;
      if (!unsupported.includes(macro)) {
        unsupported.push(macro);
      }
    }
  }

  const tree: EquationNode[] = [];
  const en = translateSemanticExpression(cleaned, "en", tree);
  const id = translateSemanticExpression(cleaned, "id");

  const supported = unsupported.length === 0;
  const fallbackNoteEn = supported
    ? en
    : `${en} (Warning: complex LaTeX constructs detected: ${unsupported.join(", ")}. Volunteer verification recommended.)`;
  const fallbackNoteId = supported
    ? id
    : `${id} (Peringatan: ditemukan konstruksi LaTeX kompleks: ${unsupported.join(", ")}. Perlu verifikasi relawan.)`;

  return {
    narrationEn: fallbackNoteEn,
    narrationId: fallbackNoteId,
    supported,
    unsupportedConstructs: unsupported,
    confidencePenalty: supported ? 0 : 0.35,
    explorationTree:
      tree.length > 0
        ? tree
        : [
            {
              label: "Expression",
              spokenEn: en,
              spokenId: id,
              latex: cleaned,
            },
          ],
  };
}
