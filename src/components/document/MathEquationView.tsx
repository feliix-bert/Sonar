"use client";

import React, { useMemo, useState } from "react";
import katex from "katex";
import { cn } from "cn";
import { narrateLatexEquation } from "@/features/math-ocr/math-narration";

export interface MathEquationViewProps {
  latex?: string;
  contentText: string;
  mathMl?: string;
  spokenText?: string;
  className?: string;
  compact?: boolean;
}

/**
 * MathEquationView
 * Accessible equation display card with KaTeX rendering, audio narration label,
 * and expandable raw LaTeX code viewer.
 */
export function MathEquationView({
  latex,
  contentText,
  mathMl,
  spokenText,
  className,
  compact = false,
}: MathEquationViewProps) {
  const [showCode, setShowCode] = useState(false);

  const formula = useMemo(() => {
    let raw = (latex || contentText || "").trim();
    if (
      (raw.startsWith("\\[") && raw.endsWith("\\]")) ||
      (raw.startsWith("\\(") && raw.endsWith("\\)"))
    ) {
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith("$$") && raw.endsWith("$$")) {
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith("$") && raw.endsWith("$") && raw.length > 2) {
      raw = raw.slice(1, -1).trim();
    }
    return raw;
  }, [latex, contentText]);

  const katexHtml = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch {
      return null;
    }
  }, [formula]);

  const effectiveSpokenText = useMemo(() => {
    const isStaleOrBuggy =
      !spokenText ||
      spokenText.includes("Peringatan: ditemukan konstruksi LaTeX kompleks") ||
      spokenText.includes("begin ") ||
      spokenText.includes("end ") ||
      (/\b[a-z]+v\b/i.test(spokenText) && spokenText.includes("indeks"));

    if (isStaleOrBuggy && formula) {
      try {
        const fresh = narrateLatexEquation(formula);
        if (fresh && fresh.narrationId) {
          return fresh.narrationId;
        }
      } catch {
        // Fallback to existing spokenText
      }
    }
    return spokenText;
  }, [spokenText, formula]);

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      <div
        tabIndex={0}
        role="region"
        aria-label={
          effectiveSpokenText ? `Rumus: ${effectiveSpokenText}` : `Rumus matematika: ${formula}`
        }
        className={cn(
          "overflow-x-auto rounded-2xl border border-primary/25 bg-card shadow-xs transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary",
          compact ? "p-3 sm:p-4" : "p-5"
        )}
      >
        {katexHtml ? (
          <div
            className={cn(
              "flex items-center justify-center text-center text-foreground font-sans",
              compact ? "min-h-9 text-base" : "min-h-12 text-lg"
            )}
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        ) : mathMl ? (
          <div
            className={cn(
              "flex items-center justify-center text-center text-foreground font-sans",
              compact ? "min-h-9 text-base" : "min-h-12 text-lg"
            )}
            dangerouslySetInnerHTML={{ __html: mathMl }}
          />
        ) : (
          <p className="font-mono text-center text-sm text-foreground">
            {formula}
          </p>
        )}
      </div>

      {effectiveSpokenText && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-ui">
          <span className="font-semibold text-foreground">Narasi suara:</span>
          <span>{effectiveSpokenText}</span>
        </p>
      )}

      <div className="font-ui">
        <button
          type="button"
          onClick={() => setShowCode((prev) => !prev)}
          className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {showCode ? "Sembunyikan kode LaTeX" : "Lihat kode LaTeX asli"}
        </button>

        {showCode && (
          <pre className="mt-2 w-full overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-xs text-foreground">
            <code>{formula}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
