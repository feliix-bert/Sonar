import type { ReaderLanguage } from "@/stores/accessibility-store";
import { autoWrapUnescapedMath, normalizeMarkdownText } from "@/lib/math/math-markdown-parser";

export interface EquationNarrationResult {
  narrationEn: string;
  narrationId: string;
  supported: boolean;
  unsupportedConstructs: string[];
  confidencePenalty: number;
  explorationTree: EquationNode[];
}

export interface EquationNode {
  label: string;
  spokenEn: string;
  spokenId: string;
  latex: string;
  children?: EquationNode[];
}

const UNSUPPORTED_MACROS = [
  "\\oint",
  "\\iint",
  "\\iiint",
  "\\stackrel",
  "\\overset",
  "\\underset",
];

const GREEK_MAP: Record<string, { en: string; id: string }> = {
  "\\alpha": { en: "alpha", id: "alfa" },
  "\\beta": { en: "beta", id: "beta" },
  "\\gamma": { en: "gamma", id: "gama" },
  "\\Gamma": { en: "capital gamma", id: "gama besar" },
  "\\delta": { en: "delta", id: "delta" },
  "\\Delta": { en: "delta", id: "delta" },
  "\\epsilon": { en: "epsilon", id: "epsilon" },
  "\\varepsilon": { en: "epsilon", id: "epsilon" },
  "\\theta": { en: "theta", id: "teta" },
  "\\Theta": { en: "capital theta", id: "teta besar" },
  "\\lambda": { en: "lambda", id: "lambda" },
  "\\mu": { en: "mu", id: "miu" },
  "\\pi": { en: "pi", id: "pi" },
  "\\rho": { en: "rho", id: "ro" },
  "\\sigma": { en: "sigma", id: "sigma" },
  "\\Sigma": { en: "capital sigma", id: "sigma besar" },
  "\\tau": { en: "tau", id: "tau" },
  "\\phi": { en: "phi", id: "fi" },
  "\\omega": { en: "omega", id: "omega" },
  "\\Omega": { en: "capital omega", id: "omega besar" },
  "\\infty": { en: "infinity", id: "tak hingga" },
  "\\partial": { en: "partial", id: "parsial" },
  "\\nabla": { en: "nabla", id: "nabla" },
};

const FUNCTION_MAP: Record<string, { en: string; id: string }> = {
  "\\sin": { en: "sine of", id: "sinus dari" },
  "\\cos": { en: "cosine of", id: "kosinus dari" },
  "\\tan": { en: "tangent of", id: "tangen dari" },
  "\\ln": { en: "natural log of", id: "logaritma natural dari" },
  "\\log": { en: "log of", id: "logaritma dari" },
  "\\exp": { en: "exponential of", id: "eksponensial dari" },
};

