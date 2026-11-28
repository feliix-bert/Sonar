const ALLOWED_HTML_TAGS = new Set([
  "article",
  "section",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "table",
  "caption",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "figure",
  "figcaption",
  "span",
  "br",
  "sub",
  "sup",
  "math",
  "semantics",
  "mrow",
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "mfrac",
  "msup",
  "msub",
  "msubsup",
  "msqrt",
  "mroot",
  "mtable",
  "mtr",
  "mtd",
  "munder",
  "mover",
  "munderover",
  "annotation",
]);

const ALLOWED_ATTRS = new Set([
  "scope",
  "colspan",
  "rowspan",
  "lang",
  "dir",
  "display",
  "xmlns",
  "encoding",
  "mathvariant",
  "aria-label",
  "role",
]);

/**
 * Sanitizes document HTML and MathML derived from PDF extraction or AI responses
 * to prevent XSS while preserving screen-reader semantics and MathML structure.
 * Zero external dependencies: 100% safe inside Serverless (AWS Lambda) and browser runtimes.
 */
export function sanitizeDocumentHtml(unsafeHtml: string): string {
  if (!unsafeHtml) return "";

  // 1. Remove dangerous blocks completely (tags + content)
  let clean = unsafeHtml.replace(
    /<\s*(?:script|style|iframe|object|embed|applet|form)[\s\S]*?(?:<\s*\/\s*(?:script|style|iframe|object|embed|applet|form)\s*>|\/?>)/gi,
    ""
  );

  // 2. Remove comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Remove inline event handlers (on*), javascript: URIs, data: URIs in attrs, and style
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  clean = clean.replace(
    /\s+(?:href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
    ""
  );
  clean = clean.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 4. Filter allowed tags and attributes
  clean = clean.replace(
    /<\/?([a-zA-Z0-9\-_]+)((?:\s+[a-zA-Z0-9\-_]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g,
    (match, tagName: string, attrs: string, selfClosing: string) => {
      const lowerTag = tagName.toLowerCase();
      if (!ALLOWED_HTML_TAGS.has(lowerTag)) {
        return ""; // Strip disallowed tags
      }
      const isClosing = match.startsWith("</");
      if (isClosing) {
        return `</${lowerTag}>`;
      }

      // Filter attributes
      let cleanAttrs = "";
      if (attrs) {
        const attrRegex = /([a-zA-Z0-9\-_]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
        let attrMatch: RegExpExecArray | null;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          const attrName = attrMatch[1].toLowerCase();
          if (ALLOWED_ATTRS.has(attrName)) {
            const val = attrMatch[2] ? `=${attrMatch[2]}` : "";
            cleanAttrs += ` ${attrName}${val}`;
          }
        }
      }
      return `<${lowerTag}${cleanAttrs}${selfClosing ? " />" : ">"}`;
    }
  );

  return clean.trim();
}

/**
 * Strips instruction-like control markers from untrusted document excerpts
 * before embedding them inside RAG system contexts.
 */
export function sanitizeRagSourceText(raw: string): string {
  return raw
    .replace(/<\/?untrusted_document_source[^>]*>/gi, "")
    .replace(/<\/?system[^>]*>/gi, "")
    .replace(/\u0000/g, "")
    .trim();
}
