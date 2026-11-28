import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { ReaderSkeleton } from "@/components/skeletons/PageSkeletons";
import { ReaderEmptyState } from "@/components/document/ReaderEmptyState";
import { AccessibleReaderStudio } from "@/components/document/AccessibleReaderStudio";
import { loadDocumentDetail, loadWorkspaceSnapshot } from "@/lib/data/workspace";
import { getSharedMaterialById } from "@/lib/data/course-materials";
import { isAiConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Pembaca Dokumen",
};

async function ReaderIndexBody() {
  await connection();
  const snapshot = await loadWorkspaceSnapshot();
  const initialDoc =
    snapshot.documents.find((d) => d.review_status === "verified") ??
    snapshot.documents[0];

  if (!initialDoc) {
    return <ReaderEmptyState type="no_documents" />;
  }

  const detail = await loadDocumentDetail(initialDoc.id);
  if (!detail) {
    return <ReaderEmptyState type="not_found" />;
  }

  const relatedDocuments = snapshot.documents
    .filter((d) => d.id !== detail.document.id)
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      title: d.title,
      reviewStatus: d.review_status,
    }));

  const sharedMeta = getSharedMaterialById(detail.document.id);

  return (
    <AccessibleReaderStudio
      document={detail.document}
      courseLabel={
        detail.course ? `${detail.course.code}: ${detail.course.title}` : undefined
      }
      blocks={detail.blocks}
      tables={detail.tables}
      equations={detail.equations}
      figures={detail.figures}
      signedPdfUrl={detail.signedPdfUrl}
      aiEnabled={isAiConfigured()}
      relatedDocuments={relatedDocuments}
      versionNotice={sharedMeta?.versionNotice ?? null}
    />
  );
}

export default function ReaderIndexPage() {
  return (
    <WorkspaceShell>
      <Suspense fallback={<ReaderSkeleton />}>
        <ReaderIndexBody />
      </Suspense>
    </WorkspaceShell>
  );
}