function readBracedGroup(
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

const SUPPORTED_ENVIRONMENTS = new Set([
  "matrix",
  "pmatrix",
  "bmatrix",
  "Bmatrix",
  "vmatrix",
  "Vmatrix",
  "array",
  "cases",
  "aligned",
  "align",
  "gather",
]);

function readEnvironment(
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

function translateSimpleTokens(
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
    .replace(/\^\{\\circ\}|\^\\circ/g, lang === "id" ? " derajat" : " degrees")
    // Set operations
    .replace(/\\cap\b|\\bigcap\b/g, lang === "id" ? " irisan " : " intersection ")
    .replace(/\\cup\b|\\bigcup\b/g, lang === "id" ? " gabungan " : " union ")
    .replace(/\\setminus\b/g, lang === "id" ? " selisih himpunan " : " set minus ")
    .replace(/\\subset\b/g, lang === "id" ? " himpunan bagian dari " : " subset of ")
    .replace(/\\subseteq\b/g, lang === "id" ? " bagian atau sama dengan " : " subset or equal to ")
    .replace(/\\supset\b/g, lang === "id" ? " himpunan superset dari " : " superset of ")
    .replace(/\\supseteq\b/g, lang === "id" ? " superset atau sama dengan " : " superset or equal to ")
    .replace(/\\notin\b/g, lang === "id" ? " bukan anggota dari " : " not in ")
    .replace(/\\in\b/g, lang === "id" ? " anggota dari " : " in ")
    .replace(/\\emptyset\b|\\varnothing\b/g, lang === "id" ? " himpunan kosong " : " empty set ")
    // Comparisons
    .replace(/\\leqslant\b|\\leq\b|\\le\b/g, lang === "id" ? " kurang dari atau sama dengan " : " less than or equal to ")
    .replace(/\\geqslant\b|\\geq\b|\\ge\b/g, lang === "id" ? " lebih dari atau sama dengan " : " greater than or equal to ")
    .replace(/\\ll\b/g, lang === "id" ? " jauh lebih kecil dari " : " much less than ")
    .replace(/\\gg\b/g, lang === "id" ? " jauh lebih besar dari " : " much greater than ")
    .replace(/\\neq\b|\\ne\b/g, lang === "id" ? " tidak sama dengan " : " is not equal to ")
    .replace(/\\approx\b/g, lang === "id" ? " kira-kira sama dengan " : " is approximately equal to ")
    .replace(/\\equiv\b/g, lang === "id" ? " ekuivalen dengan " : " is equivalent to ")
    .replace(/\\propto\b/g, lang === "id" ? " sebanding dengan " : " is proportional to ")
    .replace(/<=/g, lang === "id" ? " kurang dari atau sama dengan " : " less than or equal to ")
    .replace(/>=/g, lang === "id" ? " lebih dari atau sama dengan " : " greater than or equal to ")
    .replace(/!=/g, lang === "id" ? " tidak sama dengan " : " is not equal to ")
    .replace(/</g, lang === "id" ? " kurang dari " : " less than ")
    .replace(/>/g, lang === "id" ? " lebih dari " : " greater than ")
    // Logic
    .replace(/\\forall\b/g, lang === "id" ? " untuk setiap " : " for all ")
    .replace(/\\exists\b/g, lang === "id" ? " terdapat " : " there exists ")
    .replace(/\\nexists\b/g, lang === "id" ? " tidak ada " : " there does not exist ")
    .replace(/\\land\b|\\wedge\b/g, lang === "id" ? " dan " : " and ")
    .replace(/\\lor\b|\\vee\b/g, lang === "id" ? " atau " : " or ")
    .replace(/\\neg\b|\\sim\b/g, lang === "id" ? " bukan " : " not ")
    .replace(/\\implies\b|\\Rightarrow\b/g, lang === "id" ? " berimplikasi pada " : " implies ")
    .replace(/\\iff\b|\\Leftrightarrow\b/g, lang === "id" ? " jika dan hanya jika " : " if and only if ")
    .replace(/\\to\b|\\rightarrow\b/g, lang === "id" ? " menuju " : " approaches ")
    .replace(/\\leftarrow\b/g, lang === "id" ? " dari " : " from ")
    // Common operators
    .replace(/\\cdot\b/g, lang === "id" ? " dot " : " dot ")
    .replace(/\\times\b/g, lang === "id" ? " dikali silang " : " cross ")
    .replace(/\\div\b/g, lang === "id" ? " dibagi " : " divided by ")
    .replace(/\\pm\b/g, lang === "id" ? " plus minus " : " plus or minus ")
    .replace(/\\mp\b/g, lang === "id" ? " minus plus " : " minus or plus ")
    .replace(/\\dots\b|\\cdots\b|\\ldots\b/g, lang === "id" ? " dan seterusnya " : " and so on ")
    .replace(/\\circ\b/g, lang === "id" ? " derajat " : " degrees ")
    .replace(/\\infty\b/g, lang === "id" ? " tak hingga " : " infinity ")
    .replace(/\\%/g, lang === "id" ? " persen " : " percent ")
    // Vector, Norm & Set complement notation
    // In set context (expressions containing set operators/symbols like \setminus, \cup, \cap, \subset, \emptyset)
    // or probability notation P(\bar{A}), \bar{A} represents the set complement ("komplemen A").
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
        dim ? (lang === "id" ? ` ruang R ${dim} ` : ` R ${dim} space `) : (lang === "id" ? " ruang bilangan riil " : " real numbers ")
      )
      .replace(/\\mathbb\{([A-Za-z])\}/g, "$1")
      // Unwrap formatting and text wrappers
      .replace(/\\(?:text|mathrm|mathbf|mathit|textbf|operatorname)\s*\{([^}]+)\}/g, "$1")
      .replace(/\\(?:quad|qquad|hspace|vspace)\*?(?:\{[^}]*\})?/g, " ");

  for (const [macro, labels] of Object.entries(FUNCTION_MAP)) {
    out = out.replaceAll(macro, ` ${labels[lang]} `);
  }
  for (const [macro, labels] of Object.entries(GREEK_MAP)) {
    out = out.replaceAll(macro, ` ${labels[lang]} `);
  }

  // Handle superscripts and subscripts iteratively
  out = out.replace(/\^\{([^}]+)\}|\^(\d+|[A-Za-z]+)/g, (_m, braced, single) => {
    const exp = (braced ?? single ?? "").trim();
    if (exp === "2") return lang === "id" ? " kuadrat " : " squared ";
    if (exp === "3") return lang === "id" ? " pangkat tiga " : " cubed ";
    const translatedExp = translateExpression(exp, lang);
    return lang === "id" ? ` pangkat ${translatedExp} ` : ` to the power of ${translatedExp} `;
  });

  out = out.replace(/_\{([^}]+)\}|_(\d+|[A-Za-z]+)/g, (_m, braced, single) => {
    const sub = (braced ?? single ?? "").trim();
    const translatedSub = translateExpression(sub, lang);
    return lang === "id" ? ` indeks ${translatedSub} ` : ` sub ${translatedSub} `;
  });

  // Handle differentials like dx, dt
  out = out.replace(/\bd([xyztn])\b/g, (_m, v) =>
    lang === "id" ? ` terhadap ${v}` : ` d ${v}`
  );

  // Spoken numbers / operators
  out = out
    .replace(/&/g, " ")
    .replace(/=/g, lang === "id" ? " sama dengan " : " equals ")
    .replace(/\+/g, lang === "id" ? " tambah " : " plus ")
    .replace(/(^|\s)-(\s|[A-Za-z0-9])/g, (_m, a, b) =>
      lang === "id" ? `${a}kurang ${b}` : `${a}minus ${b}`
    )
    .replace(/[{}]/g, " ")
    // Strip leftover backslashes so speech synthesizer never speaks literal "backslash"
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

