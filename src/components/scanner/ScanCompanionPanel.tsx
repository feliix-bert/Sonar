"use client";

import React, { useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Bot,
  Check,
  Copy,
  Hash,
  List,
  Loader2,
  Search,
  Send,
  Sparkles,
  Table as TableIcon,
  Volume2,
  X,
  Sigma,
  ImageIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedMathText } from "@/components/document/FormattedMathText";
import { useLiveAnnouncer } from "@/components/accessibility/LiveAnnouncer";
import { narrateMixedText } from "@/features/math-ocr/math-narration";
import type { ExtractedBlockOutput } from "@/features/ocr/ocr-provider";

export interface ScanCompanionPanelProps {
  documentId: string;
  documentTitle: string;
  blocks: ExtractedBlockOutput[];
  language: "id" | "en";
  activeTab: "outline" | "ai";
  onTabChange: (tab: "outline" | "ai") => void;
  onClose: () => void;
  activeBlockIndex: number | null;
  onJumpToBlock: (index: number) => void;
  hideHeaderInSheet?: boolean;
}

function extractMessageText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function ScanCompanionPanel({
  documentId,
  documentTitle,
  blocks,
  language,
  activeTab,
  onTabChange,
  onClose,
  activeBlockIndex,
  onJumpToBlock,
  hideHeaderInSheet = false,
}: ScanCompanionPanelProps) {
  const { announce } = useLiveAnnouncer();

  // Outline Tab State
  const [outlineSubTab, setOutlineSubTab] = useState<"outline" | "search">("outline");
  const [searchQuery, setSearchQuery] = useState("");

  // AI Chat State
  const [chatInput, setChatInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Setup Chat Transport connected to Grounded RAG
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: () => ({
          documentId,
          documentTitle,
          language,
          blocks: blocks.map((b, idx) => ({
            id: `blk-${idx + 1}`,
            pageNumber: 1,
            readingOrder: idx + 1,
            blockType: b.blockType,
            sectionHeading: b.blockType === "heading" ? b.contentText : null,
            contentText: b.contentText,
            spokenText: b.spokenText,
          })),
        }),
      }),
    [documentId, documentTitle, language, blocks]
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: `scan-companion-chat-${documentId}`,
    transport: chatTransport,
    onFinish: () => {
      announce("Asisten selesai memberikan jawaban.", "polite");
      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSendAi = (textToSend?: string) => {
    const q = (textToSend || chatInput).trim();
    if (!q || isStreaming) return;
    clearError();
    setChatInput("");
    announce(`Mengirim pertanyaan: ${q}`, "polite");
    sendMessage({ text: q });
    setTimeout(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const handleCopyText = async (msgId: string, text: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    announce("Teks jawaban disalin.", "polite");
    setTimeout(() => setCopiedId(null), 1600);
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const spoken = narrateMixedText(text, language);
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.lang = language === "id" ? "id-ID" : "en-US";
    window.speechSynthesis.speak(utter);
  };

  // Outline Items
  const outlineItems = useMemo(() => {
    return blocks
      .map((block, idx) => ({ block, originalIndex: idx }))
      .filter(({ block }) =>
        ["heading", "equation", "table", "figure"].includes(block.blockType)
      );
  }, [blocks]);

  // Search Filtered Items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return blocks
      .map((block, idx) => ({ block, originalIndex: idx }))
      .filter(({ block }) => block.contentText.toLowerCase().includes(q));
  }, [blocks, searchQuery]);

  const samplePrompts = useMemo(() => {
    if (language === "en") {
      return [
        "Explain the key concepts of this material in simple terms.",
        "Walk me through the mathematical equations step by step.",
        "Create 3 practice quiz questions based on this text.",
      ];
    }
    return [
      "Jelaskan konsep utama materi ini dengan bahasa yang mudah dipahami.",
      "Jelaskan rumus matematika dan langkah-langkahnya dari teks ini.",
      "Buatkan 3 pertanyaan latihan beserta jawabannya dari materi ini.",
    ];
  }, [language]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col font-sans">
      {/* Top Companion Header with Tabs and Close Button */}
      {!hideHeaderInSheet && (
        <div className="flex items-center justify-between border-b border-border p-3 font-ui">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTabChange("outline")}
              className={cn(
                "min-h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                activeTab === "outline"
                  ? "bg-brand-mint text-brand-ink"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Daftar Isi
            </button>
            <button
              type="button"
              onClick={() => onTabChange("ai")}
              className={cn(
                "min-h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                activeTab === "ai"
                  ? "bg-tint-blue text-brand-ink"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tanya AI
            </button>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Tutup panel samping"
            onClick={onClose}
            className="size-9 rounded-full"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Switcher if inside Mobile Sheet */}
      {hideHeaderInSheet && (
        <div className="flex items-center justify-center border-b border-border p-2.5 font-ui">
          <div className="flex w-full max-w-xs items-center justify-center gap-1.5 rounded-full bg-surface-subtle p-1">
            <button
              type="button"
              onClick={() => onTabChange("outline")}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 min-h-8 rounded-full text-xs font-semibold transition-colors",
                activeTab === "outline"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Daftar Isi</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange("ai")}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 min-h-8 rounded-full text-xs font-semibold transition-colors",
                activeTab === "ai"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Tanya AI</span>
            </button>
          </div>
        </div>
      )}

      {/* BODY: OUTLINE (DAFTAR ISI) */}
      {activeTab === "outline" && (
        <div className="flex min-h-0 flex-1 flex-col font-ui">
          {/* Subtabs for Outline vs Search */}
          <div className="space-y-3 border-b border-border p-4">
            <div
              role="tablist"
              aria-label="Filter daftar isi"
              className="grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1 text-xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={outlineSubTab === "outline"}
                onClick={() => setOutlineSubTab("outline")}
                className={cn(
                  "min-h-9 rounded-lg font-semibold transition-colors",
                  outlineSubTab === "outline"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Isi
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={outlineSubTab === "search"}
                onClick={() => setOutlineSubTab("search")}
                className={cn(
                  "min-h-9 rounded-lg font-semibold transition-colors",
                  outlineSubTab === "search"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Cari
              </button>
            </div>

            {outlineSubTab === "search" && (
              <div>
                <label htmlFor="scan-search-input" className="sr-only">
                  Cari teks dalam materi
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="scan-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kata dalam materi…"
                    className="h-10 rounded-xl pl-9 font-sans text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* List of items */}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {outlineSubTab === "outline" ? (
              outlineItems.length === 0 ? (
                <p className="rounded-xl bg-surface-subtle p-4 font-sans text-sm text-muted-foreground">
                  Tidak ditemukan judul bab, rumus, atau tabel terpisah dalam materi ini.
                </p>
              ) : (
                <nav aria-label="Daftar isi materi dan elemen penting">
                  <ul className="space-y-1">
                    {outlineItems.map(({ block, originalIndex }) => {
                      const isActive = activeBlockIndex === originalIndex;
                      const isEquation = block.blockType === "equation";
                      const isTable = block.blockType === "table";
                      const isFigure = block.blockType === "figure";
                      const isHeading = block.blockType === "heading";
                      const isSubHeading =
                        isHeading && (/^#{2,}\s/.test(block.contentText) || block.contentText.startsWith("##"));

                      let prefix = "";
                      if (isEquation) prefix = "Rumus";
                      else if (isTable) prefix = "Tabel";
                      else if (isFigure) prefix = "Gambar";
                      else if (isHeading) prefix = "Bab";

                      const displayText =
                        block.contentText.replace(/^#+\s*/, "").slice(0, 80) || "Elemen materi";

                      return (
                        <li key={originalIndex}>
                          <button
                            type="button"
                            onClick={() => onJumpToBlock(originalIndex)}
                            aria-current={isActive ? "true" : undefined}
                            className={cn(
                              "flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                              isSubHeading && "pl-6",
                              isActive
                                ? "bg-primary font-semibold text-primary-foreground"
                                : "text-foreground/85 hover:bg-brand-mint hover:text-brand-ink dark:hover:bg-muted dark:hover:text-foreground"
                            )}
                          >
                            <span className="truncate">
                              {prefix ? `${prefix}: ` : ""}
                              {displayText}
                            </span>
                            <span className="shrink-0 text-xs opacity-80">
                              Blok {originalIndex + 1}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )
            ) : filteredItems.length === 0 ? (
              <p className="rounded-xl bg-surface-subtle p-4 font-sans text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "Tidak ada bagian yang cocok dengan kata kunci."
                  : "Ketik kata kunci untuk mencari di seluruh bagian materi."}
              </p>
            ) : (
              <ul className="space-y-1">
                {filteredItems.map(({ block, originalIndex }) => {
                  const isActive = activeBlockIndex === originalIndex;
                  return (
                    <li key={originalIndex}>
                      <button
                        type="button"
                        onClick={() => onJumpToBlock(originalIndex)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "text-foreground/85 hover:bg-brand-mint hover:text-brand-ink dark:hover:bg-muted dark:hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{block.contentText.slice(0, 85)}</span>
                        <span className="shrink-0 text-xs opacity-80">Blok {originalIndex + 1}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* BODY: TANYA AI */}
      {activeTab === "ai" && (
        <div className="flex min-h-0 flex-1 flex-col font-sans">
          {/* Messages list */}
          <div
            role="log"
            aria-live="polite"
            aria-label="Percakapan tanya jawab materi"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm"
          >
            {messages.length === 0 ? (
              <div className="space-y-2 rounded-2xl bg-surface-subtle p-4 text-sm text-muted-foreground font-sans">
                <p className="font-medium text-foreground">
                  Tanyakan ringkasan, rumus, tabel, atau konsep dari materi ini.
                </p>
                <p className="text-xs">
                  Jawaban disusun mengacu pada isi materi yang baru saja dipindai.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const text = extractMessageText(m);
                const isUser = m.role === "user";

                return (
                  <div key={m.id} className={cn("space-y-2", isUser ? "flex justify-end" : "")}>
                    {isUser ? (
                      <div className="max-w-[85%] rounded-2xl bg-tint-blue px-4 py-2.5 text-sm font-medium text-brand-ink">
                        <FormattedMathText text={text} as="div" className="text-sm font-medium text-brand-ink" />
                      </div>
                    ) : (
                      <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <FormattedMathText text={text} as="div" className="leading-relaxed text-foreground text-sm" />

                        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 font-ui text-xs">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Salin jawaban"
                            onClick={() => void handleCopyText(m.id, text)}
                            className="h-7 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === m.id ? (
                              <Check className="size-3.5 text-primary" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3.5" aria-hidden="true" />
                            )}
                            <span>Salin</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Dengarkan jawaban"
                            onClick={() => speakText(text)}
                            className="h-7 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Volume2 className="size-3.5" aria-hidden="true" />
                            <span>Dengarkan</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isStreaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-ui">
                <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                <span>Menyusun jawaban dari materi…</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
              >
                Gagal menghubungi asisten AI: {error.message}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Suggested Prompts & Bottom Input Bar */}
          <div className="space-y-2.5 border-t border-border p-3 font-ui">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => handleSendAi(chip)}
                    className="min-h-7 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-brand-mint hover:text-brand-ink disabled:opacity-50 text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAi(chatInput);
              }}
              className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 pl-3 shadow-2xs"
            >
              <label htmlFor="scan-companion-input" className="sr-only">
                Tanyakan isi materi ini
              </label>
              <input
                id="scan-companion-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  language === "id"
                    ? "Tanyakan konsep atau rumus dari materi ini…"
                    : "Ask any question about this material…"
                }
                className="min-w-0 flex-1 bg-transparent font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim() || isStreaming}
                aria-label="Kirim pertanyaan"
                className="size-9 shrink-0 rounded-full"
              >
                <Send className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
