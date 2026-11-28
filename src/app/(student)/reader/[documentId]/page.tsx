import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { ReaderSkeleton } from "@/components/skeletons/PageSkeletons";
import { ReaderEmptyState } from "@/components/document/ReaderEmptyState";
import { AccessibleReaderStudio } from "@/components/document/AccessibleReaderStudio";
import {
  loadDocumentDetail,
  loadRelatedDocuments,
} from "@/lib/data/workspace";
import { getSharedMaterialById } from "@/lib/data/course-materials";
import { isAiConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Pembaca Dokumen",
};

async function ReaderDetailBody({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const detail = await loadDocumentDetail(documentId);

  if (!detail) {
    return <ReaderEmptyState type="not_found" />;
  }

  const relatedDocuments = detail.course
    ? await loadRelatedDocuments(detail.course.id, detail.document.id)
    : [];

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

export default function ReaderDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  return (
    <WorkspaceShell>
      <Suspense fallback={<ReaderSkeleton />}>
        <ReaderDetailBody params={params} />
      </Suspense>
    </WorkspaceShell>
  );
}
