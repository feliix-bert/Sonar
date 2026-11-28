const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_FORMAT.format(date);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatPageCount(pages: number | null | undefined): string {
  return pages && pages > 0 ? `${pages} halaman` : "Jumlah halaman belum diketahui";
}

/** Short version label from a stored version identifier such as "ver-cs-01-v2.1". */
export function formatVersion(versionId: string | null | undefined): string {
  if (!versionId) return "v1.0";
  const match = versionId.match(/v\d+(?:\.\d+)*$/i);
  return match ? match[0].toLowerCase() : versionId;
}

export function initialsOf(name: string | null | undefined, fallback = "S"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Separates structured unit prefixes (e.g. "Modul 04: Judul") from the main
 * document title so lists read cleanly without awkward dash clutter.
 */
export function splitDocumentTitle(rawTitle: string): {
  prefix: string | null;
  title: string;
} {
  const trimmed = rawTitle.trim();
  const parts = trimmed.split(/\s+[—–:]\s+/);
  if (parts.length >= 2 && parts[0].length <= 28) {
    return {
      prefix: parts[0],
      title: parts.slice(1).join(": "),
    };
  }
  return { prefix: null, title: trimmed };
}
