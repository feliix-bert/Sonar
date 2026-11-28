"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileUp,
  Headphones,
  List,
  ListTree,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  RotateCw,
  ScanText,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLiveAnnouncer } from "@/components/accessibility/LiveAnnouncer";
import { createClient } from "@/lib/supabase/client";
import { validatePdfFile } from "@/lib/upload/pdf-validation";
import {
  SERVERLESS_UPLOAD_LIMIT_BYTES,
  describeHttpFailure,
  readJsonSafely,
} from "@/lib/http/safe-json";
import { formatFileSize } from "@/lib/format";
import {
  FormattedMathText,
  MathEquationView,
} from "@/components/document/FormattedMathText";
import { narrateMixedText, narrateTableBlock } from "@/features/math-ocr/math-narration";
import { parseTableData, narrateTable } from "@/lib/accessibility/table-narration";
import { ScanCompanionPanel } from "@/components/scanner/ScanCompanionPanel";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useAudioReader, type AudioReadableBlock } from "@/features/audio/use-audio-reader";
import { useAccessibilityStore } from "@/stores/accessibility-store";
import type { CourseRow } from "@/lib/data/workspace";
import type { ExtractedBlockOutput } from "@/features/ocr/ocr-provider";

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

interface OcrDocumentScannerProps {
  courses: CourseRow[];
  defaultCourseId?: string;
}

interface ScanResultData {
  documentId: string;
  documentTitle: string;
  confidence: number;
  blocks: ExtractedBlockOutput[];
  stats: {
    totalBlocks: number;
    headingsCount: number;
    paragraphsCount: number;
    equationsCount: number;
    tablesCount: number;
    figuresCount: number;
  };
}

