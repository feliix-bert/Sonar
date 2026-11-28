"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  ListTree,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Search,
  Send,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewStatusChip } from "@/components/app/ReviewStatusChip";
import { EmptyState } from "@/components/app/EmptyState";
import { describeHttpFailure, readJsonSafely } from "@/lib/http/safe-json";
import { StructuredTable } from "@/components/app/StructuredTable";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import { useAudioReader } from "@/features/audio/use-audio-reader";
import { useLiveAnnouncer } from "@/components/accessibility/LiveAnnouncer";
import { sanitizeDocumentHtml } from "@/lib/accessibility/sanitize";
import { parseTableData, narrateTable } from "@/lib/accessibility/table-narration";
import {
  FormattedMathText,
  MathEquationView,
} from "@/components/document/FormattedMathText";
import { narrateMixedText } from "@/features/math-ocr/math-narration";
import { useDocumentBookmarks } from "@/components/document/useDocumentBookmarks";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  answerFromDocumentBlocks,
  type LocalQaCitation,
} from "@/components/document/grounded-local-qa";
import type {
  DocumentBlockRow,
  DocumentEquationRow,
  DocumentFigureRow,
  DocumentRow,
  DocumentTableRow,
} from "@/lib/data/workspace";
import type { ReviewStatus } from "@/types/database";

export interface RelatedDocumentLink {
  id: string;
  title: string;
  courseCode?: string;
  reviewStatus: ReviewStatus;
}

export interface ReaderStudioProps {
  document: DocumentRow;
  courseLabel?: string;
  blocks: DocumentBlockRow[];
  tables: DocumentTableRow[];
  equations: DocumentEquationRow[];
  figures: DocumentFigureRow[];
  signedPdfUrl?: string | null;
  aiEnabled?: boolean;
  relatedDocuments?: RelatedDocumentLink[];
  versionNotice?: string | null;
}

const SUGGESTION_CHIPS = [
  "Ringkas materi ini",
  "Jelaskan rumus utama",
  "Sebutkan istilah penting",
  "Buat soal latihan",
];

function useIsXlDesktop(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => undefined;
      const media = window.matchMedia("(min-width: 1280px)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(min-width: 1280px)").matches
        : false,
    () => false
  );
}

function extractMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function blockKindLabel(type: DocumentBlockRow["block_type"]) {
  switch (type) {
    case "heading":
      return "Bab";
    case "equation":
      return "Rumus";
    case "table":
      return "Tabel";
    case "figure":
      return "Gambar";
    default:
      return "Paragraf";
  }
}

