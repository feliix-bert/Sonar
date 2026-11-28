import React from "react";
import katex from "katex";
import { cn } from "cn";
import { MathEquationView } from "@/components/document/MathEquationView";

/**
 * Automatically detects raw LaTeX and math constructs (sets like \{...\}, subscripts like E_7,
 * vectors like \bar{a}, norms \|\bar{u} \times \bar{v}\|, fractions, Greek commands like \varepsilon,
 * and equations) that lack standard delimiters, and safely wraps them in \( ... \) so KaTeX can render them visually.
 */
export function autoWrapUnescapedMath(text: string): string {
  if (!text) return "";
  const protectedMath: string[] = [];
  const mathRegex =
    /(?:\$\$[\s\S]*?\$\$|\\+\[[\s\S]*?\\+\]|\\+\([\s\S]*?\\+\)|\$[^\$\n]+?\$|\\+begin\{[a-zA-Z*]+\}[\s\S]*?\\+end\{[a-zA-Z*]+\})/g;

  const unwrapInnerPlaceholders = (expr: string): string => {
    let prev = "";
    let current = expr;
    while (current !== prev && /___MATH_PLACEHOLDER_\d+___/.test(current)) {
      prev = current;
      current = current.replace(/___MATH_PLACEHOLDER_(\d+)___/g, (_m, idx) => {
        const inner = protectedMath[Number(idx)];
        if (!inner) return _m;
        return inner
          .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
          .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
          .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
          .replace(/^\$([^\$\n]+)\$$/, "$1")
          .trim();
      });
    }
    return current;
  };

  const protect = (m: string): string => {
    // If m contains inner math placeholders, unwrap their math delimiters so we never produce nested \( ... \( ... \) ... \)
    const cleanExpr = unwrapInnerPlaceholders(m);
    const idx = protectedMath.length;
    protectedMath.push(cleanExpr);
    return `___MATH_PLACEHOLDER_${idx}___`;
  };

  let workingText = text
    .replace(/(?<![a-zA-Z0-9\\])o\{([a-zA-Z0-9]+)\}/g, "\\bar{$1}")
    .replace(/\\\\+([a-zA-Z]+)/g, "\\$1")
    .replace(/(?:```[\s\S]*?```|`[^`\n]+`)/g, (m) => protect(m))
    .replace(/^[ \t]*\|.+?\|[ \t]*$/gm, (m) => protect(m))
    .replace(mathRegex, (m) => protect(m));

  // 1. Set notation: e.g. \{(x, y), L - 3 \le x \le L, 0 \le y \le W\} or \{(x, y) \in S, ...\}
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])\\?\{((?:[^{}\n]|\{[^{}\n]*\})*?(?:\\in|\\le|\\ge|\\ne|\\subset|\\cup|\\cap|\\times|\^|_|=|\\varepsilon|\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\omega)(?:[^{}\n]|\{[^{}\n]*\})*?)\\?\}/g,
    (_m, inner) => protect(`\\(\\{${inner}\\}\\)`)
  );

  // 2. Norms / Double vertical bar magnitudes, with optional fraction or single scalar prefix
  // e.g. \frac{1}{2} \|\bar{u} \times \bar{v}\| or \|\bar{u} \times \bar{v}\|
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])(?:(?:\\frac\{[^{}\n]+\}\{[^{}\n]+\}|-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?(?:\\\||\|)([^|\n]+?)(?:\\\||\|)/g,
    (m, inner) => {
      if (inner.includes("___MATH_PLACEHOLDER_") || inner.includes("\\")) {
        const clean = m.replace(/^(?:\\\||\|)/, "\\|").replace(/(?:\\\||\|)$/, "\\|");
        return protect(`\\(${clean}\\)`);
      }
      return m;
    }
  );

  // 2b. Set theory operations and set equations:
  // e.g. A \cup B, A \cap B, \bar{A} = S \setminus A, (A \setminus B) \cup (B \setminus A),
  // A \setminus B = A \cap \bar{B}, P(A \cup B) = P(A) + P(B) - P(A \cap B), A \setminus (B \cup C)
  // Placed before parentheses-wrapping (Rule 3) so expressions like (A \setminus B) \cup (B \setminus A) stay unified.
  const singleSetTerm =
    '(?:___MATH_PLACEHOLDER_\\d+___|\\\\[a-zA-Z]+\\{[^{}\\n]+\\}|\\\\[a-zA-Z]+|[A-Za-z0-9](?:\\^[a-zA-Z0-9c]|\\\'|_[0-9a-zA-Z]+)?)';
  const parenSetTerm =
    '\\([a-zA-Z0-9_\\\\\\s\\^\\\'\\{\\}\\+\\-\\*\\/\\(\\)]+\\)';
  const setOperand = '(?:[A-Za-z0-9]?' + parenSetTerm + '|' + singleSetTerm + ')';
  const setBinaryOp =
    '\\\\(?:cup|cap|setminus|oplus|ominus|sqcup|sqcap|uplus)';

  const setChain =
    '(?:' +
    setOperand +
    '\\s*' +
    setBinaryOp +
    '\\s*' +
    setOperand +
    '(?:\\s*' +
    setBinaryOp +
    '\\s*' +
    setOperand +
    ')*)';

  // 2b.i. Equations involving set operations:
  // e.g. \bar{A} = S \setminus A, A \setminus B = A \cap \bar{B}, A \cap B = \emptyset, P(A \cup B) = P(A) + P(B) - P(A \cap B)
  const setEquationRegex = new RegExp(
    '(?<![a-zA-Z0-9_\\\\])(?:' +
      setChain +
      '|' +
      setOperand +
      ')\\s*=\\s*(?:' +
      setChain +
      '|' +
      setOperand +
      ')',
    'g'
  );
  workingText = workingText.replace(setEquationRegex, (m) => {
    if (
      /\\(?:cup|cap|setminus|emptyset|varnothing|subset|subseteq|supset|supseteq|bar\{[A-Za-z]\})|___MATH_PLACEHOLDER_/.test(
        m
      )
    ) {
      return protect(`\\(${unwrapInnerPlaceholders(m.trim())}\\)`);
    }
    return m;
  });

  // 2b.ii. Chained or binary set operations: e.g. A \cup B, A \cap B, (A \setminus B) \cup (B \setminus A)
  const setOpRegex = new RegExp('(?<![a-zA-Z0-9_\\\\])' + setChain, 'g');
  workingText = workingText.replace(setOpRegex, (m) =>
    protect(`\\(${unwrapInnerPlaceholders(m.trim())}\\)`)
  );

  // 3. Parentheses containing LaTeX expressions: e.g. (\mathbb{R}^3), (\bar{u} - \bar{v})
  workingText = workingText.replace(
    /\(([^\(\)\n]*?\\[a-zA-Z]+[^\(\)\n]*?)\)/g,
    (_m, inner) => protect(`\\((${inner})\\)`)
  );

  // 4. Equations with vector operations and coordinate tuples or assignments
  // e.g. \bar{a} + \bar{b} = (a_1 + b_1, a_2 + b_2, a_3 + b_3), k\bar{a} = (ka_1, ka_2, ka_3), \bar{a} = (a_1, a_2, a_3)
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])(?:(?:(?:(?:-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?\\(?:bar|vec|hat|tilde|mathbf)\{[a-zA-Z0-9]+\}|[a-zA-Z0-9_]+)\s*[\+\-\*\/]\s*)*(?:(?:(?:-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?\\(?:bar|vec|hat|tilde|mathbf)\{[a-zA-Z0-9]+\}|[a-zA-Z0-9_]+)\s*=\s*\([^\(\)\n]+\)/g,
    (m) => protect(`\\(${m}\\)`)
  );

  // 4b. Fractions (including multi-level nested fractions like \frac{1}{\frac{1}{R_1} + \frac{1}{R_2}} and F(x) = \frac{...}{...})
  const findBalancedBrace = (str: string, openIdx: number): number => {
    if (str[openIdx] !== "{") return -1;
    let depth = 0;
    for (let idx = openIdx; idx < str.length; idx++) {
      if (str[idx] === "{") depth++;
      else if (str[idx] === "}") {
        depth--;
        if (depth === 0) return idx;
      }
    }
    return -1;
  };

  let fracSearchIdx = 0;
  while (fracSearchIdx < workingText.length) {
    const match = workingText
      .slice(fracSearchIdx)
      .match(
        /(?<![a-zA-Z0-9_\\])(?:(?:[a-zA-Z](?:\([a-zA-Z0-9,\s]+\)|'|_[0-9a-zA-Z]+|\^\{?[0-9a-zA-Z]+\}?)?\s*=\s*)?)(?:-?[0-9a-zA-Z\+\-\*\/]+\s*)?\\(?:frac|dfrac|tfrac)\s*\{/
      );
    if (!match || match.index === undefined) break;

    const startPos = fracSearchIdx + match.index;
    const numOpen = startPos + match[0].length - 1;
    const numClose = findBalancedBrace(workingText, numOpen);
    if (numClose === -1) {
      fracSearchIdx = startPos + match[0].length;
      continue;
    }

    let denOpen = numClose + 1;
    while (
      denOpen < workingText.length &&
      (workingText[denOpen] === " " || workingText[denOpen] === "\t")
    ) {
      denOpen++;
    }
    const denClose = findBalancedBrace(workingText, denOpen);
    if (denClose === -1) {
      fracSearchIdx = numClose + 1;
      continue;
    }

    const fullFrac = workingText.slice(startPos, denClose + 1);
    const protectedFrac = protect(`\\(${fullFrac}\\)`);
    workingText =
      workingText.slice(0, startPos) + protectedFrac + workingText.slice(denClose + 1);
    fracSearchIdx = startPos + protectedFrac.length;
  }

  // 4c. Common equations with equality and LaTeX commands: e.g. f(x) = \frac{1}{2}x, y' = \lim_{h \to 0} ..., E = mc^2
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])(?:[a-zA-Z](?:\([a-zA-Z0-9,\s]+\)|'|_[0-9a-zA-Z]+)?\s*=\s*(?:[^\n$]+?\\[a-zA-Z]+[^\n$]*?))(?=[.,;\s]|$)/g,
    (m) => {
      if (!m.includes("___MATH_PLACEHOLDER_") && !m.includes("http")) {
        return protect(`\\(${m.trim()}\\)`);
      }
      return m;
    }
  );

  // 5. Vector expressions with arithmetic operators: e.g. \bar{a} + \bar{b}, \bar{u} - \bar{v}, \bar{a} \times \bar{b}
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])(?:(?:(?:-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?\\(?:bar|vec|hat|tilde|mathbf)\{[a-zA-Z0-9]+\})\s*(?:[\+\-\*\/]|\\times|\\cdot)\s*(?:(?:(?:-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?\\(?:bar|vec|hat|tilde|mathbf)\{[a-zA-Z0-9]+\}|[a-zA-Z0-9_]+)(?:\s*(?:[\+\-\*\/]|\\times|\\cdot)\s*(?:(?:(?:-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?\\(?:bar|vec|hat|tilde|mathbf)\{[a-zA-Z0-9]+\}|[a-zA-Z0-9_]+))*/g,
    (m) => {
      if (m.includes("\\")) {
        return protect(`\\(${m}\\)`);
      }
      return m;
    }
  );

  // 6. Subscript variables: e.g. E_7, E_8, X_1, a_k, x_{i+1}, x_{i+1}^2, x_{(i+1)^2}, R_1, R_2
  // Placed before power chains so subscripted expressions aren't partially dissected.
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])\b([A-Za-z])_([0-9a-zA-Z]+|\{[^{}\n]+\})(?:\^([0-9a-zA-Z]+|\{[^{}\n]+\}))?(?![a-zA-Z0-9_])/g,
    (_m, varName, sub, exp) => {
      const expPart = exp ? `^${exp}` : "";
      return protect(`\\(${varName}_${sub}${expPart}\\)`);
    }
  );

  // 6b. Polynomial and power terms with arithmetic: e.g. x^2y + a^3b^2, m^n p, a^n \cdot a^m, (x^2)^{k-1}
  const singlePowerTerm =
    '(?:[a-zA-Z0-9]|\\([a-zA-Z0-9_\\+\\-\\*\\/\\s\\.]+\\))\\^(?:[0-9a-zA-Z]+|\\{[^{}\\n]+\\})(?:[a-zA-Z](?:\\^(?:[0-9a-zA-Z]+|\\{[^{}\\n]+\\}))?)*';
  const powerChainRegex = new RegExp(
    '(?<![a-zA-Z0-9_\\\\])(?:[a-zA-Z0-9]\\s*=\\s*)?' +
      singlePowerTerm +
      '(?:\\s*(?:[\\+\\-\\*\\/=]|\\\\cdot|\\\\times)\\s*(?:' +
      singlePowerTerm +
      '|[0-9a-zA-Z]+))*',
    'g'
  );
  workingText = workingText.replace(powerChainRegex, (m) => {
    if (m.includes("^") && !m.includes("___MATH_PLACEHOLDER_")) {
      return protect(`\\(${m.trim()}\\)`);
    }
    return m;
  });

  // 7. Vector/math accents and Blackboard/Mathbb: e.g. \bar{a}, \bar{b}, \bar{u}, \bar{v}, \overline{A}, \mathbb{R}^3, k\bar{a}, 2\bar{a}
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])(?:(?:-?\d+(?:\.\d+)?|\b[a-zA-Z])\s*)?\\(?:bar|vec|hat|tilde|dot|ddot|mathbf|mathcal|mathbb|mathrm|overline)\{[^{}\n]+\}(?:\^[0-9a-zA-Z]+|\^\{[^}]+\}|_[0-9a-zA-Z]+|_{[^}]+})?/g,
    (m) => protect(`\\(${m}\\)`)
  );

  // 8. Square roots, integrals, summations, limits: e.g. \sqrt{a_1^2 + a_2^2}, \sum_{i=1}^n
  workingText = workingText.replace(
    /(?<![a-zA-Z0-9_\\])\\(?:sqrt|sum|prod|int|iint|iiint|oint|lim)\b(?:_[^{}\n]+|_\{\s*[^{}\n]+\s*\})?(?:\^[^{}\n]+|\^\{\s*[^{}\n]+\s*\})?(?:\{[^{}\n]+\})?/g,
    (m) => protect(`\\(${m}\\)`)
  );

  // 9. Coordinate tuples with subscripts: e.g. (a_1, a_2, a_3) or (ka_1, ka_2, ka_3)
  workingText = workingText.replace(
    /\(\s*(?:k\s*)?[a-zA-Z]_[0-9a-zA-Z]+(?:\s*[\+\-]\s*(?:k\s*)?[a-zA-Z]_[0-9a-zA-Z]+)?(?:\s*,\s*(?:k\s*)?[a-zA-Z]_[0-9a-zA-Z]+(?:\s*[\+\-]\s*(?:k\s*)?[a-zA-Z]_[0-9a-zA-Z]+)?)+\s*\)/g,
    (m) => protect(`\\(${m}\\)`)
  );

  // 10. Inline inequalities, subsets, and comparisons: e.g. L - 3 \le x \le L, 0 \le y \le W, x \ge 0, A \subset B, x^2 y \ne x^{2y}
  // Placed before standalone symbols so binary relations are captured as cohesive formulas.
  const compOperand = '(?:___MATH_PLACEHOLDER_\\d+___|[a-zA-Z0-9_\\(\\)\\-\\+\\*\\/]+)';
  const compOp = '\\\\(?:le|ge|ne|approx|sim|equiv|subset|subseteq|supset|supseteq|subsetneq|supsetneq|in|notin)';
  const compRegex = new RegExp(
    `(?<![a-zA-Z0-9_\\\\])(?:${compOperand}\\s*)?${compOp}\\s*(?:${compOperand}(?:\\s*${compOp}\\s*${compOperand})?)`,
    'g'
  );
  workingText = workingText.replace(compRegex, (m) => {
    return protect(`\\(${unwrapInnerPlaceholders(m.trim())}\\)`);
  });

  // 11. Standalone Greek / LaTeX / Math / Set symbols with text or exponents:
  // e.g. \cap, \cup, \in, \subset, \setminus, \emptyset, \varnothing, \infty, \partial, \nabla, \forall, \exists, \ne, \le, \ge, etc.
  workingText = workingText.replace(
    /\\(?:cap|cup|in|notin|subset|subseteq|supset|supseteq|setminus|emptyset|varnothing|infty|partial|nabla|forall|exists|nexists|neg|aleph|hbar|pm|mp|times|div|cdot|circ|bullet|star|approx|sim|simeq|cong|equiv|propto|le|ge|ne|neq|leq|geq|ll|gg|to|rightarrow|leftarrow|Rightarrow|Leftarrow|Leftrightarrow|iff|implies|mapsto|land|lor|oplus|otimes|varepsilon|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Delta|Gamma|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)(?:\^[0-9a-zA-Z]+|\^\{[^}]+\}|_[0-9a-zA-Z]+|_{[^}]+})?(?:\s*\\text\{[^}]+\})?/g,
    (m) => protect(`\\(${m.trim()}\\)`)
  );

  // Expand all placeholders iteratively until all nested levels are resolved
  let prevText = "";
  while (workingText !== prevText && /___MATH_PLACEHOLDER_\d+___/.test(workingText)) {
    prevText = workingText;
    workingText = workingText.replace(
      /___MATH_PLACEHOLDER_(\d+)___/g,
      (_m, idx) => protectedMath[Number(idx)] ?? _m
    );
  }

  return workingText;
}

/**
 * Normalizes text to prevent common markdown/LaTeX formatting issues:
 * 1. Windows carriage returns (\r\n -> \n)
 * 2. OCR misread of vector \bar or \vec as o{a} or o{b}
 * 3. Glued horizontal rules ("text. --- ### Title" -> "text.\n\n---\n\n### Title")
 * 4. Glued headings ("text. ### Title" -> "text.\n\n### Title")
 * 5. Glued Q&A markers ("**Soal:** ... **Jawaban:** ..." -> "**Soal:** ...\n\n**Jawaban:** ...")
 * 6. Auto-wraps raw LaTeX mathematical symbols and set notations
 */
export function normalizeMarkdownText(raw: string): string {
  if (!raw) return "";

  let s = raw.replace(/\r\n/g, "\n");

  // Fix common OCR artifact where vector arrow/bar \vec{a} or \bar{a} was read as o{a} or o{b}
  s = s.replace(/(?<![a-zA-Z0-9\\])o\{([a-zA-Z0-9]+)\}/g, "\\bar{$1}");

  // Separate glued horizontal rules: e.g. "(*screen reader*). --- ### Pertanyaan" (excluding table borders | --- |)
  s = s.replace(
    /([^-\n\s|])\s*---\s*([^-\n\s|])/g,
    (_m, p1, p2) => `${p1}\n\n---\n\n${p2}`
  );

  // Separate glued markdown headings: e.g. "text. ### Pertanyaan"
  s = s.replace(
    /([^#\n\s])\s*(#{1,6}\s+[^\n]+)/g,
    (_m, p1, p2) => `${p1}\n\n${p2}`
  );

  // Separate glued Q&A / prompt sections: e.g. "... teks? **Jawaban:** Sebuah..."
  s = s.replace(
    /([^\n])\s+(\*\*(?:Jawaban|Soal|Penjelasan|Langkah|Catatan|Pertanyaan\s+\d+):\*\*)/gi,
    (_m, p1, p2) => `${p1}\n\n${p2}`
  );

  // Auto-wrap raw/un-escaped LaTeX math formulas
  s = autoWrapUnescapedMath(s);

  return s;
}

/**
 * Checks whether a string looks like pure currency rather than a mathematical formula.
 * E.g. "$100", "$20.50", "$ 50" -> true (currency)
 * "$P$", "$E$", "$x = 5$", "$\alpha$" -> false (math formula)
 */
export function isPureCurrency(content: string): boolean {
  return /^\s*\d+(?:[\.,]\d+)?\s*$/.test(content);
}

/**
 * Parses inline formatting:
 * 1. KaTeX Math: \[...\], \(...\), $$...$$, $...$, \begin{...}...\end{...}
 * 2. Citations: [Page X · Block Y]
 * 3. Markdown inline: **bold**, *italic*, `code`, and preserved line breaks (\n).
 */
export function renderInlineMathAndMarkdown(
  text: string,
  baseKey = "inline"
): React.ReactNode[] {
  if (!text) return [];

  // Automatically wrap unescaped LaTeX math formulas (e.g. \{(x, y)...\}, E_7, \varepsilon)
  const preparedText = autoWrapUnescapedMath(text);

  // Match:
  // 1. $$ ... $$ (display math)
  // 2. \[ ... \] or \\[ ... \\] (display math)
  // 3. \( ... \) or \\( ... \\) (inline math)
  // 4. $ ... $   (inline math)
  // 5. \begin{env} ... \end{env} (environment math)
  const mathRegex =
    /(?:\$\$([\s\S]*?)\$\$|\\+\[([\s\S]*?)\\+\]|\\+\(([\s\S]*?)\\+\)|\$([^\$\n]+?)\$|\\+begin\{([a-zA-Z*]+)\}([\s\S]*?)\\+end\{\5\})/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = mathRegex.exec(preparedText)) !== null) {
    if (match.index > lastIndex) {
      const plainSegment = preparedText.slice(lastIndex, match.index);
      result.push(
        ...parseInlineMarkdownOnly(plainSegment, `${baseKey}-txt-${keyIdx++}`)
      );
    }

    // Determine formula and display mode
    let rawFormula = "";
    let isExplicitDisplay = false;

    if (match[1] !== undefined) {
      // $$ ... $$
      rawFormula = match[1];
      isExplicitDisplay = true;
    } else if (match[2] !== undefined) {
      // \[ ... \]
      rawFormula = match[2];
      isExplicitDisplay = true;
    } else if (match[3] !== undefined) {
      // \( ... \)
      rawFormula = match[3];
      isExplicitDisplay = false;
    } else if (match[4] !== undefined) {
      // $ ... $
      if (isPureCurrency(match[4])) {
        // Not a math formula, render as literal currency text
        result.push(
          <span key={`${baseKey}-curr-${keyIdx++}`}>${match[4]}$</span>
        );
        lastIndex = mathRegex.lastIndex;
        continue;
      }
      rawFormula = match[4];
      isExplicitDisplay = false;
    } else if (match[5] !== undefined) {
      // \begin{env} ... \end{env}
      const envName = match[5];
      const envBody = match[6] ?? "";
      rawFormula = `\\begin{${envName}}${envBody}\\end{${envName}}`;
      isExplicitDisplay = true;
    } else {
      rawFormula = match[0] || "";
    }

    const cleanFormula = rawFormula.replace(/\\\(|\\\)/g, "").trim();

    // In KaTeX, environments like align, equation, gather REQUIRE displayMode: true
    const isDisplayMode = Boolean(
      isExplicitDisplay ||
        /\\begin\{(?:align|equation|gather|multline|CD|alignat)\*?\}/.test(
          cleanFormula
        )
    );

    try {
      const html = katex.renderToString(cleanFormula, {
        displayMode: isDisplayMode,
        throwOnError: false,
        strict: false,
        trust: true,
      });

      result.push(
        <span
          key={`${baseKey}-math-${keyIdx++}`}
          tabIndex={isDisplayMode ? 0 : undefined}
          role={isDisplayMode ? "region" : undefined}
          aria-label={isDisplayMode ? `Rumus: ${cleanFormula}` : undefined}
          className={cn(
            "inline-math-container font-sans inline-block align-baseline mx-0.5",
            isDisplayMode &&
              "my-2.5 block text-center overflow-x-auto py-1 max-w-full"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      result.push(
        <code
          key={`${baseKey}-matherr-${keyIdx++}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
        >
          {rawFormula}
        </code>
      );
    }

    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < preparedText.length) {
    result.push(
      ...parseInlineMarkdownOnly(
        preparedText.slice(lastIndex),
        `${baseKey}-txt-${keyIdx++}`
      )
    );
  }

  return result;
}

