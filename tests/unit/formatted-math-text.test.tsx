import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormattedMathText } from "@/components/document/FormattedMathText";

describe("FormattedMathText & KaTeX rendering", () => {
  it("renders headings from markdown hashes", () => {
    const text = "### Pertanyaan 1: Definisi Probabilitas";
    render(<FormattedMathText text={text} as="div" />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Pertanyaan 1: Definisi Probabilitas");
  });

  it("renders bold, italic, and inline code properly", () => {
    const text = "Ini teks **tebal**, teks *miring*, dan `kode inline`.";
    render(<FormattedMathText text={text} as="div" />);
    expect(screen.getByText("tebal").tagName.toLowerCase()).toBe("strong");
    expect(screen.getByText("miring").tagName.toLowerCase()).toBe("em");
    expect(screen.getByText("kode inline").tagName.toLowerCase()).toBe("code");
  });

  it("renders inline LaTeX equations with KaTeX HTML", () => {
    const text = "Diberikan probabilitas $P(E)$ dan kejadian $A \\cap B$.";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    const mathSpans = container.querySelectorAll(".inline-math-container");
    expect(mathSpans.length).toBe(2);
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  it("renders display math equations ($$ ... $$) cleanly", () => {
    const text = "$$(A \\cap B) \\cup (A \\cap \\bar{B}) = A$$";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    const displayMath = container.querySelector(".katex-display");
    expect(displayMath).toBeInTheDocument();
  });

  it("renders LaTeX environments such as \\begin{aligned} in display mode without error", () => {
    const text = "\\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned}";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    expect(container.querySelector(".katex-display")).toBeInTheDocument();
    expect(container.querySelector(".katex-error")).toBeNull();
  });

  it("separates glued horizontal rules and headings defensively", () => {
    const text =
      "melalui pembaca layar (*screen reader*). --- ### Pertanyaan 1: Definisi\n**Soal:** Apa itu $P$?";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    expect(container.querySelector("hr")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Pertanyaan 1: Definisi"
    );
    expect(screen.getByText("Soal:")).toBeInTheDocument();
  });

  it("renders bullet and numbered lists properly", () => {
    const text = "* Butir pertama\n* Butir kedua dengan $x = 10$\n* Butir ketiga";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    const list = container.querySelector("ul");
    expect(list).toBeInTheDocument();
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
  });

  it("does not mistake ordinary currency for math", () => {
    const text = "Biaya langganan adalah $100 per tahun.";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    expect(container.querySelector(".inline-math-container")).toBeNull();
    expect(screen.getByText(/Biaya langganan adalah/)).toBeInTheDocument();
  });

  it("renders un-delimited LaTeX sets, subscripts, and Greek symbols cleanly via KaTeX", () => {
    const text =
      'kejadian E_7 = "robot berada 3 kaki" himpunan \\{(x, y), L - 3 \\le x \\le L, 0 \\le y \\le W\\}. E_8 = \\varepsilon \\text{ kaki}';
    const { container } = render(<FormattedMathText text={text} as="div" />);
    const katexNodes = container.querySelectorAll(".katex");
    expect(katexNodes.length).toBeGreaterThanOrEqual(3);
    const katexHtml = container.querySelector(".katex-html");
    expect(katexHtml).toBeInTheDocument();
    expect(katexHtml?.textContent).not.toContain("\\le");
    expect(katexHtml?.textContent).not.toContain("\\varepsilon");
  });

  it("renders un-delimited vector operations, coordinate tuples, norms, and fractions cleanly via KaTeX", () => {
    const text1 =
      "Diketahui o{a} dan o{b} di ruang (\\mathbb{R}^3) dengan \\bar{a} = (a_1, a_2, a_3).\n* \\bar{a} + \\bar{b} = (a_1 + b_1, a_2 + b_2, a_3 + b_3)\n* k\\bar{a} = (ka_1, ka_2, ka_3)";
    const { container: c1 } = render(<FormattedMathText text={text1} as="div" />);
    const kNodes1 = c1.querySelectorAll(".katex");
    expect(kNodes1.length).toBeGreaterThanOrEqual(3);
    const html1 = c1.querySelector(".katex-html");
    expect(html1).toBeInTheDocument();
    expect(html1?.textContent).not.toContain("\\bar{a}");
    expect(html1?.textContent).not.toContain("\\mathbb{R}");

    const text2 =
      "Luas jajaran-genjang: \\|\\bar{u} \\times \\bar{v}\\| dan luas segitiga: \\frac{1}{2} \\|\\bar{u} \\times \\bar{v}\\|.";
    const { container: c2 } = render(<FormattedMathText text={text2} as="div" />);
    const kNodes2 = c2.querySelectorAll(".katex");
    expect(kNodes2.length).toBeGreaterThanOrEqual(2);
    const html2 = c2.querySelector(".katex-html");
    expect(html2).toBeInTheDocument();
    expect(html2?.textContent).not.toContain("\\frac{1}{2}");
    expect(html2?.textContent).not.toContain("\\times");
  });

  it("renders complex nested set and inequality equations via KaTeX", () => {
    const text =
      "Kejadian E_8 = \\{(x, y) \\in S, (x - L / 2)^2 + (y - W / 2)^2 \\le \\varepsilon^2\\}.";
    const { container } = render(<FormattedMathText text={text} as="div" />);
    const katexNodes = container.querySelectorAll(".katex");
    expect(katexNodes.length).toBeGreaterThanOrEqual(1);
    const html = container.querySelector(".katex-html");
    expect(html).toBeInTheDocument();
    expect(html?.textContent).not.toContain("\\le");
    expect(html?.textContent).not.toContain("\\varepsilon");
  });

  it("renders markdown tables with embedded math formulas cleanly", () => {
    const tableText =
      "| Simbol | Makna |\n| --- | --- |\n| $f'(x)$ | Turunan pertama |\n| $\\int f(x) dx$ | Integral tak tentu |";
    const { container } = render(<FormattedMathText text={tableText} as="div" />);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelectorAll("th").length).toBe(2);
    expect(container.querySelectorAll("td").length).toBe(4);
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
  });

  it("renders code fences with latex as interactive MathEquationView", () => {
    const codeText = "```latex\n\\int_{0}^{\\pi} \\sin(x) dx = 2\n```";
    const { container } = render(<FormattedMathText text={codeText} as="div" />);
    expect(container.querySelector(".katex-display")).toBeInTheDocument();
    expect(screen.getByText("Lihat kode LaTeX asli")).toBeInTheDocument();
  });

  it("renders complex nested fractions and unescaped exponent/subscript expressions cleanly", () => {
    // 1. Nested fraction
    const fracText = "Pecahan bertingkat: \\frac{1}{\\frac{1}{R_1} + \\frac{1}{R_2}}";
    const { container: c1 } = render(<FormattedMathText text={fracText} as="div" />);
    expect(c1.querySelector(".katex")).toBeInTheDocument();
    expect(c1.querySelector(".katex-html")?.textContent).not.toContain("\\frac");

    // 2. Exponent followed by variable
    const expText = "Nilai ekspresi x^2y + a^3b^2 dan m^n p";
    const { container: c2 } = render(<FormattedMathText text={expText} as="div" />);
    expect(c2.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(1);

    // 3. Subscript with arithmetic inside curly braces
    const subText = "Elemen x_{i+1} dan kombinasi x_{i+1}^2";
    const { container: c3 } = render(<FormattedMathText text={subText} as="div" />);
    expect(c3.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(c3.querySelector(".katex-html")?.textContent).not.toContain("x_{i+1}");
  });

  it("renders complex table key verification expressions without nested delimiter errors", () => {
    // V-A01: Complex 3-layer fraction
    const vA01 = "F(x) = \\frac{\\frac{x+1}{x-1} - \\frac{x-1}{x+1}}{\\frac{x+1}{x-1} + \\frac{x-1}{x+1}}";
    const { container: c1 } = render(<FormattedMathText text={vA01} as="span" />);
    expect(c1.querySelector(".katex")).toBeInTheDocument();
    expect(c1.querySelector(".katex-error")).toBeNull();

    // V-A02: Powers, subscripts, and inequality comparisons
    const vA02 = "x^2 y \\ne x^{2y}, x_{i+1}^2 \\ne x_{(i+1)^2}";
    const { container: c2 } = render(<FormattedMathText text={vA02} as="span" />);
    expect(c2.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(1);
    expect(c2.querySelector(".katex-error")).toBeNull();

    // V-A03: Standalone set and logic symbols separated by commas
    const vA03 = "\\cap, \\cup, \\in, \\subset, \\setminus, \\emptyset, \\forall, \\exists";
    const { container: c3 } = render(<FormattedMathText text={vA03} as="span" />);
    expect(c3.querySelectorAll(".katex").length).toBe(8);
    expect(c3.querySelector(".katex-error")).toBeNull();
  });

  it("renders Category D (Piecewise, Combinatorics, Math Text) OCR expressions cleanly", () => {
    // Academic paragraph with finite set, dots, and binomial coefficients
    const paragraph =
      "Untuk setiap k \\in \\{0, 1, \\dots, n\\}, banyaknya cara memilih k objek dari n objek dinyatakan oleh \\binom{n}{k} = \\frac{n!}{k!(n-k)!} yang memenuhi sifat simetri \\binom{n}{k} = \\binom{n}{n-k}.";
    const { container: cPara } = render(<FormattedMathText text={paragraph} as="div" />);
    expect(cPara.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(3);
    expect(cPara.querySelector(".katex-error")).toBeNull();
    // Visual HTML text should contain rendered mathematical symbols, not unrendered backslashes
    cPara.querySelectorAll(".katex-html").forEach((el) => {
      expect(el.textContent).not.toContain("\\in");
      expect(el.textContent).not.toContain("\\dots");
      expect(el.textContent).not.toContain("\\binom");
    });

    // V-D01: Standalone math text operator \text{sgn}(x)
    const vD01 = "S(x) (4 kondisi), \\text{sgn}(x) (3 kondisi)";
    const { container: cD01 } = render(<FormattedMathText text={vD01} as="span" />);
    expect(cD01.querySelector(".katex")).toBeInTheDocument();
    expect(cD01.querySelector(".katex-error")).toBeNull();
    cD01.querySelectorAll(".katex-html").forEach((el) => {
      expect(el.textContent).not.toContain("\\text");
    });

    // V-D02: Standalone and chained binomial coefficients
    const vD02 = "\\binom{n}{k}, \\binom{m+n}{r}";
    const { container: cD02 } = render(<FormattedMathText text={vD02} as="span" />);
    expect(cD02.querySelectorAll(".katex").length).toBe(2);
    expect(cD02.querySelector(".katex-error")).toBeNull();
    cD02.querySelectorAll(".katex-html").forEach((el) => {
      expect(el.textContent).not.toContain("\\binom");
    });

    // V-D03: Math text environment and Greek function call
    const vD03 = "Blok \\text{align*} & \\Psi_n (x) gabungan";
    const { container: cD03 } = render(<FormattedMathText text={vD03} as="span" />);
    expect(cD03.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(1);
    expect(cD03.querySelector(".katex-error")).toBeNull();
    cD03.querySelectorAll(".katex-html").forEach((el) => {
      expect(el.textContent).not.toContain("\\text");
      expect(el.textContent).not.toContain("\\Psi");
    });
  });
});
