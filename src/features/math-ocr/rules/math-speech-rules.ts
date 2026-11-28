import type { ReaderLanguage } from "@/stores/accessibility-store";

export interface SpeechTranslation {
  en: string;
  id: string;
}

export interface MacroRule {
  macro: string;
  en: string;
  id: string;
  category: "greek" | "function" | "operator" | "symbol" | "calculus" | "set" | "logic";
}

/**
 * Standard Greek alphabet mappings in English and Indonesian mathematical speech.
 */
export const GREEK_RULES: Record<string, SpeechTranslation> = {
  "\\alpha": { en: "alpha", id: "alfa" },
  "\\beta": { en: "beta", id: "beta" },
  "\\gamma": { en: "gamma", id: "gama" },
  "\\Gamma": { en: "capital gamma", id: "gama besar" },
  "\\delta": { en: "delta", id: "delta" },
  "\\Delta": { en: "delta", id: "delta" },
  "\\epsilon": { en: "epsilon", id: "epsilon" },
  "\\varepsilon": { en: "epsilon", id: "epsilon" },
  "\\zeta": { en: "zeta", id: "zeta" },
  "\\eta": { en: "eta", id: "eta" },
  "\\theta": { en: "theta", id: "teta" },
  "\\Theta": { en: "capital theta", id: "teta besar" },
  "\\vartheta": { en: "theta", id: "teta" },
  "\\iota": { en: "iota", id: "iota" },
  "\\kappa": { en: "kappa", id: "kapa" },
  "\\lambda": { en: "lambda", id: "lambda" },
  "\\Lambda": { en: "capital lambda", id: "lambda besar" },
  "\\mu": { en: "mu", id: "miu" },
  "\\nu": { en: "nu", id: "niu" },
  "\\xi": { en: "xi", id: "ksi" },
  "\\Xi": { en: "capital xi", id: "ksi besar" },
  "\\pi": { en: "pi", id: "pi" },
  "\\Pi": { en: "capital pi", id: "pi besar" },
  "\\varpi": { en: "pi", id: "pi" },
  "\\rho": { en: "rho", id: "ro" },
  "\\varrho": { en: "rho", id: "ro" },
  "\\sigma": { en: "sigma", id: "sigma" },
  "\\Sigma": { en: "capital sigma", id: "sigma besar" },
  "\\tau": { en: "tau", id: "tau" },
  "\\upsilon": { en: "upsilon", id: "upsilon" },
  "\\phi": { en: "phi", id: "fi" },
  "\\Phi": { en: "capital phi", id: "fi besar" },
  "\\varphi": { en: "phi", id: "fi" },
  "\\chi": { en: "chi", id: "khi" },
  "\\psi": { en: "psi", id: "psi" },
  "\\Psi": { en: "capital psi", id: "psi besar" },
  "\\omega": { en: "omega", id: "omega" },
  "\\Omega": { en: "capital omega", id: "omega besar" },
};

/**
 * Standard elementary and special functions.
 */
export const FUNCTION_RULES: Record<string, SpeechTranslation> = {
  "\\sin": { en: "sine of", id: "sinus dari" },
  "\\cos": { en: "cosine of", id: "kosinus dari" },
  "\\tan": { en: "tangent of", id: "tangen dari" },
  "\\cot": { en: "cotangent of", id: "kotangen dari" },
  "\\sec": { en: "secant of", id: "sekan dari" },
  "\\csc": { en: "cosecant of", id: "kosekan dari" },
  "\\arcsin": { en: "arcsine of", id: "arkus sinus dari" },
  "\\arccos": { en: "arccosine of", id: "arkus kosinus dari" },
  "\\arctan": { en: "arctangent of", id: "arkus tangen dari" },
  "\\sinh": { en: "hyperbolic sine of", id: "sinus hiperbolik dari" },
  "\\cosh": { en: "hyperbolic cosine of", id: "kosinus hiperbolik dari" },
  "\\tanh": { en: "hyperbolic tangent of", id: "tangen hiperbolik dari" },
  "\\ln": { en: "natural log of", id: "logaritma natural dari" },
  "\\log": { en: "log of", id: "logaritma dari" },
  "\\exp": { en: "exponential of", id: "eksponensial dari" },
  "\\det": { en: "determinant of", id: "determinan dari" },
  "\\gcd": { en: "greatest common divisor of", id: "faktor persekutuan terbesar dari" },
  "\\deg": { en: "degree of", id: "derajat dari" },
  "\\dim": { en: "dimension of", id: "dimensi dari" },
  "\\ker": { en: "kernel of", id: "kernel dari" },
  "\\hom": { en: "homomorphism of", id: "homomorfisme dari" },
  "\\arg": { en: "argument of", id: "argumen dari" },
  "\\sgn": { en: "sign of", id: "fungsi tanda dari" },
};

/**
 * Mathematical operations, relations, logic, set theory, and vector operators.
 */
