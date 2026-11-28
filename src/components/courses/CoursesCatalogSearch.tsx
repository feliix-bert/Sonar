"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  X,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";
import { getCourseToneStyles } from "@/lib/course-theme";
import { APP_IMAGES } from "@/lib/images";
import type { CourseRow, DocumentRow } from "@/lib/data/workspace";
import { useTranslation } from "@/lib/i18n/use-translation";

interface CourseCardData {
  course: CourseRow;
  verifiedCount: number;
  pendingCount: number;
  docs: DocumentRow[];
}

interface CoursesCatalogSearchProps {
  courses: CourseRow[];
  documents: DocumentRow[];
}

function getCourseImage(course: { id: string; code: string; discipline: string }) {
  const code = course.code.toLowerCase();
  const disc = course.discipline.toLowerCase();
  if (
    course.id === "math-105" ||
    course.id === "a0000000-0000-0000-0000-000000000105" ||
    code.includes("math") ||
    disc.includes("matematika")
  ) {
    return APP_IMAGES.courseMath;
  }
  if (
    course.id === "stat-210" ||
    course.id === "a0000000-0000-0000-0000-000000000210" ||
    code.includes("stat") ||
    disc.includes("statistika")
  ) {
    return APP_IMAGES.courseStat;
  }
  return APP_IMAGES.courseCS;
}

export function CoursesCatalogSearch({
  courses,
  documents,
}: CoursesCatalogSearchProps) {
  const { isEn } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.discipline) set.add(c.discipline);
    });
    return Array.from(set);
  }, [courses]);

  const cardsData = useMemo<CourseCardData[]>(() => {
    return courses.map((course) => {
      const courseSlug = course.code.toLowerCase().replace(/\s+/g, "-");
      const docs = documents.filter(
        (d) =>
          d.course_id === course.id ||
          d.course_id === courseSlug ||
          (course.code === "CS 201" && (d.course_id === "cs-201" || d.course_id === "a0000000-0000-0000-0000-000000000201")) ||
          (course.code === "MATH 105" && (d.course_id === "math-105" || d.course_id === "a0000000-0000-0000-0000-000000000105")) ||
          (course.code === "STAT 210" && (d.course_id === "stat-210" || d.course_id === "a0000000-0000-0000-0000-000000000210"))
      );
      const verifiedCount = docs.filter(
        (d) => d.review_status === "verified"
      ).length;
      const pendingCount = docs.length - verifiedCount;
      return { course, verifiedCount, pendingCount, docs };
    });
  }, [courses, documents]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cardsData.filter(({ course, docs }) => {
      const matchesDocKeyword = docs.some(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.original_filename?.toLowerCase().includes(q)
      );

      const matchesSearch =
        !q ||
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        course.discipline.toLowerCase().includes(q) ||
        (course.description && course.description.toLowerCase().includes(q)) ||
        matchesDocKeyword;

      const matchesDiscipline =
        selectedDiscipline === "all" ||
        course.discipline.toLowerCase() === selectedDiscipline.toLowerCase();

      return matchesSearch && matchesDiscipline;
    });
  }, [cardsData, searchQuery, selectedDiscipline]);

  return (
    <div className="space-y-6">
      {/* Search Bar & Discipline Filter Dropdown */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center font-ui">
        <div className="relative flex-1">
          <label htmlFor="courses-search-input" className="sr-only">
            {isEn ? "Search courses" : "Cari mata kuliah"}
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Search className="size-4" aria-hidden="true" />
          </div>
          <input
            id="courses-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? "Search course code, title, or keywords..."
                : "Cari kode, judul matkul, atau kata kunci materi…"
            }
            className="w-full h-11 rounded-full border border-input bg-card pl-10 pr-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              aria-label={isEn ? "Clear search" : "Bersihkan pencarian"}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {disciplines.length > 0 && (
          <div className="w-full sm:w-64 shrink-0">
            <Select
              value={selectedDiscipline}
              onValueChange={setSelectedDiscipline}
            >
              <SelectTrigger
                id="courses-discipline-filter"
                aria-label={isEn ? "Filter by discipline" : "Filter berdasarkan bidang studi"}
                className="h-11 w-full rounded-full border border-input bg-card px-4 text-sm font-semibold text-foreground shadow-xs cursor-pointer"
              >
                <SelectValue placeholder={isEn ? "All Disciplines" : "Semua Bidang Studi"} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-border bg-popover shadow-md font-ui">
                <SelectItem value="all" className="rounded-lg text-sm cursor-pointer py-2 font-medium">
                  {isEn ? `All Disciplines (${courses.length})` : `Semua (${courses.length})`}
                </SelectItem>
                {disciplines.map((disc) => {
                  const count = courses.filter(
                    (c) => c.discipline.toLowerCase() === disc.toLowerCase()
                  ).length;
                  return (
                    <SelectItem
                      key={disc}
                      value={disc}
                      className="rounded-lg text-sm cursor-pointer py-2"
                    >
                      {disc} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map(({ course, verifiedCount, pendingCount }, idx) => {
            const courseImage = getCourseImage(course);
            const tone = getCourseToneStyles(course);

            return (
              <article
                key={course.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary/50"
              >
                <div>
                  <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
                    <Image
                      src={courseImage.src}
                      alt={courseImage.alt}
                      fill
                      priority={idx === 0}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 font-ui">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          tone.surface,
                          "text-brand-ink"
                        )}
                      >
                        {course.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {course.discipline}
                      </span>
                    </div>

                    <h2 className="font-heading text-lg font-bold leading-snug text-foreground">
                      <Link
                        href={`/courses/${course.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {course.title}
                      </Link>
                    </h2>

                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {course.description}
                    </p>

                    <div className="space-y-2 border-t border-border/70 pt-3 text-sm font-ui">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle2
                            className="size-4 text-primary"
                            aria-hidden="true"
                          />
                          <span>{isEn ? "Verified materials" : "Materi terverifikasi"}</span>
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {verifiedCount} {isEn ? "documents" : "dokumen"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Clock
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span>{isEn ? "In review process" : "Dalam proses review"}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {pendingCount} {isEn ? "documents" : "dokumen"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/70 bg-surface-subtle/50 p-4 font-ui">
                  <Button
                    asChild
                    className="min-h-10 w-full justify-between rounded-full px-4 font-semibold"
                  >
                    <Link href={`/courses/${course.id}`}>
                      <span>{isEn ? "View Class Materials" : "Lihat Materi Kelas"}</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-card font-ui space-y-3">
          <BookOpen className="size-8 mx-auto text-muted-foreground/60" aria-hidden="true" />
          <p className="font-heading text-base font-bold text-foreground">
            {isEn
              ? `No courses matched "${searchQuery}"`
              : `Tidak ada mata kuliah yang cocok dengan "${searchQuery}"`}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {isEn
              ? "Try different keywords, clear discipline filter, or upload new course materials."
              : "Coba gunakan kata kunci lain, bersihkan filter bidang studi, atau unggah materi baru ke mata kuliah yang Anda butuhkan."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedDiscipline("all");
            }}
            className="rounded-full"
          >
            {isEn ? "Reset Search" : "Reset Pencarian"}
          </Button>
        </div>
      )}
    </div>
  );
}
