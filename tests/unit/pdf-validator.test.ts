import { describe, expect, it } from "vitest";
import { validatePdfBuffer } from "@/features/pdf-processing/validator";
import { documentUploadMetaSchema } from "@/lib/validation/schemas";

describe("SONAR Server PDF Upload Validator", () => {
  it("validates document upload metadata with slug or UUID courseId", () => {
    const slugValid = documentUploadMetaSchema.safeParse({
      courseId: "cs-201",
      title: "Bab 04: Binary Search Trees",
      language: "id",
    });
    expect(slugValid.success).toBe(true);

    const uuidValid = documentUploadMetaSchema.safeParse({
      courseId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Modul Kalkulus Multivariabel",
      language: "id",
    });
    expect(uuidValid.success).toBe(true);
  });

  it("accepts a valid PDF buffer and computes SHA-256 hash", () => {
    const samplePdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const res = validatePdfBuffer({
      buffer: samplePdf,
      filename: "lecture-notes.pdf",
      mimeType: "application/pdf",
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.fileHash).toHaveLength(64);
      expect(res.sizeBytes).toBe(samplePdf.byteLength);
    }
  });

  it("rejects disguised non-PDF files without %PDF- magic header", () => {
    const spoofed = Buffer.from("<script>alert(1)</script>");
    const res = validatePdfBuffer({
      buffer: spoofed,
      filename: "evil.pdf",
      mimeType: "application/pdf",
    });

    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain("%PDF-");
    }
  });

  it("rejects empty files and non-pdf extensions", () => {
    const empty = validatePdfBuffer({
      buffer: Buffer.alloc(0),
      filename: "empty.pdf",
      mimeType: "application/pdf",
    });
    expect(empty.valid).toBe(false);

    const wrongExt = validatePdfBuffer({
      buffer: Buffer.from("%PDF-1.7"),
      filename: "notes.docx",
      mimeType: "application/pdf",
    });
    expect(wrongExt.valid).toBe(false);
  });
});