function translateExpression(
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
              .map((c) => translateExpression(c, "id"))
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
              .map((c) => translateExpression(c, "en"))
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
            spokenEn: `row ${rIdx + 1}: ${rowCells.map((c) => translateExpression(c, "en")).join(", ")}`,
            spokenId: `baris ${rIdx + 1}: ${rowCells.map((c) => translateExpression(c, "id")).join(", ")}`,
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
              .map((c) => translateExpression(c.trim(), "id"))
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
              .map((c) => translateExpression(c.trim(), "en"))
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
          translateExpression(line.replace(/&/g, " "), lang)
        );
        parts.push(narratedLines.join(", "));
      } else {
        parts.push(translateExpression(body, lang));
      }

      i = nextIdx;
      continue;
    }

    if (src.startsWith("\\frac", i)) {
      flushBuffer();
      const num = readBracedGroup(src, i + 5);
      const den = readBracedGroup(src, num.nextIdx);
      const numSpoken = translateExpression(num.content, lang);
      const denSpoken = translateExpression(den.content, lang);
      const spoken =
        lang === "id"
          ? `pecahan dengan pembilang ${numSpoken}, dan penyebut ${denSpoken}`
          : `fraction with numerator ${numSpoken}, over denominator ${denSpoken}`;
      parts.push(spoken);
      nodes?.push({
        label: lang === "id" ? "Pecahan" : "Fraction",
        spokenEn: `fraction with numerator ${translateExpression(num.content, "en")}, over denominator ${translateExpression(den.content, "en")}`,
        spokenId: `pecahan dengan pembilang ${translateExpression(num.content, "id")}, dan penyebut ${translateExpression(den.content, "id")}`,
        latex: `\\frac{${num.content}}{${den.content}}`,
        children: [
          {
            label: lang === "id" ? "Pembilang" : "Numerator",
            spokenEn: translateExpression(num.content, "en"),
            spokenId: translateExpression(num.content, "id"),
            latex: num.content,
          },
          {
            label: lang === "id" ? "Penyebut" : "Denominator",
            spokenEn: translateExpression(den.content, "en"),
            spokenId: translateExpression(den.content, "id"),
            latex: den.content,
          },
        ],
      });
      i = den.nextIdx;
      continue;
    }

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
      const inner = translateExpression(radicand.content, lang);
      if (rootDegree) {
        parts.push(
          lang === "id"
            ? `akar pangkat ${translateExpression(rootDegree, lang)} dari ${inner}`
            : `the ${translateExpression(rootDegree, lang)} root of ${inner}`
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

    if (src.startsWith("\\vec", i)) {
      flushBuffer();
      const target = readBracedGroup(src, i + 4);
      const inner = translateExpression(target.content, lang);
      parts.push(lang === "id" ? `vektor ${inner}` : `vector ${inner}`);
      i = target.nextIdx;
      continue;
    }

    if (src.startsWith("\\hat", i)) {
      flushBuffer();
      const target = readBracedGroup(src, i + 4);
      const inner = translateExpression(target.content, lang);
      parts.push(lang === "id" ? `vektor satuan ${inner}` : `unit vector ${inner}`);
      i = target.nextIdx;
      continue;
    }

    if (src.startsWith("\\|", i) || src.startsWith("\\Vert", i)) {
      flushBuffer();
      const skipLen = src.startsWith("\\Vert", i) ? 5 : 2;
      const endIdx = src.indexOf("\\|", i + skipLen);
      const endVertIdx = src.indexOf("\\Vert", i + skipLen);
      const closingIdx = endIdx !== -1 ? endIdx : endVertIdx;
      if (closingIdx !== -1) {
        const innerContent = src.slice(i + skipLen, closingIdx);
        const inner = translateExpression(innerContent, lang);
        parts.push(lang === "id" ? `panjang ${inner}` : `norm of ${inner}`);
        i = closingIdx + (endIdx !== -1 ? 2 : 5);
        continue;
      }
    }

    if (src.startsWith("\\int", i)) {
      flushBuffer();
      let idx = i + 4;
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
      const integrandSpoken = translateExpression(rest, lang);
      if (lower || upper) {
        const lo = translateExpression(lower, lang);
        const hi = translateExpression(upper, lang);
        parts.push(
          lang === "id"
            ? `integral dari ${lo} sampai ${hi}, dari ${integrandSpoken}`
            : `the integral from ${lo} to ${hi} of ${integrandSpoken}`
        );
        nodes?.push({
          label: lang === "id" ? "Integral tentu" : "Definite integral",
          spokenEn: `the integral from ${translateExpression(lower, "en")} to ${translateExpression(upper, "en")} of ${translateExpression(rest, "en")}`,
          spokenId: `integral dari ${translateExpression(lower, "id")} sampai ${translateExpression(upper, "id")}, dari ${translateExpression(rest, "id")}`,
          latex: src.slice(i),
          children: [
            {
              label: lang === "id" ? "Batas bawah" : "Lower bound",
              spokenEn: translateExpression(lower, "en"),
              spokenId: translateExpression(lower, "id"),
              latex: lower,
            },
            {
              label: lang === "id" ? "Batas atas" : "Upper bound",
              spokenEn: translateExpression(upper, "en"),
              spokenId: translateExpression(upper, "id"),
              latex: upper,
            },
            {
              label: lang === "id" ? "Integran" : "Integrand",
              spokenEn: translateExpression(rest, "en"),
              spokenId: translateExpression(rest, "id"),
              latex: rest,
            },
          ],
        });
      } else {
        parts.push(
          lang === "id"
            ? `integral tak tentu dari ${integrandSpoken}`
            : `the integral of ${integrandSpoken}`
        );
      }
      i = src.length;
      continue;
    }

    if (src.startsWith("\\sum", i)) {
      flushBuffer();
      let idx = i + 4;
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
      const body = translateExpression(rest, lang);
      parts.push(
        lang === "id"
          ? `sigma penjumlahan dari ${translateExpression(lower, lang)} sampai ${translateExpression(upper, lang)}, dari ${body}`
          : `summation from ${translateExpression(lower, lang)} to ${translateExpression(upper, lang)} of ${body}`
      );
      i = src.length;
      continue;
    }

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
          ? `limit untuk ${translateExpression(sub, lang)}, dari ${translateExpression(rest, lang)}`
          : `the limit as ${translateExpression(sub, lang)} of ${translateExpression(rest, lang)}`
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
 * Deterministically translates LaTeX into structured, screen-reader-friendly
 * English and Indonesian speech strings. Flags unsupported matrix/multiline macros
 * explicitly rather than silently omitting or hallucinating content.
 */
export function narrateLatexEquation(latex: string): EquationNarrationResult {
  const cleaned = latex.trim();
  const unsupported = UNSUPPORTED_MACROS.filter((macro) =>
    cleaned.includes(macro)
  );

  // Also detect unknown LaTeX commands outside supported set
  const knownCommands = new Set([
    "\\begin",
    "\\end",
    "\\cr",
    "\\hline",
    "\\vline",
    "\\frac",
    "\\sqrt",
    "\\int",
    "\\sum",
    "\\lim",
    "\\left",
    "\\right",
    "\\cdot",
    "\\times",
    "\\div",
    "\\pm",
    "\\mp",
    "\\leq",
    "\\le",
    "\\leqslant",
    "\\geq",
    "\\ge",
    "\\geqslant",
    "\\lt",
    "\\gt",
    "\\ll",
    "\\gg",
    "\\neq",
    "\\ne",
    "\\approx",
    "\\equiv",
    "\\propto",
    "\\cap",
    "\\bigcap",
    "\\cup",
    "\\bigcup",
    "\\setminus",
    "\\subset",
    "\\subseteq",
    "\\supset",
    "\\supseteq",
    "\\in",
    "\\notin",
    "\\emptyset",
    "\\varnothing",
    "\\forall",
    "\\exists",
    "\\nexists",
    "\\land",
    "\\wedge",
    "\\lor",
    "\\vee",
    "\\neg",
    "\\sim",
    "\\implies",
    "\\Rightarrow",
    "\\iff",
    "\\Leftrightarrow",
    "\\to",
    "\\rightarrow",
    "\\leftarrow",
    "\\vec",
    "\\bar",
    "\\overline",
    "\\hat",
    "\\tilde",
    "\\dot",
    "\\ddot",
    "\\circ",
    "\\Vert",
    "\\mathbb",
    "\\mathcal",
    "\\bm",
    "\\boldsymbol",
    "\\infty",
    "\\dots",
    "\\cdots",
    "\\ldots",
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
    "\\subsetneq",
    "\\supsetneq",
    "\\oplus",
    "\\otimes",
    ...Object.keys(GREEK_MAP),
    ...Object.keys(FUNCTION_MAP),
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
  const en = translateExpression(cleaned, "en", tree);
  const id = translateExpression(cleaned, "id");

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