export function OcrDocumentScanner({
  courses,
  defaultCourseId,
}: OcrDocumentScannerProps) {
  const { t, isEn } = useTranslation();
  const { announce } = useLiveAnnouncer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initialCourse =
    defaultCourseId && courses.some((c) => c.id === defaultCourseId)
      ? defaultCourseId
      : (courses[0]?.id ?? "");

  const [courseId, setCourseId] = useState(initialCourse);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [documentTitle, setDocumentTitle] = useState("");
  const [isCustomTitle, setIsCustomTitle] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isCurrentFileScanned, setIsCurrentFileScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStageMessage, setScanStageMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [activePanel, setActivePanel] = useState<"outline" | "ai" | null>("outline");
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const isXlDesktop = useIsXlDesktop();
  const [narrationSpeed, setNarrationSpeed] = useState(1);
  const fontSizePx = useAccessibilityStore((s) => s.fontSizePx);
  const setFontSizePx = useAccessibilityStore((s) => s.setFontSizePx);

  const audioBlocks: AudioReadableBlock[] = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.blocks.map((block, idx) => {
      let spoken = block.spokenText || block.contentText;
      if (block.blockType === "table") {
        if (block.tableHeaders || block.tableRows) {
          spoken = narrateTableBlock(block.contentText, block.tableHeaders, block.tableRows, language);
        } else {
          const parsed = parseTableData(null, null, block.contentText);
          if (parsed.headers.length > 0 || parsed.rows.length > 0) {
            spoken = narrateTable(parsed, language);
          }
        }
      }
      return {
        id: `scan-block-${idx}`,
        spokenText: spoken,
        label: `Blok ${idx + 1}`,
      };
    });
  }, [scanResult, language]);

  const audio = useAudioReader({
    blocks: audioBlocks,
    rate: narrationSpeed,
    language,
    onBlockChange: (_id, index) => {
      setActiveBlockIndex(index);
      const el = window.document.getElementById(`scan-block-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    onAnnounce: (msg) => announce(msg, "polite"),
  });

  const togglePanel = (panel: "outline" | "ai") => {
    setActivePanel((prev) => {
      const next = prev === panel ? null : panel;
      announce(
        next === "outline"
          ? "Panel daftar isi dibuka."
          : next === "ai"
            ? "Panel Tanya AI dibuka."
            : "Panel samping ditutup.",
        "polite"
      );
      return next;
    });
  };

  const jumpToBlock = (index: number) => {
    setActiveBlockIndex(index);
    if (!isXlDesktop) {
      setActivePanel(null);
    }
    requestAnimationFrame(() => {
      const el = window.document.getElementById(`scan-block-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.focus({ preventScroll: true });
      }
    });
    const target = scanResult?.blocks[index];
    if (target) {
      announce(`Berpindah ke blok ${index + 1}: ${target.blockType}.`, "polite");
    }
  };
  const [isSharing, setIsSharing] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);
  const [sharingNotes, setSharingNotes] = useState("");
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, ExtractedBlockOutput[]>>({});

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const clearSelection = () => {
    audio.stop();
    setSelectedPdfFile(null);
    setScanResult(null);
    setIsCurrentFileScanned(false);
    setDocumentTitle("");
    setIsCustomTitle(false);
    setHasShared(false);
    setShareSuccessMessage(null);
    setShareErrorMessage(null);
    setSharingNotes("");
    setShowShareOptions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelScan = () => {
    audio.stop();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setScanning(false);
    setIsCurrentFileScanned(false);
    setScanProgress(0);
    setScanStageMessage("");
    announce("Pemindaian dibatalkan.", "polite");
  };

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    audio.stop();
    setErrorMessage(null);
    setScanResult(null);
    setIsCurrentFileScanned(false);
    setDocumentTitle("");
    setIsCustomTitle(false);
    setScanProgress(0);
    setScanStageMessage("");
    setHasShared(false);
    setShareSuccessMessage(null);
    setShareErrorMessage(null);

    const validation = await validatePdfFile(file);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      announce(validation.message, "assertive");
      clearSelection();
      return;
    }

    setSelectedPdfFile(file);
    announce(`Berkas PDF ${file.name} siap dipindai.`, "polite");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    noClick: Boolean(selectedPdfFile),
    noKeyboard: Boolean(selectedPdfFile),
    onDrop: (accepted) => {
      if (accepted[0]) void handleFileSelect(accepted[0]);
    },
    onDropRejected: () => {
      const msg = "Format tidak didukung. Hanya menerima berkas materi kuliah berformat PDF (.pdf).";
      setErrorMessage(msg);
      announce(msg, "assertive");
      clearSelection();
    },
  });

  const executeOcrScan = async () => {
    if (!selectedPdfFile) {
      const msg = "Pilih berkas PDF materi kuliah terlebih dahulu sebelum memindai.";
      setErrorMessage(msg);
      announce(msg, "assertive");
      return;
    }

    try {
      setScanning(true);
      setScanProgress(12);
      setScanStageMessage("Membaca halaman PDF & mengonfigurasi model AI Vision...");
      setErrorMessage(null);
      announce("Memulai pemindaian materi kuliah dan penyiapan audio…", "polite");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      progressTimerRef.current = setInterval(() => {
        setScanProgress((prev) => {
          if (prev < 35) {
            setScanStageMessage("Menganalisis hierarki heading, paragraf, dan tata letak halaman...");
            return prev + 6;
          }
          if (prev < 65) {
            setScanStageMessage("Mendeteksi formula matematika & mengonversi ke MathML standar...");
            return prev + 5;
          }
          if (prev < 85) {
            setScanStageMessage("Menyusun tabel matriks semantik & deskripsi visual...");
            return prev + 3;
          }
          if (prev < 96) {
            setScanStageMessage("Menghasilkan audio narasi lisan dan mengindeks dokumen...");
            return prev + 1;
          }
          return prev;
        });
      }, 400);

      const resolvedTitle = isCustomTitle ? documentTitle.trim() : "";

      let response: Response;

      if (selectedPdfFile.size > SERVERLESS_UPLOAD_LIMIT_BYTES) {
        // Berkas di atas 3,8 MB diunggah langsung ke Supabase Storage dari browser
        // agar tidak terpotong oleh batas payload Vercel Serverless (4,5 MB).
        const supabase = createClient();
        if (!supabase) {
          throw new Error(
            `Ukuran PDF (${formatFileSize(selectedPdfFile.size)}) melebihi batas pengiriman langsung 4 MB dan penyimpanan cloud belum terkonfigurasi.`
          );
        }

        const safeName =
          selectedPdfFile.name.replace(/[^\w.-]/g, "_").slice(0, 80) || "document.pdf";
        const storagePath = `scans/${courseId}/${Date.now()}-${safeName}`;

        const { error: storageErr } = await supabase.storage
          .from("course-documents")
          .upload(storagePath, selectedPdfFile, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (storageErr) {
          throw new Error(
            `Ukuran PDF (${formatFileSize(selectedPdfFile.size)}) melebihi 4 MB. Masuk ke akun Anda terlebih dahulu atau kompres PDF agar dapat dipindai.`
          );
        }

        response = await fetch("/api/ocr/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            courseId,
            language,
            title: resolvedTitle,
          }),
          signal: controller.signal,
        });
      } else {
        // Kirim berkas PDF mentah via multipart (±25% lebih kecil daripada base64 JSON)
        const formData = new FormData();
        formData.append("image", selectedPdfFile);
        formData.append("courseId", courseId);
        formData.append("language", language);
        formData.append("title", resolvedTitle);

        response = await fetch("/api/ocr/scan", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      }

      let data: (ScanResultData & { error?: string }) | null = null;
      let rawResponseText = "";
      try {
        rawResponseText = await response.text();
        data = rawResponseText.trim() ? JSON.parse(rawResponseText) : null;
      } catch (parseErr) {
        console.error(
          "[OcrDocumentScanner] Non-JSON response received:",
          parseErr,
          "\nRaw response body:",
          rawResponseText
        );
      }

      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      if (!response.ok || !data || data.error) {
        // Extract readable server detail from JSON or HTML
        let serverDetail = data?.error;
        if (!serverDetail && rawResponseText) {
          const titleMatch = rawResponseText.match(/<title>([^<]+)<\/title>/i);
          const bodyClean = rawResponseText
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          serverDetail = titleMatch ? titleMatch[1] : bodyClean.slice(0, 250);
        }

        const formattedError = serverDetail
          ? `Gagal memproses pemindaian materi (HTTP ${response.status}${response.statusText ? ` - ${response.statusText}` : ""}): ${serverDetail}`
          : describeHttpFailure(response.status, "pemindaian materi kuliah");

        console.error("[OcrDocumentScanner] OCR Request Failed Details:", {
          httpStatus: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          rawResponseBody: rawResponseText,
          parsedJson: data,
          extractedMessage: formattedError,
        });

        throw new Error(formattedError);
      }

      setScanProgress(100);
      setScanStageMessage("Pemindaian materi selesai! Menyajikan struktur dokumen bacaan aksesibel...");

      setTimeout(() => {
        setScanResult(data);
        setIsCurrentFileScanned(true);
        if (data.documentTitle) {
          setDocumentTitle(data.documentTitle);
          setIsCustomTitle(false);
        }
        setTranslationCache({ [language]: data.blocks });
        announce(
          `Pemindaian selesai. Terdeteksi ${data.stats.totalBlocks} blok materi.`,
          "polite"
        );
      }, 350);
    } catch (err) {
      setIsCurrentFileScanned(false);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      // User-initiated cancellation — don't show an error
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setScanProgress(0);
      setScanStageMessage("");
      const msg =
        err instanceof Error ? err.message : "Gagal memproses pemindaian materi kuliah.";
      setErrorMessage(msg);
      announce(msg, "assertive");
    } finally {
      abortControllerRef.current = null;
      setTimeout(() => {
        setScanning(false);
      }, 400);
    }
  };

  const handleSwitchLanguage = async (targetLang: "id" | "en") => {
    if (targetLang === language) return;
    if (!scanResult) {
      setLanguage(targetLang);
      return;
    }

    audio.stop();
    setLanguage(targetLang);

    // If cached in target language, use immediately
    if (translationCache[targetLang] && translationCache[targetLang].length > 0) {
      setScanResult((prev) => (prev ? { ...prev, blocks: translationCache[targetLang] } : null));
      announce(
        `Bahasa dokumen dialihkan ke ${targetLang === "id" ? "Bahasa Indonesia" : "English"}.`,
        "polite"
      );
      return;
    }

    // Call translation endpoint to translate blocks
    setIsTranslating(true);
    announce(
      `Menerjemahkan dokumen ke ${targetLang === "id" ? "Bahasa Indonesia" : "English"}...`,
      "polite"
    );

    try {
      const res = await fetch("/api/documents/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: scanResult.blocks,
          targetLanguage: targetLang,
        }),
      });

      const json = await readJsonSafely<{ blocks?: ExtractedBlockOutput[]; error?: string }>(res);
      if (!res.ok || !json || json.error || !json.blocks) {
        throw new Error(json?.error || describeHttpFailure(res.status, "penerjemahan dokumen"));
      }

      const translatedBlocks: ExtractedBlockOutput[] = json.blocks;
      setTranslationCache((prev) => ({
        ...prev,
        [targetLang]: translatedBlocks,
      }));
      setScanResult((prev) => (prev ? { ...prev, blocks: translatedBlocks } : null));
      announce(
        `Dokumen berhasil diterjemahkan ke ${targetLang === "id" ? "Bahasa Indonesia" : "English"}.`,
        "polite"
      );
    } catch (translateErr) {
      console.error("[OcrDocumentScanner] Translation error:", translateErr);
      announce("Gagal menerjemahkan teks, tetap menggunakan teks saat ini.", "assertive");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleShareWithCourse = async () => {
    if (!selectedPdfFile || !courseId) return;
    setIsSharing(true);
    setShareErrorMessage(null);
    announce("Mengunggah dan membagikan materi ke mata kuliah…", "polite");

    try {
      const formData = new FormData();
      formData.append("file", selectedPdfFile);
      formData.append("courseId", courseId);
      formData.append(
        "title",
        scanResult?.documentTitle || documentTitle || selectedPdfFile.name.replace(/\.pdf$/i, "")
      );
      formData.append("language", language);
      formData.append("academicLevel", "s1");
      formData.append("sharingOption", "shared");
      formData.append("reviewerNotes", sharingNotes.trim());

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await readJsonSafely<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error || describeHttpFailure(res.status, "pembagian dokumen"));
      }

      const selectedCourseObj = courses.find((c) => c.id === courseId);
      const successMsg = `Dokumen berhasil disimpan & dibagikan ke ${
        selectedCourseObj ? selectedCourseObj.code + " — " + selectedCourseObj.title : "mata kuliah"
      }.`;
      setShareSuccessMessage(successMsg);
      setHasShared(true);
      announce(successMsg, "polite");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat membagikan dokumen.";
      setShareErrorMessage(msg);
      announce(msg, "assertive");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div
        aria-busy={scanning}
        className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7 space-y-5"
      >
        {errorMessage ? (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Kesalahan pemindaian</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3 font-ui">
          <div className="space-y-1.5">
            <Label htmlFor="ocr-course">Mata kuliah</Label>
            <Select value={courseId} onValueChange={(val) => setCourseId(val)}>
              <SelectTrigger
                id="ocr-course"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
              >
                <SelectValue placeholder={t("chooseCourse")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover shadow-md">
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id} className="rounded-lg text-sm">
                    {course.code} — {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ocr-lang">{t("narrationLanguage")}</Label>
            <Select
              value={language}
              onValueChange={(val) => setLanguage(val as "id" | "en")}
            >
              <SelectTrigger
                id="ocr-lang"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
              >
                <SelectValue placeholder={isEn ? "Select language" : "Pilih bahasa"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover shadow-md">
                <SelectItem value="id" className="rounded-lg text-sm">
                  Bahasa Indonesia
                </SelectItem>
                <SelectItem value="en" className="rounded-lg text-sm">
                  English
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ocr-title">{t("readingTitle")}</Label>
            <Input
              id="ocr-title"
              value={documentTitle}
              onChange={(e) => {
                setDocumentTitle(e.target.value);
                setIsCustomTitle(e.target.value.trim().length > 0);
              }}
              placeholder={
                selectedPdfFile
                  ? selectedPdfFile.name.replace(/\.pdf$/i, "")
                  : t("readingTitlePlaceholder")
              }
              className="h-10 rounded-xl"
            />
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "rounded-2xl border-2 border-dashed p-6 transition-colors",
            isDragActive
              ? "border-primary bg-brand-mint/50"
              : selectedPdfFile
                ? "border-border bg-surface-subtle/60"
                : "border-border bg-surface-subtle/40 hover:border-primary/60 hover:bg-surface-subtle/70 cursor-pointer"
          )}
        >
          <input {...getInputProps()} aria-hidden="true" tabIndex={-1} />
          <input
            ref={fileInputRef}
            id="ocr-pdf-input"
            type="file"
            accept=".pdf,application/pdf"
            aria-label={isEn ? "Choose PDF file to scan" : "Pilih berkas PDF untuk dipindai cepat"}
            className="sr-only"
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
            onChange={(e) => void handleFileSelect(e.target.files?.[0])}
          />

          {!selectedPdfFile ? (
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-tint-blue text-brand-blue-strong">
                <Upload className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-heading text-base font-bold text-foreground">
                  {t("chooseScannedPdf")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("choosePdfSub")}
                </p>
              </div>
              <span className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-card px-5 font-ui text-sm font-semibold shadow-xs hover:bg-brand-mint hover:text-brand-ink transition-colors">
                {t("selectPdfBtn")}
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xs">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tint-blue text-brand-blue-strong">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground font-ui">
                      {selectedPdfFile.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground font-ui">
                      <span className="rounded-md bg-brand-mint px-1.5 py-0.5 font-semibold text-brand-ink">
                        PDF
                      </span>
                      <span>
                        {scanning ? `Menyiapkan materi (${scanProgress}%)…` : formatFileSize(selectedPdfFile.size)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-ui">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={scanning}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                      fileInputRef.current?.click();
                    }}
                    className="min-h-10 rounded-full px-4 text-xs"
                  >
                    Ganti berkas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={scanning}
                    aria-label="Hapus berkas PDF"
                    onClick={clearSelection}
                    className="size-10 rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Live Loading Progress Bar during Document Conversion */}
              {scanning && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-label="Status pemindaian materi kuliah"
                  className="rounded-2xl border border-primary/25 bg-surface-subtle/80 p-4 sm:p-5 space-y-3.5 text-left shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex size-2.5 shrink-0 items-center justify-center" aria-hidden="true">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
                        <span className="relative inline-flex size-2 rounded-full bg-primary" />
                      </span>
                      <p className="truncate text-xs sm:text-sm font-medium text-foreground">
                        {scanStageMessage}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-0.5 rounded-full bg-primary/10 px-3 py-1 text-primary ring-1 ring-primary/25 shrink-0 shadow-2xs font-ui">
                      <span className="font-mono text-sm sm:text-base font-bold tabular-nums">
                        {scanProgress}
                      </span>
                      <span className="font-mono text-xs font-semibold opacity-75">%</span>
                    </div>
                  </div>

                  <Progress
                    value={scanProgress}
                    aria-label={`Progres pemindaian: ${scanProgress}%`}
                    className="h-2 rounded-full bg-muted/80"
                  />

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5 text-center font-ui">
                    <div
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-1.5 text-[11px] sm:text-xs font-medium transition-all",
                        scanProgress >= 25
                          ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/25"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {scanProgress >= 60 ? (
                        <CheckCircle2 className="size-3 text-primary shrink-0" aria-hidden="true" />
                      ) : null}
                      <span>1. Analisis Visual</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-1.5 text-[11px] sm:text-xs font-medium transition-all",
                        scanProgress >= 60
                          ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/25"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {scanProgress >= 85 ? (
                        <CheckCircle2 className="size-3 text-primary shrink-0" aria-hidden="true" />
                      ) : null}
                      <span>2. Rumus MathML</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-1.5 text-[11px] sm:text-xs font-medium transition-all",
                        scanProgress >= 85
                          ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/25"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {scanProgress >= 100 ? (
                        <CheckCircle2 className="size-3 text-primary shrink-0" aria-hidden="true" />
                      ) : null}
                      <span>3. Narasi Suara</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isCurrentFileScanned && !scanning ? (
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 font-ui pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-3.5 py-2 shadow-2xs">
              <CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" />
              Materi berkas ini telah selesai dipindai
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCurrentFileScanned(false)}
              className="min-h-9 rounded-full px-3.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Tampilkan kembali tombol pemindaian untuk berkas ini"
            >
              <RotateCw className="size-3.5 mr-1.5" aria-hidden="true" />
              Pindai ulang berkas ini
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 font-ui">
            {scanning && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelScan}
                className="min-h-10 rounded-full px-4 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Batalkan pemindaian materi"
              >
                <X className="size-4 mr-1.5" aria-hidden="true" />
                Batalkan
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              disabled={!selectedPdfFile || scanning}
              onClick={executeOcrScan}
              className="min-h-11 rounded-full px-6 text-sm font-semibold shadow-xs"
            >
              {!scanning && <ScanText className="size-4 mr-2" aria-hidden="true" />}
              <span>{scanning ? `Memindai (${scanProgress}%)…` : "Mulai Pindai Materi Kuliah"}</span>
            </Button>
          </div>
        )}
      </div>

      {scanResult ? (
        <>
          <div className="grid gap-6 xl:grid-cols-12 items-start">
            <div
              className={cn(
                "space-y-5 transition-all min-w-0",
                activePanel && isXlDesktop ? "xl:col-span-8" : "xl:col-span-12"
              )}
            >
              <section
                aria-label="Hasil pemindaian dokumen"
                className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7"
              >
              <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      {scanResult.documentTitle}
                    </h2>
                  </div>
                </div>

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
                    <span>Daftar Isi</span>
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
                    <span>Tanya AI</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="min-h-10 rounded-full px-4 text-xs font-semibold"
                  >
                    <Link href={`/reader/${scanResult.documentId}`}>
                      <span>Buka di Pembaca</span>
                      <ExternalLink className="size-3.5 ml-1" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>

          {/* Post-Scan Sharing Option to Course Materials */}
          <div className="rounded-2xl border border-primary/25 bg-surface-subtle/70 p-4 space-y-3 font-ui text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                  <FileUp className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Unggah &amp; Bagikan ke Mata Kuliah</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Ingin membagikan materi ini? Hasil pindai akan disimpan ke katalog perkuliahan agar dapat diakses teman sekelas dan ditinjau reviewer.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareOptions((prev) => !prev)}
                  className="min-h-10 rounded-full px-3 text-xs"
                >
                  {showShareOptions ? "Tutup Catatan" : "Tambah Catatan"}
                </Button>

                <Button
                  type="button"
                  onClick={handleShareWithCourse}
                  disabled={isSharing || hasShared}
                  className="min-h-10 rounded-full px-4 text-xs font-semibold shadow-xs"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      <span>Membagikan…</span>
                    </>
                  ) : hasShared ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                      <span>Telah Dibagikan</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="size-3.5" aria-hidden="true" />
                      <span>Bagikan ke {courses.find((c) => c.id === courseId)?.code || "Mata Kuliah"}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {showShareOptions && !hasShared && (
              <div className="pt-2 border-t border-border/50 space-y-2">
                <Label htmlFor="sharing-notes" className="text-xs font-medium text-foreground">
                  Catatan untuk reviewer atau mahasiswa lain (opsional)
                </Label>
                <Input
                  id="sharing-notes"
                  value={sharingNotes}
                  onChange={(e) => setSharingNotes(e.target.value)}
                  placeholder="Contoh: Dokumen mencakup materi bab 1 s.d. 3 untuk persiapan kuis."
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            )}

            {shareSuccessMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>{shareSuccessMessage}</span>
              </div>
            )}

            {shareErrorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs font-semibold text-destructive">
                <AlertCircle className="size-4 text-destructive shrink-0" aria-hidden="true" />
                <span>{shareErrorMessage}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-ui">
            <div className="rounded-2xl bg-brand-mint p-3.5 text-brand-ink">
              <p className="text-xs font-medium">Total Blok</p>
              <p className="mt-1 font-heading text-2xl font-extrabold tabular-nums">
                {scanResult.stats.totalBlocks}
              </p>
            </div>
            <div className="rounded-2xl bg-tint-blue p-3.5 text-brand-ink">
              <p className="text-xs font-medium">Heading</p>
              <p className="mt-1 font-heading text-2xl font-extrabold tabular-nums">
                {scanResult.stats.headingsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-tint-peach p-3.5 text-brand-ink">
              <p className="text-xs font-medium">Rumus MathML</p>
              <p className="mt-1 font-heading text-2xl font-extrabold tabular-nums">
                {scanResult.stats.equationsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-tint-gold p-3.5 text-brand-ink">
              <p className="text-xs font-medium">Tabel</p>
              <p className="mt-1 font-heading text-2xl font-extrabold tabular-nums">
                {scanResult.stats.tablesCount}
              </p>
            </div>
          </div>

          <div
            className="sonar-reader-prose max-w-none space-y-3"
            style={{ fontSize: `${fontSizePx}px`, "--reader-font-size": `${fontSizePx}px` } as React.CSSProperties}
          >
            {scanResult.blocks.map((block, idx) => {
              const isPlayingThis = audio.isPlaying && audio.activeIndex === idx;
              const isBlockActive = activeBlockIndex === idx || isPlayingThis;

              return (
                <div
                  key={idx}
                  id={`scan-block-${idx}`}
                  tabIndex={-1}
                  className={cn(
                    "rounded-2xl border bg-surface-subtle/50 p-4 space-y-2.5 transition-all focus:outline-none",
                    isBlockActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-xs"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 font-ui">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {block.blockType === "heading"
                        ? `Heading level ${block.headingLevel ?? 2}`
                        : block.blockType === "equation"
                          ? "Rumus Matematika"
                          : block.blockType === "table"
                            ? "Tabel Terstruktur"
                            : "Paragraf"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (audio.isPlaying && audio.activeIndex === idx) {
                          audio.pause();
                        } else {
                          audio.playFrom(idx);
                        }
                      }}
                      className={cn(
                        "h-8 rounded-full px-2.5 text-xs transition-colors",
                        isPlayingThis
                          ? "text-primary font-semibold bg-primary/10"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="size-3.5 mr-1 text-primary" aria-hidden="true" />
                          <span>Jeda</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-3.5 mr-1" aria-hidden="true" />
                          <span>Dengarkan</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {block.blockType === "heading" ? (
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      <FormattedMathText text={block.contentText} as="span" />
                    </h3>
                  ) : block.blockType === "equation" ? (
                    <MathEquationView
                      latex={block.latex}
                      contentText={block.contentText}
                      mathMl={block.mathMl}
                      spokenText={block.spokenText}
                    />
                  ) : block.blockType === "table" &&
                    block.tableHeaders &&
                    block.tableRows ? (
                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                      <table className="w-full border-collapse text-left text-sm">
                        <caption className="px-3 py-2 text-left font-medium">
                          <FormattedMathText text={block.contentText} as="span" />
                        </caption>
                        <thead>
                          <tr className="border-b border-border bg-surface-subtle">
                            {block.tableHeaders.map((header, hIdx) => (
                              <th
                                key={hIdx}
                                scope="col"
                                className="px-3 py-2 font-semibold text-foreground"
                              >
                                <FormattedMathText text={header} as="span" />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.tableRows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className="border-b border-border/60 last:border-b-0"
                            >
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-2 text-foreground">
                                  <FormattedMathText text={cell} as="span" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <FormattedMathText
                      text={block.contentText}
                      className="text-foreground leading-relaxed"
                    />
                  )}
                </div>
              );
            })}
          </div>

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
                  <span>Jeda</span>
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
                  <span>{audio.isPaused ? "Lanjutkan" : "Dengarkan"}</span>
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
                aria-label="Blok berikutnya"
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
                  aria-label="Hentikan audio"
                  className="size-9 rounded-full"
                >
                  <Square className="size-3.5" aria-hidden="true" />
                </Button>
              ) : null}

              <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">
                Blok {audioBlocks.length === 0 ? 0 : audio.activeIndex + 1} dari{" "}
                {audioBlocks.length}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <span>Kecepatan</span>
                <select
                  aria-label="Kecepatan suara"
                  value={narrationSpeed}
                  onChange={(e) => setNarrationSpeed(Number(e.target.value))}
                  className="h-9 rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-foreground"
                >
                  <option value="0.75">0.75×</option>
                  <option value="1">1.0×</option>
                  <option value="1.25">1.25×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2.0×</option>
                </select>
              </label>

              <label className="flex items-center gap-1.5 text-muted-foreground">
                <span>Bahasa</span>
                <div className="relative inline-flex items-center">
                  <select
                    aria-label="Bahasa narasi dan terjemahan"
                    disabled={isTranslating}
                    value={language}
                    onChange={(e) =>
                      handleSwitchLanguage(e.target.value === "id" ? "id" : "en")
                    }
                    className="h-9 rounded-full border border-border bg-background px-2.5 text-xs font-semibold text-foreground disabled:opacity-50"
                  >
                    <option value="id">ID</option>
                    <option value="en">EN</option>
                  </select>
                  {isTranslating && (
                    <Loader2
                      className="absolute right-7 size-3 animate-spin text-primary"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Docked Single Companion Panel on xl+ */}
      {activePanel && isXlDesktop ? (
        <aside
          aria-label={
            activePanel === "outline" ? "Daftar isi materi" : "Tanya asisten materi"
          }
          className="sticky top-20 flex max-h-[calc(100dvh-6.5rem)] min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card xl:col-span-4"
        >
          <ScanCompanionPanel
            documentId={scanResult.documentId}
            documentTitle={scanResult.documentTitle}
            blocks={scanResult.blocks}
            language={language}
            activeTab={activePanel}
            onTabChange={(tab) => setActivePanel(tab)}
            onClose={() => setActivePanel(null)}
            activeBlockIndex={activeBlockIndex}
            onJumpToBlock={jumpToBlock}
          />
        </aside>
      ) : null}
    </div>

    {/* Responsive Slide-over Sheet on < xl (< 1280px) */}
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
            {activePanel === "ai" ? "Tanya AI" : "Daftar Isi & Navigasi"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {activePanel === "ai"
              ? "Jawaban mengacu pada isi materi yang baru saja dipindai."
              : "Lompat langsung ke judul bab, rumus, atau tabel materi."}
          </SheetDescription>
        </SheetHeader>
        <ScanCompanionPanel
          documentId={scanResult.documentId}
          documentTitle={scanResult.documentTitle}
          blocks={scanResult.blocks}
          language={language}
          activeTab={activePanel || "outline"}
          onTabChange={(tab) => setActivePanel(tab)}
          onClose={() => setActivePanel(null)}
          activeBlockIndex={activeBlockIndex}
          onJumpToBlock={jumpToBlock}
          hideHeaderInSheet
        />
      </SheetContent>
    </Sheet>
  </>
) : null}
    </div>
  );
}