export function AccessibleReaderStudio({
  document,
  courseLabel,
  blocks,
  tables,
  equations,
  figures,
  signedPdfUrl,
  aiEnabled = false,
  relatedDocuments = [],
  versionNotice,
}: ReaderStudioProps) {
  // Starts closed so the reading paper immediately gets spacious, calm, full-focus width.
  const [activePanel, setActivePanel] = useState<"outline" | "ai" | null>(null);
  const [outlineTab, setOutlineTab] = useState<"outline" | "bookmarks" | "search">(
    "outline"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    blocks[0]?.id ?? null
  );
  const [chatInput, setChatInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localCitationsByMsgId, setLocalCitationsByMsgId] = useState<
    Record<string, LocalQaCitation[]>
  >({});
  const [aiStatusNotice, setAiStatusNotice] = useState<string | null>(null);
  const lastSubmittedQueryRef = useRef<string>("");

  const isXlDesktop = useIsXlDesktop();

  const language = useAccessibilityStore((s) => s.language);
  const setLanguage = useAccessibilityStore((s) => s.setLanguage);
  const narrationSpeed = useAccessibilityStore((s) => s.narrationSpeed);
  const { t, isEn } = useTranslation();
  const setNarrationSpeed = useAccessibilityStore((s) => s.setNarrationSpeed);
  const fontSizePx = useAccessibilityStore((s) => s.fontSizePx);
  const setFontSizePx = useAccessibilityStore((s) => s.setFontSizePx);
  const readingFont = useAccessibilityStore((s) => s.readingFont);
  const lineHeight = useAccessibilityStore((s) => s.lineHeight);

  const { announce } = useLiveAnnouncer();
  const { bookmarks, toggleBookmark } = useDocumentBookmarks(document.id);

  const [renderedBlocks, setRenderedBlocks] = useState<DocumentBlockRow[]>(blocks);
  const [isTranslatingDoc, setIsTranslatingDoc] = useState(false);
  const [blocksByLanguage, setBlocksByLanguage] = useState<
    Record<string, DocumentBlockRow[]>
  >({
    [document.language || "id"]: blocks,
  });

  const handleLanguageChange = async (targetLang: "id" | "en") => {
    setLanguage(targetLang);

    if (blocksByLanguage[targetLang] && blocksByLanguage[targetLang].length > 0) {
      setRenderedBlocks(blocksByLanguage[targetLang]);
      announce(
        `Bahasa dokumen dialihkan ke ${targetLang === "id" ? "Bahasa Indonesia" : "English"}.`,
        "polite"
      );
      return;
    }

    setIsTranslatingDoc(true);
    announce(
      `Menerjemahkan teks dokumen ke ${targetLang === "id" ? "Bahasa Indonesia" : "English"}...`,
      "polite"
    );

    try {
      const res = await fetch("/api/documents/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: renderedBlocks.map((b) => ({
            id: b.id,
            blockType: b.block_type,
            headingLevel: b.heading_level ?? undefined,
            contentText: b.content_text,
            latex: (b.metadata as Record<string, unknown> | null)?.latex as string | undefined,
            confidence: b.confidence_score,
          })),
          targetLanguage: targetLang,
        }),
      });

      const json = await readJsonSafely<{
        blocks?: Array<{ contentText: string; spokenText?: string }>;
        error?: string;
      }>(res);
      if (!res.ok || !json || json.error || !json.blocks) {
        throw new Error(json?.error || describeHttpFailure(res.status, "penerjemahan dokumen"));
      }

      const translated = json.blocks;

      const updatedRows: DocumentBlockRow[] = renderedBlocks.map((b, idx) => {
        const trans = translated[idx];
        if (!trans) return b;
        return {
          ...b,
          content_text: trans.contentText,
          spoken_text:
            trans.spokenText || narrateMixedText(trans.contentText, targetLang),
        };
      });

      setBlocksByLanguage((prev) => ({ ...prev, [targetLang]: updatedRows }));
      setRenderedBlocks(updatedRows);
      announce(
        `Teks dokumen berhasil diterjemahkan ke ${targetLang === "id" ? "Bahasa Indonesia" : "English"}.`,
        "polite"
      );
    } catch (err) {
      console.error("[AccessibleReaderStudio] Translation error:", err);
      announce("Gagal menerjemahkan dokumen ke bahasa terpilih.", "assertive");
    } finally {
      setIsTranslatingDoc(false);
    }
  };

  const equationsByBlock = useMemo(() => {
    const map = new Map<string, DocumentEquationRow>();
    for (const eq of equations) map.set(eq.block_id, eq);
    return map;
  }, [equations]);

  const tablesByBlock = useMemo(() => {
    const map = new Map<string, DocumentTableRow>();
    for (const tbl of tables) map.set(tbl.block_id, tbl);
    return map;
  }, [tables]);

  const figuresByBlock = useMemo(() => {
    const map = new Map<string, DocumentFigureRow>();
    for (const fig of figures) map.set(fig.block_id, fig);
    return map;
  }, [figures]);

  const audioBlocks = useMemo(
    () =>
      renderedBlocks.map((block) => {
        const eq = equationsByBlock.get(block.id);
        const tbl = tablesByBlock.get(block.id);
        const fig = figuresByBlock.get(block.id);

        let spoken = block.spoken_text;

        if (!spoken) {
          if (block.block_type === "equation" && eq) {
            spoken = language === "id" ? eq.narration_id : eq.narration_en;
          } else if (block.block_type === "table") {
            const meta = (typeof block.metadata === "object" && block.metadata !== null) ? (block.metadata as Record<string, unknown>) : undefined;
            const metaHeaders = Array.isArray(meta?.tableHeaders) ? (meta.tableHeaders as string[]) : undefined;
            const metaRows = Array.isArray(meta?.tableRows) ? (meta.tableRows as string[][]) : undefined;
            const effectiveTbl = tbl ?? (metaHeaders || metaRows ? {
              id: `tbl-${block.id}`,
              document_id: block.document_id,
              block_id: block.id,
              caption: block.content_text,
              headers: metaHeaders ?? [],
              rows: metaRows ?? [],
              column_count: metaHeaders?.length ?? metaRows?.[0]?.length ?? 0,
              row_count: metaRows?.length ?? 0,
              created_at: block.created_at,
            } : undefined);
            const tableData = parseTableData(
              block.content_html,
              effectiveTbl,
              block.content_text
            );
            spoken = narrateTable(tableData, language);
          } else if (block.block_type === "figure" && fig?.summary) {
            spoken = fig.summary;
          }
        }

        return {
          id: block.id,
          spokenText: narrateMixedText(
            spoken ?? block.content_text,
            language
          ),
          label: `${blockKindLabel(block.block_type)} halaman ${block.page_number}`,
        };
      }),
    [renderedBlocks, equationsByBlock, tablesByBlock, figuresByBlock, language]
  );

  const handleAudioBlockChange = useCallback((blockId: string) => {
    setActiveBlockId(blockId);
    const el = window.document.getElementById(`block-${blockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const audio = useAudioReader({
    blocks: audioBlocks,
    rate: narrationSpeed,
    language,
    onBlockChange: handleAudioBlockChange,
    onAnnounce: (msg) => announce(msg, "polite"),
  });

  const outlineItems = useMemo(
    () =>
      renderedBlocks.filter(
        (b) =>
          b.block_type === "heading" ||
          b.block_type === "equation" ||
          b.block_type === "table" ||
          b.block_type === "figure"
      ),
    [renderedBlocks]
  );

  const bookmarkedBlocks = useMemo(
    () => renderedBlocks.filter((b) => bookmarks.includes(b.id)),
    [renderedBlocks, bookmarks]
  );

  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return renderedBlocks;
    const q = searchQuery.toLowerCase();
    return renderedBlocks.filter((b) => b.content_text.toLowerCase().includes(q));
  }, [renderedBlocks, searchQuery]);

  const jumpToBlock = (blockId: string) => {
    setActiveBlockId(blockId);
    if (!isXlDesktop) {
      setActivePanel(null);
    }
    requestAnimationFrame(() => {
      const el = window.document.getElementById(`block-${blockId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.focus({ preventScroll: true });
      }
    });
    const target = renderedBlocks.find((b) => b.id === blockId);
    if (target) {
      announce(
        `Berpindah ke ${blockKindLabel(target.block_type)} halaman ${target.page_number}.`
      );
    }
  };

  const togglePanel = (panel: "outline" | "ai") => {
    const next = activePanel === panel ? null : panel;
    setActivePanel(next);
    announce(
      next === "outline"
        ? "Panel daftar isi dibuka."
        : next === "ai"
          ? "Panel Tanya AI dibuka."
          : "Panel samping ditutup.",
      "polite"
    );
  };

  const canUseRemoteAi = aiEnabled;

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: () => ({
          documentId: document.id,
          documentTitle: document.title,
          language,
          blocks: renderedBlocks.map((b) => ({
            id: b.id,
            pageNumber: b.page_number,
            readingOrder: b.reading_order,
            blockType: b.block_type,
            sectionHeading: b.section_id,
            contentText: b.content_text,
            spokenText: b.spoken_text,
          })),
        }),
      }),
    [document.id, document.title, language, renderedBlocks]
  );

  const onErrorFallbackRef = useRef<(query: string) => void>(() => undefined);

  const { messages, sendMessage, status, error, setMessages, clearError } =
    useChat({
      id: `reader-chat-${document.id}`,
      transport: chatTransport,
      onError: () => {
        if (lastSubmittedQueryRef.current) {
          onErrorFallbackRef.current(lastSubmittedQueryRef.current);
          lastSubmittedQueryRef.current = "";
        }
      },
    });

  const appendLocalAnswer = useCallback(
    (query: string, appendUserMessage: boolean) => {
      const answer = answerFromDocumentBlocks(query, {
        documentTitle: document.title,
        blocks: renderedBlocks,
        equations,
        tables,
        figures,
        language,
        activeBlockId,
      });

      const assistantMsgId = `local-asst-${Date.now()}`;
      setLocalCitationsByMsgId((prev) => ({
        ...prev,
        [assistantMsgId]: answer.citations,
      }));

      setMessages((prev) => {
        const extra: UIMessage[] = [];
        if (appendUserMessage) {
          extra.push({
            id: `local-user-${Date.now()}`,
            role: "user",
            parts: [{ type: "text", text: query }],
          });
        }
        extra.push({
          id: assistantMsgId,
          role: "assistant",
          parts: [{ type: "text", text: answer.text }],
        });
        return [...prev, ...extra];
      });
    },
    [
      activeBlockId,
      renderedBlocks,
      document.title,
      equations,
      figures,
      language,
      setMessages,
      tables,
    ]
  );

  useEffect(() => {
    onErrorFallbackRef.current = (query: string) => {
      setAiStatusNotice("Menampilkan jawaban ekstraktif dari teks dokumen ini.");
      appendLocalAnswer(query, false);
    };
  }, [appendLocalAnswer]);

  const isStreaming = status === "submitted" || status === "streaming";

  const submitAiQuestion = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query || isStreaming) return;
    setChatInput("");
    setAiStatusNotice(null);
    clearError();

    if (!canUseRemoteAi) {
      appendLocalAnswer(query, true);
      announce("Jawaban asisten dokumen tersedia.", "polite");
      return;
    }

    lastSubmittedQueryRef.current = query;
    try {
      await sendMessage({ text: query });
    } catch {
      setAiStatusNotice("Menampilkan jawaban ekstraktif dari teks dokumen ini.");
      appendLocalAnswer(query, false);
    } finally {
      lastSubmittedQueryRef.current = "";
    }
  };

  const handleCopyText = async (msgId: string, text: string) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    announce("Teks jawaban disalin.", "polite");
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const speakSingleText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(narrateMixedText(text, language));
    utteranceSetLang(utter, language, narrationSpeed);
    window.speechSynthesis.speak(utter);
  };

  const courseShort = courseLabel ? courseLabel.split(/[:—–]/)[0].trim() : "Mata Kuliah";

  const outlinePanelBody = (
    <div className="flex min-h-0 flex-1 flex-col font-ui">
      <div className="space-y-3 border-b border-border p-4">
        <div
          role="tablist"
          aria-label="Filter daftar isi"
          className="grid grid-cols-3 gap-1 rounded-xl bg-surface-subtle p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={outlineTab === "outline"}
            onClick={() => setOutlineTab("outline")}
            className={cn(
              "min-h-9 rounded-lg font-semibold transition-colors",
              outlineTab === "outline"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Isi
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={outlineTab === "bookmarks"}
            onClick={() => setOutlineTab("bookmarks")}
            className={cn(
              "min-h-9 rounded-lg font-semibold transition-colors",
              outlineTab === "bookmarks"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Penanda ({bookmarks.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={outlineTab === "search"}
            onClick={() => setOutlineTab("search")}
            className={cn(
              "min-h-9 rounded-lg font-semibold transition-colors",
              outlineTab === "search"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Cari
          </button>
        </div>

        {outlineTab === "search" ? (
          <div>
            <label htmlFor="reader-search-input" className="sr-only">
              Cari teks dalam dokumen
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="reader-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata dalam materi…"
                className="h-10 rounded-xl pl-9 font-sans text-sm"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {outlineTab === "bookmarks" ? (
          bookmarkedBlocks.length === 0 ? (
            <p className="rounded-xl bg-surface-subtle p-4 font-sans text-sm text-muted-foreground">
              Belum ada penanda. Pilih tombol Tandai pada bagian bacaan untuk menyimpannya di sini.
            </p>
          ) : (
            <ul className="space-y-1">
              {bookmarkedBlocks.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpToBlock(item.id)}
                    aria-current={activeBlockId === item.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      activeBlockId === item.id
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground/85 hover:bg-brand-mint hover:text-brand-ink"
                    )}
                  >
                    <span className="truncate">{item.content_text}</span>
                    <span className="shrink-0 text-xs opacity-80">
                      Hlm {item.page_number}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : outlineTab === "search" ? (
          filteredBlocks.length === 0 ? (
            <p className="rounded-xl bg-surface-subtle p-4 font-sans text-sm text-muted-foreground">
              Tidak ada bagian yang cocok dengan pencarian Anda.
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredBlocks.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpToBlock(item.id)}
                    aria-current={activeBlockId === item.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      activeBlockId === item.id
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground/85 hover:bg-brand-mint hover:text-brand-ink"
                    )}
                  >
                    <span className="truncate">{item.content_text}</span>
                    <span className="shrink-0 text-xs opacity-80">
                      Hlm {item.page_number}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <nav aria-label="Daftar isi bab dan elemen">
            <ul className="space-y-1">
              {outlineItems.map((item) => {
                const isActive = activeBlockId === item.id;
                const isSubHeading =
                  item.block_type === "heading" && (item.heading_level ?? 1) >= 2;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => jumpToBlock(item.id)}
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
                        {item.block_type !== "heading"
                          ? `${blockKindLabel(item.block_type)}: `
                          : ""}
                        {item.content_text}
                      </span>
                      <span className="shrink-0 text-xs opacity-80">
                        {item.page_number}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {relatedDocuments.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="px-2 text-xs font-semibold text-muted-foreground">
              Materi lain di kelas ini
            </p>
            <ul className="space-y-1">
              {relatedDocuments.map((rel) => (
                <li key={rel.id}>
                  <Link
                    href={`/reader/${rel.id}`}
                    className="block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-brand-mint hover:text-brand-ink dark:hover:bg-muted"
                  >
                    <p className="truncate font-medium text-foreground">{rel.title}</p>
                    <div className="mt-1">
                      <ReviewStatusChip status={rel.reviewStatus} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );

  const aiPanelBody = (
    <div className="flex min-h-0 flex-1 flex-col font-sans">
      <div
        role="log"
        aria-live="polite"
        aria-label="Percakapan tanya jawab dokumen"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm"
      >
        {messages.length === 0 ? (
          <div className="space-y-2 rounded-2xl bg-surface-subtle p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Tanyakan ringkasan, rumus, tabel, atau konsep dari dokumen ini.
            </p>
            <p className="text-xs">
              Jawaban disusun mengacu pada isi materi yang sedang Anda baca.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const text = extractMessageText(m);
            const citations = localCitationsByMsgId[m.id] ?? [];
            const isUser = m.role === "user";

            return (
              <div
                key={m.id}
                className={cn("space-y-2", isUser ? "flex justify-end" : "")}
              >
                {isUser ? (
                  <div className="max-w-[85%] rounded-2xl bg-tint-blue px-4 py-2.5 text-sm font-medium text-brand-ink">
                    <FormattedMathText text={text} as="div" className="text-sm font-medium text-brand-ink" />
                  </div>
                ) : (
                  <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-xs">
                    <FormattedMathText
                      text={text}
                      as="div"
                      className="leading-relaxed text-foreground text-sm"
                    />
                    {citations.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 font-ui pt-1">
                        {citations.map((cit) => (
                          <button
                            key={`${m.id}-${cit.blockId}`}
                            type="button"
                            onClick={() => jumpToBlock(cit.blockId)}
                            className="min-h-7 rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-aqua/40"
                          >
                            {cit.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
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
                        onClick={() => speakSingleText(text)}
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

        {isStreaming ? (
          <p className="font-ui text-xs text-muted-foreground">
            Menyusun jawaban dari isi dokumen…
          </p>
        ) : null}

        {aiStatusNotice ? (
          <p className="rounded-xl bg-tint-gold px-3 py-2 text-xs text-brand-ink">
            {aiStatusNotice}
          </p>
        ) : null}

        {error && !aiStatusNotice ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            Gagal menghubungi asisten AI: {error.message}
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5 border-t border-border p-3 font-ui">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isStreaming}
              onClick={() => void submitAiQuestion(chip)}
              className="min-h-8 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-brand-mint hover:text-brand-ink disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitAiQuestion(chatInput);
          }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 pl-3"
        >
          <label htmlFor="reader-ai-input" className="sr-only">
            Tanyakan isi dokumen ini
          </label>
          <input
            id="reader-ai-input"
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Tanyakan isi dokumen ini…"
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
  );

  return (
    <div
      className={cn(
        "w-full space-y-6 font-sans",
        activePanel && isXlDesktop ? "max-w-7xl" : "max-w-5xl"
      )}
    >
      {/* Clean Document Header */}
      <header className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-3 font-ui">
          <Link
            href={`/courses/${document.course_id}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-semibold text-secondary-foreground hover:underline"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span>{t("backTo")} {courseShort}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <ReviewStatusChip status={document.review_status} />
            <span className="text-xs text-muted-foreground">
              {isEn ? `${document.page_count} pages` : `${document.page_count} halaman`}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="min-w-0 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {document.title}
          </h1>

          <div className="flex flex-wrap items-center justify-start gap-2 font-ui">
            <div
              role="group"
              aria-label={isEn ? "Reading font size" : "Ukuran huruf bacaan"}
              className="inline-flex items-center rounded-full border border-border bg-background p-0.5"
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = Math.max(14, fontSizePx - 1);
                  setFontSizePx(next);
                  announce(isEn ? `Font size ${next} pixels.` : `Ukuran huruf ${next} piksel.`);
                }}
                className="h-9 rounded-full px-3 text-xs font-semibold"
              >
                <span aria-hidden="true">A−</span>
                <span className="sr-only">{isEn ? "Decrease font size" : "Perkecil ukuran teks"}</span>
              </Button>
              <span className="px-1 text-xs tabular-nums text-muted-foreground">
                {fontSizePx}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = Math.min(28, fontSizePx + 1);
                  setFontSizePx(next);
                  announce(isEn ? `Font size ${next} pixels.` : `Ukuran huruf ${next} piksel.`);
                }}
                className="h-9 rounded-full px-3 text-xs font-semibold"
              >
                <span aria-hidden="true">A+</span>
                <span className="sr-only">{isEn ? "Increase font size" : "Perbesar ukuran teks"}</span>
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              variant={activePanel === "outline" ? "default" : "outline"}
              aria-pressed={activePanel === "outline"}
              onClick={() => togglePanel("outline")}
              className="min-h-10 rounded-full px-4 text-xs font-semibold"
            >
              <ListTree className="size-4" aria-hidden="true" />
              <span>{t("outline")}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant={activePanel === "ai" ? "default" : "outline"}
              aria-pressed={activePanel === "ai"}
              onClick={() => togglePanel("ai")}
              className="min-h-10 rounded-full px-4 text-xs font-semibold"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              <span>{t("askAi")}</span>
            </Button>

            {signedPdfUrl ? (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="min-h-10 rounded-full px-4 text-xs font-semibold"
              >
                <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer">
                  <span>{t("readerOriginalPdf")}</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {versionNotice ? (
        <div
          role="status"
          className="rounded-2xl border border-brand-gold bg-tint-gold p-4 text-sm text-brand-ink"
        >
          {versionNotice}
        </div>
      ) : null}

      {/* Main Spacious Reading Area + Optional Single Docked Companion on xl+ */}
      <div
        className={cn(
          "items-start gap-6",
          activePanel && isXlDesktop ? "xl:grid xl:grid-cols-12" : "block"
        )}
      >
        <div
          className={cn(
            "min-w-0 space-y-6",
            activePanel && isXlDesktop ? "xl:col-span-8" : "w-full"
          )}
        >
          {filteredBlocks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t("noMatchingSections")}
              description={t("clearSearchHint")}
            />
          ) : (
            <article
              aria-label={document.title}
              className="w-full rounded-2xl border border-border bg-card px-3 py-5 shadow-card sm:px-4 sm:py-6"
            >
              <div
                className="sonar-reader-prose w-full space-y-6"
                style={
                  {
                    fontFamily:
                      readingFont === "atkinson"
                        ? "var(--font-atkinson-hyperlegible), sans-serif"
                        : "var(--font-poppins), sans-serif",
                    fontSize: `${fontSizePx}px`,
                    lineHeight: lineHeight,
                    "--reader-font-size": `${fontSizePx}px`,
                    "--reader-line-height": `${lineHeight}`,
                  } as React.CSSProperties
                }
              >
                {filteredBlocks.map((block, index) => {
                  const isCurrent = activeBlockId === block.id;
                  const isBookmarked = bookmarks.includes(block.id);
                  const eqData = equationsByBlock.get(block.id);
                  const tblData = tablesByBlock.get(block.id);
                  const figData = figuresByBlock.get(block.id);
                  const meta = (typeof block.metadata === "object" && block.metadata !== null) ? (block.metadata as Record<string, unknown>) : undefined;
                  const metaHeaders = Array.isArray(meta?.tableHeaders) ? (meta.tableHeaders as string[]) : undefined;
                  const metaRows = Array.isArray(meta?.tableRows) ? (meta.tableRows as string[][]) : undefined;
                  const resolvedTbl = tblData ?? (metaHeaders || metaRows ? {
                    id: `tbl-${block.id}`,
                    document_id: block.document_id,
                    block_id: block.id,
                    caption: block.content_text,
                    headers: metaHeaders ?? [],
                    rows: metaRows ?? [],
                    column_count: metaHeaders?.length ?? metaRows?.[0]?.length ?? 0,
                    row_count: metaRows?.length ?? 0,
                    created_at: block.created_at,
                  } : undefined);

                  return (
                    <section
                      key={block.id}
                      id={`block-${block.id}`}
                      tabIndex={-1}
                      aria-current={isCurrent ? "true" : undefined}
                      aria-label={`Halaman ${block.page_number}, ${blockKindLabel(block.block_type)}`}
                      className={cn(
                        "group relative scroll-mt-24 rounded-xl p-2 transition-colors outline-none sm:p-2.5",
                        isCurrent
                          ? "bg-brand-mint/45 ring-2 ring-primary/45 dark:bg-secondary/40"
                          : "hover:bg-surface-subtle/60"
                      )}
                    >
                      {block.block_type === "heading" &&
                        (!block.heading_level || block.heading_level === 1) && (
                          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
                            <FormattedMathText text={block.content_text} as="span" />
                          </h2>
                        )}

                      {block.block_type === "heading" &&
                        block.heading_level === 2 && (
                          <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
                            <FormattedMathText text={block.content_text} as="span" />
                          </h3>
                        )}

                      {block.block_type === "heading" &&
                        (block.heading_level ?? 0) >= 3 && (
                          <h4 className="font-heading text-lg font-bold text-foreground">
                            <FormattedMathText text={block.content_text} as="span" />
                          </h4>
                        )}

                      {block.block_type === "paragraph" && (
                        <FormattedMathText
                          text={block.content_text}
                          className="text-foreground"
                        />
                      )}

                      {block.block_type === "table" && (
                        <div className="space-y-3 rounded-2xl border border-brand-teal/30 bg-brand-mint/25 p-4 dark:bg-secondary/25">
                          <div className="flex flex-wrap items-center justify-start gap-2 font-ui">
                            <span className="rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                              {language === "id" ? "Tabel Data" : "Data Table"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => audio.playFrom(index)}
                              className="h-9 rounded-full bg-card px-3 text-xs"
                            >
                              <Volume2 className="size-3.5" aria-hidden="true" />
                              <span>
                                {language === "id" ? "Dengarkan tabel" : "Listen to table"}
                              </span>
                            </Button>
                          </div>

                          <div
                            tabIndex={0}
                            role="region"
                            aria-label={`Tabel halaman ${block.page_number}`}
                            className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs"
                          >
                            <StructuredTable
                              html={block.content_html}
                              table={resolvedTbl}
                              fallbackText={block.content_text}
                            />
                          </div>
                        </div>
                      )}

                      {block.block_type === "equation" && (
                        <div className="space-y-3 rounded-2xl border border-brand-teal/30 bg-brand-mint/35 p-5 dark:bg-secondary/35">
                          <div className="flex flex-wrap items-center justify-start gap-2 font-ui">
                            <span className="rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
                              Rumus Matematika
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => audio.playFrom(index)}
                              className="h-9 rounded-full bg-card px-3 text-xs"
                            >
                              <Volume2 className="size-3.5" aria-hidden="true" />
                              <span>Dengarkan rumus</span>
                            </Button>
                          </div>

                          <MathEquationView
                            latex={
                              eqData?.latex ??
                              (typeof (block.metadata as Record<string, unknown> | null)?.latex === "string"
                                ? ((block.metadata as Record<string, unknown>).latex as string)
                                : block.content_text)
                            }
                            contentText={block.content_text}
                            mathMl={eqData?.mathml ?? block.content_html ?? undefined}
                            spokenText={
                              (language === "id"
                                ? eqData?.narration_id
                                : eqData?.narration_en) ??
                              block.spoken_text ??
                              block.content_text
                            }
                          />
                        </div>
                      )}

                      {block.block_type === "figure" && (
                        <div className="space-y-3 rounded-2xl border border-border bg-surface-subtle/60 p-4">
                          {block.content_html?.trim() ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: sanitizeDocumentHtml(block.content_html),
                              }}
                            />
                          ) : null}
                          <div className="rounded-xl border border-border bg-card p-4 text-sm">
                            <p className="font-ui text-xs font-semibold text-secondary-foreground">
                              Deskripsi gambar untuk screen reader
                            </p>
                            <p className="mt-1 text-foreground">
                              {figData?.summary ??
                                block.spoken_text ??
                                block.content_text}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Quiet block actions: visible when active, hovered, or keyboard-focused */}
                      <div
                        className={cn(
                          "mt-2 flex items-center justify-start gap-1 font-ui transition-opacity",
                          isCurrent
                            ? "opacity-100"
                            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        )}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => audio.playFrom(index)}
                          aria-label={`Dengarkan ${blockKindLabel(block.block_type)} halaman ${block.page_number}`}
                          className="h-8 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Volume2 className="size-3.5" aria-hidden="true" />
                          <span>Dengarkan</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-pressed={isBookmarked}
                          onClick={() => {
                            const saved = toggleBookmark(block.id);
                            announce(
                              saved ? "Penanda disimpan." : "Penanda dihapus.",
                              "polite"
                            );
                          }}
                          className="h-8 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Bookmark
                            className={cn(
                              "size-3.5",
                              isBookmarked && "fill-primary text-primary"
                            )}
                            aria-hidden="true"
                          />
                          <span>{isBookmarked ? "Ditandai" : "Tandai"}</span>
                          <span className="sr-only">
                            {" "}
                            blok halaman {block.page_number}
                          </span>
                        </Button>
                      </div>
                    </section>
                  );
                })}
              </div>
            </article>
          )}

          {/* Sticky Floating Audio Transport Bar */}
          <div
            role="region"
            aria-label="Pemutar audio pembaca dokumen"
            className="sticky bottom-20 z-20 flex flex-wrap items-center justify-start gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 font-ui shadow-nav backdrop-blur-md lg:bottom-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={audio.previous}
                disabled={!audio.isSupported || audio.activeIndex === 0}
                aria-label="Blok sebelumnya"
                className="size-9 rounded-full"
              >
                <SkipBack className="size-4" aria-hidden="true" />
              </Button>

              {audio.isPlaying ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={audio.pause}
                  className="h-9 rounded-full px-4 text-xs font-semibold"
                >
                  <Pause className="size-4" aria-hidden="true" />
                  <span>{t("pause")}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    audio.isPaused ? audio.resume() : audio.playFrom(audio.activeIndex)
                  }
                  disabled={!audio.isSupported || audioBlocks.length === 0}
                  className="h-9 rounded-full px-4 text-xs font-semibold"
                >
                  <Play className="size-4" aria-hidden="true" />
                  <span>{audio.isPaused ? t("readerResume") : t("listen")}</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={audio.next}
                disabled={
                  !audio.isSupported || audio.activeIndex >= audioBlocks.length - 1
                }
                aria-label={t("readerNextBlock")}
                className="size-9 rounded-full"
              >
                <SkipForward className="size-4" aria-hidden="true" />
              </Button>

              {audio.isPlaying || audio.isPaused ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={audio.stop}
                  aria-label={t("readerStopAudio")}
                  className="size-9 rounded-full"
                >
                  <Square className="size-3.5" aria-hidden="true" />
                </Button>
              ) : null}

              <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">
                {t("blockOf")} {audioBlocks.length === 0 ? 0 : audio.activeIndex + 1} {t("from")}{" "}
                {audioBlocks.length}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground font-ui">
                <span>{t("speed")}</span>
                <Select
                  value={String(narrationSpeed)}
                  onValueChange={(val) => setNarrationSpeed(Number(val))}
                >
                  <SelectTrigger
                    aria-label={isEn ? "Speech speed" : "Kecepatan suara"}
                    className="h-9 min-w-[5.25rem] rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-primary/50"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[5.25rem] rounded-2xl border border-border bg-popover shadow-md font-ui">
                    <SelectItem value="0.75" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">0.75×</SelectItem>
                    <SelectItem value="1" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">1.0×</SelectItem>
                    <SelectItem value="1.25" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">1.25×</SelectItem>
                    <SelectItem value="1.5" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">1.5×</SelectItem>
                    <SelectItem value="2" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">2.0×</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground font-ui">
                <span>{t("language")}</span>
                <div className="relative inline-flex items-center">
                  <Select
                    disabled={isTranslatingDoc}
                    value={language}
                    onValueChange={(val) => handleLanguageChange(val === "id" ? "id" : "en")}
                  >
                    <SelectTrigger
                      aria-label="Bahasa narasi dan terjemahan"
                      className="h-9 min-w-[4.5rem] rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-primary/50 disabled:opacity-50"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[4.5rem] rounded-2xl border border-border bg-popover shadow-md font-ui">
                      <SelectItem value="id" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">ID</SelectItem>
                      <SelectItem value="en" className="rounded-lg text-xs cursor-pointer py-1.5 font-medium">EN</SelectItem>
                    </SelectContent>
                  </Select>
                  {isTranslatingDoc && (
                    <Loader2
                      className="absolute right-8 size-3 animate-spin text-primary pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Docked Single Companion Panel on xl+ */}
        {activePanel && isXlDesktop ? (
          <aside
            aria-label={
              activePanel === "outline"
                ? "Daftar isi dokumen"
                : "Tanya asisten dokumen"
            }
            className="sticky top-20 flex max-h-[calc(100dvh-6.5rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card xl:col-span-4"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 font-ui">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActivePanel("outline")}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                    activePanel === "outline"
                      ? "bg-brand-mint text-brand-ink"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Daftar Isi
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("ai")}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                    activePanel === "ai"
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
                onClick={() => setActivePanel(null)}
                className="size-9 rounded-full"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            {activePanel === "outline" ? outlinePanelBody : aiPanelBody}
          </aside>
        ) : null}
      </div>

      {/* Responsive Slide-over Sheet on < xl (< 1280px) so reading paper never gets squeezed */}
      <Sheet
        open={Boolean(activePanel) && !isXlDesktop}
        onOpenChange={(open) => {
          if (!open) setActivePanel(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full max-w-sm flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 py-3.5 text-left">
            <SheetTitle className="font-heading text-base font-bold">
              {activePanel === "ai" ? "Tanya AI" : "Daftar Isi & Materi"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {activePanel === "ai"
                ? "Jawaban mengacu pada isi dokumen yang sedang dibuka."
                : "Lompat langsung ke bab, rumus, tabel, atau penanda Anda."}
            </SheetDescription>
          </SheetHeader>
          {activePanel === "ai" ? aiPanelBody : outlinePanelBody}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function utteranceSetLang(
  utterance: SpeechSynthesisUtterance,
  language: "id" | "en",
  rate: number
) {
  utterance.lang = language === "id" ? "id-ID" : "en-US";
  utterance.rate = rate;
}
