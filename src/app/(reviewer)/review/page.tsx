import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { ReviewQueueSkeleton } from "@/components/skeletons/PageSkeletons";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewQueueTable } from "@/components/reviewer/ReviewQueueTable";
import {
  loadWorkspaceSnapshot,
  FALLBACK_DOCUMENTS,
  FALLBACK_COURSES,
} from "@/lib/data/workspace";

export const metadata: Metadata = {
  title: "Antrean Review Volunteer",
};

async function ReviewQueueBody() {
  const snapshot = await loadWorkspaceSnapshot();
  const userRoles = snapshot.user?.roles ?? ["student"];
  const canReview = userRoles.some(
    (role) => role === "volunteer" || role === "admin"
  );
  if (!canReview) {
    redirect("/forbidden");
  }

  const allDocs =
    snapshot.documents.length > 0 ? snapshot.documents : FALLBACK_DOCUMENTS;
  const courses =
    snapshot.courses.length > 0 ? snapshot.courses : FALLBACK_COURSES;

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      <PageHeader
        title="Antrean Review Volunteer"
        description="Periksa keakuratan teks bacaan hasil pindai materi, rumus matematika, tabel, dan deskripsi gambar agar materi layak dibagikan kepada mahasiswa se-kelas."
      />

      <ReviewQueueTable documents={allDocs} courses={courses} />
    </div>
  );
}

export default function ReviewQueuePage() {
  return (
    <WorkspaceShell>
      <Suspense fallback={<ReviewQueueSkeleton />}>
        <ReviewQueueBody />
      </Suspense>
    </WorkspaceShell>
  );
}
