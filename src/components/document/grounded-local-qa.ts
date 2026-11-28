import type {
  DocumentBlockRow,
  DocumentEquationRow,
  DocumentFigureRow,
  DocumentTableRow,
} from "@/lib/data/workspace";

export interface LocalQaCitation {
  blockId: string;
  label: string;
}

export interface LocalQaAnswer {
  text: string;
  citations: LocalQaCitation[];
}

const STOPWORDS = new Set([
  "apa",
  "apakah",
  "bagaimana",
  "mengapa",
  "siapa",
  "kapan",
  "dimana",
  "yang",
  "dan",
  "atau",
  "dari",
  "untuk",
  "dengan",
  "pada",
  "dalam",
  "ini",
  "itu",
  "tentang",
  "jelaskan",
  "sebutkan",
  "tolong",
  "buat",
  "the",
  "and",
  "for",
  "what",
  "how",
  "why",
  "explain",
  "this",
  "that",
]);

function blockTypeLabel(type: DocumentBlockRow["block_type"]): string {
  switch (type) {
    case "heading":
      return "Judul";
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

function makeCitation(block: DocumentBlockRow): LocalQaCitation {
  return {
    blockId: block.id,
    label: `Hlm ${block.page_number} · ${blockTypeLabel(block.block_type)}`,
  };
}

export function answerFromDocumentBlocks(
  query: string,
  context: {
    documentTitle: string;
    blocks: DocumentBlockRow[];
    equations: DocumentEquationRow[];
    tables: DocumentTableRow[];
    figures: DocumentFigureRow[];
    language: "id" | "en";
    activeBlockId?: string | null;
  }
): LocalQaAnswer {
  const { documentTitle, blocks, equations, tables, figures, language, activeBlockId } =
    context;

  if (blocks.length === 0) {
    return {
      text: `Dokumen "${documentTitle}" belum memiliki blok teks terstruktur untuk dianalisis.`,
      citations: [],
    };
  }

  const eqMap = new Map(equations.map((e) => [e.block_id, e]));
  const tblMap = new Map(tables.map((t) => [t.block_id, t]));
  const figMap = new Map(figures.map((f) => [f.block_id, f]));
  const lower = query.toLowerCase();

  // Intent: Ringkasan / Summary
  if (lower.includes("ringkas") || lower.includes("summary") || lower.includes("rangkum")) {
    const headings = blocks.filter((b) => b.block_type === "heading").slice(0, 4);
    const introParagraphs = blocks
      .filter((b) => b.block_type === "paragraph")
      .slice(0, 2);
    const picked = [...headings, ...introParagraphs].slice(0, 4);

    if (picked.length > 0) {
      const lines = picked.map((b) => `• ${b.content_text}`);
      return {
        text: `Ringkasan struktur dan poin awal dari "${documentTitle}":\n\n${lines.join("\n")}`,
        citations: picked.map(makeCitation),
      };
    }
  }

  // Intent: Rumus / Formula / Equation
  if (lower.includes("rumus") || lower.includes("formula") || lower.includes("equation")) {
    const eqBlocks = blocks.filter((b) => b.block_type === "equation");
    if (eqBlocks.length === 0) {
      return {
        text: `Tidak ditemukan blok rumus matematika pada dokumen "${documentTitle}".`,
        citations: [],
      };
    }

    const activeEq = activeBlockId
      ? eqBlocks.find((b) => b.id === activeBlockId)
      : undefined;
    const targets = activeEq ? [activeEq] : eqBlocks.slice(0, 3);
    const lines = targets.map((b) => {
      const eq = eqMap.get(b.id);
      const narration = eq
        ? language === "id"
          ? eq.narration_id
          : eq.narration_en
        : b.spoken_text;
      return `• ${b.content_text}${narration ? `\n  Narasi: ${narration}` : ""}`;
    });

    return {
      text: `Rumus yang tercatat dalam "${documentTitle}":\n\n${lines.join("\n\n")}`,
      citations: targets.map(makeCitation),
    };
  }

  // Intent: Istilah penting / Poin / Bab
  if (
    lower.includes("istilah") ||
    lower.includes("poin") ||
    lower.includes("bab") ||
    lower.includes("topik")
  ) {
    const keyBlocks = blocks
      .filter((b) => b.block_type === "heading" || b.block_type === "table")
      .slice(0, 5);
    if (keyBlocks.length > 0) {
      return {
        text: `Pokok bahasan dan tabel utama di "${documentTitle}":\n\n${keyBlocks
          .map((b) => `• ${b.content_text} (Halaman ${b.page_number})`)
          .join("\n")}`,
        citations: keyBlocks.map(makeCitation),
      };
    }
  }

  // Intent: Latihan soal / Quiz
  if (lower.includes("soal") || lower.includes("kuis") || lower.includes("latihan")) {
    const sourceBlocks = blocks
      .filter((b) => b.block_type === "heading" || b.block_type === "paragraph" || b.block_type === "equation")
      .slice(0, 3);
    const items = sourceBlocks.map((b, i) => {
      if (b.block_type === "equation") {
        const eq = eqMap.get(b.id);
        return `${i + 1}. Jelaskan arti dan kegunaan persamaan "${b.content_text}"${eq?.narration_id ? ` (${eq.narration_id})` : ""}.`;
      }
      return `${i + 1}. Apa gagasan utama yang dibahas pada bagian "${b.content_text.slice(0, 120)}${b.content_text.length > 120 ? "…" : ""}"?`;
    });

    return {
      text: `Pertanyaan latihan berdasarkan isi "${documentTitle}":\n\n${items.join("\n")}`,
      citations: sourceBlocks.map(makeCitation),
    };
  }

  // General keyword scoring over blocks + metadata
  const tokens = lower
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const scored = blocks
    .map((block) => {
      const eq = eqMap.get(block.id);
      const tbl = tblMap.get(block.id);
      const fig = figMap.get(block.id);
      const searchable = [
        block.content_text,
        block.spoken_text ?? "",
        eq?.latex ?? "",
        eq?.narration_id ?? "",
        eq?.narration_en ?? "",
        tbl?.caption ?? "",
        fig?.summary ?? "",
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const tok of tokens) {
        if (searchable.includes(tok)) {
          score += block.content_text.toLowerCase().includes(tok) ? 3 : 1;
        }
      }
      if (block.id === activeBlockId && tokens.length === 0) score += 1;
      return { block, eq, fig, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      text: `Tidak ditemukan bagian dalam "${documentTitle}" yang secara langsung memuat kata kunci pertanyaan Anda. Coba gunakan kata kunci lain yang tercantum di daftar isi atau materi.`,
      citations: [],
    };
  }

  const excerpts = scored.map(({ block, eq, fig }) => {
    const detailText =
      block.block_type === "figure" && fig?.summary
        ? fig.summary
        : block.block_type === "equation" && eq?.narration_id
          ? `${block.content_text} (${language === "id" ? eq.narration_id : eq.narration_en})`
          : block.content_text;
    const trimmed =
      detailText.length > 260 ? `${detailText.slice(0, 257)}…` : detailText;
    return `• (Hlm ${block.page_number}) ${trimmed}`;
  });

  return {
    text: `Bagian relevan dari "${documentTitle}":\n\n${excerpts.join("\n\n")}`,
    citations: scored.map(({ block }) => makeCitation(block)),
  };
}
