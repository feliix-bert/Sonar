import { describe, expect, it } from "vitest";
import {
  narrateLatexEquation,
  narrateMixedText,
  narrateTableBlock,
} from "@/features/math-ocr/math-narration";
import { latexToMathMl } from "@/features/math-ocr/latex-to-mathml";
import { parseTableData, narrateTable } from "@/lib/accessibility/table-narration";
import { autoWrapUnescapedMath } from "@/lib/math/math-markdown-parser";

describe("SONAR Deterministic Math Narration & MathML Engine", () => {
  it("narrates definite integrals accurately in English and Indonesian", () => {
    const res = narrateLatexEquation("\\int_0^1 x^2 \\, dx");
    expect(res.supported).toBe(true);
    expect(res.confidencePenalty).toBe(0);
    expect(res.narrationEn.toLowerCase()).toContain("integral from 0 to 1");
    expect(res.narrationEn.toLowerCase()).toContain("x squared");
    expect(res.narrationId.toLowerCase()).toContain("integral dari nol sampai satu");
    expect(res.narrationId.toLowerCase()).toContain("x kuadrat");
    expect(res.explorationTree.length).toBeGreaterThan(0);
  });

  it("narrates fractions and square roots cleanly", () => {
    const res = narrateLatexEquation("x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}");
    expect(res.supported).toBe(true);
    expect(res.narrationEn).toContain("fraction with numerator");
    expect(res.narrationEn).toContain("square root of");
    expect(res.narrationId).toContain("pecahan dengan pembilang");
    expect(res.narrationId).toContain("akar kuadrat dari");
  });

  it("flags unsupported macros explicitly rather than dropping them", () => {
    const res = narrateLatexEquation("A \\stackrel{\\text{def}}{=} B");
    expect(res.supported).toBe(false);
    expect(res.unsupportedConstructs).toContain("\\stackrel");
    expect(res.confidencePenalty).toBeGreaterThan(0);
    expect(res.narrationEn).toContain("Warning:");
  });

  it("narrates matrices and vector determinants cleanly without raw syntax or glued words", () => {
    const latex =
      "\\vec{u} \\times \\vec{v} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ u_1 & u_2 & u_3 \\\\ v_1 & v_2 & v_3 \\end{vmatrix} = (u_2 v_3 - u_3 v_2) \\hat{i} + (u_3 v_1 - u_1 v_3) \\hat{j} + (u_1 v_2 - u_2 v_1) \\hat{k}";
    const res = narrateLatexEquation(latex);
    expect(res.supported).toBe(true);
    expect(res.unsupportedConstructs).toHaveLength(0);
    expect(res.confidencePenalty).toBe(0);

    // Verify determinant narration
    expect(res.narrationId).toContain("determinan matriks 3 kali 3");
    expect(res.narrationId).toContain("baris 1: vektor satuan i, vektor satuan j, vektor satuan k");
    expect(res.narrationId).toContain("baris 2: u indeks satu, u indeks dua, u indeks tiga");
    expect(res.narrationId).toContain("baris 3: v indeks satu, v indeks dua, v indeks tiga");

    // Verify subscripts are not glued to subsequent variable names
    expect(res.narrationId).not.toContain("duav");
    expect(res.narrationId).not.toContain("tigav");
    expect(res.narrationId).not.toContain("satuv");
    expect(res.narrationId).toContain("u indeks dua v indeks tiga");
    expect(res.narrationId).toContain("u indeks tiga v indeks satu");

    // Verify no raw LaTeX delimiters or warnings
    expect(res.narrationId).not.toContain("begin vmatrix");
    expect(res.narrationId).not.toContain("end vmatrix");
    expect(res.narrationId).not.toContain("Peringatan:");

    // Verify English matrix narration
    const bmatrix = narrateLatexEquation("A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}");
    expect(bmatrix.supported).toBe(true);
    expect(bmatrix.narrationEn).toContain("2 by 2 matrix: row 1: 1, 2; row 2: 3, 4");
    expect(bmatrix.narrationId).toContain("matriks 2 kali 2: baris 1: satu, dua; baris 2: tiga, empat");
  });

  it("converts valid LaTeX into sanitized semantic MathML", () => {
    const mml = latexToMathMl("\\frac{a + b}{c}");
    expect(mml.valid).toBe(true);
    expect(mml.mathml).toContain("<math");
    expect(mml.mathml).toContain("<mfrac>");
  });

  it("flags invalid LaTeX syntax via MathJax parse validation", () => {
    const mml = latexToMathMl("\\frac{1}{");
    expect(mml.valid).toBe(false);
  });

  it("narrates complex vector math, norms, and unit vectors accurately", () => {
    const res = narrateLatexEquation("\\|\\vec{a}\\| = \\sqrt{a_1^2 + a_2^2}");
    expect(res.supported).toBe(true);
    expect(res.narrationId.toLowerCase()).toContain("vektor a");
    expect(res.narrationId.toLowerCase()).toContain("akar kuadrat");
    expect(res.narrationEn.toLowerCase()).toContain("vector a");

    const vecDot = narrateLatexEquation("\\vec{a} = 2\\hat{i} + 2\\hat{j}");
    expect(vecDot.supported).toBe(true);
    expect(vecDot.narrationId.toLowerCase()).toContain("vektor a");
    expect(vecDot.narrationId.toLowerCase()).toContain("vektor satuan i");
  });

  it("narrates set operations (irisan/gabungan) and inequalities correctly in Indonesian", () => {
    const setRes = narrateLatexEquation("A \\cap B \\cup C");
    expect(setRes.supported).toBe(true);
    expect(setRes.narrationId.toLowerCase()).toContain("irisan");
    expect(setRes.narrationId.toLowerCase()).toContain("gabungan");
    expect(setRes.narrationEn.toLowerCase()).toContain("intersection");
    expect(setRes.narrationEn.toLowerCase()).toContain("union");

    const ineqRes = narrateLatexEquation("x < 5 \\le y > 2 \\ge z");
    expect(ineqRes.supported).toBe(true);
    expect(ineqRes.narrationId.toLowerCase()).toContain("kurang dari");
    expect(ineqRes.narrationId.toLowerCase()).toContain("kurang dari atau sama dengan");
    expect(ineqRes.narrationId.toLowerCase()).toContain("lebih dari");
    expect(ineqRes.narrationId.toLowerCase()).toContain("lebih dari atau sama dengan");
  });

  it("narrates mixed prose paragraphs with inline math formulas seamlessly", () => {
    const prose =
      "Contoh 4.2: Tentukan hasil kali dari vektor \\(\\vec{a} = 2\\hat{i}\\) jika \\(x < 10\\).";
    const spokenId = narrateMixedText(prose, "id");
    expect(spokenId).toContain("vektor a sama dengan dua vektor satuan i");
    expect(spokenId).toContain("x kurang dari");
    expect(spokenId).not.toContain("\\(");
    expect(spokenId).not.toContain("\\vec");
    expect(spokenId).not.toContain("backslash");
  });

  it("narrates un-delimited LaTeX sets, subscripts, and Greek symbols naturally without raw code", () => {
    const text =
      'kejadian E_7 = "robot" himpunan \\{(x, y), L - 3 \\le x \\le L, 0 \\le y \\le W\\}. E_8 = "robot" \\varepsilon \\text{ kaki}';
    const spoken = narrateMixedText(text, "id");
    expect(spoken).toContain("E indeks tujuh");
    expect(spoken).toContain("himpunan");
    expect(spoken).toContain("kurang dari atau sama dengan");
    expect(spoken).toContain("epsilon kaki");
    expect(spoken).not.toContain("\\");
  });

  it("narrates un-delimited vector equations, coordinate tuples, and norms into natural speech", () => {
    const text =
      "Diketahui o{a} dan o{b} di ruang (\\mathbb{R}^3).\n* \\bar{a} + \\bar{b} = (a_1 + b_1, a_2 + b_2, a_3 + b_3)\n* Luas \\|\\bar{u} \\times \\bar{v}\\|";
    const spoken = narrateMixedText(text, "id");
    expect(spoken.toLowerCase()).toContain("vektor a");
    expect(spoken.toLowerCase()).toContain("vektor b");
    expect(spoken.toLowerCase()).toContain("ruang r tiga");
    expect(spoken.toLowerCase()).toContain("panjang vektor");
    expect(spoken.toLowerCase()).toContain("dikali silang");
    expect(spoken).not.toContain("\\");
  });

  it("parses and narrates tabular data with mathematical cells cleanly for screen readers", () => {
    const htmlTable = `
      <table>
        <caption>Operasi Vektor</caption>
        <thead><tr><th>Vektor</th><th>Operasi</th></tr></thead>
        <tbody>
          <tr><td>\\bar{a}</td><td>\\bar{a} + \\bar{b}</td></tr>
          <tr><td>\\bar{u}</td><td>\\|\\bar{u} \\times \\bar{v}\\|</td></tr>
        </tbody>
      </table>
    `;
    const parsed = parseTableData(htmlTable);
    expect(parsed.caption).toBe("Operasi Vektor");
    expect(parsed.headers).toEqual(["Vektor", "Operasi"]);
    expect(parsed.rows.length).toBe(2);

    const spoken = narrateTable(parsed, "id");
    expect(spoken).toContain("Tabel: Operasi Vektor");
    expect(spoken).toContain("Terdiri dari 2 kolom: Vektor, Operasi");
    expect(spoken).toContain("Baris 1: Vektor: vektor a, Operasi: vektor a tambah vektor b");
    expect(spoken).toContain("Baris 2: Vektor: vektor u, Operasi: panjang vektor u dikali silang vektor v");
  });

  it("narrates structured table blocks directly with mathematical cell contents", () => {
    const tableSpeech = narrateTableBlock(
      "Kriteria Uji Matriks Hessian",
      ["Kondisi", "Hasil"],
      [
        ["D > 0 dan f_xx > 0", "Minimum Lokal"],
        ["\\|\\bar{u} \\times \\bar{v}\\| = 0", "\\bar{u} sejajar \\bar{v}"],
      ],
      "id"
    );

    expect(tableSpeech).toContain("Tabel: Kriteria Uji Matriks Hessian");
    expect(tableSpeech).toContain("Memiliki 2 kolom dan 2 baris");
    expect(tableSpeech).toContain("Judul kolom: Kondisi, Hasil");
    expect(tableSpeech).toContain("Baris 1: Kondisi: D > 0 dan f indeks xx > 0; Hasil: Minimum Lokal");
    expect(tableSpeech).toContain("Baris 2: Kondisi: panjang vektor u dikali silang vektor v sama dengan nol; Hasil: vektor u sejajar vektor v");
  });

  it("safely auto-wraps Indonesian vector and norm sentences without capturing prose words", () => {
    const s1 = "Diketahui o{a} dan o{b} merupakan vektor di ruang (\\mathbb{R}^3) maka \\bar{a} = (a_1, a_2, a_3)";
    const wrapped1 = autoWrapUnescapedMath(s1);
    expect(wrapped1).toContain("\\(\\bar{a}\\)");
    expect(wrapped1).toContain("\\(\\bar{b}\\)");
    expect(wrapped1).toContain("\\((\\mathbb{R}^3)\\)");
    expect(wrapped1).toContain("\\(\\bar{a} = (a_1, a_2, a_3)\\)");

    const s4 = "Luas jajaran-genjang yang dibentuk oleh vektor \\bar{u} & \\bar{v} adalah \\|\\bar{u} \\times \\bar{v}\\|";
    const wrapped4 = autoWrapUnescapedMath(s4);
    expect(wrapped4).toContain("\\(\\|\\bar{u} \\times \\bar{v}\\|\\)");
    expect(wrapped4).not.toContain("adalah \\|");
    expect(wrapped4).not.toContain("vektor \\bar{u}");

    const s5 = "Luas segitiga adalah \\frac{1}{2} \\|\\bar{u} \\times \\bar{v}\\|";
    const wrapped5 = autoWrapUnescapedMath(s5);
    expect(wrapped5).toContain("\\(\\frac{1}{2} \\|\\bar{u} \\times \\bar{v}\\|\\)");
  });

  it("narrates vector norms with \\bar without flagging them as unsupported", () => {
    const res = narrateLatexEquation("\\frac{1}{2} \\|\\bar{u} \\times \\bar{v}\\|");
    expect(res.supported).toBe(true);
    expect(res.unsupportedConstructs).toHaveLength(0);
    expect(res.narrationId).not.toContain("Peringatan:");
    expect(res.narrationId).toContain("panjang vektor u dikali silang vektor v");
  });

  it("auto-wraps set theory operations, equations, complements, and empty set symbols accurately", () => {
    expect(autoWrapUnescapedMath("A \\cup B")).toBe("\\(A \\cup B\\)");
    expect(autoWrapUnescapedMath("A \\cap B")).toBe("\\(A \\cap B\\)");
    expect(autoWrapUnescapedMath("\\bar{A} = S \\setminus A")).toBe(
      "\\(\\bar{A} = S \\setminus A\\)"
    );
    expect(autoWrapUnescapedMath("A \\subset B")).toBe("\\(A \\subset B\\)");
    expect(
      autoWrapUnescapedMath("(A \\setminus B) \\cup (B \\setminus A)")
    ).toBe("\\((A \\setminus B) \\cup (B \\setminus A)\\)");
    expect(autoWrapUnescapedMath("\\emptyset")).toBe("\\(\\emptyset\\)");
    expect(autoWrapUnescapedMath("\\varnothing")).toBe("\\(\\varnothing\\)");
    expect(autoWrapUnescapedMath("A \\setminus B = A \\cap \\bar{B}")).toBe(
      "\\(A \\setminus B = A \\cap \\bar{B}\\)"
    );
    expect(
      autoWrapUnescapedMath("P(A \\cup B) = P(A) + P(B) - P(A \\cap B)")
    ).toBe("\\(P(A \\cup B) = P(A) + P(B) - P(A \\cap B)\\)");
  });

  it("narrates set operations, complement of events, and empty sets naturally in speech", () => {
    const complementRes = narrateLatexEquation("\\bar{A} = S \\setminus A");
    expect(complementRes.supported).toBe(true);
    expect(complementRes.narrationId.toLowerCase()).toContain("komplemen a");
    expect(complementRes.narrationId.toLowerCase()).toContain("selisih himpunan a");

    const symDiffRes = narrateLatexEquation("(A \\setminus B) \\cup (B \\setminus A)");
    expect(symDiffRes.supported).toBe(true);
    expect(symDiffRes.narrationId.toLowerCase()).toContain("selisih himpunan");
    expect(symDiffRes.narrationId.toLowerCase()).toContain("gabungan");

    const emptySetRes = narrateLatexEquation("\\emptyset");
    expect(emptySetRes.supported).toBe(true);
    expect(emptySetRes.narrationId.toLowerCase()).toContain("himpunan kosong");

    const tableNarration = narrateTableBlock(
      "Tabel Event",
      ["Event"],
      [
        ["A \\cup B"],
        ["A \\cap B"],
        ["\\bar{A} = S \\setminus A"],
        ["A \\subset B"],
        ["(A \\setminus B) \\cup (B \\setminus A)"],
        ["S"],
        ["\\emptyset"],
      ],
      "id"
    );

    expect(tableNarration).toContain("Tabel: Tabel Event");
    expect(tableNarration.toLowerCase()).toContain("gabungan");
    expect(tableNarration.toLowerCase()).toContain("irisan");
    expect(tableNarration.toLowerCase()).toContain("komplemen a");
    expect(tableNarration.toLowerCase()).toContain("selisih himpunan");
    expect(tableNarration.toLowerCase()).toContain("himpunan kosong");
  });

  it("narrates binomial coefficients accurately in both languages", () => {
    const res = narrateLatexEquation("\\binom{n}{k} = \\frac{n!}{k!(n-k)!}");
    expect(res.supported).toBe(true);
    expect(res.narrationId.toLowerCase()).toContain("kombinasi k dari n");
    expect(res.narrationEn.toLowerCase()).toContain("n choose k");
  });

  it("narrates partial derivatives with natural conversational order", () => {
    const firstOrder = narrateLatexEquation("\\frac{\\partial f}{\\partial x}");
    expect(firstOrder.supported).toBe(true);
    expect(firstOrder.narrationId.toLowerCase()).toContain("turunan parsial f terhadap x");
    expect(firstOrder.narrationEn.toLowerCase()).toContain("partial derivative of f with respect to x");

    const secondOrder = narrateLatexEquation("\\frac{\\partial^2 f}{\\partial x^2}");
    expect(secondOrder.supported).toBe(true);
    expect(secondOrder.narrationId.toLowerCase()).toContain("turunan parsial kedua f terhadap x");
    expect(secondOrder.narrationEn.toLowerCase()).toContain("second partial derivative of f with respect to x");
  });

  it("narrates multi-variable calculus double and contour integrals cleanly", () => {
    const doubleInt = narrateLatexEquation("\\iint_D x^2 + y^2 \\, dA");
    expect(doubleInt.supported).toBe(true);
    expect(doubleInt.narrationId.toLowerCase()).toContain("integral lipat dua");
    expect(doubleInt.narrationEn.toLowerCase()).toContain("double integral");

    const contourInt = narrateLatexEquation("\\oint_C \\vec{F} \\cdot d\\vec{r}");
    expect(contourInt.supported).toBe(true);
    expect(contourInt.narrationId.toLowerCase()).toContain("integral lintasan tertutup");
    expect(contourInt.narrationEn.toLowerCase()).toContain("contour integral");
  });

  it("narrates ellipsis (\\dots, \\cdots, \\ldots) naturally as sampai dengan without flagging warnings or chopping to dot s", () => {
    const hypergeo =
      "P(X = k) = \\frac{\\binom{K}{k}\\binom{N-K}{n-k}}{\\binom{N}{n}}, \\quad \\binom{n}{k_1, k_2, \\dots, k_m} = \\frac{n!}{k_1! k_2! \\cdots k_m!}";
    const res = narrateLatexEquation(hypergeo);
    expect(res.supported).toBe(true);
    expect(res.unsupportedConstructs).not.toContain("\\dots");
    expect(res.unsupportedConstructs).not.toContain("\\cdots");
    expect(res.narrationId.toLowerCase()).toContain("sampai dengan");
    expect(res.narrationId.toLowerCase()).not.toContain("dot s");
    expect(res.narrationId.toLowerCase()).not.toContain("peringatan:");
  });
});
