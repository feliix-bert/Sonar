"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Upload,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveAnnouncer } from "@/components/accessibility/LiveAnnouncer";
import { validatePdfFile } from "@/lib/upload/pdf-validation";
import { formatFileSize } from "@/lib/format";
import type { CourseRow } from "@/lib/data/workspace";

export function UploadForm({
  courses,
  defaultCourseId,
}: {
  courses: CourseRow[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const { announce } = useLiveAnnouncer();
  const nativeFileRef = useRef<HTMLInputElement>(null);

  const initialCourse =
    defaultCourseId && courses.some((c) => c.id === defaultCourseId)
      ? defaultCourseId
      : (courses[0]?.id ?? "");

  const [courseId, setCourseId] = useState(initialCourse);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [shareWithCourse, setShareWithCourse] = useState(true);
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const resetPicker = () => {
    setSelectedFile(null);
    if (nativeFileRef.current) nativeFileRef.current.value = "";
  };

  const handleSelectedFile = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const validation = await validatePdfFile(file);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      announce(validation.message, "assertive");
      resetPicker();
      return;
    }

    setSelectedFile(file);
    announce(
      `Berkas ${file.name} siap diproses, ukuran ${formatFileSize(file.size)}.`,
      "polite"
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    noClick: Boolean(selectedFile),
    noKeyboard: Boolean(selectedFile),
    onDrop: (accepted) => {
      if (accepted[0]) void handleSelectedFile(accepted[0]);
    },
    onDropRejected: (rejections) => {
      const rejected = rejections[0]?.file;
      const msg = rejected
        ? `Format berkas "${rejected.name}" ditolak. Hanya dokumen PDF (.pdf) yang diperbolehkan.`
        : "Format berkas tidak didukung. Hanya dokumen PDF (.pdf) yang diperbolehkan.";
      setErrorMessage(msg);
      announce(msg, "assertive");
      resetPicker();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!courseId) {
      const msg = "Pilih mata kuliah terlebih dahulu.";
      setErrorMessage(msg);
      announce(msg, "assertive");
      return;
    }

    if (!selectedFile) {
      const msg = "Pilih berkas PDF kuliah sebelum mengirim.";
      setErrorMessage(msg);
      announce(msg, "assertive");
      return;
    }

    setSubmitting(true);
    setUploadProgress(25);
    announce("Mengunggah berkas PDF dan memulai konversi aksesibilitas…", "polite");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("courseId", courseId);
      formData.append(
        "title",
        title.trim() || selectedFile.name.replace(/\.pdf$/i, "")
      );
      formData.append("language", language);
      formData.append("academicLevel", "s1");
      formData.append("sharingOption", shareWithCourse ? "shared" : "personal");
      formData.append("reviewerNotes", notes.trim());

      setUploadProgress(55);
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      let payload: {
        error?: string;
        duplicate?: boolean;
        documentId?: string;
        message?: string;
      } = {};
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const msg =
          payload.error ??
          "Gagal mengunggah dokumen. Pastikan Anda sudah masuk dan terdaftar pada mata kuliah ini.";
        setErrorMessage(msg);
        announce(msg, "assertive");
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      const okMsg = payload.duplicate
        ? (payload.message ??
          "Dokumen identik sudah tersedia di mata kuliah ini. Membuka versi yang ada.")
        : "Dokumen berhasil diunggah dan sedang disiapkan untuk pembaca.";
      setStatusMessage(okMsg);
      announce(okMsg, "polite");

      if (payload.documentId) {
        router.push(`/reader/${payload.documentId}`);
      } else {
        router.push(`/courses/${courseId}`);
      }
    } catch {
      const msg =
        "Koneksi terputus saat mengunggah dokumen. Periksa jaringan Anda lalu coba lagi.";
      setErrorMessage(msg);
      announce(msg, "assertive");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting}
      noValidate
      className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7 space-y-5 font-sans"
    >
      {errorMessage ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Gagal memproses unggahan</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert className="border-brand-teal/40 bg-brand-mint text-brand-ink" role="status">
          <CheckCircle2 className="size-4 text-brand-teal" aria-hidden="true" />
          <AlertTitle>Unggahan diterima</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* Top Compact Option Selectors */}
      <div className="grid gap-4 sm:grid-cols-2 font-ui">
        <div className="space-y-1.5">
          <Label htmlFor="upload-course">Mata kuliah</Label>
          <Select value={courseId} onValueChange={(val) => setCourseId(val)}>
            <SelectTrigger
              id="upload-course"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
            >
              <SelectValue placeholder="Pilih mata kuliah" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border bg-popover shadow-md">
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="rounded-lg text-sm">
                  {c.code}: {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="upload-language">Bahasa narasi suara</Label>
          <Select
            value={language}
            onValueChange={(val) => setLanguage(val as "id" | "en")}
          >
            <SelectTrigger
              id="upload-language"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs"
            >
              <SelectValue placeholder="Pilih bahasa" />
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
      </div>

      {/* File Dropzone or Selected File Card */}
      <div
        {...getRootProps()}
        className={cn(
          "rounded-2xl border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-primary bg-brand-mint/50"
            : selectedFile
              ? "border-border bg-surface-subtle/60"
              : "border-border bg-surface-subtle/40 hover:border-primary/60 hover:bg-surface-subtle/70 cursor-pointer"
        )}
      >
        <input {...getInputProps()} aria-hidden="true" tabIndex={-1} />
        <input
          ref={nativeFileRef}
          id="upload-pdf-file"
          type="file"
          accept=".pdf,application/pdf"
          aria-label="Pilih berkas PDF perkuliahan"
          className="sr-only"
          onChange={(e) => void handleSelectedFile(e.target.files?.[0])}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-3 py-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-mint text-brand-teal">
              <Upload className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="font-heading text-base font-bold text-foreground">
                Pilih berkas PDF atau seret ke area ini
              </p>
              <p className="text-sm text-muted-foreground">
                Hanya berkas format PDF (.pdf), maksimal 25 MB.
              </p>
            </div>
            <span className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-card px-5 font-ui text-sm font-semibold shadow-xs hover:bg-brand-mint hover:text-brand-ink transition-colors">
              Pilih Berkas PDF
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xs">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-mint text-brand-teal">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground font-ui">
                  {selectedFile.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground font-ui">
                  <span className="rounded-md bg-tint-blue px-1.5 py-0.5 font-semibold text-brand-ink">
                    PDF
                  </span>
                  <span>
                    {submitting ? "Mengunggah…" : formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-ui">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => nativeFileRef.current?.click()}
                className="min-h-10 rounded-full px-4 text-xs"
              >
                Ganti berkas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={submitting}
                aria-label="Hapus berkas terpilih"
                onClick={() => {
                  resetPicker();
                  announce("Berkas terpilih dihapus.", "polite");
                }}
                className="size-10 rounded-full text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document Title & Sharing Toggle */}
      <div className="space-y-4 border-t border-border pt-5 font-ui">
        <div className="space-y-1.5">
          <Label htmlFor="upload-title">
            Judul modul atau materi{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (otomatis dideteksi dari isi PDF jika dikosongkan)
            </span>
          </Label>
          <Input
            id="upload-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Otomatis mendeteksi judul di dalam isi dokumen PDF..."
            className="h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-subtle/70 px-4 py-3.5">
          <div className="space-y-0.5">
            <Label htmlFor="upload-sharing-switch" className="text-sm font-semibold">
              Ajukan review volunteer dan bagikan ke kelas
            </Label>
            <p className="text-xs text-muted-foreground font-sans">
              {shareWithCourse
                ? "Setelah disetujui volunteer, materi dapat digunakan kembali oleh mahasiswa lain pada mata kuliah ini."
                : "Materi hanya disimpan untuk akses pribadi Anda dan tidak muncul di perpustakaan kelas."}
            </p>
          </div>
          <Switch
            id="upload-sharing-switch"
            checked={shareWithCourse}
            onCheckedChange={setShareWithCourse}
          />
        </div>

        <details className="rounded-2xl border border-border bg-background px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Tambah catatan untuk volunteer (opsional)
          </summary>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="upload-reviewer-notes" className="sr-only">
              Catatan untuk volunteer
            </Label>
            <Textarea
              id="upload-reviewer-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis nomor halaman yang memiliki rumus sulit, tabel kompleks, atau diagram penting."
              className="font-sans text-sm"
            />
          </div>
        </details>
      </div>

      {submitting ? (
        <div className="space-y-2 rounded-2xl bg-brand-mint/50 p-4" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-semibold text-brand-ink font-ui">
            <span>Mengunggah berkas dan menjadwalkan konversi…</span>
            <span className="tabular-nums">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} aria-label="Progres unggah dokumen" />
        </div>
      ) : null}

      <div className="flex justify-end pt-1 font-ui">
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="min-h-11 rounded-full px-6 text-sm font-semibold shadow-xs"
        >
          <FileUp className="size-4" aria-hidden="true" />
          <span>{submitting ? "Memproses…" : "Proses Dokumen"}</span>
        </Button>
      </div>
    </form>
  );
}
