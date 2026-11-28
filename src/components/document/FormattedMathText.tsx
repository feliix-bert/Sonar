"use client";

import React, { useMemo } from "react";
import {
  renderInlineMathAndMarkdown,
  renderMarkdownBlocks,
  normalizeMarkdownText,
  isPureCurrency,
} from "@/lib/math/math-markdown-parser";

export {
  renderInlineMathAndMarkdown,
  renderMarkdownBlocks,
  normalizeMarkdownText,
  isPureCurrency,
};
export {
  MathEquationView,
  type MathEquationViewProps,
} from "@/components/document/MathEquationView";

export interface FormattedMathTextProps {
  text: string;
  className?: string;
  as?: "p" | "span" | "div";
}

/**
 * FormattedMathText
 * Renders LaTeX formulas via KaTeX alongside markdown blocks (headings, rules, lists, paragraphs).
 */
export function FormattedMathText({
  text,
  className,
  as: Component = "p",
}: FormattedMathTextProps) {
  const hasBlocks = useMemo(() => {
    return (
      Component === "div" ||
      (Component !== "span" &&
        (text.includes("\n") ||
          text.includes("###") ||
          text.includes("---") ||
          text.includes("$$") ||
          text.includes("\\[") ||
          text.includes("```") ||
          text.includes("|") ||
          text.includes("\\begin{")))
    );
  }, [Component, text]);

  const renderedElements = useMemo(() => {
    if (!text) return null;

    if (Component !== "span" && hasBlocks) {
      return renderMarkdownBlocks(text);
    }

    return renderInlineMathAndMarkdown(text, "root");
  }, [text, Component, hasBlocks]);

  // If text contains block elements (headings, hr, ul, p), always use a div to preserve valid HTML
  const WrapperTag = hasBlocks ? "div" : Component;

  return <WrapperTag className={className}>{renderedElements}</WrapperTag>;
}
