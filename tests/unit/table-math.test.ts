import { describe, it, expect } from "vitest";
import { renderInlineMathAndMarkdown, autoWrapUnescapedMath } from "@/lib/math/math-markdown-parser";
import React from "react";
import ReactDOMServer from "react-dom/server";

describe("Table cell math variations", () => {
  const variations = [
    // Double backslash (e.g. from JSON string escaping or raw OCR output)
    "A \\\\cup B",
    "A \\\\cap B",
    "\\\\bar{A} = S \\\\setminus A",
    "\\\\emptyset",
    // With partial dollar signs
    "$A$ \\cup $B$",
    "$\\bar{A}$ = S \\setminus A",
    "$(A \\setminus B)$ \\cup $(B \\setminus A)$",
    // With escaped backslashes and partial dollars
    "$\\bar{A}$ = S \\\\setminus A",
    "$(A \\\\setminus B)$ \\\\cup $(B \\\\setminus A)$",
  ];

  it("evaluates each variation and ensures it renders via KaTeX", () => {
    for (const v of variations) {
      const wrapped = autoWrapUnescapedMath(v);
      const nodes = renderInlineMathAndMarkdown(v, "test");
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement("div", null, nodes));
      expect(html).toContain("katex");
      expect(html).not.toMatch(/<span>\s*\\cup\s*<\/span>/);
      expect(html).not.toMatch(/<span>\s*\\cap\s*<\/span>/);
      expect(html).not.toMatch(/<span>\s*\\setminus\s*<\/span>/);
      expect(html).not.toMatch(/<span>\s*\\emptyset\s*<\/span>/);
    }
  });
});