/**
 * Parses bold (**text**), italic (*text*), citations ([Page 1 · Block #2]), code (`text`), and line breaks (\n).
 */
export function parseInlineMarkdownOnly(
  text: string,
  prefix: string
): React.ReactNode[] {
  if (!text) return [];

  // Match bold (**...**), italic (*...*), citations ([Page ...]), inline code (`...`), or newline (\n)
  const tokenRegex =
    /(\*\*[^\*]+\*\*|\*[^\*]+\*|\[(?:Page|Halaman)\s+\d+[^\]]*\]|`[^`]+`|\n)/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let subKey = 0;

  while ((m = tokenRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(
        <span key={`${prefix}-p-${subKey++}`}>
          {text.slice(lastIdx, m.index)}
        </span>
      );
    }

    const token = m[0];
    if (token === "\n") {
      nodes.push(<br key={`${prefix}-br-${subKey++}`} />);
    } else if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      nodes.push(
        <strong key={`${prefix}-b-${subKey++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      nodes.push(
        <em key={`${prefix}-i-${subKey++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("[") && token.endsWith("]")) {
      nodes.push(
        <span
          key={`${prefix}-cite-${subKey++}`}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary font-ui mx-1"
        >
          {token.slice(1, -1)}
        </span>
      );
    } else if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      nodes.push(
        <code
          key={`${prefix}-c-${subKey++}`}
          className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<span key={`${prefix}-raw-${subKey++}`}>{token}</span>);
    }

    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    nodes.push(
      <span key={`${prefix}-rem-${subKey++}`}>{text.slice(lastIdx)}</span>
    );
  }

  return nodes;
}

/**
 * Parses multi-paragraph structured markdown blocks (headers, rules, lists, paragraphs)
 * with embedded KaTeX formulas.
 */
export function renderMarkdownBlocks(text: string): React.ReactNode {
  if (!text) return null;

  const normalized = normalizeMarkdownText(text);
  const lines = normalized.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let keyIdx = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Horizontal rule: --- or *** or ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`b-hr-${keyIdx++}`} className="my-3.5 border-border/70" />
      );
      i++;
      continue;
    }

    // 3. Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const inlineNodes = renderInlineMathAndMarkdown(content, `h-${keyIdx++}`);

      if (level === 1) {
        elements.push(
          <h1
            key={`b-h1-${keyIdx++}`}
            className="mt-4 mb-2 text-xl font-bold font-heading text-foreground"
          >
            {inlineNodes}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2
            key={`b-h2-${keyIdx++}`}
            className="mt-3.5 mb-1.5 text-lg font-bold font-heading text-foreground"
          >
            {inlineNodes}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3
            key={`b-h3-${keyIdx++}`}
            className="mt-3 mb-1 text-base font-semibold font-heading text-foreground"
          >
            {inlineNodes}
          </h3>
        );
      } else {
        elements.push(
          <h4
            key={`b-h4-${keyIdx++}`}
            className="mt-2.5 mb-1 text-sm font-semibold font-heading text-foreground"
          >
            {inlineNodes}
          </h4>
        );
      }
      i++;
      continue;
    }

    // 4. Standalone Display Math blocks ($$ or \[ or \begin{env})
    if (
      trimmed.startsWith("$$") ||
      trimmed.startsWith("\\[") ||
      /^\\+begin\{/.test(trimmed)
    ) {
      const mathLines: string[] = [line];
      const isDelimited =
        (trimmed.startsWith("$$") &&
          trimmed.endsWith("$$") &&
          trimmed.length > 2) ||
        (trimmed.startsWith("\\[") &&
          trimmed.endsWith("\\]") &&
          trimmed.length > 2);

      if (
        !isDelimited &&
        !/^\\+begin\{([a-zA-Z*]+)\}[\s\S]*\\+end\{\1\}$/.test(trimmed)
      ) {
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          mathLines.push(nextLine);
          if (
            nextLine.includes("$$") ||
            nextLine.includes("\\]") ||
            /^\\+end\{/.test(nextLine.trim())
          ) {
            i++;
            break;
          }
          i++;
        }
      } else {
        i++;
      }

      const fullMathBlock = mathLines.join("\n");
      let formula = fullMathBlock.trim();
      if (
        (formula.startsWith("\\[") && formula.endsWith("\\]")) ||
        (formula.startsWith("\\(") && formula.endsWith("\\)"))
      ) {
        formula = formula.slice(2, -2).trim();
      } else if (formula.startsWith("$$") && formula.endsWith("$$")) {
        formula = formula.slice(2, -2).trim();
      }

      elements.push(
        <MathEquationView
          key={`b-math-${keyIdx++}`}
          latex={formula}
          contentText={formula}
          compact
          className="my-3"
        />
      );
      continue;
    }

    // 4b. Code blocks: ```latex, ```math, or general ```
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim().toLowerCase();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++;
      }
      const codeContent = codeLines.join("\n").trim();
      if (lang === "latex" || lang === "math" || lang === "tex") {
        elements.push(
          <MathEquationView
            key={`b-code-math-${keyIdx++}`}
            latex={codeContent}
            contentText={codeContent}
            compact
            className="my-3"
          />
        );
      } else {
        elements.push(
          <pre
            key={`b-code-${keyIdx++}`}
            className="my-2.5 overflow-x-auto rounded-xl border border-border bg-muted/60 p-3 font-mono text-xs text-foreground"
          >
            <code>{codeContent}</code>
          </pre>
        );
      }
      continue;
    }

    // 4c. Markdown Table: lines starting and ending with |
    if (
      trimmed.startsWith("|") &&
      trimmed.endsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*\|/.test(lines[i + 1].trim())
    ) {
      const headerLine = trimmed;
      const rawHeaders = headerLine
        .split("|")
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      i += 2; // skip header line and divider line
      const tableRows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        const rowCells = lines[i]
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (rowCells.length > 0) {
          tableRows.push(rowCells);
        }
        i++;
      }

      elements.push(
        <div
          key={`b-table-${keyIdx++}`}
          tabIndex={0}
          role="region"
          aria-label="Tabel data"
          className="my-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-xs"
        >
          <table className="w-full border-collapse text-left text-sm font-ui">
            <thead>
              <tr className="border-b border-border bg-surface-subtle">
                {rawHeaders.map((h, hIdx) => (
                  <th
                    key={`th-${keyIdx}-${hIdx}`}
                    scope="col"
                    className="p-2.5 font-semibold text-foreground text-xs"
                  >
                    {renderInlineMathAndMarkdown(h, `th-${keyIdx}-${hIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={`tr-${keyIdx}-${rIdx}`}
                  className="border-b border-border/50 transition-colors hover:bg-muted/30 last:border-0"
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={`td-${keyIdx}-${rIdx}-${cIdx}`}
                      className="p-2.5 text-foreground text-xs align-top"
                    >
                      {renderInlineMathAndMarkdown(cell, `td-${keyIdx}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 5. Bullet list: lines starting with *, -, +
    if (/^\s*[\*\-]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[\*\-]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[\*\-]\s+/, ""));
        i++;
      }
      elements.push(
        <ul
          key={`b-ul-${keyIdx++}`}
          className="my-2 space-y-1.5 pl-5 list-disc font-ui"
        >
          {listItems.map((item, lIdx) => (
            <li
              key={`li-${keyIdx}-${lIdx}`}
              className="leading-relaxed"
            >
              {renderInlineMathAndMarkdown(item, `li-${keyIdx}-${lIdx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Numbered list: lines starting with 1., 2., etc.
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol
          key={`b-ol-${keyIdx++}`}
          className="my-2 space-y-1.5 pl-5 list-decimal font-ui"
        >
          {listItems.map((item, lIdx) => (
            <li
              key={`oli-${keyIdx}-${lIdx}`}
              className="leading-relaxed"
            >
              {renderInlineMathAndMarkdown(item, `oli-${keyIdx}-${lIdx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Blockquote: lines starting with >
    if (/^\s*>\s*/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s*/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s*/, ""));
        i++;
      }
      elements.push(
        <blockquote
          key={`b-quote-${keyIdx++}`}
          className="my-2 border-l-4 border-primary/40 pl-3 italic text-muted-foreground font-ui"
        >
          {renderInlineMathAndMarkdown(quoteLines.join("\n"), `q-${keyIdx++}`)}
        </blockquote>
      );
      continue;
    }

    // 8. Regular paragraph: collect until blank line, heading, list, rule, or display math
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^#{1,6}\s+/.test(lines[i].trim()) &&
      !/^\s*[\*\-]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s*/.test(lines[i]) &&
      !lines[i].trim().startsWith("$$") &&
      !lines[i].trim().startsWith("\\[") &&
      !/^\\+begin\{/.test(lines[i].trim())
    ) {
      pLines.push(lines[i]);
      i++;
    }

    if (pLines.length > 0) {
      elements.push(
        <p key={`b-p-${keyIdx++}`} className="mb-2 last:mb-0">
          {renderInlineMathAndMarkdown(pLines.join("\n"), `p-${keyIdx++}`)}
        </p>
      );
    }
  }

  return elements;
}