export const OPERATOR_RULES: Record<string, SpeechTranslation> = {
  // Calculus & Vectors
  "\\partial": { en: "partial", id: "parsial" },
  "\\nabla": { en: "nabla", id: "nabla" },
  "\\infty": { en: "infinity", id: "tak hingga" },
  "\\oint": { en: "contour integral", id: "integral lintasan tertutup" },
  "\\iint": { en: "double integral", id: "integral lipat dua" },
  "\\iiint": { en: "triple integral", id: "integral lipat tiga" },
  "\\cdots": { en: "ellipsis", id: "sampai dengan" },
  "\\dots": { en: "ellipsis", id: "sampai dengan" },
  "\\ldots": { en: "ellipsis", id: "sampai dengan" },
  "\\vdots": { en: "vertical dots", id: "titik-titik vertikal" },
  "\\ddots": { en: "diagonal dots", id: "titik-titik diagonal" },
  "\\cdot": { en: "dot", id: "dot" },
  "\\times": { en: "cross", id: "dikali silang" },
  "\\div": { en: "divided by", id: "dibagi" },
  "\\pm": { en: "plus or minus", id: "plus minus" },
  "\\mp": { en: "minus or plus", id: "minus plus" },
  "\\circ": { en: "degrees", id: "derajat" },

  // Set Theory
  "\\cap": { en: "intersection", id: "irisan" },
  "\\bigcap": { en: "intersection", id: "irisan" },
  "\\cup": { en: "union", id: "gabungan" },
  "\\bigcup": { en: "union", id: "gabungan" },
  "\\setminus": { en: "set minus", id: "selisih himpunan" },
  "\\subset": { en: "subset of", id: "himpunan bagian dari" },
  "\\subseteq": { en: "subset or equal to", id: "bagian atau sama dengan" },
  "\\supset": { en: "superset of", id: "himpunan superset dari" },
  "\\supseteq": { en: "superset or equal to", id: "superset atau sama dengan" },
  "\\notin": { en: "not in", id: "bukan anggota dari" },
  "\\in": { en: "in", id: "anggota dari" },
  "\\emptyset": { en: "empty set", id: "himpunan kosong" },
  "\\varnothing": { en: "empty set", id: "himpunan kosong" },

  // Comparisons & Relations
  "\\leq": { en: "less than or equal to", id: "kurang dari atau sama dengan" },
  "\\le": { en: "less than or equal to", id: "kurang dari atau sama dengan" },
  "\\leqslant": { en: "less than or equal to", id: "kurang dari atau sama dengan" },
  "\\geq": { en: "greater than or equal to", id: "lebih dari atau sama dengan" },
  "\\ge": { en: "greater than or equal to", id: "lebih dari atau sama dengan" },
  "\\geqslant": { en: "greater than or equal to", id: "lebih dari atau sama dengan" },
  "\\neq": { en: "is not equal to", id: "tidak sama dengan" },
  "\\ne": { en: "is not equal to", id: "tidak sama dengan" },
  "\\approx": { en: "is approximately equal to", id: "kira-kira sama dengan" },
  "\\equiv": { en: "is equivalent to", id: "ekuivalen dengan" },
  "\\sim": { en: "is similar to", id: "serupa dengan" },
  "\\cong": { en: "is congruent to", id: "kongruen dengan" },
  "\\propto": { en: "is proportional to", id: "sebanding dengan" },
  "\\ll": { en: "much less than", id: "jauh lebih kecil dari" },
  "\\gg": { en: "much greater than", id: "jauh lebih besar dari" },

  // Logic & Quantifiers
  "\\forall": { en: "for all", id: "untuk setiap" },
  "\\exists": { en: "there exists", id: "terdapat" },
  "\\nexists": { en: "there does not exist", id: "tidak ada" },
  "\\land": { en: "and", id: "dan" },
  "\\wedge": { en: "and", id: "dan" },
  "\\lor": { en: "or", id: "atau" },
  "\\vee": { en: "or", id: "atau" },
  "\\neg": { en: "not", id: "bukan" },
  "\\implies": { en: "implies", id: "berimplikasi pada" },
  "\\Rightarrow": { en: "implies", id: "berimplikasi pada" },
  "\\iff": { en: "if and only if", id: "jika dan hanya jika" },
  "\\Leftrightarrow": { en: "if and only if", id: "jika dan hanya jika" },
  "\\to": { en: "approaches", id: "menuju" },
  "\\rightarrow": { en: "approaches", id: "menuju" },
  "\\leftarrow": { en: "from", id: "dari" },

  // Probability & Modular
  "\\mid": { en: "given", id: "dengan syarat" },
  "\\pmod": { en: "modulo", id: "modulo" },
  "\\bmod": { en: "modulo", id: "modulo" },
};

/**
 * Environments recognized for semantic translation.
 */
export const SUPPORTED_ENVIRONMENTS = new Set([
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
  "align*",
  "gather",
  "gather*",
  "equation",
  "equation*",
]);

/**
 * Helper to get localized speech for an operator or symbol.
 */
export function getLocalizedSpeech(
  key: string,
  lang: ReaderLanguage
): string | undefined {
  if (FUNCTION_RULES[key]) return FUNCTION_RULES[key][lang];
  if (GREEK_RULES[key]) return GREEK_RULES[key][lang];
  if (OPERATOR_RULES[key]) return OPERATOR_RULES[key][lang];
  return undefined;
}
